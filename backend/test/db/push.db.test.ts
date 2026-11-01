import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestApp, password } from './helpers.js';
import { createPushRepository } from '../../src/modules/notifications/notifications.push.js';
import { createPushWorker } from '../../src/modules/notifications/notifications.push-worker.js';
import { createNotificationRepository } from '../../src/modules/notifications/notifications.repository.js';
const projectId = '10101010-1010-4010-8010-101010101010';
let t: Awaited<ReturnType<typeof startTestApp>>;
let alice: { id: string; token: string }, bob: { id: string; token: string };
interface Login {
  accessToken: string;
  refreshToken: string;
  user: { id: string };
}
async function login(identifier: string): Promise<Login> {
  const response = await fetch(`${t.base}/auth/native/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return response.json() as Promise<Login>;
}
const tokenA = 'ExpoPushToken[push-device-aaaaaaaaaaaa]';
const tokenB = 'ExponentPushToken[push-device-bbbbbbbbbbbb]';
const register = (session: Login, token = tokenA, extra = {}) =>
  t.request('POST', '/notifications/push/devices', session.accessToken, {
    token,
    platform: 'ios',
    projectId,
    refreshToken: session.refreshToken,
    ...extra,
  });
before(async () => {
  t = await startTestApp({ PUSH_ENABLED: 'true', EXPO_PROJECT_ID: projectId });
  alice = await t.person({
    key: 'pushalice',
    code: 'PUSH-CSE-001',
    role: 'Faculty',
    department: 'CSE',
  });
  bob = await t.person({
    key: 'pushbob',
    code: 'PUSH-ECE-001',
    role: 'Faculty',
    department: 'ECE',
  });
});
after(async () => {
  await t.prisma.user.deleteMany({
    where: { email: { in: ['pushalice@jcet.test', 'pushbob@jcet.test'] } },
  });
  await t.prisma.employee.deleteMany({
    where: { id: { in: [alice.id, bob.id] } },
  });
  await t.stop();
});

test('push registration validates projects, tokens, native refresh ownership and server availability', async () => {
  const a = await login('PUSH-CSE-001'),
    b = await login('PUSH-ECE-001');
  assert.equal(
    (await t.request('POST', '/notifications/push/devices', undefined, {}))
      .status,
    401,
  );
  assert.equal((await register(a, 'not-a-push-token')).status, 400);
  assert.equal((await register(a, tokenA, { userId: b.user.id })).status, 400);
  assert.equal(
    (
      await register(a, tokenA, {
        projectId: '20202020-2020-4020-8020-202020202020',
      })
    ).status,
    400,
  );
  assert.equal(
    (await register(a, tokenA, { refreshToken: b.refreshToken })).status,
    401,
  );
  const disabled = await startTestApp();
  try {
    assert.equal(
      (
        await disabled.request(
          'POST',
          '/notifications/push/devices',
          a.accessToken,
          {},
        )
      ).status,
      503,
    );
  } finally {
    await disabled.stop();
  }
  assert.equal((await register(a)).status, 204);
  assert.equal((await register(a)).status, 204);
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: a.user.id } }),
    1,
  );
  await t.request('DELETE', '/notifications/push/devices', b.accessToken, {
    refreshToken: a.refreshToken,
  });
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: a.user.id } }),
    1,
    'another account cannot remove a device',
  );
  assert.equal((await register(a, tokenB)).status, 204);
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: a.user.id } }),
    1,
    'token rotation replaces its old token',
  );
  await t.request('DELETE', '/notifications/push/devices', a.accessToken, {
    refreshToken: a.refreshToken,
  });
});

test('registration and queued updates follow refresh rotation, logout and token account transfer', async () => {
  let a = await login('PUSH-CSE-001');
  const b = await login('PUSH-ECE-001');
  await register(a);
  const notifications = createNotificationRepository(t.prisma, true);
  await notifications.create([a.user.id], {
    kind: 'leave.approved',
    title: 'Private name and leave',
    body: 'Private medical details',
    link: '/leave',
  });
  const id = (
    await t.prisma.notification.findFirstOrThrow({
      where: { userId: a.user.id },
    })
  ).id;
  assert.equal(
    (await t.request('GET', `/notifications/${id}`, b.accessToken)).status,
    404,
  );
  assert.equal(
    (await t.request('GET', `/notifications/${id}`, a.accessToken)).status,
    200,
  );
  const snapshot = await t.prisma.pushDevice.findUniqueOrThrow({
    where: { token: tokenA },
  });
  assert.equal(
    await createPushRepository(
      t.prisma,
      '20202020-2020-4020-8020-202020202020',
    ).activeDevice(snapshot.id, a.user.id, snapshot.updatedAt, new Date()),
    null,
    'another project cannot dispatch old tokens',
  );
  await t.prisma.pushDevice.update({
    where: { id: snapshot.id },
    data: { updatedAt: new Date(snapshot.updatedAt.getTime() + 1000) },
  });
  await createPushRepository(t.prisma).removeInvalid(
    snapshot.id,
    snapshot.token,
    snapshot.updatedAt,
  );
  assert.equal(
    await t.prisma.pushDevice.count({ where: { id: snapshot.id } }),
    1,
    'an old invalid receipt cannot delete a renewed registration',
  );
  const oldRefresh = a.refreshToken;
  const rotation = await fetch(`${t.base}/auth/native/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: oldRefresh }),
  });
  assert.equal(rotation.status, 200);
  a = (await rotation.json()) as Login;
  assert.equal(
    await t.prisma.pushDevice.count({
      where: { userId: a.user.id, session: { revokedAt: null } },
    }),
    1,
  );
  assert.equal(
    (await register(a, tokenA, { refreshToken: oldRefresh })).status,
    401,
  );
  assert.equal(
    await t.prisma.pushDelivery.count({ where: { notificationId: id } }),
    1,
  );
  await register(b);
  assert.equal(
    await t.prisma.pushDelivery.count({ where: { notificationId: id } }),
    0,
    'account transfer removes old-account queued jobs',
  );
  await t.request('DELETE', '/notifications/push/devices', a.accessToken, {
    refreshToken: a.refreshToken,
  });
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: b.user.id } }),
    1,
  );
  await t.request('POST', '/auth/native/logout', undefined, {
    refreshToken: b.refreshToken,
  });
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: b.user.id } }),
    0,
  );
});

