// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { password, startTestApp } from './helpers.js';

describe('own password change (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  let userId: string;

  /** Signs in like a browser: access token plus the refresh cookie. */
  const signIn = async (secret: string) => {
    const response = await fetch(`${t.base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'PW-CSE-021', password: secret }),
    });
    const body = (await response.json()) as { accessToken?: string };
    const cookie = response.headers.get('set-cookie')?.split(';')[0] ?? '';
    return { status: response.status, token: body.accessToken, cookie };
  };
  const change = (
    session: { token?: string; cookie: string },
    body: Record<string, unknown>,
  ) =>
    fetch(`${t.base}/auth/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
        Cookie: session.cookie,
      },
      body: JSON.stringify(body),
    });
  const refresh = (cookie: string) =>
    fetch(`${t.base}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

  before(async () => {
    t = await startTestApp();
    const employeeId = (
      await t.person({
        key: 'pwfac',
        role: 'Faculty',
        code: 'PW-CSE-021',
        department: 'CSE',
      })
    ).id;
    userId = (await t.prisma.user.findUniqueOrThrow({ where: { employeeId } }))
      .id;
  });
  after(() => t.stop());

  test('the current password is checked and the new one validated', async () => {
    const here = await signIn(password);
    assert.equal(
      (
        await change(
          { cookie: '' },
          { currentPassword: password, newPassword: 'x'.repeat(12) },
        )
      ).status,
      401,
    );
    const wrong = await change(here, {
      currentPassword: 'not-the-password',
      newPassword: 'brand-new-password-1',
    });
    assert.equal(wrong.status, 400);
    assert.equal(
      ((await wrong.json()) as { error: { code: string } }).error.code,
      'WRONG_PASSWORD',
    );
    const short = await change(here, {
      currentPassword: password,
      newPassword: 'short',
    });
    assert.equal(short.status, 400);
  });

  test('a change keeps this browser signed in and signs out the others', async () => {
    const here = await signIn(password);
    const laptop = await signIn(password);
    const done = await change(here, {
      currentPassword: password,
      newPassword: 'brand-new-password-1',
    });
    assert.equal(done.status, 204);
    assert.equal(
      (await refresh(here.cookie)).status,
      200,
      'this browser stays',
    );
    assert.equal(
      (await refresh(laptop.cookie)).status,
      401,
      'others are signed out',
    );
    assert.equal((await signIn(password)).status, 401);
    assert.equal((await signIn('brand-new-password-1')).status, 200);
    const audit = await t.prisma.auditLog.findFirst({
      where: { action: 'user.password_change', resourceId: userId },
    });
    assert.equal(audit?.actorUserId, userId);
    assert.ok(!JSON.stringify(audit?.afterJson).includes('passwordHash'));
  });
});
