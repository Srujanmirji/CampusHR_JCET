import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const realFetch = globalThis.fetch;
const platform = { OS: 'ios' };
const values = new Map();
let fail;
let writeGate;
let secureCalls;
const key = 'campushr.session.v1';
const api = 'https://api.test/api/v1';
mock.module('react-native', { exports: { Platform: platform } });
mock.module('../lib/api-config.ts', { exports: { API_BASE_URL: api } });
mock.module('expo-secure-store', {
  exports: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    async getItemAsync() {
      secureCalls++;
      if (fail === 'read') throw new Error('Keychain locked');
      return values.get(key) ?? null;
    },
    async setItemAsync(k, value, options) {
      secureCalls++;
      assert.equal(options.keychainAccessible, 6);
      if (writeGate) await writeGate.promise;
      if (fail === 'write') throw new Error('Storage full');
      values.set(k, value);
    },
    async deleteItemAsync(k) {
      secureCalls++;
      if (fail === 'delete') throw new Error('Keychain locked');
      values.delete(k);
    },
  },
});
let serial = 0;
const load = () => import(`../lib/session.ts?case=${++serial}`);
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'first@jcet.test',
  role: 'Faculty',
  permissions: ['leave.read.own'],
  employeeId: null,
  departmentId: null,
};
const payload = (suffix = 'a', extra = {}) => ({
  accessToken: `access-${suffix}`,
  expiresIn: 900,
  refreshToken: suffix.repeat(43),
  user,
  ...extra,
});
const json = (body, status = 200) => globalThis.Response.json(body, { status });
const ended = () =>
  json({ error: { code: 'SESSION_EXPIRED', message: 'Sign in again.' } }, 401);
const saved = (token = 'a'.repeat(43)) =>
  JSON.stringify({ apiUrl: api, refreshToken: token });
const login = (s) => s.signIn('first@jcet.test', 'test-only-password', true);
const tick = () => new Promise((resolve) => globalThis.setImmediate(resolve));
beforeEach(async () => {
  globalThis.fetch = realFetch;
  platform.OS = 'ios';
  fail = undefined;
  writeGate = undefined;
  const storage = await import('../lib/session-storage.ts');
  await storage.writeSavedSession(null);
  values.clear();
  secureCalls = 0;
  globalThis.__DEV__ = false;
});

test('remembered credentials rotate on restart; only refresh token and API identity are stored', async () => {
  const s = await load();
  mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.credentials, 'omit');
    assert.equal(init.headers.Cookie, undefined);
    if (url.endsWith('/native/login')) return json(payload());
    assert.ok(url.endsWith('/native/refresh'));
    assert.equal(JSON.parse(init.body).refreshToken, 'a'.repeat(43));
    return json(
      payload('b', {
        user: { ...user, permissions: ['leave.read.department'] },
      }),
    );
  });
  await login(s);
  assert.deepEqual(JSON.parse(values.get(key)), {
    apiUrl: api,
    refreshToken: 'a'.repeat(43),
  });
  assert.ok(!values.get(key).includes('access-'));
  assert.ok(!values.get(key).includes('password'));
  const restarted = await load();
  assert.equal(restarted.getSession().status, 'loading');
  await Promise.all([restarted.restoreSession(), restarted.restoreSession()]);
  assert.equal(restarted.getSession().status, 'signedIn');
  assert.equal(restarted.getSession().accessToken, 'access-b');
  assert.deepEqual(restarted.getSession().user.permissions, [
    'leave.read.department',
  ]);
  assert.equal(JSON.parse(values.get(key)).refreshToken, 'b'.repeat(43));
});

test('Remember me off clears an earlier saved credential and does not restore after restart', async () => {
  values.set(key, saved());
  const s = await load();
  const fetch = mock.method(globalThis, 'fetch', async () => json(payload()));
  await s.signIn('first@jcet.test', 'test-only-password', false);
  assert.equal(values.size, 0);
  assert.equal(s.getSession().status, 'signedIn');
  const restarted = await load();
  await restarted.restoreSession();
  assert.equal(restarted.getSession().status, 'signedOut');
  assert.equal(fetch.mock.callCount(), 1);
});

