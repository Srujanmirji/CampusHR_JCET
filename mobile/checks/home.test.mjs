import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { homeFixtures, homeUser, employeeId } from './home-fixtures.mjs';
let responses;
let paths;
mock.module('../lib/session.ts', {
  exports: {
    apiFetch: async (path) => {
      paths.push(path);
      const response =
        responses[new globalThis.URL(path, 'https://test.invalid').pathname];
      if (response instanceof Error) throw response;
      assert.ok(response, `Unexpected API path ${path}`);
      return globalThis.Response.json(response);
    },
  },
});
const home = await import('../lib/home-api.ts');
beforeEach(() => {
  paths = [];
  responses = homeFixtures();
});
const loaders = [
  (user, token) => home.getHomeSchedule(user, token, 'WED'),
  (user, token) => home.getHomeAttendance(user, token, '2026-10-21'),
  (user, token) => home.getHomeBalances(user, token, 2026),
  home.getHomeWorkload,
  home.getHomeNotifications,
  home.getHomeUnread,
];
test('HOD Home reads only their own employee summaries using the existing contracts', async () => {
  const [schedule, attendance, balances, workload, notifications, unread] =
    await Promise.all(loaders.map((load) => load(homeUser, 'real-token')));
  assert.equal(schedule.entries.length, 1);
  assert.equal(attendance.status, 'PRESENT');
  assert.equal(balances[0].remaining, 6.5);
  assert.equal(balances[1].remaining, null);
  assert.equal(workload.totalHours, 12);
  assert.equal(notifications[0].title, 'Leave request updated');
  assert.equal(unread, 2);
  const leaveUrl = new globalThis.URL(
    paths.find((path) => path.startsWith('/leave/balances')),
    'https://test.invalid',
  );
  assert.equal(leaveUrl.searchParams.get('employeeId'), employeeId);
  assert.equal(leaveUrl.searchParams.get('year'), '2026');
  assert.equal(
    new globalThis.URL(
      paths.find((path) => path.startsWith('/timetable/entries')),
      'https://test.invalid',
    ).searchParams.get('facultyId'),
    employeeId,
  );
  assert.ok(paths.includes(`/workload/faculty/${employeeId}`));
  assert.ok(!paths.includes('/workload'));
});
test('no employee record prevents personal requests even for an administrator; notifications remain user-scoped', async () => {
  const admin = {
    ...homeUser,
    employeeId: null,
    permissions: homeUser.permissions.map((permission) =>
      permission.replace('.department', '.all'),
    ),
  };
  for (const load of loaders.slice(0, 4))
    await assert.rejects(load(admin, 'real-token'), /Link an employee/);
  assert.equal(paths.length, 0);
  assert.equal(await home.getHomeUnread(admin, 'real-token'), 2);
});
test('signed-out, demo and denied callers make no summary requests or sample fallbacks', async () => {
  for (const load of loaders) {
    await assert.rejects(load(null, null), /Sign in/);
    await assert.rejects(load(homeUser, 'demo-token'), /real account/);
    await assert.rejects(
      load({ ...homeUser, permissions: [] }, 'real-token'),
      /not available/,
    );
  }
  assert.deepEqual(paths, []);
});
test('non-teaching staff can read attendance and leave without teaching permissions', async () => {
  const staff = {
    ...homeUser,
    role: 'Non-Teaching Staff',
    permissions: [
      'attendance.read.own',
      'leave.read.own',
      'notification.read.own',
    ],
  };
  await home.getHomeAttendance(staff, 'real-token', '2026-10-21');
  await home.getHomeBalances(staff, 'real-token', 2026);
  await assert.rejects(
    home.getHomeSchedule(staff, 'real-token', 'WED'),
    /not available/,
  );
  await assert.rejects(
    home.getHomeWorkload(staff, 'real-token'),
    /not available/,
  );
  assert.equal(paths.length, 2);
});
test('one failed source does not prevent other summaries and never invents success', async () => {
  for (const message of ['Forbidden (403)', 'Offline', 'Server error (500)']) {
    responses['/attendance/today'] = new Error(message);
    await assert.rejects(
      home.getHomeAttendance(homeUser, 'real-token', '2026-10-21'),
      { message },
    );
    assert.equal(await home.getHomeUnread(homeUser, 'real-token'), 2);
  }
});
test('valid empty and unbounded results remain distinct from invalid responses', async () => {
  responses['/attendance/today'] = { data: null };
  responses['/leave/balances'] = { data: [] };
  responses['/notifications'] = { data: [], hasMore: false };
  assert.equal(
    await home.getHomeAttendance(homeUser, 'real-token', '2026-10-21'),
    null,
  );
  assert.deepEqual(
    await home.getHomeBalances(homeUser, 'real-token', 2026),
    [],
  );
  assert.deepEqual(await home.getHomeNotifications(homeUser, 'real-token'), []);
  for (const path of Object.keys(responses)) responses[path] = { data: [{}] };
  for (const load of loaders)
    await assert.rejects(load(homeUser, 'real-token'));
});
test('foreign employee, wrong date/year and missing period definitions are refused', async () => {
  responses['/attendance/today'].data.employeeId = homeUser.id;
  await assert.rejects(
    home.getHomeAttendance(homeUser, 'real-token', '2026-10-21'),
    /does not belong/,
  );
  responses = homeFixtures();
  await assert.rejects(
    home.getHomeAttendance(homeUser, 'real-token', '2026-10-22'),
    /different date/,
  );
  await assert.rejects(
    home.getHomeBalances(homeUser, 'real-token', 2027),
    /different year/,
  );
  responses[`/workload/faculty/${employeeId}`].data.faculty.id = homeUser.id;
  await assert.rejects(
    home.getHomeWorkload(homeUser, 'real-token'),
    /does not belong/,
  );
  responses['/timetable/entries'].data[0].faculty.id = homeUser.id;
  await assert.rejects(
    home.getHomeSchedule(homeUser, 'real-token', 'WED'),
    /does not belong/,
  );
  responses = homeFixtures();
  responses['/timetable/periods'].data = [];
  await assert.rejects(
    home.getHomeSchedule(homeUser, 'real-token', 'WED'),
    /timings are missing/,
  );
});
test('Sunday skips timetable requests; campus date/year rolls over in IST', async () => {
  assert.deepEqual(await home.getHomeSchedule(homeUser, 'real-token', null), {
    periods: [],
    entries: [],
  });
  assert.deepEqual(paths, []);
  assert.deepEqual(home.campusClock(new Date('2026-12-31T18:30:00Z')), {
    date: '2027-01-01',
    year: 2027,
    day: 'FRI',
    minutes: 0,
  });
  assert.equal(home.campusClock(new Date('2026-10-24T18:30:00Z')).day, null);
});
test('notification destinations are restricted to implemented permitted native routes', () => {
  assert.equal(
    home.homeNotificationRoute('/leave?tab=mine', homeUser),
    '/(tabs)/leave',
  );
  assert.equal(
    home.homeNotificationRoute('/timetable', homeUser),
    '/(tabs)/timetable',
  );
  for (const link of [
    'https://evil.test/leave',
    '//evil.test',
    '/leave-other',
    '/substitution',
    null,
  ])
    assert.equal(home.homeNotificationRoute(link, homeUser), null);
  assert.equal(
    home.homeNotificationRoute('/leave', { ...homeUser, permissions: [] }),
    null,
  );
  assert.equal(
    home.homeNotificationRoute('/leave', { ...homeUser, employeeId: null }),
    null,
  );
});
