import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { homeFixtures } from './home-fixtures.mjs';
import {
  scheduleFixture,
  scheduleUser,
  schedulePeriods,
} from './schedule-fixtures.mjs';
let paths, responses, failure;
mock.module('../lib/session.ts', {
  exports: {
    apiFetch: async (path) => {
      paths.push(path);
      if (failure) throw failure;
      return globalThis.Response.json(
        responses[new globalThis.URL(path, 'https://test.invalid').pathname],
      );
    },
  },
});
const {
  getOwnSchedule,
  getDatedDuties,
  mergeDatedDuties,
  weekDates,
  dayForDate,
  classStatus,
} = await import('../lib/schedule-api.ts');
beforeEach(() => {
  paths = [];
  failure = null;
  responses = {
    ...homeFixtures(),
    '/substitution/mine': { data: [scheduleFixture()] },
  };
  responses['/timetable/periods'] = { data: schedulePeriods };
});
test('own regular schedule and cookie-free own duties use existing authenticated API paths', async () => {
  const regular = await getOwnSchedule(
    scheduleUser,
    'real-token',
    '2026-10-21',
  );
  const duties = await getDatedDuties(scheduleUser, 'real-token');
  assert.equal(regular.entries.length, 1);
  assert.ok(
    paths.find((path) => path.includes(`facultyId=${scheduleUser.employeeId}`)),
  );
  assert.ok(paths.includes('/substitution/mine'));
  assert.equal(duties[0].coveringFor.name, 'Absent Faculty');
});
test('dated coverage appears once on its exact date and never repeats on the same weekday next week', async () => {
  const regular = await getOwnSchedule(
    scheduleUser,
    'real-token',
    '2026-10-21',
  );
  const duty = scheduleFixture();
  const today = mergeDatedDuties(
    regular.entries,
    [duty, duty],
    '2026-10-21',
    schedulePeriods,
  );
  assert.equal(today.length, 2);
  assert.equal(today[1].dutyDate, '2026-10-21');
  assert.equal(today[1].isSubstitute, true);
  assert.equal(today[1].startPeriod, 2);
  assert.equal(today[1].endPeriod, 3);
  assert.equal(today[1].batch, 'A2');
  assert.match(today[1].substituteNote, /Absent Faculty/);
  assert.equal(today[1].subject.name, duty.entry.subject.name);
  assert.equal(
    mergeDatedDuties(regular.entries, [duty], '2026-10-28', schedulePeriods)
      .length,
    1,
  );
  assert.equal(
    mergeDatedDuties(regular.entries, [duty], '2026-10-22', schedulePeriods)
      .length,
    0,
  );
  assert.equal(
    regular.entries[0].isSubstitute,
    undefined,
    'does not mutate regular data',
  );
});
test('undo/refresh replaces duties instead of retaining a local assignment', async () => {
  const duties = await getDatedDuties(scheduleUser, 'real-token');
  assert.equal(
    mergeDatedDuties([], duties, '2026-10-21', schedulePeriods).length,
    1,
  );
  responses['/substitution/mine'] = { data: [] };
  assert.deepEqual(await getDatedDuties(scheduleUser, 'real-token'), []);
  assert.deepEqual(mergeDatedDuties([], [], '2026-10-21', schedulePeriods), []);
});
test('missing employee, no permission, signed-out and demo sessions never request personal schedules or duties', async () => {
  for (const load of [
    (user, token) => getOwnSchedule(user, token, '2026-10-21'),
    getDatedDuties,
  ]) {
    for (const [user, token] of [
      [null, null],
      [{ ...scheduleUser, employeeId: null }, 'real'],
      [{ ...scheduleUser, permissions: [] }, 'real'],
      [scheduleUser, 'demo-token'],
    ])
      await assert.rejects(load(user, token));
  }
  assert.deepEqual(paths, []);
});
test('foreign substitute, malformed payload and mismatched weekday fail closed', async () => {
  responses['/substitution/mine'].data[0].substitute.id = scheduleUser.id;
  await assert.rejects(getDatedDuties(scheduleUser, 'real'), /do not belong/);
  responses['/substitution/mine'] = {
    data: [scheduleFixture('2026-10-22', 'WED')],
  };
  await assert.rejects(getDatedDuties(scheduleUser, 'real'), /does not match/);
  for (const data of [
    [{}],
    [{ ...scheduleFixture(), date: '2026-02-30' }],
    [{ ...scheduleFixture(), kind: 'NOT_NEEDED' }],
  ]) {
    responses['/substitution/mine'] = { data };
    await assert.rejects(getDatedDuties(scheduleUser, 'real'));
  }
});
test('duties API failure is independent of the regular schedule and never supplies demo data', async () => {
  for (const message of [
    'Expired (401)',
    'Forbidden (403)',
    'Server error (500)',
    'Offline',
  ]) {
    failure = new Error(message);
    await assert.rejects(getDatedDuties(scheduleUser, 'real'), { message });
    failure = null;
    assert.equal(
      (await getOwnSchedule(scheduleUser, 'real', '2026-10-21')).entries.length,
      1,
    );
  }
});
test('missing duty period timings fail instead of inventing default times', () => {
  assert.throws(
    () =>
      mergeDatedDuties([], [scheduleFixture()], '2026-10-21', [
        schedulePeriods[0],
      ]),
    /timings are missing/,
  );
});
test('Sunday has no regular requests; date arithmetic crosses weeks and years without local timezone drift', async () => {
  assert.deepEqual(await getOwnSchedule(scheduleUser, 'real', '2026-10-25'), {
    periods: [],
    entries: [],
  });
  assert.deepEqual(paths, []);
  assert.equal(weekDates('2026-12-31')[6], '2027-01-03');
  assert.equal(weekDates('2026-12-31', 1)[0], '2027-01-04');
  assert.equal(weekDates('2026-10-25')[0], '2026-10-19');
  assert.equal(dayForDate('2026-10-25'), null);
  assert.throws(() => dayForDate('2026-02-30'));
});
test('live class status updates at boundaries and never labels another date as currently active', () => {
  assert.equal(
    classStatus('2026-10-21', 540, 600, { date: '2026-10-21', minutes: 539 }),
    'Upcoming',
  );
  assert.equal(
    classStatus('2026-10-21', 540, 600, { date: '2026-10-21', minutes: 540 }),
    'In progress',
  );
  assert.equal(
    classStatus('2026-10-21', 540, 600, { date: '2026-10-21', minutes: 600 }),
    'Completed',
  );
  assert.equal(
    classStatus('2026-10-28', 540, 600, { date: '2026-10-21', minutes: 550 }),
    null,
  );
});
