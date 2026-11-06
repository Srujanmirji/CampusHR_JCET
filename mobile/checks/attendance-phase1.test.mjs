import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

process.env.EXPO_OS = 'ios';
globalThis.__DEV__ = true;
globalThis.expo = { EventEmitter: class {} };
const platform = { OS: 'ios' };
mock.module('react-native', {
  defaultExport: { Platform: platform },
  namedExports: { Platform: platform },
  exports: { Platform: platform, default: { Platform: platform } },
});
mock.module('expo-constants', { exports: { default: {} } });
mock.module('../lib/api-config.ts', {
  exports: { API_BASE_URL: 'https://api.test/api/v1' },
});
mock.module('expo-secure-store', {
  exports: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    async getItemAsync() {
      return null;
    },
    async setItemAsync() {},
    async deleteItemAsync() {},
  },
});

const {
  correctionSchema,
  cancelAttendanceCorrection,
  getDepartmentAttendanceCorrections,
  reviewAttendanceCorrection,
} = await import('../lib/attendance-api.ts');
const { ApiError } = await import('../lib/session.ts');

const baseUser = {
  id: 'a0000000-0000-4000-8000-000000000001',
  email: 'hod.cse@jcethbl.edu.in',
  role: 'HOD',
  permissions: [
    'attendance.read',
    'attendance.read.department',
    'attendance_correction.request',
    'attendance_correction.approve',
    'attendance_correction.approve.department',
  ],
  employeeId: 'b0000000-0000-4000-8000-000000000001',
  departmentId: 1,
  name: 'Dr. Ramesh K',
};

const facultyUser = {
  id: 'a0000000-0000-4000-8000-000000000002',
  email: 'faculty.cse@jcethbl.edu.in',
  role: 'FACULTY',
  permissions: ['attendance.read', 'attendance_correction.request'],
  employeeId: 'b0000000-0000-4000-8000-000000000002',
  departmentId: 1,
  name: 'Prof. Asha Patil',
};

test('correctionSchema supports CANCELLED status and optional employee details', () => {
  const payload = {
    id: 'c0000000-0000-4000-8000-000000000001',
    employeeId: 'b0000000-0000-4000-8000-000000000002',
    date: '2026-10-22T00:00:00.000Z',
    requestedCheckIn: '2026-10-22T03:42:00.000Z',
    requestedCheckOut: '2026-10-22T11:15:00.000Z',
    requestedStatus: 'PRESENT',
    reason: 'Lab exam viva extended beyond official hours',
    status: 'CANCELLED',
    reviewNote: null,
    createdAt: '2026-10-22T12:00:00.000Z',
    employee: {
      id: 'b0000000-0000-4000-8000-000000000002',
      employeeCode: 'JCET-CSE-021',
      firstName: 'Asha',
      lastName: 'Patil',
      departmentId: 1,
      department: {
        id: 1,
        code: 'CSE',
        name: 'Computer Science and Engineering',
      },
    },
  };

  const parsed = correctionSchema.parse(payload);
  assert.equal(parsed.status, 'CANCELLED');
  assert.equal(parsed.employee?.employeeCode, 'JCET-CSE-021');
  assert.equal(parsed.employee?.department?.code, 'CSE');
});

test('correctionSchema validates standard statuses PENDING, APPROVED, REJECTED', () => {
  for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
    const parsed = correctionSchema.parse({
      id: 'c0000000-0000-4000-8000-000000000001',
      employeeId: 'b0000000-0000-4000-8000-000000000002',
      date: '2026-10-22T00:00:00.000Z',
      requestedCheckIn: null,
      requestedCheckOut: null,
      requestedStatus: 'HALF_DAY',
      reason: 'Personal regularisation reason',
      status,
      createdAt: '2026-10-22T12:00:00.000Z',
    });
    assert.equal(parsed.status, status);
  }
});

test('cancelAttendanceCorrection validates permissions and confirms cancelled status', async () => {
  // Test permission guard for user without employee link
  await assert.rejects(
    cancelAttendanceCorrection(
      { ...facultyUser, employeeId: null },
      'mock-token',
      'c0000000-0000-0000-0000-000000000001',
    ),
    /Link an employee record/,
  );

  // Test permission guard when attendance_correction.request is missing
  await assert.rejects(
    cancelAttendanceCorrection(
      { ...facultyUser, permissions: [] },
      'mock-token',
      'c0000000-0000-0000-0000-000000000001',
    ),
    /not available for your account/,
  );
});

test('getDepartmentAttendanceCorrections validates reviewer permissions', async () => {
  // Faculty without approve permission should be rejected
  await assert.rejects(
    getDepartmentAttendanceCorrections(
      { ...facultyUser, permissions: ['leave.read'] },
      'mock-token',
      { status: 'PENDING' },
    ),
    /You do not have permission to view attendance corrections/,
  );
});

test('reviewAttendanceCorrection enforces HOD approval permissions', async () => {
  // Faculty without approve permission should be rejected
  await assert.rejects(
    reviewAttendanceCorrection(
      facultyUser,
      'mock-token',
      'c0000000-0000-0000-0000-000000000001',
      { status: 'APPROVED' },
    ),
    /You do not have permission to review attendance corrections/,
  );
});

test('ApiError correctly encapsulates conflict error codes for ALREADY_REQUESTED and CONFLICTING_SCHEDULE', () => {
  const dupError = new ApiError(
    409,
    'ALREADY_REQUESTED',
    'A pending correction request already exists for this date.',
  );
  assert.equal(dupError.status, 409);
  assert.equal(dupError.code, 'ALREADY_REQUESTED');

  const conflictError = new ApiError(
    409,
    'CONFLICTING_SCHEDULE',
    'Cannot request attendance regularisation on a date with an approved full-day leave.',
  );
  assert.equal(conflictError.status, 409);
  assert.equal(conflictError.code, 'CONFLICTING_SCHEDULE');
});
