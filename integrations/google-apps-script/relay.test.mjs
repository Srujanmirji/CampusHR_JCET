import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { URL } from 'node:url';
import { test } from 'node:test';

const secret = 'test-only-mail-signing-secret-with-at-least-32-characters';
const now = Date.parse('2026-11-01T15:00:00Z');
const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
function fixture(options = {}) {
  const values = new Map(
    Object.entries({ CAMPUSHR_MAIL_SECRET: secret, ...options.properties }),
  );
  const messages = [];
  let attempts = 0,
    released = 0;
  const context = vm.createContext({
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => values.get(key) ?? null,
        setProperty: (key, value) => values.set(key, value),
        deleteProperty: (key) => values.delete(key),
        getProperties: () => Object.fromEntries(values),
      }),
    },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      computeHmacSha256Signature: (value, key) =>
        [...createHmac('sha256', key).update(value).digest()].map((b) =>
          b > 127 ? b - 256 : b,
        ),
      formatDate: (date) => date.toISOString(),
    },
    MailApp: {
      getRemainingDailyQuota: () => options.quota ?? 100,
      sendEmail: (message) => {
        attempts++;
        if (options.failSend)
          throw new Error('Provider acknowledgement unavailable');
        messages.push(message);
      },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => !options.busy,
        releaseLock: () => released++,
      }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        text,
        setMimeType() {
          return this;
        },
      }),
    },
  });
  vm.runInContext(source, context);
  function send(patch = {}, envelopePatch = {}) {
    const payload = JSON.stringify({
      action: 'password-reset',
      requestId: '11111111-1111-4111-8111-111111111111',
      to: 'asha@example.edu',
      otp: '034219',
      issuedAt: now,
      expiresAt: now + 600000,
      ...patch,
    });
    const signature = createHmac('sha256', secret)
      .update('campushr-mail-v1\n' + payload)
      .digest('hex');
    const contents = JSON.stringify({ payload, signature, ...envelopePatch });
    const output = context.doPost({
      postData: { contents, length: contents.length },
    });
    assert.ok(
      !output.text.includes('034219'),
      'Responses never return the OTP',
    );
    assert.ok(!output.text.includes(secret));
    return JSON.parse(output.text);
  }
  return {
    send,
    values,
    messages,
    context,
    get attempts() {
      return attempts;
    },
    get released() {
      return released;
    },
  };
}

test('signed requests send a fixed-format email once; matching retries are idempotent', () => {
  const f = fixture();
  assert.equal(f.send().ok, true);
  assert.equal(f.send().ok, true);
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].to, 'asha@example.edu');
  assert.equal(f.messages[0].subject, 'Your CampusHR password reset code');
  assert.ok(f.messages[0].body.includes('034219'));
  assert.equal(f.released, 2);
  for (const [key, value] of f.values)
    if (key.startsWith('mail:')) {
      const record = JSON.parse(value);
      assert.deepEqual(Object.keys(record).sort(), ['at', 'digest', 'status']);
    }
  assert.equal(f.send({ to: 'other@example.edu' }).error, 'REQUEST_ID_REUSED');
});

test('missing secrets, bad signatures and tampered envelopes cannot send', () => {
  assert.equal(
    fixture({ properties: { CAMPUSHR_MAIL_SECRET: '' } }).send().error,
    'NOT_CONFIGURED',
  );
  const f = fixture();
  assert.equal(f.send({}, { signature: '0'.repeat(64) }).error, 'UNAUTHORIZED');
  assert.equal(f.send({}, { payload: '{}' }).error, 'UNAUTHORIZED');
  assert.equal(f.attempts, 0);
});

test('expired, stale, malformed and multiple-recipient requests are rejected', () => {
  for (const patch of [
    { issuedAt: now - 120001 },
    { issuedAt: now + 120001 },
    { expiresAt: now },
    { expiresAt: now + 600001 },
    { otp: '12345' },
    { otp: 123456 },
    { to: 'a@example.edu,b@example.edu' },
    { to: 'a@example.edu\nBcc: b@example.edu' },
    { requestId: 'not-a-uuid' },
    { action: 'arbitrary-email' },
  ]) {
    const f = fixture();
    assert.equal(f.send(patch).ok, false);
    assert.equal(f.attempts, 0);
  }
});

test('domain policy, daily cap and provider quota prevent sends', () => {
  assert.equal(
    fixture({ properties: { CAMPUSHR_ALLOWED_DOMAIN: 'college.edu' } }).send()
      .error,
    'RECIPIENT_NOT_ALLOWED',
  );
  assert.equal(fixture({ quota: 0 }).send().error, 'MAIL_LIMIT_REACHED');
  const f = fixture({ properties: { CAMPUSHR_DAILY_LIMIT: '1' } });
  assert.equal(f.send().ok, true);
  assert.equal(
    f.send({ requestId: '22222222-2222-4222-8222-222222222222' }).error,
    'MAIL_LIMIT_REACHED',
  );
  assert.equal(f.attempts, 1);
});

test('ambiguous provider failures are not resent and do not claim delivery', () => {
  const f = fixture({ failSend: true });
  assert.equal(f.send().error, 'DELIVERY_UNCONFIRMED');
  assert.equal(f.send().error, 'DELIVERY_UNCONFIRMED');
  assert.equal(f.attempts, 1);
  assert.equal(f.released, 2);
});

test('busy, malformed and oversized requests fail without sending', () => {
  assert.equal(fixture({ busy: true }).send().error, 'BUSY');
  const f = fixture();
  for (const contents of ['{', 'null', 'x'.repeat(8193)]) {
    assert.equal(
      JSON.parse(
        f.context.doPost({ postData: { contents, length: contents.length } })
          .text,
      ).ok,
      false,
    );
  }
  assert.equal(f.attempts, 0);
  assert.deepEqual(JSON.parse(f.context.doGet().text), {
    ok: true,
    service: 'CampusHR OTP mail relay',
  });
  assert.equal(f.context.authorizeMailService(), 100);
});