test('expired, rejected and offline restoration never publishes a saved user', async () => {
  for (const status of [401, 409, 500, 'offline']) {
    values.set(key, saved());
    const s = await load();
    const fetch = mock.method(globalThis, 'fetch', async () => {
      if (status === 'offline') throw new TypeError('Network request failed');
      return status === 401
        ? ended()
        : json({ error: { code: 'FAILED', message: 'Retry' } }, status);
    });
    await s.restoreSession();
    assert.equal(s.getSession().status, 'signedOut');
    assert.equal(s.getSession().user, null);
    assert.equal(s.getSession().accessToken, null);
    assert.ok(s.getSession().error);
    assert.equal(values.size, 0);
    assert.equal(
      fetch.mock.callCount(),
      1,
      'do not retry rotated or ambiguous credentials',
    );
    fetch.mock.restore();
  }
});

test('corrupt or different-server storage is discarded without sending its token', async () => {
  for (const stored of [
    'not json',
    JSON.stringify({
      apiUrl: 'https://different.test',
      refreshToken: 'a'.repeat(43),
    }),
  ]) {
    values.set(key, stored);
    const s = await load();
    const fetch = mock.method(globalThis, 'fetch', () => {
      throw new Error('Must not send stored credential');
    });
    await s.restoreSession();
    assert.equal(s.getSession().status, 'signedOut');
    assert.equal(values.size, 0);
    assert.equal(fetch.mock.callCount(), 0);
    fetch.mock.restore();
  }
});

test('secure storage failure prevents sign-in and revokes the newly issued session', async () => {
  const s = await load();
  fail = 'write';
  let revoked = false;
  mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/logout')) {
      revoked = JSON.parse(init.body).refreshToken === 'a'.repeat(43);
      return new globalThis.Response(null, { status: 204 });
    }
    return json(payload());
  });
  await assert.rejects(login(s), /save your session securely/);
  assert.equal(s.getSession().status, 'signedOut');
  assert.equal(values.size, 0);
  assert.equal(revoked, true);
});

test('inaccessible Keychain fails closed without a network request', async () => {
  fail = 'read';
  const s = await load();
  const fetch = mock.method(globalThis, 'fetch', () => {
    throw new Error('Unexpected request');
  });
  await s.restoreSession();
  assert.equal(s.getSession().status, 'signedOut');
  assert.ok(s.getSession().error);
  assert.equal(fetch.mock.callCount(), 0);
});

test('concurrent 401 responses share one renewal and each request is replayed only once', async () => {
  const s = await load();
  const gate = deferred();
  let renewals = 0;
  let requests = 0;
  mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/login')) return json(payload());
    if (url.endsWith('/refresh')) {
      renewals++;
      await gate.promise;
      return json(payload('b'));
    }
    requests++;
    const headers = new globalThis.Headers(init.headers);
    return headers.get('Authorization') === 'Bearer access-a'
      ? ended()
      : json({ data: 'ok' });
  });
  await login(s);
  const first = s.apiFetch('/timetable/periods');
  const second = s.apiFetch('/leave/types');
  await tick();
  assert.equal(renewals, 1);
  gate.resolve();
  const results = await Promise.all([first, second]);
  assert.ok(results.every((r) => r.ok));
  assert.equal(requests, 4);
  assert.equal(JSON.parse(values.get(key)).refreshToken, 'b'.repeat(43));
});

test('403 and server errors are not refresh loops or session-ending errors', async () => {
  const s = await load();
  let renewals = 0;
  let status = 403;
  mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/login')) return json(payload());
    if (url.endsWith('/refresh')) renewals++;
    return json({ error: { code: 'DENIED', message: 'Not allowed' } }, status);
  });
  await login(s);
  for (status of [403, 500])
    await assert.rejects(
      s.apiFetch('/leave/types'),
      (e) => e.status === status,
    );
  assert.equal(renewals, 0);
  assert.equal(s.getSession().status, 'signedIn');
});

test('a second 401 after renewal clears credentials rather than replaying again', async () => {
  const s = await load();
  let requests = 0;
  mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/login')) return json(payload());
    if (url.endsWith('/refresh')) return json(payload('b'));
    requests++;
    return ended();
  });
  await login(s);
  await assert.rejects(s.apiFetch('/leave/types'), (e) => e.status === 401);
  assert.equal(requests, 2);
  assert.equal(s.getSession().status, 'signedOut');
  assert.equal(values.size, 0);
});

