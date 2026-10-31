import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
const platform = { OS: 'ios' },
  cache = 'file:///private/cache/';
let result, removed, options;
mock.module('react-native', { exports: { Platform: platform } });
mock.module('expo-document-picker', {
  exports: {
    getDocumentAsync: async (input) => {
      options = input;
      return result;
    },
  },
});
mock.module('expo-file-system', {
  exports: {
    Paths: { cache: { uri: cache } },
    File: class {
      constructor(uri) {
        this.uri = uri;
      }
      exists = true;
      size = 14;
      delete() {
        removed.push(this.uri);
      }
    },
    Directory: class {
      constructor(_root, name) {
        this.uri = cache + name;
      }
      exists = true;
      delete() {
        removed.push(this.uri);
      }
    },
  },
});
mock.module('../lib/api-config.ts', {
  exports: { API_BASE_URL: 'https://api.test/api/v1' },
});
mock.module('../lib/session.ts', {
  exports: {
    getSession: () => ({}),
    apiFetch: async () => {
      throw new Error('Unexpected network request');
    },
  },
});
const picker = await import('../lib/document-picker.ts');
beforeEach(() => {
  platform.OS = 'ios';
  removed = [];
  result = {
    canceled: false,
    assets: [
      {
        name: 'certificate.pdf',
        uri: cache + 'DocumentPicker/certificate.pdf',
        size: 14,
        mimeType: 'application/pdf',
      },
    ],
  };
});
test('native picker copies one allowed file privately and cleans only its own copy', async () => {
  const file = await picker.pickDocument();
  assert.equal(file.size, 14);
  assert.equal(options.copyToCacheDirectory, true);
  assert.equal(options.multiple, false);
  assert.equal(options.base64, false);
  await picker.discardDocument(file);
  assert.deepEqual(removed, [file.uri]);
  await picker.discardDocument({
    ...file,
    uri: 'file:///provider/original.pdf',
  });
  assert.equal(removed.length, 1);
  await picker.clearDocumentCache();
  assert.equal(removed[1], cache + 'DocumentPicker');
});
test('cancel never deletes originals and invalid/oversized files clean the private copy', async () => {
  result = { canceled: true, assets: null };
  assert.equal(await picker.pickDocument(), null);
  assert.deepEqual(removed, []);
  result = {
    canceled: false,
    assets: [
      {
        name: 'large.pdf',
        uri: cache + 'DocumentPicker/large.pdf',
        size: 10485761,
        mimeType: 'application/pdf',
      },
    ],
  };
  await assert.rejects(picker.pickDocument(), /10 MB/);
  assert.equal(removed.length, 1);
  result.assets[0].uri = 'file:///provider/original.pdf';
  await assert.rejects(picker.pickDocument(), /private temporary/);
  assert.equal(removed.length, 1);
});
test('web selection/cache cleanup never touches device files', async () => {
  platform.OS = 'web';
  await picker.clearDocumentCache();
  await picker.discardDocument({ uri: 'file:///something' });
  assert.deepEqual(removed, []);
});

test('web picker blob URLs are revoked when their selection is discarded', async () => {
  platform.OS = 'web';
  const uri = globalThis.URL.createObjectURL(
    new globalThis.Blob(['test-only']),
  );
  await picker.discardDocument({ uri });
  await assert.rejects(globalThis.fetch(uri));
});
