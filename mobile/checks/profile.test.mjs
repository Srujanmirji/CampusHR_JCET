import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { homeUser, employeeId } from './home-fixtures.mjs';
const user = {
  ...homeUser,
  permissions: [
    ...homeUser.permissions,
    'employee.read.own',
    'employee.update.own',
    'document.read.own',
    'document.upload.own',
  ],
};
let current, handler, calls;
mock.module('../lib/api-config.ts', {
  exports: { API_BASE_URL: 'https://api.test/api/v1' },
});
mock.module('../lib/session.ts', {
  exports: {
    getSession: () => current,
    apiFetch: async (path, init) => {
      calls.push({ path, init });
      return handler(path, init);
    },
  },
});
const profile = await import('../lib/profile-api.ts'),
  documents = await import('../lib/documents-api.ts');
const employee = {
  id: employeeId,
  employeeCode: 'IOS004',
  firstName: 'Home',
  lastName: 'Test',
  email: user.email,
  phone: null,
  department: { id: 1, code: 'CSE', name: 'Computer Science' },
  designation: { id: 1, name: 'Professor', category: 'TEACHING' },
  employmentType: 'PERMANENT',
  joiningDate: '2020-06-01',
  qualification: null,
  specialization: null,
  experienceYears: 6,
  status: 'ACTIVE',
};
const row = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  employeeId,
  title: 'Test certificate',
  documentType: 'Certificate',
  category: 'ACADEMIC',
  fileName: 'certificate.pdf',
  fileSize: 14,
  mimeType: 'application/pdf',
  status: 'PENDING',
  expiryDate: null,
  reviewNote: null,
  createdAt: '2026-10-22T00:00:00Z',
};
const page = (data = [row]) => ({
  data,
  page: 1,
  total: data.length,
  totalPages: 1,
});
beforeEach(() => {
  current = { user, accessToken: 'rotated' };
  calls = [];
  handler = async () => globalThis.Response.json({ data: employee });
});
test('profile reads a linked own UUID and edits only phone, including clearing it', async () => {
  assert.equal((await profile.getOwnProfile(user, 'real')).id, employeeId);
  assert.equal(calls[0].path, `/employees/${employeeId}`);
  handler = async (_path, init) =>
    globalThis.Response.json({
      data: { ...employee, phone: JSON.parse(init.body).phone },
    });
  assert.equal(
    (await profile.saveOwnPhone(user, 'real', '+91 98765 43210')).phone,
    '+91 98765 43210',
  );
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    phone: '+91 98765 43210',
  });
  assert.equal((await profile.saveOwnPhone(user, 'real', '')).phone, null);
  await assert.rejects(profile.saveOwnPhone(user, 'real', 'bad'));
  handler = async () =>
    globalThis.Response.json({ data: { ...employee, id: row.id } });
  await assert.rejects(
    profile.getOwnProfile(user, 'real'),
    /different employee/,
  );
});
test('no-link, forbidden, demo, expired and changed accounts do not make private requests', async () => {
  for (const [who, token] of [
    [{ ...user, employeeId: null }, 'real'],
    [{ ...user, permissions: [] }, 'real'],
    [user, 'demo-token'],
    [null, null],
  ]) {
    await assert.rejects(profile.getOwnProfile(who, token));
    await assert.rejects(documents.listOwnDocuments(who, token));
  }
  current.user = { ...user, id: row.id };
  await assert.rejects(profile.getOwnProfile(user, 'real'), /Session changed/);
  assert.deepEqual(calls, []);
});
test('document pages and protected preview refuse foreign or malformed content', async () => {
  handler = async () => globalThis.Response.json(page());
  assert.equal((await documents.listOwnDocuments(user, 'real')).data.length, 1);
  assert.match(
    calls[0].path,
    new RegExp(`employeeId=${employeeId}&page=1&limit=20`),
  );
  for (const data of [[{ ...row, employeeId: row.id }], [row, row]]) {
    handler = async () => globalThis.Response.json(page(data));
    await assert.rejects(documents.listOwnDocuments(user, 'real'));
  }
  handler = async () =>
    new globalThis.Response(null, {
      headers: { 'content-type': 'application/pdf', 'content-length': '14' },
    });
  const source = await documents.documentPreview(user, 'real', row);
  assert.equal(
    source.uri,
    `https://api.test/api/v1/documents/${row.id}/content`,
  );
  assert.equal(source.token, 'rotated');
  assert.equal(calls.at(-1).init.method, 'HEAD');
  await assert.rejects(
    documents.documentPreview(user, 'real', { ...row, employeeId: row.id }),
  );
  for (const headers of [
    { 'content-type': 'text/html', 'content-length': '14' },
    { 'content-type': 'application/pdf', 'content-length': '10485761' },
  ]) {
    handler = async () => new globalThis.Response(null, { headers });
    await assert.rejects(documents.documentPreview(user, 'real', row));
  }
});
test('uploads validate file, metadata and confirmed 201 without retry or multipart header', async () => {
  const file = new globalThis.File(['%PDF-1.4\n%%EOF'], 'certificate.pdf', {
    type: 'application/pdf',
  });
  const selected = {
      file,
      uri: 'blob:test',
      size: file.size,
      name: file.name,
      mimeType: file.type,
    },
    metadata = {
      title: row.title,
      documentType: row.documentType,
      category: row.category,
      expiryDate: '',
    };
  handler = async (_path, init) => {
    assert.equal(init.headers, undefined);
    assert.equal(init.method, 'POST');
    assert.equal(init.body.get('employeeId'), null);
    assert.equal(init.body.get('title'), row.title);
    return globalThis.Response.json({ data: row }, { status: 201 });
  };
  await documents.uploadOwnDocument(
    user,
    'real',
    metadata,
    selected,
    false,
    new globalThis.AbortController().signal,
  );
  for (const extra of [
    { size: 0 },
    { size: documents.MAX_DOCUMENT_BYTES + 1 },
    { name: 'x.html' },
    { mimeType: 'text/html' },
  ])
    assert.throws(() => documents.validateSelection({ ...selected, ...extra }));
  await assert.rejects(
    documents.uploadOwnDocument(
      user,
      'real',
      { ...metadata, expiryDate: '2026-02-31' },
      selected,
      false,
      new globalThis.AbortController().signal,
    ),
  );
  assert.equal(calls.length, 1);
  handler = async () => globalThis.Response.json({ data: row });
  await assert.rejects(
    documents.uploadOwnDocument(
      user,
      'real',
      metadata,
      selected,
      false,
      new globalThis.AbortController().signal,
    ),
    /not confirmed/,
  );
});
