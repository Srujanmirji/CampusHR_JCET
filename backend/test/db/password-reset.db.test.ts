import bcrypt from 'bcrypt';
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestApp, password } from './helpers.js';
import { deliverResetMail } from '../../src/modules/auth/password-reset.service.js';
import type { ResetMail } from '../../src/modules/auth/password-reset.crypto.js';

const secret = 'test-only-reset-secret-with-at-least-32-characters';
const config = {
  PASSWORD_RESET_ENABLED: true,
  PASSWORD_RESET_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec',
  PASSWORD_RESET_SCRIPT_SECRET: secret,
  PASSWORD_RESET_DAILY_LIMIT: 80,
};
describe('password recovery (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>,
    employee: { id: string; token: string };
  const inbox: ResetMail[] = [];
  const post = async (path: string, body: unknown) => {
    const r = await fetch(t.base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  };
  const cooldown = () =>
    t.prisma.passwordResetThrottle.updateMany({
      data: { lastAttempt: new Date(0), count: 0 },
    });
  const requestCode = () =>
    post('/auth/password-reset/request', { email: 'resetfaculty@jcet.test' });
  const confirm = (id: string, code: string) =>
    post('/auth/password-reset/confirm', {
      challengeId: id,
      code,
      newPassword: 'NewTestPassword2026!',
    });
  before(async () => {
    t = await startTestApp({
      PASSWORD_RESET_ENABLED: 'true',
      PASSWORD_RESET_SCRIPT_URL: config.PASSWORD_RESET_SCRIPT_URL,
      PASSWORD_RESET_SCRIPT_SECRET: secret,
    });
    employee = await t.person({
      key: 'resetfaculty',
      role: 'Faculty',
      code: 'RESET-CSE-021',
      department: 'CSE',
    });
  });
  after(async () => {
    await t.stop();
  });

  test('known/unknown accounts have the same response; durable queue stores no plaintext and limits resends', async () => {
    const known = await requestCode();
    const unknown = await post('/auth/password-reset/request', {
      email: 'not-registered@jcet.test',
    });
    assert.equal(known.status, 202);
    assert.equal(unknown.status, 202);
    assert.deepEqual(Object.keys(known.body), Object.keys(unknown.body));
    assert.equal(known.body.message, unknown.body.message);
    assert.equal((await requestCode()).status, 429);
    assert.equal(
      await deliverResetMail(t.prisma, config, async (mail) => {
        inbox.push(mail);
      }),
      true,
    );
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].to, 'resetfaculty@jcet.test');
    const row = await t.prisma.passwordResetChallenge.findUniqueOrThrow({
      where: { id: known.body.challengeId },
    });
    assert.notEqual(row.otpHash, inbox[0].otp);
    assert.equal(row.encryptedMail, null);
    assert.ok(row.deliveredAt);
    assert.equal(
      (await confirm(unknown.body.challengeId, '000000')).status,
      400,
    );
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await confirm(
            known.body.challengeId,
            inbox[0].otp === '000000' ? '111111' : '000000',
          )
        ).status,
        400,
      );
    assert.equal(
      (await confirm(known.body.challengeId, inbox[0].otp)).status,
      400,
      'Guessing limit cannot be bypassed with a later correct code',
    );
  });
  test('one-use atomic reset works for website and native login, and revokes old access/refresh sessions', async () => {
    await cooldown();
    const native = await post('/auth/native/login', {
      identifier: 'resetfaculty@jcet.test',
      password,
    });
    assert.equal(native.status, 200);
    const oldSnapshot = await t.prisma.user.findUniqueOrThrow({
      where: { email: 'resetfaculty@jcet.test' },
    });
    const issued = await requestCode();
    await deliverResetMail(t.prisma, config, async (mail) => {
      inbox.push(mail);
    });
    const code = inbox.at(-1)!.otp;
    const completed = await Promise.all([
      confirm(issued.body.challengeId, code),
      confirm(issued.body.challengeId, code),
    ]);
    assert.deepEqual(completed.map((r) => r.status).sort(), [200, 400]);
    for (const token of [employee.token, native.body.accessToken]) {
      const r = await fetch(t.base + '/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(r.status, 401);
    }
    assert.equal(
      (
        await post('/auth/native/refresh', {
          refreshToken: native.body.refreshToken,
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await post('/auth/login', {
          identifier: 'resetfaculty@jcet.test',
          password,
        })
      ).status,
      401,
    );
    for (const route of ['/auth/login', '/auth/native/login']) {
      const signed = await post(route, {
        identifier: 'resetfaculty@jcet.test',
        password: 'NewTestPassword2026!',
      });
      assert.equal(signed.status, 200);
      assert.equal(signed.body.user.email, 'resetfaculty@jcet.test');
    }
    await assert.rejects(
      createPrismaAuthRepository(t.prisma).changePassword(
        oldSnapshot.id,
        await bcrypt.hash('attacker-selected-password-2026', 4),
        null,
        new Date(),
        {
          passwordHash: oldSnapshot.passwordHash,
          authVersion: oldSnapshot.authVersion,
        },
      ),
      /password changed|Sign in again/i,
    );
    assert.equal(
      (
        await post('/auth/login', {
          identifier: 'resetfaculty@jcet.test',
          password: 'NewTestPassword2026!',
        })
      ).status,
      200,
      'An in-flight old-credential write cannot overwrite recovery',
    );
    const user = await t.prisma.user.findUniqueOrThrow({
      where: { email: 'resetfaculty@jcet.test' },
    });
    assert.equal(user.authVersion, 1);
    assert.equal(
      await t.prisma.auditLog.count({
        where: { action: 'user.password_reset', actorUserId: user.id },
      }),
      1,
    );
  });
  test('a pending challenge cannot overwrite a later authenticated password change', async () => {
    await cooldown();
    const requested = await requestCode();
    await deliverResetMail(t.prisma, config, async (mail) => {
      inbox.push(mail);
    });
    const signed = await post('/auth/native/login', {
      identifier: 'resetfaculty@jcet.test',
      password: 'NewTestPassword2026!',
    });
    assert.equal(signed.status, 200);
    const response = await fetch(t.base + '/auth/native/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signed.body.accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'NewTestPassword2026!',
        newPassword: 'NewerTestPassword2026!',
        refreshToken: signed.body.refreshToken,
      }),
    });
    assert.equal(response.status, 204);
    assert.equal(
      (await confirm(requested.body.challengeId, inbox.at(-1)!.otp)).status,
      400,
    );
  });
  test('delivery leases prevent duplicate claims; encrypted mail survives a failed attempt', async () => {
    await cooldown();
    const issued = await requestCode();
    const attempts: ResetMail[] = [];
    const results = await Promise.all(
      [1, 2].map(() =>
        deliverResetMail(t.prisma, config, async (mail) => {
          attempts.push(mail);
          await new Promise((resolve) => setTimeout(resolve, 20));
          throw new Error('Provider unavailable');
        }),
      ),
    );
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(attempts.length, 1);
    const pending = await t.prisma.passwordResetChallenge.findUniqueOrThrow({
      where: { id: issued.body.challengeId },
    });
    assert.ok(pending.encryptedMail);
    assert.equal(pending.deliveryAttempts, 1);
    await t.prisma.passwordResetChallenge.update({
      where: { id: pending.id },
      data: { nextDeliveryAt: new Date(0) },
    });
    await deliverResetMail(t.prisma, config, async (mail) => {
      assert.deepEqual(mail, attempts[0]);
    });
    const delivered = await t.prisma.passwordResetChallenge.findUniqueOrThrow({
      where: { id: pending.id },
    });
    assert.equal(delivered.encryptedMail, null);
    assert.ok(delivered.deliveredAt);
  });
  test('expired challenges and deactivated users cannot change passwords', async () => {
    await cooldown();
    const request = await requestCode();
    await deliverResetMail(t.prisma, config, async (mail) => {
      inbox.push(mail);
    });
    await t.prisma.passwordResetChallenge.update({
      where: { id: request.body.challengeId },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(
      (await confirm(request.body.challengeId, inbox.at(-1)!.otp)).status,
      400,
    );
    await cooldown();
    const active = await requestCode();
    await deliverResetMail(t.prisma, config, async (mail) => {
      inbox.push(mail);
    });
    await t.prisma.user.update({
      where: { email: 'resetfaculty@jcet.test' },
      data: { status: 'INACTIVE' },
    });
    assert.equal(
      (await confirm(active.body.challengeId, inbox.at(-1)!.otp)).status,
      400,
    );
  });
  test('weak new passwords are rejected before consuming the OTP; a compliant password succeeds', async () => {
    await cooldown();
    const person = await t.person({
      key: 'policyperson',
      role: 'Faculty',
      code: 'POLICY-CSE-021',
      department: 'CSE',
    });
    const requested = await post('/auth/password-reset/request', {
      email: 'policyperson@jcet.test',
    });
    assert.equal(requested.status, 202);
    let mail: ResetMail | undefined;
    await deliverResetMail(t.prisma, config, async (message) => {
      mail = message;
    });
    assert.ok(mail);
    for (const newPassword of [
      'alllowercase123!',
      'ALLUPPERCASE123!',
      'NoDigitsHere!!',
      'NoSymbolsHere123',
    ]) {
      const rejected = await post('/auth/password-reset/confirm', {
        challengeId: requested.body.challengeId,
        code: mail.otp,
        newPassword,
      });
      assert.equal(rejected.status, 400);
      assert.equal(rejected.body.error.code, 'VALIDATION_ERROR');
    }
    const row = await t.prisma.passwordResetChallenge.findUniqueOrThrow({
      where: { id: requested.body.challengeId },
    });
    assert.equal(row.attempts, 0);
    assert.equal(row.consumedAt, null);
    assert.equal(
      (
        await post('/auth/password-reset/confirm', {
          challengeId: requested.body.challengeId,
          code: mail.otp,
          newPassword: 'PolicyReady42!',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post('/auth/native/login', {
          identifier: 'policyperson@jcet.test',
          password: 'PolicyReady42!',
        })
      ).status,
      200,
    );
    assert.ok(person.id);
  });
});
