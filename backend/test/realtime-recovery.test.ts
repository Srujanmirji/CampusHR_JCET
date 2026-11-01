import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { io as connect } from 'socket.io-client';
import { createRealtime } from '../src/modules/notifications/notifications.realtime.js';

test('a password reset also rejects an authentication handshake already in flight', async () => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let release!: () => void, entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const realtime = createRealtime();
  const io = realtime.attach(server, {
    origin: 'http://localhost',
    verify: async () => {
      entered();
      await gate;
      return 'user-before-reset';
    },
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const client = connect(`http://127.0.0.1:${address.port}`, {
    path: '/api/v1/socket.io',
    auth: { token: 'test-token' },
    reconnection: false,
    autoConnect: false,
  });
  try {
    const outcome = Promise.race([
      new Promise<string>((resolve) =>
        client.once('connect', () => resolve('connected')),
      ),
      new Promise<string>((resolve) =>
        client.once('connect_error', () => resolve('blocked')),
      ),
    ]);
    client.connect();
    await started;
    realtime.disconnect('user-before-reset');
    release();
    assert.equal(await outcome, 'blocked');
    assert.equal(
      io.sockets.adapter.rooms.get('user:user-before-reset')?.size ?? 0,
      0,
    );
  } finally {
    client.disconnect();
    await io.close();
    server.close();
  }
});
