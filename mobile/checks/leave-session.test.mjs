import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
mock.module('../lib/session.ts', {
  exports: {
    ApiError: class extends Error {},
    apiFetch: async () => {
      throw new Error('Session has ended');
    },
  },
});
const {
  getLeaveTypes,
  getLeaveBalances,
  getLeaveRequests,
  applyForLeave,
  decideLeaveRequest,
  cancelLeaveRequest,
} = await import('../lib/leave-api.ts');
const user = { id: 'test-user', role: 'Faculty' };
const operations = (token) => [
  () => getLeaveTypes(token),
  () => getLeaveBalances(token),
  () => getLeaveRequests(token),
  () =>
    applyForLeave(
      token,
      {
        leaveTypeId: 1,
        startDate: '2026-10-22',
        endDate: '2026-10-22',
        reason: 'Test only',
      },
      user,
    ),
  () => decideLeaveRequest(token, 'request-id', true),
  () => cancelLeaveRequest(token, 'request-id'),
];
test('live leave reads and writes propagate session errors instead of demo data or success', async () => {
  for (const operation of operations('real-token'))
    await assert.rejects(operation(), /Session has ended/);
});
test('signed-out leave calls cannot enter the local demo path', async () => {
  for (const operation of operations(null))
    await assert.rejects(operation(), /Sign in/);
});
test('explicit demo sessions retain the existing preview lists', async () => {
  assert.ok((await getLeaveTypes('demo-token')).length > 0);
  assert.ok((await getLeaveBalances('demo-token')).length > 0);
});