test('logout during renewal cannot resurrect the account or persist its replacement', async () => {
  const s = await load();
  const gate = deferred();
  const revoked = [];
  mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/login')) return json(payload());
    if (url.endsWith('/refresh')) {
      await gate.promise;
      return json(payload('b'));
    }
    if (url.endsWith('/logout')) {
      revoked.push(JSON.parse(init.body).refreshToken);
      return new globalThis.Response(null, { status: 204 });
    }
    return ended();
  });
  await login(s);
  const request = s.apiFetch('/leave/types');
  const rejected = assert.rejects(request, /Session changed/);
  await tick();
  await s.signOut();
  gate.resolve();
  await rejected;
  assert.equal(s.getSession().status, 'signedOut');
  assert.equal(values.size, 0);
  assert.deepEqual(revoked.sort(), ['a'.repeat(43), 'b'.repeat(43)]);
});

test('a delayed secure write is followed by logout deletion, never the reverse', async () => {
  const s = await load();
  writeGate = deferred();
  mock.method(globalThis, 'fetch', async (url) =>
    url.endsWith('/logout')
      ? new globalThis.Response(null, { status: 204 })
      : json(payload()),
  );
  const signingIn = login(s);
  const rejected = assert.rejects(signingIn, /Session changed/);
  await tick();
  const signingOut = s.signOut();
  writeGate.resolve();
  await Promise.all([rejected, signingOut]);
  assert.equal(s.getSession().status, 'signedOut');
  assert.equal(values.size, 0);
});

test('offline logout clears local credentials and reports unconfirmed server revocation', async () => {
  const s = await load();
  mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/logout')) throw new TypeError('Offline');
    return json(payload());
  });
  await login(s);
  await s.signOut();
  assert.equal(values.size, 0);
  assert.equal(s.getSession().status, 'signedOut');
  assert.match(s.getSession().error, /Server sign-out was not confirmed/);
});

test('failed deletion is visible and can be retried instead of claiming stored credentials were cleared', async () => {
  const s = await load();
  mock.method(globalThis, 'fetch', async (url) =>
    url.endsWith('/logout')
      ? new globalThis.Response(null, { status: 204 })
      : json(payload()),
  );
  await login(s);
  fail = 'delete';
  await s.signOut();
  assert.ok(values.has(key));
  assert.match(s.getSession().error, /could not be cleared/);
  fail = undefined;
  await s.signOut();
  assert.equal(values.size, 0);
  assert.equal(s.getSession().error, null);
});

test('web uses HttpOnly-cookie routes and never writes credentials to device/browser storage', async () => {
  platform.OS = 'web';
  const s = await load();
  let logouts = 0;
  mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.credentials, 'include');
    assert.ok(!url.includes('/native/'));
    if (url.endsWith('/logout')) {
      logouts++;
      return new globalThis.Response(null, { status: 204 });
    }
    const { refreshToken: _secret, ...body } = payload();
    assert.ok(_secret);
    return json(body);
  });
  await login(s);
  await s.signOut();
  await (await load()).restoreSession();
  assert.equal(secureCalls, 0);
  assert.equal(values.size, 0);
  assert.equal(logouts, 1);
});

test('release builds reject demo entry', async () => {
  const s = await load();
  await assert.rejects(s.signInDemo(user), /unavailable in release/);
  assert.notEqual(s.getSession().status, 'signedIn');
  assert.equal(values.size, 0);
});

test('returning to foreground renews an expired in-memory access token', async () => {
  const s = await load();
  let renewals = 0;
  const clock = mock.method(Date, 'now', () => 1000);
  mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/refresh')) {
      renewals++;
      return json(payload('b'));
    }
    return json(payload('a', { expiresIn: 1 }));
  });
  try {
    await login(s);
    await s.refreshIfExpired();
    assert.equal(renewals, 0);
    clock.mock.mockImplementation(() => 3000);
    await s.refreshIfExpired();
    assert.equal(renewals, 1);
    assert.equal(s.getSession().accessToken, 'access-b');
  } finally {
    clock.mock.restore();
  }
});

