import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  sealResetMail,
  openResetMail,
  otpDigest,
  passwordStamp,
} from '../src/modules/auth/password-reset.crypto.js';
import { sendResetMail } from '../src/modules/auth/password-reset.mail.js';

const secret = 'test-only-reset-secret-at-least-32-characters';
const payload = {
  action: 'password-reset' as const,
  requestId: '11111111-1111-4111-8111-111111111111',
  to: 'faculty@example.edu',
  otp: '034219',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 600000,
};
test('queued reset emails are encrypted and authenticated, digests are challenge-bound', () => {
  const sealed = sealResetMail(payload, secret);
  assert.ok(!sealed.includes(payload.otp) && !sealed.includes(payload.to));
  assert.deepEqual(openResetMail(sealed, secret), payload);
  assert.throws(() =>
    openResetMail(sealed, 'another-secret-which-cannot-decrypt'),
  );
  assert.notEqual(
    otpDigest(payload.requestId, payload.otp, secret),
    otpDigest('another-id', payload.otp, secret),
  );
  assert.notEqual(
    passwordStamp('old-password-hash'),
    passwordStamp('new-password-hash'),
  );
});
test('Google relay signs the exact payload, rejects false acknowledgements and login pages', async () => {
  const url = 'https://script.google.com/macros/s/test-deployment/exec';
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), url);
      const envelope = JSON.parse(String(init?.body));
      assert.equal(
        envelope.signature,
        createHmac('sha256', secret)
          .update('campushr-mail-v1\n' + envelope.payload)
          .digest('hex'),
      );
      assert.deepEqual(JSON.parse(envelope.payload), payload);
      return Response.json({ ok: true, requestId: payload.requestId });
    };
    await sendResetMail(url, secret, payload);
    for (const response of [
      Response.json({ ok: false, error: 'UNAUTHORIZED' }),
      Response.json({ ok: true, requestId: 'wrong' }),
      new Response('<html>Sign in</html>'),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(
        sendResetMail(url, secret, payload),
        /could not be confirmed/,
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});
