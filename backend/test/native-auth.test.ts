import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, test } from 'node:test';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';
import { envSchema } from '../src/config/env.js';
import { defaultGrants } from '../src/modules/auth/permissions.js';
import { createMemoryAuthRepository, unusedPrisma } from './fakes.js';

const password = 'native-contract-test-password';
const nextPassword = 'NativeReplacement42!';
const env = envSchema.parse({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost/campushr_test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  CORS_ORIGIN: 'http://localhost:5173',
});
interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; permissions: string[] };
}

describe('native auth transport', () => {
  let server: Server;
  let base: string;
  let memory: ReturnType<typeof createMemoryAuthRepository>;
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    memory = createMemoryAuthRepository(
      ['first', 'second'].map((key, index) => ({
        id:
          index === 0
            ? '11111111-1111-4111-8111-111111111111'
            : '22222222-2222-4222-8222-222222222222',
        email: `${key}@jcet.test`,
        employeeCode: `JCET-CSE-00${index + 1}`,
        passwordHash,
        status: 'ACTIVE',
        role: 'Faculty',
        permissions: defaultGrants('Faculty'),
      })),
    );
    server = createApp(env, {
      authRepository: memory.repo,
      prisma: unusedPrisma,
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}/api/v1/auth`;
  });
  afterEach(() => {
    server.closeAllConnections();
    server.close();
  });

  const post = (
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const login = async (identifier = 'first@jcet.test') => {
    const response = await post('/native/login', {
      identifier,
      password,
      remember: true,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.headers.getSetCookie(), []);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return (await response.json()) as Session;
  };

  test('native JSON contains a rotating credential; browser JSON never does', async () => {
    const session = await login('jcet-cse-001');
    assert.match(session.refreshToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(session.expiresIn, 900);
    assert.deepEqual(session.user.permissions, defaultGrants('Faculty'));
    assert.equal(
      memory.sessions[0]!.tokenHash,
      createHash('sha256').update(session.refreshToken).digest('hex'),
    );
    const web = await post('/login', {
      identifier: 'first@jcet.test',
      password,
    });
    assert.equal(web.status, 200);
    assert.equal((await web.json()).refreshToken, undefined);
    assert.match(web.headers.getSetCookie()[0]!, /HttpOnly.*SameSite=Strict/);
    const bodyOnly = await post('/refresh', {
      refreshToken: session.refreshToken,
    });
    assert.equal(
      bodyOnly.status,
      401,
      'browser refresh never reads JSON credentials',
    );
  });

  test('a new cookie-free client can rotate, detect duplicates and revoke the saved credential', async () => {
    const session = await login();
    // A separate request carries only the saved credential, as after app restart.
    const rotated = await post('/native/refresh', {
      refreshToken: session.refreshToken,
    });
    assert.equal(rotated.status, 200);
    const current = (await rotated.json()) as Session;
    assert.notEqual(current.refreshToken, session.refreshToken);
    assert.deepEqual(rotated.headers.getSetCookie(), []);
    const duplicate = await post('/native/refresh', {
      refreshToken: session.refreshToken,
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).error.code, 'REFRESH_IN_PROGRESS');
    assert.deepEqual(duplicate.headers.getSetCookie(), []);
    assert.equal(
      (await post('/native/logout', { refreshToken: current.refreshToken }))
        .status,
      204,
    );
    const expired = await post('/native/refresh', {
      refreshToken: current.refreshToken,
    });
    assert.equal(expired.status, 401);
    assert.deepEqual(expired.headers.getSetCookie(), []);
    assert.equal(expired.headers.get('cache-control'), 'no-store');
    assert.equal(
      (await post('/native/logout', { refreshToken: current.refreshToken }))
        .status,
      204,
    );
  });

  test('native routes reject browser origins and cookies before using credentials', async () => {
    const session = await login();
    const count = memory.sessions.length;
    const browserHeaders: Record<string, string>[] = [
      { Origin: env.CORS_ORIGIN },
      { Origin: 'https://evil.jcet.test' },
      { Origin: 'null' },
      { Cookie: `campushr_refresh=${session.refreshToken}` },
    ];
    for (const path of [
      '/native/login',
      '/native/refresh',
      '/native/logout',
      '/native/password',
    ]) {
      for (const headers of browserHeaders) {
        const response = await post(
          path,
          { refreshToken: session.refreshToken },
          headers,
        );
        assert.equal(response.status, 403);
        assert.equal(
          (await response.json()).error.code,
          'NATIVE_CLIENT_REQUIRED',
        );
        assert.deepEqual(response.headers.getSetCookie(), []);
      }
    }
    assert.equal(memory.sessions.length, count);
    assert.equal(
      (await post('/native/refresh', { refreshToken: session.refreshToken }))
        .status,
      200,
      'rejected requests did not rotate or revoke the session',
    );
  });

  test('native session bodies validate strictly and ignore credentials in a URL or access header', async () => {
    const session = await login();
    for (const path of ['/native/refresh', '/native/logout']) {
      for (const body of [
        undefined,
        {},
        { refreshToken: '' },
        { refreshToken: 123 },
        { refreshToken: 'x'.repeat(44) },
        { refreshToken: session.refreshToken, extra: true },
      ]) {
        const response = await post(path, body);
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
        assert.deepEqual(response.headers.getSetCookie(), []);
      }
      assert.equal(
        (
          await post(
            `${path}?refreshToken=${session.refreshToken}`,
            {},
            { Authorization: `Bearer ${session.accessToken}` },
          )
        ).status,
        400,
      );
    }
    assert.equal(
      (await post('/native/refresh', { refreshToken: 'x'.repeat(43) })).status,
      401,
    );
  });

  test('switching native and web login routes cannot bypass failed-attempt limits', async () => {
    for (let index = 0; index < 5; index++) {
      const response = await post(index % 2 ? '/login' : '/native/login', {
        identifier: 'first@jcet.test',
        password: 'incorrect',
      });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.code, 'INVALID_CREDENTIALS');
    }
    for (const path of ['/login', '/native/login']) {
      const blocked = await post(path, {
        identifier: 'first@jcet.test',
        password,
      });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.headers.get('retry-after'), '900');
    }
  });

  test('native password change preserves its session, ends the others and does not affect another user', async () => {
    const current = await login();
    const otherPhone = await login();
    const otherUser = await login('second@jcet.test');
    const web = await post('/login', {
      identifier: 'first@jcet.test',
      password,
    });
    const cookie = web.headers.getSetCookie()[0]!.split(';')[0]!;
    const authHeader = { Authorization: `Bearer ${current.accessToken}` };
    const body = {
      currentPassword: password,
      newPassword: nextPassword,
      refreshToken: current.refreshToken,
    };
    assert.equal((await post('/native/password', body)).status, 401);
    assert.equal(
      (await post('/native/password', { ...body, extra: true }, authHeader))
        .status,
      400,
    );
    assert.equal(
      (
        await post(
          '/native/password',
          { ...body, currentPassword: 'wrong' },
          authHeader,
        )
      ).status,
      400,
    );
    const changed = await post('/native/password', body, authHeader);
    assert.equal(changed.status, 204);
    assert.deepEqual(changed.headers.getSetCookie(), []);
    assert.equal(
      (await post('/native/refresh', { refreshToken: otherPhone.refreshToken }))
        .status,
      401,
    );
    assert.equal(
      (await post('/refresh', undefined, { Cookie: cookie })).status,
      401,
    );
    assert.equal(
      (await post('/native/refresh', { refreshToken: current.refreshToken }))
        .status,
      200,
    );
    assert.equal(
      (await post('/native/refresh', { refreshToken: otherUser.refreshToken }))
        .status,
      200,
    );
    assert.equal(
      (await post('/native/login', { identifier: 'first@jcet.test', password }))
        .status,
      401,
    );
    assert.equal(
      (
        await post('/native/login', {
          identifier: 'first@jcet.test',
          password: nextPassword,
        })
      ).status,
      200,
    );
  });

  test('wrong-current-password budgets are also shared across transports', async () => {
    const session = await login();
    const headers = { Authorization: `Bearer ${session.accessToken}` };
    for (let index = 0; index < 5; index++) {
      const native = index % 2 === 0;
      const response = await post(
        native ? '/native/password' : '/password',
        {
          currentPassword: 'incorrect',
          newPassword: nextPassword,
          ...(native ? { refreshToken: session.refreshToken } : {}),
        },
        headers,
      );
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'WRONG_PASSWORD');
    }
    for (const path of ['/native/password', '/password']) {
      assert.equal(
        (
          await post(
            path,
            {
              currentPassword: password,
              newPassword: nextPassword,
              ...(path.includes('/native/')
                ? { refreshToken: session.refreshToken }
                : {}),
            },
            headers,
          )
        ).status,
        429,
      );
    }
  });
});
