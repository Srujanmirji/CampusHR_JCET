import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { z } from 'zod';
import { homeUser } from './home-fixtures.mjs';
let session,
  listener,
  hooks,
  persisted,
  calls,
  shown,
  routes,
  changes,
  sync,
  permission,
  tokenGate,
  stopped;
const payload = {
  notificationId: '12121212-1212-4212-8212-121212121212',
  recipientId: homeUser.id,
};
const adapter = {
  supported: true,
  projectId: '10101010-1010-4010-8010-101010101010',
  platform: 'ios',
  async permission(ask) {
    calls.push(['permission', ask]);
    return permission;
  },
  async token() {
    if (tokenGate) await tokenGate;
    return 'ExpoPushToken[only-test-device-token]';
  },
  listen(own, received, tapped, rotated) {
    hooks = { own, received, tapped, rotated };
    return () => {
      stopped++;
    };
  },
  async clearResponse() {
    calls.push(['clearResponse']);
  },
  async clearTray() {
    calls.push(['clearTray']);
  },
};
mock.module('../lib/notifications.ts', {
  exports: {
    pushNative: adapter,
    pushPayloadSchema: z
      .object({ notificationId: z.uuid(), recipientId: z.uuid() })
      .strict(),
  },
});
mock.module('../lib/session-storage.ts', {
  exports: {
    readPushEnabled: async () => persisted,
    writePushEnabled: async (value) => {
      persisted = value;
    },
  },
});
let handler;
mock.module('../lib/session.ts', {
  exports: {
    ApiError: Error,
    getSession: () => session,
    subscribeSession: (fn) => {
      listener = fn;
      return () => {
        listener = null;
      };
    },
    setPushDevice: async (value) => {
      calls.push(['device', value]);
    },
    apiFetch: async (path) => {
      calls.push(['get', path]);
      return handler(path);
    },
  },
});
const { startPushSync } = await import('../lib/push-sync.ts');
const flush = async () => {
  for (let i = 0; i < 8; i++)
    await new Promise((resolve) => globalThis.setImmediate(resolve));
};
function start() {
  sync = startPushSync(
    (state) => shown.push(state),
    (route) => routes.push(route),
    (user) => changes.push(user),
  );
  return sync;
}
beforeEach(() => {
  session = {
    status: 'signedIn',
    user: homeUser,
    accessToken: 'current-token',
  };
  persisted = false;
  calls = [];
  shown = [];
  routes = [];
  changes = [];
  stopped = 0;
  tokenGate = null;
  permission = { granted: true, canAskAgain: true };
  adapter.supported = true;
  handler = async (path) =>
    path === '/notifications/push'
      ? globalThis.Response.json({
          data: { enabled: true, projectId: adapter.projectId },
        })
      : globalThis.Response.json({
          data: {
            ...payload,
            id: payload.notificationId,
            kind: 'leave.approved',
            title: 'Private update',
            body: 'Only after auth',
            link: '/leave',
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        });
});
afterEach(() => sync?.close());

test('web/Expo Go does not import/register/simulate remote push or request permission', async () => {
  adapter.supported = false;
  start();
  await flush();
  assert.equal(shown.at(-1).status, 'unsupported');
  assert.ok(
    !calls.some(
      ([name]) => name === 'get' || name === 'device' || name === 'permission',
    ),
  );
});
test('enabling is explicit, registers the approved project and never exposes the token in UI state', async () => {
  start();
  await flush();
  assert.ok(!calls.some(([name, value]) => name === 'permission' && value));
  await sync.enable();
  assert.equal(persisted, true);
  assert.equal(shown.at(-1).status, 'enabled');
  assert.deepEqual(calls.filter(([name]) => name === 'device').at(-1)[1], {
    token: 'ExpoPushToken[only-test-device-token]',
    platform: 'ios',
    projectId: adapter.projectId,
  });
  assert.ok(!JSON.stringify(shown).includes('ExpoPushToken'));
  await sync.disable();
  assert.equal(persisted, false);
  assert.equal(shown.at(-1).status, 'off');
  assert.equal(calls.filter(([name]) => name === 'device').at(-1)[1], null);
});
test('permission refusal and foreground revocation remove server registration without claiming enabled', async () => {
  start();
  permission.granted = false;
  await sync.enable();
  assert.equal(shown.at(-1).status, 'denied');
  assert.equal(calls.filter(([name]) => name === 'device').at(-1)[1], null);
  permission.granted = true;
  sync.setActive(true);
  await flush();
  assert.equal(shown.at(-1).status, 'enabled');
  permission.granted = false;
  sync.setActive(false);
  sync.setActive(true);
  await flush();
  assert.equal(shown.at(-1).status, 'denied');
});
test('project mismatch refuses token registration and can be retried', async () => {
  handler = async () =>
    globalThis.Response.json({
      data: {
        enabled: true,
        projectId: '20202020-2020-4020-8020-202020202020',
      },
    });
  start();
  await sync.enable();
  assert.equal(shown.at(-1).status, 'error');
  assert.ok(!calls.some(([name, value]) => name === 'device' && value));
});
test('logout or account switch while the native token resolves cannot register a stale account', async () => {
  let release;
  tokenGate = new Promise((resolve) => {
    release = resolve;
  });
  persisted = true;
  start();
  await flush();
  session = { status: 'signedOut', user: null, accessToken: null };
  listener();
  release();
  await flush();
  assert.ok(!calls.some(([name, value]) => name === 'device' && value));
  assert.ok(calls.some(([name]) => name === 'clearTray'));
  assert.equal(shown.at(-1).status, 'off');
});
test('cold-start tap waits for sign-in, fetches owned content and uses the existing permission-aware route map', async () => {
  session = { status: 'loading', user: null, accessToken: null };
  start();
  hooks.tapped(payload);
  await flush();
  assert.deepEqual(routes, []);
  session = { status: 'signedIn', user: homeUser, accessToken: 'restored' };
  listener();
  await flush();
  assert.deepEqual(routes, ['/(tabs)/leave']);
  assert.ok(
    calls.some(
      ([name, path]) =>
        name === 'get' && path === `/notifications/${payload.notificationId}`,
    ),
  );
  hooks.tapped(payload);
  await flush();
  assert.equal(routes.length, 1);
  hooks.received();
  assert.ok(changes.includes(homeUser.id));
});
test('foreign/malformed pushes and URLs in untrusted payloads cannot navigate', async () => {
  start();
  await flush();
  hooks.tapped({
    ...payload,
    recipientId: '34343434-3434-4434-8434-343434343434',
  });
  hooks.tapped({ ...payload, url: 'https://evil.test' });
  await flush();
  assert.deepEqual(routes, []);
  assert.equal(
    hooks.own({
      ...payload,
      recipientId: '34343434-3434-4434-8434-343434343434',
    }),
    false,
  );
  assert.ok(
    !calls.some(
      ([name, path]) => name === 'get' && path.includes(payload.notificationId),
    ),
  );
});
test('unsafe or unsupported related links open only the protected inbox', async () => {
  handler = async () =>
    globalThis.Response.json({
      data: {
        id: payload.notificationId,
        kind: 'announcement',
        title: 'Update',
        body: 'Text',
        link: 'https://evil.test',
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    });
  start();
  hooks.tapped(payload);
  await flush();
  assert.deepEqual(routes, ['/notifications']);
});
test('closing or switching accounts prevents late tap fetches from navigating', async () => {
  let release;
  handler = () =>
    new Promise((resolve) => {
      release = () =>
        resolve(
          globalThis.Response.json({
            data: {
              id: payload.notificationId,
              kind: 'announcement',
              title: 'Update',
              body: 'Text',
              link: '/leave',
              readAt: null,
              createdAt: new Date().toISOString(),
            },
          }),
        );
    });
  start();
  hooks.tapped(payload);
  await flush();
  sync.close();
  release();
  await flush();
  assert.deepEqual(routes, []);
  assert.ok(stopped >= 1);
});
