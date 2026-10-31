import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { attendanceUser, attendanceFixtures } from './attendance-fixtures.mjs';
let calls, fixture, handler;
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
mock.module('../lib/session.ts', {
  exports: {
    ApiError,
    apiFetch: async (path, init) => {
      calls.push({ path, init });
      return handler(path, init);
    },
  },
});
const api = await import('../lib/attendance-api.ts');
beforeEach(() => {
  calls = [];
  fixture = attendanceFixtures();
  handler = async (path) =>
    globalThis.Response.json(
      path.startsWith('/attendance/corrections?')
        ? { data: [fixture.correction], meta: fixture.meta }
        : path.startsWith('/attendance?')
          ? { data: [fixture.record], meta: fixture.meta }
          : path === '/attendance/settings'
            ? { data: fixture.policy }
            : { data: fixture.record },
    );
});
test('HOD personal month and request list always send their employee filter and UTC boundaries', async () => {
  assert.equal(
    (await api.getAttendanceHistory(attendanceUser, 'real', '2026-10')).length,
    1,
  );
  await api.getAttendanceCorrections(attendanceUser, 'real');
  for (const call of calls)
    assert.equal(
      new globalThis.URL(call.path, 'https://test.invalid').searchParams.get(
        'employeeId',
      ),
      attendanceUser.employeeId,
    );
  const month = new globalThis.URL(calls[0].path, 'https://test.invalid');
  assert.equal(month.searchParams.get('startDate'), '2026-10-01');
  assert.equal(month.searchParams.get('endDate'), '2026-10-31');
  assert.equal(
    (await api.getAttendancePolicy(attendanceUser, 'real')).gracePeriodMinutes,
    15,
  );
});
test('no employee, demo, missing permission and signed-out callers never call attendance endpoints', async () => {
  for (const [user, token] of [
    [null, null],
    [{ ...attendanceUser, employeeId: null }, 'real'],
    [{ ...attendanceUser, permissions: [] }, 'real'],
    [attendanceUser, 'demo-real'],
  ]) {
    for (const load of [
      (u, t) => api.getAttendanceToday(u, t),
      (u, t) => api.getAttendanceHistory(u, t, '2026-10'),
      api.getAttendanceCorrections,
      api.getAttendancePolicy,
      (u, t) => api.punchAttendance(u, t, 'CHECK_IN'),
    ])
      await assert.rejects(load(user, token));
  }
  assert.deepEqual(calls, []);
});
test('foreign records, wrong month/date/page and malformed responses are refused', async () => {
  fixture.record.employeeId = attendanceUser.id;
  await assert.rejects(
    api.getAttendanceToday(attendanceUser, 'real', '2026-10-21'),
    /another employee/,
  );
  await assert.rejects(
    api.getAttendanceHistory(attendanceUser, 'real', '2026-10'),
    /another employee/,
  );
  fixture.correction.employeeId = attendanceUser.id;
  await assert.rejects(
    api.getAttendanceCorrections(attendanceUser, 'real'),
    /another employee/,
  );
  fixture = attendanceFixtures();
  await assert.rejects(
    api.getAttendanceToday(attendanceUser, 'real', '2026-10-22'),
    /day changed/,
  );
  await assert.rejects(
    api.getAttendanceHistory(attendanceUser, 'real', '2026-09'),
    /outside/,
  );
  await assert.rejects(
    api.getAttendanceCorrections(attendanceUser, 'real', 2),
    /another request page/,
  );
  handler = async () => globalThis.Response.json({ data: [{}] });
  await assert.rejects(
    api.getAttendanceHistory(attendanceUser, 'real', '2026-10'),
  );
});
test('null today and empty history are real empty states, not absence', async () => {
  handler = async (path) =>
    globalThis.Response.json(
      path === '/attendance/today'
        ? { data: null }
        : { data: [], meta: { ...fixture.meta, total: 0 } },
    );
  assert.equal(await api.getAttendanceToday(attendanceUser, 'real'), null);
  assert.deepEqual(
    await api.getAttendanceHistory(attendanceUser, 'real', '2026-10'),
    [],
  );
});
test('punches use explicit dated MOBILE actions and validate server confirmation', async () => {
  fixture.record.date = '2026-10-21T00:00:00.000Z';
  await api.punchAttendance(attendanceUser, 'real', 'CHECK_OUT', '2026-10-21');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    source: 'MOBILE',
    action: 'CHECK_OUT',
    date: '2026-10-21',
  });
  assert.ok(calls[0].init.signal);
  fixture.record.checkOut = null;
  await assert.rejects(
    api.punchAttendance(attendanceUser, 'real', 'CHECK_OUT', '2026-10-21'),
    /did not confirm/,
  );
});
test('in-flight writes are guarded synchronously without automatically resending an ambiguous POST', async () => {
  let resolve;
  handler = () =>
    new Promise((done) => {
      resolve = done;
    });
  const first = api.punchAttendance(
    attendanceUser,
    'real',
    'CHECK_IN',
    '2026-10-21',
  );
  await assert.rejects(
    api.punchAttendance(attendanceUser, 'real', 'CHECK_IN', '2026-10-21'),
    /still pending/,
  );
  assert.equal(calls.length, 1);
  resolve(globalThis.Response.json({ data: fixture.record }));
  await first;
  handler = async () => {
    throw new TypeError('Response lost');
  };
  await assert.rejects(
    api.punchAttendance(attendanceUser, 'real', 'CHECK_IN', '2026-10-21'),
    /Response lost/,
  );
  assert.equal(calls.length, 2);
});
test('correction validation rejects bad calendar/time, reversed times, future dates and short reasons', () => {
  const input = {
    date: '2026-10-01',
    checkIn: '09:00',
    checkOut: '17:00',
    requestedStatus: 'PRESENT',
    reason: 'Correct missing device record.',
  };
  for (const patch of [
    { date: '2026-02-30' },
    { date: '2099-01-01' },
    { checkIn: '99:00' },
    { checkOut: '08:00' },
    { checkIn: '' },
    { reason: 'x' },
  ])
    assert.equal(
      api.correctionInputSchema.safeParse({ ...input, ...patch }).success,
      false,
    );
});
test('correction writes send UTC timestamps, require PENDING and never claim attendance approval', async () => {
  const input = {
    date: '2026-10-01',
    checkIn: '09:00',
    checkOut: '17:00',
    requestedStatus: 'PRESENT',
    reason: ' Correct missing device record. ',
  };
  handler = async (_path, init) => {
    const body = JSON.parse(init.body);
    return globalThis.Response.json({
      data: {
        ...fixture.correction,
        date: `${body.date}T00:00:00.000Z`,
        reason: body.reason,
        requestedCheckIn: body.requestedCheckIn,
        requestedCheckOut: body.requestedCheckOut,
        requestedStatus: body.requestedStatus,
      },
    });
  };
  const result = await api.requestAttendanceCorrection(
    attendanceUser,
    'real',
    input,
  );
  assert.equal(result.status, 'PENDING');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    date: input.date,
    requestedCheckIn: '2026-10-01T09:00:00.000Z',
    requestedCheckOut: '2026-10-01T17:00:00.000Z',
    requestedStatus: 'PRESENT',
    reason: input.reason.trim(),
  });
});
test('server refusals differ from uncertain failures, and reads never fall back to demo records', async () => {
  for (const status of [400, 401, 403, 409])
    assert.equal(
      api.uncertainWrite(new ApiError(status, 'FAIL', 'Refused')),
      false,
    );
  for (const error of [
    new TypeError('Offline'),
    new ApiError(500, 'FAIL', 'Error'),
  ]) {
    assert.equal(api.uncertainWrite(error), true);
    handler = async () => {
      throw error;
    };
    await assert.rejects(
      api.getAttendanceHistory(attendanceUser, 'real', '2026-10'),
    );
  }
});
test('calendar month arithmetic and recorded duration do not depend on phone timezone', () => {
  assert.deepEqual(api.monthRange('2028-02'), {
    startDate: '2028-02-01',
    endDate: '2028-02-29',
  });
  assert.equal(api.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(
    api.attendanceDay(new Date('2026-10-21T22:00:00Z')),
    '2026-10-21',
  );
  assert.equal(api.recordedDuration(fixture.record), '8h 0m');
  assert.equal(
    api.recordedDuration({ ...fixture.record, checkOut: null }),
    null,
  );
});
