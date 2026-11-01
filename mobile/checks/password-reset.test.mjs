import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
mock.module('../lib/api-config.ts', {
  exports: { API_BASE_URL: 'https://staging.example.test/api/v1' },
});
const api = await import('../lib/password-reset-api.ts');
test('recovery uses shared API without credentials and requires explicit confirmation', async () => {
  const original = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return globalThis.Response.json({ enabled: true });
    };
    assert.deepEqual(await api.passwordResetOptions(), { enabled: true });
    assert.equal(
      calls[0].url,
      'https://staging.example.test/api/v1/auth/password-reset/options',
    );
    assert.equal(calls[0].init.credentials, 'omit');
    assert.equal(calls[0].init.headers.Authorization, undefined);
    globalThis.fetch = async () => globalThis.Response.json({ message: 'ok' });
    await assert.rejects(
      api.confirmPasswordReset({
        challengeId: 'test',
        code: '123456',
        newPassword: 'test-password',
      }),
      /unexpected response/,
    );
    globalThis.fetch = async () =>
      globalThis.Response.json({ passwordUpdated: true, message: 'Updated' });
    assert.equal(
      (
        await api.confirmPasswordReset({
          challengeId: 'test',
          code: '123456',
          newPassword: 'test-password',
        })
      ).passwordUpdated,
      true,
    );
    globalThis.fetch = async () =>
      globalThis.Response.json(
        { error: { message: 'Invalid or expired code' } },
        { status: 400 },
      );
    await assert.rejects(
      api.confirmPasswordReset({
        challengeId: 'test',
        code: '000000',
        newPassword: 'test-password',
      }),
      /Invalid or expired/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
