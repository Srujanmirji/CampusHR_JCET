import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { homeFixtures, homeUser } from './home-fixtures.mjs';
let calls, handler;
mock.module('../lib/session.ts', {
  exports: {
    apiFetch: async (path, init) => {
      calls.push({ path, init });
      return handler(path, init);
    },
  },
});
const api = await import('../lib/notifications-api.ts'),
  home = await import('../lib/home-api.ts');
const item = homeFixtures()['/notifications'].data[0];
beforeEach(() => {
  calls = [];
  handler = async () =>
    globalThis.Response.json({ data: [item], hasMore: false });
});
test('notification reads work without an employee link but require real authentication and permission', async () => {
  assert.equal(
    (await api.listNotifications({ ...homeUser, employeeId: null }, 'real'))
      .data.length,
    1,
  );
  for (const [user, token] of [
    [null, null],
    [homeUser, 'demo-token'],
    [{ ...homeUser, permissions: [] }, 'real'],
  ]) {
    await assert.rejects(api.listNotifications(user, token));
    await assert.rejects(api.markNotificationRead(user, token, item.id));
  }
  assert.equal(calls.length, 1);
});
test('pagination uses server cursor and limit; repeated, empty continuation and malformed pages are refused', async () => {
  await api.listNotifications(homeUser, 'real', homeUser.id, 10);
  assert.match(calls[0].path, new RegExp(`limit=10&after=${homeUser.id}`));
  for (const value of [
    { data: [item, item], hasMore: false },
    { data: [], hasMore: true },
    { data: [{ ...item, kind: undefined }], hasMore: false },
    {},
  ]) {
    handler = async () => globalThis.Response.json(value);
    await assert.rejects(api.listNotifications(homeUser, 'real'));
  }
  handler = async () =>
    globalThis.Response.json({ data: [item], hasMore: true });
  await assert.rejects(
    api.listNotifications(homeUser, 'real', item.id),
    /invalid/,
  );
  await assert.rejects(api.listNotifications(homeUser, 'real', undefined, 51));
});
test('read and read-all require a confirmed 204 and preserve errors without local success', async () => {
  handler = async () => new globalThis.Response(null, { status: 204 });
  await api.markNotificationRead(homeUser, 'real', item.id);
  await api.markNotificationRead(homeUser, 'real');
  assert.equal(calls[0].path, `/notifications/${item.id}/read`);
  assert.equal(calls[1].path, '/notifications/read-all');
  assert.equal(calls[0].init.method, 'PATCH');
  handler = async () => globalThis.Response.json({ data: null });
  await assert.rejects(
    api.markNotificationRead(homeUser, 'real'),
    /not confirmed/,
  );
  handler = async () => {
    throw new Error('Forbidden');
  };
  await assert.rejects(
    api.markNotificationRead(homeUser, 'real', item.id),
    /Forbidden/,
  );
  await assert.rejects(api.markNotificationRead(homeUser, 'real', 'not-an-id'));
});
test('related links are allowlisted and require the destination permissions and own employee record', () => {
  const user = {
    ...homeUser,
    permissions: [...homeUser.permissions, 'substitution.read.own'],
  };
  assert.equal(
    home.homeNotificationRoute('/substitution', user),
    '/(tabs)/timetable',
  );
  assert.equal(
    home.homeNotificationRoute('/leave?tab=mine&request=untrusted', user),
    '/(tabs)/leave',
  );
  assert.equal(
    home.homeNotificationRoute('/substitution', {
      ...user,
      permissions: ['substitution.read.own'],
    }),
    null,
  );
  for (const link of [
    'https://evil.test/leave',
    '//evil.test/leave',
    '/leave/../profile',
    'javascript:alert(1)',
    '/unknown',
    '/leave#bad',
  ])
    assert.equal(home.homeNotificationRoute(link, user), null);
  assert.equal(
    home.homeNotificationRoute('/substitution', { ...user, permissions: [] }),
    null,
  );
  assert.equal(
    home.homeNotificationRoute('/leave', { ...user, employeeId: null }),
    null,
  );
});

test('document notifications open only the signed-in employee Profile with read permission', () => {
  assert.equal(
    home.homeNotificationRoute('/documents?status=VERIFIED', {
      ...homeUser,
      permissions: ['document.read.own'],
    }),
    '/(tabs)/profile',
  );
  assert.equal(home.homeNotificationRoute('/documents', homeUser), null);
  assert.equal(
    home.homeNotificationRoute('/documents', {
      ...homeUser,
      employeeId: null,
      permissions: ['document.read.all'],
    }),
    null,
  );
});
