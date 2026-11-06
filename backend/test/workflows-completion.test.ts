import assert from 'node:assert/strict';
import test from 'node:test';
import { createTimetableService } from '../src/modules/timetable/timetable.service.js';
import { createSubstitutionService } from '../src/modules/substitution/substitution.service.js';
import { createAttendanceService } from '../src/modules/attendance/attendance.service.js';
import { createMemoryAttendanceRepository } from './attendance-memory.js';
import type { AcademicCalendarService } from '../src/modules/academic-calendar/academic-calendar.service.js';
import type { SubstitutionRepository } from '../src/modules/substitution/substitution.repository.js';
import type { Notifier } from '../src/modules/notifications/notifications.service.js';

const mockNotifier: Notifier = {
  async notifyRole() {},
  async notifyEmployee() {},
};

test('Academic Calendar ↔ Timetable: rejects scheduling on non-working day', async () => {
  const mockCalendarService: Partial<AcademicCalendarService> = {
    async getWeeklyWorkingPatterns() {
      return [
        { id: '1', dayOfWeek: 1, dayName: 'Monday', isWorkingDay: true, description: null },
        { id: '2', dayOfWeek: 2, dayName: 'Tuesday', isWorkingDay: true, description: null },
        { id: '3', dayOfWeek: 3, dayName: 'Wednesday', isWorkingDay: true, description: null },
        { id: '4', dayOfWeek: 4, dayName: 'Thursday', isWorkingDay: true, description: null },
        { id: '5', dayOfWeek: 5, dayName: 'Friday', isWorkingDay: true, description: null },
        { id: '6', dayOfWeek: 6, dayName: 'Saturday', isWorkingDay: false, description: 'Weekend Off' },
      ];
    },
  };

  const mockRepo: any = {
    async findDepartment() { return { id: 1 }; },
    async findSubject() { return { id: 10, departmentId: 1, semester: 5, kind: 'THEORY' }; },
    async findFaculty() { return { id: 'f1', status: 'ACTIVE', designation: { category: 'TEACHING' } }; },
    async findRoom() { return { id: 20, kind: 'CLASSROOM' }; },
    async periods() { return [{ number: 1 }, { number: 2 }, { number: 3 }]; },
  };

  const service = createTimetableService(mockRepo, mockCalendarService as AcademicCalendarService);
  const access: any = { userId: 'admin', scope: 'all' };

  await assert.rejects(
    () =>
      service.create(access, {
        departmentId: 1,
        semester: 5,
        section: 'A',
        batch: null,
        subjectId: 10,
        facultyId: 'f1',
        roomId: 20,
        day: 'SAT',
        startPeriod: 1,
        endPeriod: 2,
      }),
    (err: any) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'NON_WORKING_DAY');
      assert.ok(err.message.includes('configured as a non-working day'));
      return true;
    },
  );
});

