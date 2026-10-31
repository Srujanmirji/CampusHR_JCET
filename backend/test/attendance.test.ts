import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryAttendanceRepository } from './attendance-memory.js';
import { createAttendanceService } from '../src/modules/attendance/attendance.service.js';

test('punch records check-in and check-out with correct statuses', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  const facultyAccess = {
    userId: 'user-1',
    role: 'Faculty',
    scope: 'own' as const,
    employeeId: 'emp-1',
    departmentId: 1,
    permissions: new Set(['attendance.read', 'attendance.check_in']),
  };

  // 1. Initial Punch In
  const checkIn = await service.punch(facultyAccess, { source: 'WEB' });
  assert.equal(checkIn.employeeId, 'emp-1');
  assert.ok(checkIn.checkIn);
  assert.ok(!checkIn.checkOut);
  assert.ok(['PRESENT', 'LATE'].includes(checkIn.status));

  // 2. Fetch today
  const todayRec = await service.today(facultyAccess);
  assert.equal(todayRec?.id, checkIn.id);

  // 3. Second Punch (Check-Out)
  const checkOut = await service.punch(facultyAccess, { source: 'WEB' });
  assert.ok(checkOut.checkOut);
});

test('attendance requires a linked employee record', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  const adminWithoutEmployee = {
    userId: 'admin-1',
    role: 'Super Admin',
    scope: 'all' as const,
    employeeId: null,
    departmentId: null,
    permissions: new Set(['attendance.check_in']),
  };

  await assert.rejects(
    () => service.punch(adminWithoutEmployee, { source: 'WEB' }),
    { message: 'Only staff linked to an employee record can punch in/out.' },
  );
});

test('requesting and reviewing an attendance correction updates attendance', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  const facultyAccess = {
    userId: 'user-1',
    role: 'Faculty',
    scope: 'own' as const,
    employeeId: 'emp-1',
    departmentId: 1,
    permissions: new Set(['attendance_correction.request', 'attendance.read']),
  };

  const hodAccess = {
    userId: 'hod-1',
    role: 'HOD',
    scope: 'department' as const,
    employeeId: 'emp-hod',
    departmentId: 1,
    permissions: new Set(['attendance_correction.approve', 'attendance.read']),
  };

  // 1. Request correction
  const corr = await service.requestCorrection(facultyAccess, {
    date: '2026-10-18',
    requestedCheckIn: '2026-10-18T09:05:00.000Z',
    requestedCheckOut: '2026-10-18T17:05:00.000Z',
    requestedStatus: 'PRESENT',
    reason: 'Biometric device was offline',
  });
  assert.equal(corr.status, 'PENDING');
  assert.equal(corr.employeeId, 'emp-1');

  // 2. Approve correction
  const approved = await service.reviewCorrection(hodAccess, corr.id, {
    status: 'APPROVED',
    reviewNote: 'Approved as per manual register',
  });
  assert.equal(approved.status, 'APPROVED');

  // 3. Verify attendance record is created/applied
  const applied = await repo.findByEmployeeAndDate(
    'emp-1',
    new Date('2026-10-18T00:00:00Z'),
  );
  assert.ok(applied);
  assert.equal(applied.status, 'PRESENT');
  assert.equal(applied.source, 'MANUAL');
});
