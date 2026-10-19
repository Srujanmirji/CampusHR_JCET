import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';
import { envSchema } from '../src/config/env.js';
import {
  createAuthService,
  REFRESH_TOKEN_TTL_MS,
} from '../src/modules/auth/auth.service.js';
import { defaultGrants } from '../src/modules/auth/permissions.js';
import { createMemoryAuthRepository, unusedPrisma } from './fakes.js';

const password = 'correct horse battery';
const env = envSchema.parse({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost/campushr_test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  CORS_ORIGIN: 'http://localhost:5173',
});

describe('auth API', () => {
  let server: Server;
  let url: string;
  let sessions: ReturnType<typeof createMemoryAuthRepository>['sessions'];

  before(async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    const memory = createMemoryAuthRepository([
      {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'hod@jcet.test',
        passwordHash,
        status: 'ACTIVE',
        role: 'HOD',
        permissions: defaultGrants('HOD'),
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'former@jcet.test',
        passwordHash,
        status: 'INACTIVE',
        role: 'Faculty',
        permissions: defaultGrants('Faculty'),
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        email: 'limit@jcet.test',
        passwordHash,
        status: 'ACTIVE',
        role: 'Faculty',
        permissions: defaultGrants('Faculty'),
      },
    ]);
    sessions = memory.sessions;
    server = createApp(env, {
      authRepository: memory.repo,
      prisma: unusedPrisma,
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    url = `http://127.0.0.1:${address.port}/api/v1/auth`;
  });

  after(() => server.close());

  const post = (path: string, body?: unknown, cookie?: string) =>
    fetch(`${url}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const login = (identifier: string, pass = password) =>
    post('/login', { identifier, password: pass });
  const refreshCookie = (response: Response) => {
    const header = response.headers
      .getSetCookie()
      .find((value) => value.startsWith('campushr_refresh='));
    assert.ok(header, 'refresh cookie must be set');
    return { header, pair: header.split(';')[0]! };
  };
  const errorCode = async (response: Response) =>
    ((await response.json()) as { error: { code: string } }).error.code;

  test('login returns an access token and an HttpOnly refresh cookie', async () => {
    const response = await login('HOD@jcet.test');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(typeof body.accessToken, 'string');
    assert.equal(body.expiresIn, 900);
    assert.equal(
      body.refreshToken,
      undefined,
      'refresh token stays in the cookie',
    );
    assert.deepEqual(body.user, {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'hod@jcet.test',
      role: 'HOD',
      permissions: defaultGrants('HOD'),
      employeeId: null,
      departmentId: null,
    });
    const { header } = refreshCookie(response);
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Strict/);
    assert.match(header, /Path=\/api\/v1\/auth/);
  });

  test('Remember me decides whether the cookie outlives the browser', async () => {
    const browserOnly = refreshCookie(await login('hod@jcet.test'));
    assert.doesNotMatch(browserOnly.header, /Max-Age/);
    const rotated = refreshCookie(
      await post('/refresh', undefined, browserOnly.pair),
    );
    assert.doesNotMatch(rotated.header, /Max-Age/, 'kept across rotation');

    const remembered = refreshCookie(
      await post('/login', {
        identifier: 'hod@jcet.test',
        password,
        remember: true,
      }),
    );
    assert.match(remembered.header, /Max-Age=604800/);
    const rotatedRemembered = refreshCookie(
      await post('/refresh', undefined, remembered.pair),
    );
    assert.match(rotatedRemembered.header, /Max-Age=604800/);
  });

  test('wrong password, unknown email and deactivated account look the same', async () => {
    for (const response of [
      await login('hod@jcet.test', 'wrong password'),
      await login('nobody@jcet.test'),
      await login('former@jcet.test'),
    ]) {
      assert.equal(response.status, 401);
      assert.equal(await errorCode(response), 'INVALID_CREDENTIALS');
    }
  });

  test('invalid input is rejected', async () => {
    const response = await post('/login', { identifier: 'hod@jcet.test' });
    assert.equal(response.status, 400);
    assert.equal(await errorCode(response), 'VALIDATION_ERROR');
  });

  test('/me requires a valid access token', async () => {
    const { accessToken } = (await (await login('hod@jcet.test')).json()) as {
      accessToken: string;
    };
    const me = await fetch(`${url}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(me.status, 200);
    assert.equal(
      ((await me.json()) as { user: { email: string } }).user.email,
      'hod@jcet.test',
    );
    const missing = await fetch(`${url}/me`);
    assert.equal(missing.status, 401);
    assert.equal(await errorCode(missing), 'UNAUTHENTICATED');
    const tampered = await fetch(`${url}/me`, {
      headers: { Authorization: `Bearer ${accessToken.slice(0, -2)}xx` },
    });
    assert.equal(tampered.status, 401);
  });

  test('refresh rotates the token; a concurrent duplicate keeps the new one', async () => {
    const first = refreshCookie(await login('hod@jcet.test')).pair;
    const rotated = await post('/refresh', undefined, first);
    assert.equal(rotated.status, 200);
    const second = refreshCookie(rotated).pair;
    assert.notEqual(second, first);

    const duplicate = await post('/refresh', undefined, first);
    assert.equal(duplicate.status, 409);
    assert.equal(await errorCode(duplicate), 'REFRESH_IN_PROGRESS');
    assert.deepEqual(
      duplicate.headers.getSetCookie(),
      [],
      'the newer cookie is not cleared',
    );
    assert.equal((await post('/refresh', undefined, second)).status, 200);
  });

  test('refresh and logout reject other browser origins', async () => {
    const cookie = refreshCookie(await login('hod@jcet.test')).pair;
    for (const path of ['/refresh', '/logout']) {
      const response = await fetch(`${url}${path}`, {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'https://evil.jcethbl.edu.in' },
      });
      assert.equal(response.status, 403);
      assert.equal(await errorCode(response), 'FORBIDDEN_ORIGIN');
    }
    const sameOrigin = await fetch(`${url}/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: 'http://localhost:5173' },
    });
    assert.equal(sameOrigin.status, 200);
  });

  test('a malformed cookie is treated as no cookie', async () => {
    const response = await post(
      '/logout',
      undefined,
      'campushr_refresh=%E0%A4%A',
    );
    assert.equal(response.status, 204);
    assert.equal(
      (await post('/refresh', undefined, 'campushr_refresh=%E0%A4%A')).status,
      401,
    );
  });

  test('logout revokes the session and clears the cookie', async () => {
    const cookie = refreshCookie(await login('hod@jcet.test')).pair;
    const logout = await post('/logout', undefined, cookie);
    assert.equal(logout.status, 204);
    assert.match(refreshCookie(logout).header, /Expires=Thu, 01 Jan 1970/);
    assert.equal((await post('/refresh', undefined, cookie)).status, 401);
    assert.equal((await post('/logout')).status, 204, 'logout is idempotent');
  });

  test('five failed attempts block the account for this client', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      assert.equal((await login('limit@jcet.test', 'wrong')).status, 401);
    }
    const blocked = await login('limit@jcet.test');
    assert.equal(blocked.status, 429);
    assert.equal(await errorCode(blocked), 'TOO_MANY_ATTEMPTS');
    assert.equal(blocked.headers.get('retry-after'), '900');
    assert.equal(
      (await login('hod@jcet.test')).status,
      200,
      'other accounts unaffected',
    );
  });

  test('parallel guesses are limited too', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => login('burst@jcet.test', 'guess')),
    );
    const statuses = responses.map((response) => response.status).sort();
    assert.deepEqual(
      statuses,
      [401, 401, 401, 401, 401, 429, 429, 429, 429, 429],
    );
  });

  test('sessions store only a token hash', () => {
    assert.ok(sessions.length > 0);
    for (const session of sessions)
      assert.match(session.tokenHash, /^[0-9a-f]{64}$/);
  });
});

test('refresh fails once the session has expired', async () => {
  const passwordHash = await bcrypt.hash(password, 4);
  const { repo } = createMemoryAuthRepository([
    {
      id: 'u1',
      email: 'a@jcet.test',
      passwordHash,
      status: 'ACTIVE',
      role: 'HOD',
      permissions: defaultGrants('HOD'),
    },
  ]);
  let clock = new Date('2026-10-13T09:00:00Z');
  const auth = createAuthService(repo, env.JWT_ACCESS_SECRET, () => clock);
  const { refreshToken } = await auth.login('a@jcet.test', password, {});
  clock = new Date(clock.getTime() + REFRESH_TOKEN_TTL_MS + 1);
  await assert.rejects(auth.refresh(refreshToken, {}), {
    code: 'SESSION_EXPIRED',
  });
});

test('replaying a rotated token after the grace period ends every session', async () => {
  const passwordHash = await bcrypt.hash(password, 4);
  const { repo } = createMemoryAuthRepository([
    {
      id: 'u1',
      email: 'a@jcet.test',
      passwordHash,
      status: 'ACTIVE',
      role: 'HOD',
      permissions: defaultGrants('HOD'),
    },
  ]);
  let clock = new Date('2026-10-13T09:00:00Z');
  const auth = createAuthService(repo, env.JWT_ACCESS_SECRET, () => clock);
  const stolen = (await auth.login('a@jcet.test', password, {})).refreshToken;
  const current = (await auth.refresh(stolen, {})).refreshToken;
  clock = new Date(clock.getTime() + 60_000);
  await assert.rejects(auth.refresh(stolen, {}), { code: 'SESSION_EXPIRED' });
  await assert.rejects(auth.refresh(current, {}), { code: 'SESSION_EXPIRED' });
});

test('changing your password keeps this session and ends the others', async () => {
  const passwordHash = await bcrypt.hash(password, 4);
  const { repo, sessions } = createMemoryAuthRepository([
    {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'c@jcet.test',
      passwordHash,
      status: 'ACTIVE',
      role: 'Faculty',
      permissions: defaultGrants('Faculty'),
    },
  ]);
  const auth = createAuthService(repo, env.JWT_ACCESS_SECRET);
  const here = await auth.login('c@jcet.test', password, {});
  const phone = await auth.login('c@jcet.test', password, {});
  const userId = here.user.id;

  await assert.rejects(
    auth.changePassword(
      userId,
      'not-my-password',
      'brand-new-password-1',
      here.refreshToken,
    ),
    { code: 'WRONG_PASSWORD' },
  );
  await assert.rejects(
    auth.changePassword(userId, password, password, here.refreshToken),
    { code: 'SAME_PASSWORD' },
  );
  await auth.changePassword(
    userId,
    password,
    'brand-new-password-1',
    here.refreshToken,
  );

  await assert.rejects(auth.login('c@jcet.test', password, {}), {
    code: 'INVALID_CREDENTIALS',
  });
  assert.ok(await auth.login('c@jcet.test', 'brand-new-password-1', {}));
  assert.ok(await auth.refresh(here.refreshToken, {}), 'this session stays');
  await assert.rejects(auth.refresh(phone.refreshToken, {}), {
    code: 'SESSION_EXPIRED',
  });
  assert.ok(sessions.length >= 3);
});
