import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLeaveService } from '../../backend/src/modules/leave/leave.service.ts';
import { createLeavePreviewRepository } from './leave-fixtures.mjs';
import { homeUser } from './home-fixtures.mjs';

const faculty = {
  ...homeUser,
  id: '12121212-1212-4212-8212-121212121212',
  role: 'Faculty',
};
const input = {
  leaveTypeId: 1,
  startDate: '2026-11-02',
  endDate: '2026-11-02',
  halfDay: null,
  reason: 'Personal appointment',
};
const serviceFor = (users) =>
  createLeaveService(createLeavePreviewRepository(users), {
    notifyRole: async () => {},
    notifyEmployee: async () => {},
  });

test('preview faculty leave uses the linked employee and Faculty approval chain', async () => {
  const service = serviceFor([homeUser, faculty]);
  const request = await service.apply({ userId: faculty.id }, input);
  assert.equal(request.employee.id, homeUser.employeeId);
  assert.equal(request.status, 'PENDING');
  assert.equal(request.pendingRole, 'HOD');
  assert.deepEqual(request.approverRoles, ['HOD', 'HR Admin']);

  // The pre-existing HOD preview keeps its own Principal approval path.
  const hod = await serviceFor().apply({ userId: homeUser.id }, input);
  assert.equal(hod.pendingRole, 'Principal');
});

test('preview users without an employee link still cannot submit leave', async () => {
  const service = serviceFor([{ ...faculty, employeeId: null }]);
  await assert.rejects(
    service.apply({ userId: faculty.id }, input),
    /not linked to an active employee/,
  );
  await assert.rejects(
    service.apply({ userId: 'unknown-user' }, input),
    /not linked to an active employee/,
  );
});
