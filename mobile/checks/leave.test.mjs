import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { homeUser } from './home-fixtures.mjs';
import { leaveType, leaveRequest } from './leave-fixtures.mjs';
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
const api = await import('../lib/leave-api.ts');
beforeEach(() => {
  calls = [];
  handler = async () => globalThis.Response.json({ data: [] });
});
test('personal reads explicitly filter employee and selected year, rejecting foreign records', async () => {
  await api.getLeaveRequests('real', {
    employeeId: homeUser.employeeId,
    year: 2026,
  });
  assert.match(calls[0].path, /employeeId=aaaaaaaa/);
  assert.match(calls[0].path, /year=2026/);
  handler = async () => globalThis.Response.json({ data: [leaveRequest] });
  await assert.rejects(
    api.getLeaveRequests('real', { employeeId: homeUser.employeeId }),
    /another employee/,
  );
  await assert.rejects(
    api.getLeaveRequests('real', { year: 2025 }),
    /another year/,
  );
});
test('approval queue uses the server awaitingMe filter; malformed lists never become empty success', async () => {
  handler = async () => globalThis.Response.json({ data: [leaveRequest] });
  assert.equal(
    (await api.getLeaveRequests('real', { awaitingMe: true }))[0].pendingRole,
    'HOD',
  );
  assert.match(calls[0].path, /awaitingMe=true/);
  handler = async () => globalThis.Response.json({});
  await assert.rejects(api.getLeaveRequests('real'));
  await assert.rejects(api.getLeaveTypes('real'));
  await assert.rejects(api.getLeaveBalances('real'));
});
test('balances preserve unlimited and zero quotas, inactive types and correct year', async () => {
  handler = async () =>
    globalThis.Response.json({
      data: [leaveType, { ...leaveType, active: false }],
    });
  assert.equal((await api.getLeaveTypes('real'))[1].active, false);
  const balance = {
    leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
    active: true,
    year: 2026,
    entitled: null,
    carriedIn: 0,
    used: 1,
    pending: 0,
    remaining: null,
  };
  handler = async () =>
    globalThis.Response.json({
      data: [balance, { ...balance, remaining: 0, entitled: 0 }],
    });
  const rows = await api.getLeaveBalances('real', homeUser.employeeId, 2026);
  assert.equal(rows[0].remaining, null);
  assert.equal(rows[1].remaining, 0);
  await assert.rejects(
    api.getLeaveBalances('real', homeUser.employeeId, 2025),
    /another year/,
  );
});
test('real dates, ordering, one-year spans, Sunday and single-day halves are validated', () => {
  const value = {
    leaveTypeId: 1,
    startDate: '2026-10-22',
    endDate: '2026-10-22',
    halfDay: 'FIRST',
    reason: '  Medical visit  ',
  };
  assert.equal(api.leaveInputSchema.parse(value).reason, 'Medical visit');
  for (const patch of [
    { startDate: '2026-02-30' },
    { endDate: '2026-10-21' },
    { endDate: '2027-01-01' },
    { endDate: '2026-10-23' },
    { startDate: '2026-10-25', endDate: '2026-10-25' },
    { reason: 'a' },
    { reason: 'x'.repeat(501) },
  ])
    assert.equal(
      api.leaveInputSchema.safeParse({ ...value, ...patch }).success,
      false,
    );
});
test('apply verifies pending owner and payload instead of accepting a fabricated success', async () => {
  const payload = {
    leaveTypeId: 1,
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
    reason: leaveRequest.reason,
  };
  handler = async () => globalThis.Response.json({ data: leaveRequest });
  const user = { id: leaveRequest.employee.id, role: 'Faculty' };
  assert.equal(
    (await api.applyForLeave('real', payload, user)).status,
    'PENDING',
  );
  await assert.rejects(
    api.applyForLeave('real', payload, { ...user, id: homeUser.employeeId }),
    /did not confirm/,
  );
  handler = async () =>
    globalThis.Response.json({ data: { ...leaveRequest, status: 'APPROVED' } });
  await assert.rejects(
    api.applyForLeave('real', payload, user),
    /did not confirm/,
  );
});
test('HOD recommendation remains pending with HR; rejection and cancellation require confirmed states', async () => {
  handler = async () =>
    globalThis.Response.json({
      data: {
        ...leaveRequest,
        pendingRole: 'HR Admin',
        decisions: [
          {
            step: 0,
            role: 'HOD',
            approved: true,
            note: 'Recommended',
            decidedAt: '2026-10-21T10:00:00Z',
          },
        ],
      },
    });
  const recommended = await api.decideLeaveRequest(
    'real',
    leaveRequest.id,
    true,
    'Recommended',
  );
  assert.equal(recommended.status, 'PENDING');
  assert.equal(recommended.pendingRole, 'HR Admin');
  await assert.rejects(
    api.cancelLeaveRequest('real', leaveRequest.id),
    /did not confirm/,
  );
  handler = async () =>
    globalThis.Response.json({
      data: { ...leaveRequest, status: 'CANCELLED', pendingRole: null },
    });
  assert.equal(
    (await api.cancelLeaveRequest('real', leaveRequest.id)).status,
    'CANCELLED',
  );
  await assert.rejects(
    api.decideLeaveRequest('real', leaveRequest.id, false, 'No'),
    /minimum/,
  );
  await assert.rejects(
    api.decideLeaveRequest('real', leaveRequest.id, true, 'x'.repeat(501)),
    /500/,
  );
});
test('writes serialize double taps and do not retry unknown outcomes', async () => {
  let release;
  handler = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const first = api.cancelLeaveRequest('real', leaveRequest.id);
  await assert.rejects(
    api.cancelLeaveRequest('real', leaveRequest.id),
    /still pending/,
  );
  release(
    globalThis.Response.json({
      data: { ...leaveRequest, status: 'CANCELLED', pendingRole: null },
    }),
  );
  await first;
  assert.equal(calls.length, 1);
  handler = async () => {
    throw new Error('Network lost');
  };
  await assert.rejects(
    api.cancelLeaveRequest('real', leaveRequest.id),
    /Network lost/,
  );
  assert.equal(calls.length, 2);
  assert.equal(
    api.uncertainLeaveWrite(new ApiError(409, 'CHANGED', 'Changed')),
    false,
  );
  assert.equal(
    api.uncertainLeaveWrite(new ApiError(503, 'LOST', 'Unknown')),
    true,
  );
});
test('request lookup verifies the requested id when reconciling an uncertain write', async () => {
  handler = async () => globalThis.Response.json({ data: leaveRequest });
  assert.equal(
    (await api.getLeaveRequest('real', leaveRequest.id)).id,
    leaveRequest.id,
  );
  await assert.rejects(
    api.getLeaveRequest('real', homeUser.id),
    /another request/,
  );
});
