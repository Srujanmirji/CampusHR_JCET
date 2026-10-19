import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AttendanceRecord,
  AttendanceRepository,
  CorrectionRecord,
} from '../src/modules/attendance/attendance.repository.js';
import { createAttendanceService } from '../src/modules/attendance/attendance.service.js';

function mockEmployee() {
  return {
    id: 'emp-1',
    employeeCode: 'JCET-CSE-001',
    firstName: 'Faculty',
    lastName: 'User',
    departmentId: 1,
    department: { id: 1, code: 'CSE', name: 'Computer Science' },
  };
}

function createMemoryAttendanceRepository(): AttendanceRepository {
  let settings = {
    workDayStart: '09:00',
    workDayEnd: '17:00',
    gracePeriodMinutes: 15,
    halfDayHours: 4.0,
    fullDayHours: 7.0,
  };
  const attendanceRecords: AttendanceRecord[] = [];
  const corrections: CorrectionRecord[] = [];

  return {
    async getSettings() {
      return { ...settings };
    },
    async updateSettings(data) {
      settings = { ...data };
      return { ...settings };
    },
    async findByEmployeeAndDate(employeeId: string, date: Date) {
      const dStr = date.toISOString().split('T')[0];
      return (
        attendanceRecords.find(
          (r) =>
            r.employeeId === employeeId &&
            new Date(r.date).toISOString().split('T')[0] === dStr,
        ) ?? null
      );
    },
    async findById(id: string) {
      return attendanceRecords.find((r) => r.id === id) ?? null;
    },
    async recordPunch(params) {
      const dStr = params.date.toISOString().split('T')[0];
      const idx = attendanceRecords.findIndex(
        (r) =>
          r.employeeId === params.employeeId &&
          new Date(r.date).toISOString().split('T')[0] === dStr,
      );
      if (idx >= 0) {
        attendanceRecords[idx] = {
          ...attendanceRecords[idx],
          checkIn: params.checkIn ?? attendanceRecords[idx].checkIn,
          checkOut: params.checkOut ?? attendanceRecords[idx].checkOut,
          status: params.status,
          source: params.source,
          notes: params.notes ?? attendanceRecords[idx].notes,
          updatedAt: new Date(),
        };
        return attendanceRecords[idx];
      }
      const newRec: AttendanceRecord = {
        id: `att-${attendanceRecords.length + 1}`,
        employeeId: params.employeeId,
        date: params.date,
        checkIn: params.checkIn ?? null,
        checkOut: params.checkOut ?? null,
        status: params.status,
        source: params.source,
        notes: params.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: mockEmployee(),
      };
      attendanceRecords.push(newRec);
      return newRec;
    },
    async list(params) {
      let items = [...attendanceRecords];
      if (params.employeeId) items = items.filter((r) => r.employeeId === params.employeeId);
      if (params.status) items = items.filter((r) => r.status === params.status);
      return { items: items.slice(params.skip, params.skip + params.take), total: items.length };
    },
    async createCorrection(data) {
      const newCorr: CorrectionRecord = {
        id: `corr-${corrections.length + 1}`,
        attendanceId: data.attendanceId ?? null,
        employeeId: data.employeeId,
        date: data.date,
        requestedCheckIn: data.requestedCheckIn ?? null,
        requestedCheckOut: data.requestedCheckOut ?? null,
        requestedStatus: data.requestedStatus,
        reason: data.reason,
        status: 'PENDING',
        reviewedByUserId: null,
        reviewedAt: null,
        reviewNote: null,
        reviewedByUser: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: mockEmployee(),
      };
      corrections.push(newCorr);
      return newCorr;
    },
    async findCorrectionById(id: string) {
      return corrections.find((c) => c.id === id) ?? null;
    },
    async listCorrections(params) {
      let items = [...corrections];
      if (params.employeeId) items = items.filter((c) => c.employeeId === params.employeeId);
      if (params.status) items = items.filter((c) => c.status === params.status);
      return { items: items.slice(params.skip, params.skip + params.take), total: items.length };
    },
    async updateCorrection(id, data) {
      const idx = corrections.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('Not found');
      corrections[idx] = {
        ...corrections[idx],
        status: data.status,
        reviewedByUserId: data.reviewedByUserId,
        reviewedAt: data.reviewedAt,
        reviewNote: data.reviewNote ?? null,
        updatedAt: new Date(),
      };
      return corrections[idx];
    },
    async applyCorrection(params) {
      return this.recordPunch({
        employeeId: params.employeeId,
        date: params.date,
        checkIn: params.checkIn ?? undefined,
        checkOut: params.checkOut ?? undefined,
        status: params.status,
        source: 'MANUAL',
      });
    },
  };
}

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
  const applied = await repo.findByEmployeeAndDate('emp-1', new Date('2026-10-18T00:00:00Z'));
  assert.ok(applied);
  assert.equal(applied.status, 'PRESENT');
  assert.equal(applied.source, 'MANUAL');
});