test('Smart Substitution: detects Exam Duty & On-Duty conflicts with clear reasons', async () => {
  const staffFaculty = [
    {
      id: 'f-exam',
      employeeCode: 'JCET-01',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      experienceYears: 5,
      department: { id: 1, code: 'CSE' },
      designation: { name: 'Assistant Professor', workload: { maxHours: 18, minHours: 12 } },
      timetable: [],
    },
    {
      id: 'f-onduty',
      employeeCode: 'JCET-02',
      firstName: 'Pooja',
      lastName: 'Hegde',
      experienceYears: 8,
      department: { id: 1, code: 'CSE' },
      designation: { name: 'Associate Professor', workload: { maxHours: 16, minHours: 10 } },
      timetable: [],
    },
    {
      id: 'f-available',
      employeeCode: 'JCET-03',
      firstName: 'Suresh',
      lastName: 'Patil',
      experienceYears: 6,
      department: { id: 1, code: 'CSE' },
      designation: { name: 'Assistant Professor', workload: { maxHours: 18, minHours: 12 } },
      timetable: [],
    },
  ];

  const mockRepo: any = {
    teachingStaff: async () => staffFaculty,
    onLeave: async () => new Set<string>(),
    onExamDuty: async () => new Set(['f-exam']),
    onApprovedOnDuty: async () => new Set(['f-onduty']),
    assignmentsBetween: async () => [],
    periodStarts: async () => new Map([[1, '09:00'], [2, '10:00']]),
    classesOf: async () => [
      {
        id: 'tt-1',
        departmentId: 1,
        department: { id: 1, code: 'CSE', name: 'Computer Science' },
        semester: 5,
        section: 'A',
        batch: null,
        facultyId: 'f-onleave',
        faculty: { id: 'f-onleave', employeeCode: 'JCET-00', firstName: 'Anita', lastName: 'Rao' },
        subjectId: 101,
        subject: { id: 101, code: 'CS501', name: 'DBMS', kind: 'THEORY' },
        roomId: 10,
        room: { id: 10, name: 'LH-1', kind: 'CLASSROOM' },
        day: 'MON',
        startPeriod: 1,
        endPeriod: 1,
      },
    ],
    findApprovedLeave: async () => ({
      id: 'leave-1',
      employeeId: 'f-onleave',
      startDate: new Date('2026-11-09T00:00:00Z'),
      endDate: new Date('2026-11-09T00:00:00Z'),
      halfDay: null,
      days: 1,
      employee: { id: 'f-onleave', employeeCode: 'JCET-00', firstName: 'Anita', lastName: 'Rao' },
      department: { id: 1, code: 'CSE', name: 'Computer Science' },
      leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
    }),
  };

  const service = createSubstitutionService(mockRepo as SubstitutionRepository, mockNotifier);
  const access: any = { userId: 'hod-1', scope: 'department', departmentId: 1 };

  const candidates = await service.candidates(access, 'leave-1', 'tt-1', '2026-11-09');

  const examCandidate = candidates.find((c) => c.faculty.id === 'f-exam');
  const onDutyCandidate = candidates.find((c) => c.faculty.id === 'f-onduty');
  const availableCandidate = candidates.find((c) => c.faculty.id === 'f-available');

  assert.equal(examCandidate?.eligible, false);
  assert.equal(examCandidate?.reason, 'Assigned to Exam Duty on this date.');

  assert.equal(onDutyCandidate?.eligible, false);
  assert.equal(onDutyCandidate?.reason, 'On approved Official On-Duty on this date.');

  assert.equal(availableCandidate?.eligible, true);
  assert.equal(availableCandidate?.reason, null);

  // Attempting to assign the candidate with Exam Duty conflict must be rejected
  await assert.rejects(
    () =>
      service.assign(access, {
        leaveRequestId: 'leave-1',
        timetableEntryId: 'tt-1',
        date: '2026-11-09',
        substituteId: 'f-exam',
      }),
    (err: any) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'NOT_AVAILABLE');
      assert.equal(err.message, 'Assigned to Exam Duty on this date.');
      return true;
    },
  );
});

test('Attendance Regularisation: prevents duplicate requests and conflicting leave', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  const facultyAccess: any = {
    userId: 'user-1',
    role: 'Faculty',
    scope: 'own',
    employeeId: 'emp-1',
    departmentId: 1,
    permissions: new Set(['attendance.read', 'attendance_correction.request']),
  };

  // 1. Submit first correction request
  const first = await service.requestCorrection(facultyAccess, {
    date: '2026-11-02',
    requestedStatus: 'PRESENT',
    reason: 'Fingerprint scanner offline at 9am',
  });
  assert.equal(first.status, 'PENDING');

  // 2. Duplicate submission for same date must be rejected
  await assert.rejects(
    () =>
      service.requestCorrection(facultyAccess, {
        date: '2026-11-02',
        requestedStatus: 'PRESENT',
        reason: 'Duplicate request test',
      }),
    (err: any) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'ALREADY_REQUESTED');
      return true;
    },
  );

  // 3. Test conflicting schedule rejection when full-day leave exists
  repo.hasConflictingLeaveOrOnDuty = async () => ({
    conflictingLeave: true,
    conflictingOnDuty: false,
  });

  await assert.rejects(
    () =>
      service.requestCorrection(facultyAccess, {
        date: '2026-11-03',
        requestedStatus: 'PRESENT',
        reason: 'On leave date correction',
      }),
    (err: any) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'CONFLICTING_SCHEDULE');
      return true;
    },
  );

  // 4. Test self-cancellation of pending request
  repo.hasConflictingLeaveOrOnDuty = async () => ({
    conflictingLeave: false,
    conflictingOnDuty: false,
  });

  const cancelled = await service.cancelCorrection(facultyAccess, first.id);
  assert.equal(cancelled.status, 'CANCELLED');

  // 5. Trying to cancel an already cancelled request must be rejected
  await assert.rejects(
    () => service.cancelCorrection(facultyAccess, first.id),
    (err: any) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'CANNOT_CANCEL');
      return true;
    },
  );
});