test('the durable sender uses private payloads, checks receipts, retries and removes invalid tokens', async () => {
  const a = await login('PUSH-CSE-001');
  await register(a);
  const repo = createPushRepository(t.prisma);
  const notifications = createNotificationRepository(t.prisma, true);
  await notifications.create([a.user.id], {
    kind: 'announcement',
    title: 'Private employee name',
    body: 'Confidential reason',
  });
  let clock = new Date(),
    calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(
      new Headers(init?.headers).get('authorization'),
      'Bearer server-only-test',
    );
    const body = JSON.parse(String(init?.body));
    if (String(url).endsWith('/send')) {
      assert.equal(body[0].title, 'CampusHR');
      assert.equal(
        body[0].body,
        'You have a new update. Open CampusHR to view it.',
      );
      assert.deepEqual(Object.keys(body[0].data).sort(), [
        'notificationId',
        'recipientId',
      ]);
      assert.equal(body[0].data.recipientId, a.user.id);
      assert.ok(!String(init?.body).includes('Confidential'));
      return Response.json({ data: [{ status: 'ok', id: 'ticket-for-test' }] });
    }
    return Response.json({
      data: {
        'ticket-for-test': {
          status: 'error',
          details: { error: 'DeviceNotRegistered' },
        },
      },
    });
  };
  const worker = createPushWorker(
    repo,
    'server-only-test',
    transport,
    () => clock,
  );
  await Promise.all([
    worker.tick(),
    createPushWorker(repo, 'server-only-test', transport, () => clock).tick(),
  ]);
  assert.equal(calls, 1, 'overlapping ticks cannot double-send');
  const job = await t.prisma.pushDelivery.findFirstOrThrow({
    where: { device: { userId: a.user.id } },
  });
  assert.equal(job.ticketId, 'ticket-for-test');
  await t.prisma.notification.update({
    where: { id: job.notificationId },
    data: { readAt: new Date() },
  });
  clock = new Date(clock.getTime() + 16 * 60_000);
  await worker.tick();
  assert.equal(calls, 2);
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: a.user.id } }),
    0,
  );
  await register(a);
  await notifications.create([a.user.id], {
    kind: 'announcement',
    title: 'Retry test',
    body: 'Only the in-app inbox has these details.',
  });
  let failedCalls = 0;
  const failing = createPushWorker(repo, undefined, async () => {
    failedCalls++;
    throw new Error('network');
  });
  await failing.tick();
  await failing.tick();
  assert.equal(failedCalls, 1, 'failed sends wait for backoff before retrying');
  assert.equal(
    (
      await t.prisma.pushDelivery.findFirstOrThrow({
        where: { device: { userId: a.user.id } },
      })
    ).attempts,
    1,
  );
  await t.prisma.pushDelivery.updateMany({
    where: { device: { userId: a.user.id } },
    data: {
      createdAt: new Date(Date.now() - 25 * 3600_000),
      nextAttemptAt: new Date(0),
    },
  });
  await failing.tick();
  assert.equal(failedCalls, 1, 'old jobs expire without a late provider send');
  assert.equal(
    await t.prisma.pushDelivery.count({
      where: { device: { userId: a.user.id } },
    }),
    0,
  );
  await t.request('POST', '/auth/native/logout', undefined, {
    refreshToken: a.refreshToken,
  });
  assert.equal(
    await t.prisma.pushDelivery.count({
      where: { notification: { userId: a.user.id } },
    }),
    0,
  );
});

test('password changes revoke other-device pushes and deactivation/expired sessions are pruned', async () => {
  const first = await login('PUSH-CSE-001'),
    current = await login('PUSH-CSE-001');
  await register(first, tokenA);
  await register(current, tokenB);
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: current.user.id } }),
    2,
  );
  const changed = await t.request(
    'POST',
    '/auth/native/password',
    current.accessToken,
    {
      currentPassword: password,
      newPassword: 'ChangedPushTest42!',
      refreshToken: current.refreshToken,
    },
  );
  assert.equal(changed.status, 204);
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: current.user.id } }),
    1,
  );
  assert.equal(
    await t.prisma.pushDevice.count({
      where: { userId: current.user.id, token: tokenB },
    }),
    1,
  );
  await t.prisma.user.update({
    where: { id: current.user.id },
    data: { status: 'INACTIVE' },
  });
  const repo = createPushRepository(t.prisma);
  await repo.prune(new Date());
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: current.user.id } }),
    0,
  );
  const b = await login('PUSH-ECE-001');
  await register(b);
  const device = await t.prisma.pushDevice.findUniqueOrThrow({
    where: { token: tokenA },
  });
  await t.prisma.refreshSession.update({
    where: { id: device.sessionId },
    data: { expiresAt: new Date(0) },
  });
  await repo.prune(new Date());
  assert.equal(
    await t.prisma.pushDevice.count({ where: { userId: b.user.id } }),
    0,
  );
});