test('a response belonging to a signed-out account cannot be returned to a new account', async () => {
  const s = await load();
  const gate = deferred();
  let account = 'a';
  mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/login'))
      return json(
        payload(account, {
          user:
            account === 'a'
              ? user
              : { ...user, id: '22222222-2222-4222-8222-222222222222' },
        }),
      );
    if (url.endsWith('/logout'))
      return new globalThis.Response(null, { status: 204 });
    await gate.promise;
    return json({ data: 'first account private data' });
  });
  await login(s);
  const pending = assert.rejects(s.apiFetch('/leave/types'), /Session changed/);
  await tick();
  await s.signOut();
  account = 'b';
  await login(s);
  gate.resolve();
  await pending;
  assert.equal(s.getSession().user.id, '22222222-2222-4222-8222-222222222222');
});

test('device registration keeps refresh credentials private and rebuilds its body after a 401 rotation', async () => {
  const s = await load();
  let attempts = 0;
  mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/native/login')) return json(payload());
    if (url.endsWith('/native/refresh')) return json(payload('b'));
    assert.ok(url.endsWith('/notifications/push/devices'));
    const body = JSON.parse(init.body);
    assert.equal(body.refreshToken, (attempts === 0 ? 'a' : 'b').repeat(43));
    assert.equal(
      new globalThis.Headers(init.headers).get('Authorization'),
      attempts === 0 ? 'Bearer access-a' : 'Bearer access-b',
    );
    attempts++;
    return attempts === 1
      ? ended()
      : new globalThis.Response(null, { status: 204 });
  });
  await login(s);
  await s.setPushDevice({
    token: 'ExpoPushToken[only-test-device-token]',
    platform: 'ios',
    projectId: '10101010-1010-4010-8010-101010101010',
  });
  assert.equal(attempts, 2);
  assert.equal(s.getSession().status, 'signedIn');
  assert.ok(!JSON.stringify(s.getSession()).includes('refreshToken'));
});

test('signing directly into another account revokes the previous native session first', async () => {
  const s = await load();
  const paths = [];
  mock.method(globalThis, 'fetch', async (url) => {
    paths.push(url.split('/').at(-1));
    return url.endsWith('/logout')
      ? new globalThis.Response(null, { status: 204 })
      : json(payload());
  });
  await login(s);
  await login(s);
  assert.deepEqual(paths, ['login', 'logout', 'login']);
});

test('native password change binds the current refresh credential, confirms 204 and retains session', async () => {
  const s = await load(); const calls = [];
  mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/native/login')) return json(payload());
    calls.push({ url, init }); return new globalThis.Response(null, { status: 204 });
  });
  await login(s); await s.changeOwnPassword('old-test-only', 'new-test-only-password');
  assert.equal(calls[0].url, `${api}/auth/native/password`);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer access-a');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.deepEqual(JSON.parse(calls[0].init.body), { currentPassword: 'old-test-only', newPassword: 'new-test-only-password', refreshToken: 'a'.repeat(43) });
  assert.equal(s.getSession().status, 'signedIn');
  assert.ok(!values.get(key).includes('password'));
  assert.throws(() => s.validateNewPassword('short'));
  assert.throws(() => s.validateNewPassword('😀'.repeat(19)));
  s.validateNewPassword('😀'.repeat(18));
});
test('password change refreshes a 401 once with rotated credential; uncertain responses never claim success', async () => {
  const s = await load(); let attempts = 0, refreshes = 0;
  mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/native/login')) return json(payload());
    if (url.endsWith('/native/refresh')) { refreshes++; return json(payload('b')); }
    attempts++;
    if (attempts === 1) return ended();
    assert.equal(JSON.parse(init.body).refreshToken, 'b'.repeat(43));
    return new globalThis.Response(null, { status: 204 });
  });
  await login(s); await s.changeOwnPassword('old-test-only', 'new-test-only-password');
  assert.equal(attempts, 2); assert.equal(refreshes, 1);
  mock.method(globalThis, 'fetch', async () => json({}));
  await assert.rejects(s.changeOwnPassword('old-test-only', 'new-test-only-password'), /not confirmed/);
});
test('web password changes use HttpOnly cookie contract and no native refresh field', async () => {
  platform.OS = 'web'; const s = await load(); let body;
  mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/auth/login')) return json(payload('a', { refreshToken: undefined }));
    assert.equal(url, `${api}/auth/password`); assert.equal(init.credentials, 'include'); body = JSON.parse(init.body); return new globalThis.Response(null, { status: 204 });
  });
  await login(s); await s.changeOwnPassword('old-test-only', 'new-test-only-password');
  assert.equal(body.refreshToken, undefined); assert.equal(secureCalls, 0);
});
