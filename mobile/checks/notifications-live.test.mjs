import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, mock, test } from 'node:test';
import { homeUser } from './home-fixtures.mjs';
let state,
  listener,
  connections = [],
  renewals = 0,
  refreshes = 0,
  closeController;
class FakeSocket {
  events = new Map();
  closed = false;
  on(event, fn) {
    this.events.set(event, fn);
    return this;
  }
  close() {
    this.closed = true;
  }
  fire(event, ...args) {
    this.events.get(event)?.(...args);
  }
}
mock.module('../lib/api-config.ts', {
  exports: { API_BASE_URL: 'https://api.test/api/v1' },
});
mock.module('socket.io-client', {
  exports: {
    io: (url, options) => {
      const socket = new FakeSocket();
      connections.push({ url, options, socket });
      return socket;
    },
  },
});
mock.module(createRequire(import.meta.url).resolve('socket.io-client'), {
  exports: {
    io: (url, options) => {
      const socket = new FakeSocket();
      connections.push({ url, options, socket });
      return socket;
    },
  },
});
mock.module('../lib/session.ts', {
  exports: {
    apiFetch: () => {},
    getSession: () => state,
    subscribeSession: (fn) => {
      listener = fn;
      return () => {
        listener = undefined;
      };
    },
    refreshIfExpired: async () => {
      refreshes++;
    },
    refreshSession: async () => {
      renewals++;
      state = { ...state, accessToken: 'renewed-token' };
      listener?.();
    },
  },
});
const { startNotificationSync } = await import('../lib/notifications-live.ts');
const login = (patch = {}) => {
  state = {
    status: 'signedIn',
    user: homeUser,
    accessToken: 'token',
    ...patch,
  };
  listener?.();
};
afterEach(() => {
  closeController?.();
  closeController = undefined;
  connections = [];
  renewals = 0;
  refreshes = 0;
  mock.timers.reset();
});
test('signed-out, demo and permissionless accounts do not connect; account/permission/token changes close the old socket', () => {
  state = { status: 'signedOut', user: null, accessToken: null };
  const sync = startNotificationSync(
    () => {},
    () => {},
  );
  closeController = sync.close;
  assert.equal(connections.length, 0);
  login({ accessToken: 'demo-token' });
  assert.equal(connections.length, 0);
  login({ user: { ...homeUser, permissions: [] } });
  assert.equal(connections.length, 0);
  login();
  assert.equal(connections.length, 1);
  const old = connections[0];
  assert.equal(old.url, 'https://api.test');
  assert.equal(old.options.path, '/api/v1/socket.io');
  assert.deepEqual(old.options.auth, { token: 'token' });
  login({ accessToken: 'new-token' });
  assert.equal(old.socket.closed, true);
  assert.deepEqual(connections[1].options.auth, { token: 'new-token' });
  login({ user: { ...homeUser, id: '22222222-2222-4222-8222-222222222222' } });
  assert.equal(connections[1].socket.closed, true);
  login({ user: { ...homeUser, permissions: [] } });
  assert.equal(connections.at(-1).socket.closed, true);
});
test('events/reconnect refetch only the current account; stale closed sockets cannot invalidate a new account', () => {
  login();
  const changed = [];
  const statuses = [];
  const sync = startNotificationSync(
    (id) => changed.push(id),
    (status) => statuses.push(status),
  );
  closeController = sync.close;
  const first = connections[0].socket;
  first.fire('connect');
  first.fire('notifications:changed');
  assert.deepEqual(changed, [homeUser.id, homeUser.id]);
  assert.equal(statuses.at(-1), 'connected');
  login({ user: { ...homeUser, id: '22222222-2222-4222-8222-222222222222' } });
  first.fire('notifications:changed');
  assert.equal(changed.length, 2);
  connections[1].socket.fire('connect');
  assert.equal(changed.at(-1), state.user.id);
  login({ status: 'signedOut', user: null, accessToken: null });
  connections[1].socket.fire('notifications:changed');
  assert.equal(changed.length, 3);
  sync.close();
  assert.equal(listener, undefined);
});
test('background closes the connection; foreground renews before reconnect and refetch', async () => {
  login();
  const changed = [];
  const sync = startNotificationSync(
    (id) => changed.push(id),
    () => {},
  );
  closeController = sync.close;
  await sync.setActive(false);
  assert.equal(connections[0].socket.closed, true);
  await sync.setActive(true);
  assert.equal(refreshes, 1);
  assert.equal(connections.length, 2);
  assert.deepEqual(changed, [homeUser.id]);
  sync.close();
  await sync.setActive(true);
  assert.equal(connections.length, 2);
  assert.equal(refreshes, 1);
});
test('namespace authentication failure renews once with a new token; transport failures do not cause a renewal loop', async () => {
  login();
  const sync = startNotificationSync(
    () => {},
    () => {},
  );
  closeController = sync.close;
  connections[0].socket.fire(
    'connect_error',
    new Error('Transport unavailable'),
  );
  assert.equal(renewals, 0);
  connections[0].socket.fire('connect_error', new Error('UNAUTHENTICATED'));
  assert.equal(renewals, 1);
  assert.equal(connections[0].socket.closed, true);
  assert.deepEqual(connections[1].options.auth, { token: 'renewed-token' });
  connections[1].socket.fire('connect_error', new Error('UNAUTHENTICATED'));
  assert.equal(renewals, 1);
});

test('idle foreground sessions check local token expiry; background and stopped controllers do not renew', async () => {
  mock.timers.enable({ apis: ['setInterval'] });
  login();
  const sync = startNotificationSync(
    () => {},
    () => {},
  );
  closeController = sync.close;
  mock.timers.tick(60000);
  await Promise.resolve();
  assert.equal(refreshes, 1);
  await sync.setActive(false);
  mock.timers.tick(60000);
  await Promise.resolve();
  assert.equal(refreshes, 1);
  sync.close();
  mock.timers.tick(60000);
  assert.equal(refreshes, 1);
});
