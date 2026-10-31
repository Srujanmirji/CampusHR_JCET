import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { homeUser } from './home-fixtures.mjs';
import {
  coveragePermissions,
  coverageFixture,
  coverageDate,
} from './coverage-fixtures.mjs';
let calls, handler;
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
const api = await import('../lib/substitution-api.ts');
const user = {
  ...homeUser,
  permissions: [...homeUser.permissions, ...coveragePermissions],
};
const leave = {
  id: 'abababab-abab-4bab-8bab-abababababab',
  employee: coverageFixture.coveringFor,
  department: coverageFixture.entry.department,
  leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
  startDate: coverageDate,
  endDate: coverageDate,
  halfDay: null,
  days: 1,
};
const slot = {
  date: coverageDate,
  hours: 2,
  entry: coverageFixture.entry,
  coverage: null,
};
const coverage = {
  id: coverageFixture.id,
  kind: 'SUBSTITUTE',
  substitute: coverageFixture.substitute,
  note: 'Cover lab',
  assignedAt: `${coverageDate}T02:00:00.000Z`,
};
beforeEach(() => {
  calls = [];
  handler = async () =>
    globalThis.Response.json({ data: { leave, classes: [slot] } });
});
test('demo, signed-out, read-only, own-only and unlinked-department accounts cannot manage coverage', async () => {
  for (const [u, token] of [
    [null, null],
    [user, 'demo-token'],
    [{ ...user, permissions: ['substitution.read.own'] }, 'real'],
    [{ ...user, departmentId: null }, 'real'],
  ]) {
    await assert.rejects(api.listCoverageLeave(u, token));
    await assert.rejects(api.assignCoverage(u, token, {}));
    await assert.rejects(api.undoCoverage(u, token, coverage.id));
  }
  assert.deepEqual(calls, []);
});
test('approved leave and classes preserve real lab periods, date and scope; malformed or foreign records are refused', async () => {
  assert.equal(
    (await api.getCoverageClasses(user, 'real', leave.id)).classes[0].entry
      .endPeriod,
    3,
  );
  for (const patch of [
    { date: '2026-01-01' },
    {
      entry: { ...slot.entry, department: { ...slot.entry.department, id: 2 } },
    },
    {
      entry: {
        ...slot.entry,
        faculty: { ...slot.entry.faculty, id: user.employeeId },
      },
    },
    { entry: { ...slot.entry, day: slot.entry.day === 'MON' ? 'TUE' : 'MON' } },
  ]) {
    handler = async () =>
      globalThis.Response.json({
        data: { leave, classes: [{ ...slot, ...patch }] },
      });
    await assert.rejects(
      api.getCoverageClasses(user, 'real', leave.id),
      /outside/,
    );
  }
  handler = async () =>
    globalThis.Response.json({
      data: { leave: { ...leave, id: user.id }, classes: [slot] },
    });
  await assert.rejects(api.getCoverageClasses(user, 'real', leave.id));
});
test('leave counts and date filter are checked without inventing coverage', async () => {
  handler = async () =>
    globalThis.Response.json({ data: [{ leave, classes: 1, covered: 0 }] });
  assert.equal(
    (await api.listCoverageLeave(user, 'real', coverageDate))[0].covered,
    0,
  );
  assert.match(calls[0].path, /from=/);
  handler = async () =>
    globalThis.Response.json({ data: [{ leave, classes: 1, covered: 2 }] });
  await assert.rejects(
    api.listCoverageLeave(user, 'real', coverageDate),
    /counts/,
  );
});
test('candidate request uses exact leave, entry and date and preserves server scores and eligibility', async () => {
  const candidate = {
    faculty: {
      ...coverage.substitute,
      department: { id: 1, code: 'CSE' },
      designation: 'Professor',
    },
    score: 42,
    points: {
      subject: 0,
      availability: 25,
      department: 15,
      workload: 0,
      experience: 2,
    },
    hoursAfter: 30,
    maxHours: 20,
    eligible: false,
    reason: 'Overloaded',
  };
  handler = async () => globalThis.Response.json({ data: [candidate] });
  const result = await api.getCoverageCandidates(
    user,
    'real',
    leave.id,
    slot.entry.id,
    slot.date,
  );
  assert.deepEqual(result, [candidate]);
  assert.match(
    calls[0].path,
    new RegExp(`entryId=${slot.entry.id}&date=${slot.date}`),
  );
  handler = async () => globalThis.Response.json({ data: {} });
  await assert.rejects(
    api.getCoverageCandidates(user, 'real', leave.id, slot.entry.id, slot.date),
  );
});
const input = {
  leaveRequestId: leave.id,
  timetableEntryId: slot.entry.id,
  date: slot.date,
  substituteId: coverage.substitute.id,
  note: ' Cover lab ',
};
test('assignment validates note and confirms the returned kind, recipient and note', async () => {
  handler = async () => globalThis.Response.json({ data: coverage });
  assert.equal((await api.assignCoverage(user, 'real', input)).id, coverage.id);
  assert.equal(JSON.parse(calls[0].init.body).note, 'Cover lab');
  handler = async () =>
    globalThis.Response.json({
      data: {
        ...coverage,
        substitute: { ...coverage.substitute, id: leave.employee.id },
      },
    });
  await assert.rejects(
    api.assignCoverage(user, 'real', input),
    /did not confirm/,
  );
  assert.equal(
    api.assignmentSchema.safeParse({ ...input, substituteId: null, note: 'a' })
      .success,
    false,
  );
  assert.equal(
    api.assignmentSchema.safeParse({ ...input, note: 'x'.repeat(501) }).success,
    false,
  );
  handler = async () =>
    globalThis.Response.json({
      data: {
        ...coverage,
        kind: 'NOT_NEEDED',
        substitute: null,
        note: 'Class project work',
      },
    });
  assert.equal(
    (
      await api.assignCoverage(user, 'real', {
        ...input,
        substituteId: null,
        note: 'Class project work',
      })
    ).kind,
    'NOT_NEEDED',
  );
});
test('undo requires 204; writes serialize and never automatically retry ambiguous results', async () => {
  let release;
  handler = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const first = api.assignCoverage(user, 'real', input);
  await assert.rejects(
    api.undoCoverage(user, 'real', coverage.id),
    /still pending/,
  );
  assert.equal(calls.length, 1);
  release(globalThis.Response.json({ data: coverage }));
  await first;
  handler = async () => new globalThis.Response(null, { status: 204 });
  await api.undoCoverage(user, 'real', coverage.id);
  handler = async () => globalThis.Response.json({ data: null });
  await assert.rejects(
    api.undoCoverage(user, 'real', coverage.id),
    /did not confirm/,
  );
  handler = async () => {
    throw new Error('Network lost');
  };
  await assert.rejects(api.assignCoverage(user, 'real', input), /Network lost/);
  assert.equal(calls.length, 4);
});

test('Sunday fixtures move both the coverage date and weekday to Monday', async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  try {
    const sunday = await import('./coverage-fixtures.mjs?sunday-check');
    assert.equal(sunday.coverageDate, '2026-10-26');
    assert.equal(sunday.coverageFixture.entry.day, 'MON');
  } finally {
    mock.timers.reset();
  }
});
