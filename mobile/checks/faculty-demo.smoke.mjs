// Run only against the disposable loopback preview API. Resets its test records.
// Catches summary fixtures shadowing the stateful attendance/leave routes.
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:4011';
const api = `${origin}/api/v1`;
const state = await globalThis.fetch(`${origin}/test-state`);
assert.equal(state.status, 200, 'A disposable preview API must be running.');
assert.ok(Array.isArray((await state.json()).paths));
async function mode(name) {
  assert.equal(
    (await globalThis.fetch(`${origin}/test-mode/${name}`, { method: 'POST' })).status,
    204,
  );
}
await mode('attendance-live');
await mode('leave-live');
await mode('interactive');

const login = await globalThis.fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'faculty-check@jcet.test',
    password: 'home-check-only',
  }),
});
assert.equal(login.status, 200);
const session = await login.json();
const employeeId = session.user.employeeId;
const headers = {
  Authorization: `Bearer ${session.accessToken}`,
  'Content-Type': 'application/json',
};
async function request(path, body, expectedStatus = 200) {
  const response = await globalThis.fetch(`${api}${path}`, {
    headers,
    ...(body && { method: 'POST', body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(result));
  return result.data;
}

assert.equal(
  await request('/attendance/today'),
  null,
  'A fresh interactive demo must show no punch, not a static Home summary.',
);
const date = new Date().toISOString().slice(0, 10);
const punch = (action) =>
  request('/attendance/punch', { action, date, source: 'MOBILE' });
const checkIn = await punch('CHECK_IN');
assert.ok(checkIn.id);
assert.equal(checkIn.employeeId, employeeId);
assert.equal(checkIn.source, 'MOBILE');
assert.ok(checkIn.checkIn);
assert.equal(checkIn.checkOut, null);
assert.deepEqual(await request('/attendance/today'), checkIn);
const checkOut = await punch('CHECK_OUT');
assert.equal(checkOut.id, checkIn.id);
assert.equal(checkOut.checkIn, checkIn.checkIn);
assert.ok(Date.parse(checkOut.checkOut) >= Date.parse(checkIn.checkIn));
assert.deepEqual(await request('/attendance/today'), checkOut);
const history = await request(
  `/attendance?employeeId=${employeeId}&date=${date}&page=1&limit=50`,
);
assert.equal(history.length, 1);
assert.equal(history[0].id, checkOut.id);
assert.equal(history[0].checkOut, checkOut.checkOut);
const duplicate = await globalThis.fetch(`${api}/attendance/punch`, {
  method: 'POST', headers,
  body: JSON.stringify({ action: 'CHECK_OUT', date, source: 'MOBILE' }),
});
assert.equal(duplicate.status, 409, 'A completed day cannot be punched again.');

// Choose a future Monday, outside the seeded October 22–24 requests.
const future = new Date();
future.setUTCDate(future.getUTCDate() + 14);
while (future.getUTCDay() !== 1) future.setUTCDate(future.getUTCDate() + 1);
const leaveDate = future.toISOString().slice(0, 10);
const year = future.getUTCFullYear();
const balancePath = `/leave/balances?employeeId=${employeeId}&year=${year}`;
const balances = await request(balancePath);
const before = balances.find((row) => row.leaveType.code === 'CL');
assert.ok(before);
assert.equal(typeof before.used, 'number', 'Leave receives the full balance contract.');
const payload = {
  leaveTypeId: before.leaveType.id,
  startDate: leaveDate,
  endDate: leaveDate,
  halfDay: null,
  reason: 'Faculty demo regression: personal appointment',
};
const invalid = await globalThis.fetch(`${api}/leave/requests`, {
  method: 'POST', headers,
  body: JSON.stringify({ ...payload, reason: 'x' }),
});
assert.equal(invalid.status, 400);
const leave = await request('/leave/requests', payload, 201);
assert.equal(leave.employee.id, employeeId);
assert.equal(leave.reason, payload.reason);
assert.equal(leave.status, 'PENDING');
assert.equal(leave.pendingRole, 'HOD');
assert.equal(leave.days, 1);
const requests = await request(`/leave/requests?employeeId=${employeeId}&year=${year}`);
assert.equal(requests.filter((row) => row.id === leave.id).length, 1);
const after = (await request(balancePath)).find((row) => row.leaveType.code === 'CL');
assert.equal(after.pending, before.pending + 1);
assert.equal(after.remaining, before.remaining - 1);
const overlap = await globalThis.fetch(`${api}/leave/requests`, {
  method: 'POST', headers, body: JSON.stringify(payload),
});
assert.equal(overlap.status, 409, 'An overlapping request must not duplicate leave.');
const persisted = await request(`/leave/requests?employeeId=${employeeId}&year=${year}`);
assert.equal(persisted.filter((row) => row.reason === payload.reason).length, 1);
assert.deepEqual(await request('/attendance/today'), checkOut,
  'Using Leave must not replace the recorded attendance state.');
globalThis.console.log('Faculty demo API: check-in/out, readback/history, duplicate guards, leave validation/submission/history/balances PASS.');
