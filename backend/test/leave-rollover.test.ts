import assert from 'node:assert/strict';
import test from 'node:test';
import { createLeaveService } from '../src/modules/leave/leave.service.js';
import type { LeaveRepository } from '../src/modules/leave/leave.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';

function createMockLeaveRepo(): LeaveRepository {
  const types = [
    {
      id: 1,
      code: 'CL',
      name: 'Casual Leave',
      yearlyQuota: 12,
      carryForwardMax: 0,
      allowHalfDay: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      code: 'EL',
      name: 'Earned Leave',
      yearlyQuota: 10,
      carryForwardMax: 15,
      allowHalfDay: false,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const employees = [
    {
      id: 'emp-1',
      employeeCode: 'JCET-CSE-001',
      firstName: 'Ramesh',
      lastName: 'Patil',
      joiningDate: new Date('2024-01-01T00:00:00Z'),
      departmentId: 1,
      department: { id: 1, code: 'CSE', name: 'Computer Science' },
    },
    {
      id: 'emp-2',
      employeeCode: 'JCET-ECE-001',
      firstName: 'Ananya',
      lastName: 'Deshmukh',
      joiningDate: new Date('2025-06-01T00:00:00Z'),
      departmentId: 2,
      department: { id: 2, code: 'ECE', name: 'Electronics' },
    },
  ];

  const leaveRequests = [
    // emp-1: 3 days of CL in 2026, 2 days of EL in 2026
    {
      id: 'req-1',
      employeeId: 'emp-1',
      departmentId: 1,
      leaveTypeId: 1,
      startDate: new Date('2026-03-10T00:00:00Z'),
      endDate: new Date('2026-03-12T00:00:00Z'),
      days: 3,
      status: 'APPROVED' as const,
      halfDay: null,
      reason: 'Personal',
      approverRoles: ['HOD'],
      pendingRole: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: 'emp-1',
        employeeCode: 'JCET-CSE-001',
        firstName: 'Ramesh',
        lastName: 'Patil',
      },
      department: { id: 1, code: 'CSE', name: 'Computer Science' },
      leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
      decisions: [],
    },
    {
      id: 'req-2',
      employeeId: 'emp-1',
      departmentId: 1,
      leaveTypeId: 2,
      startDate: new Date('2026-05-15T00:00:00Z'),
      endDate: new Date('2026-05-16T00:00:00Z'),
      days: 2,
      status: 'APPROVED' as const,
      halfDay: null,
      reason: 'Family function',
      approverRoles: ['HOD'],
      pendingRole: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: 'emp-1',
        employeeCode: 'JCET-CSE-001',
        firstName: 'Ramesh',
        lastName: 'Patil',
      },
      department: { id: 1, code: 'CSE', name: 'Computer Science' },
      leaveType: { id: 2, code: 'EL', name: 'Earned Leave' },
      decisions: [],
    },
  ];

  return {
    async types() {
      return types;
    },
    async findType(id: number) {
      return types.find((t) => t.id === id) ?? null;
    },
    async findTypeConflict() {
      return null;
    },
    async saveType(_before: unknown, data: unknown) {
      return { id: 1, ...(data as Record<string, unknown>) } as never;
    },
    async user() {
      return null;
    },
    async employee(id: string) {
      return employees.find((e) => e.id === id) ?? null;
    },
    async taken(employeeId: string) {
      return leaveRequests
        .filter((r) => r.employeeId === employeeId)
        .map((r) => ({
          leaveTypeId: r.leaveTypeId,
          startDate: r.startDate,
          endDate: r.endDate,
          days: r.days,
          status: r.status,
        }));
    },
    async list() {
      return [];
    },
    async find(id: string) {
      return (leaveRequests.find((r) => r.id === id) ?? null) as never;
    },
    async submit() {
      return {} as never;
    },
    async advance() {
      return {} as never;
    },
    async activeEmployees(deptId?: number) {
      if (deptId) return employees.filter((e) => e.departmentId === deptId);
      return employees;
    },
    async allTaken(employeeIds: string[]) {
      return leaveRequests
        .filter((r) => employeeIds.includes(r.employeeId))
        .map((r) => ({
          employeeId: r.employeeId,
          leaveTypeId: r.leaveTypeId,
          startDate: r.startDate,
          endDate: r.endDate,
          days: r.days,
          status: r.status,
        }));
    },
  } as unknown as LeaveRepository;
}

const adminAccess: Access = {
  userId: 'admin-user',
  scope: 'all',
  employeeId: null,
  departmentId: null,
};

const hodAccess: Access = {
  userId: 'hod-user',
  scope: 'department',
  employeeId: 'emp-1',
  departmentId: 1,
};

const facultyAccess: Access = {
  userId: 'faculty-user',
  scope: 'own',
  employeeId: 'emp-2',
  departmentId: 2,
};

test('previewRollover correctly calculates carry-forward, lapsed and next-year opening', async () => {
  const repo = createMockLeaveRepo();
  const service = createLeaveService(repo);

  const summary = await service.previewRollover(adminAccess, {
    year: 2026,
    targetYear: 2027,
  });

  assert.equal(summary.fromYear, 2026);
  assert.equal(summary.toYear, 2027);
  assert.equal(summary.totalEmployees, 2);

  // emp-1 balances:
  const emp1 = summary.records.find((r) => r.employeeCode === 'JCET-CSE-001');
  assert.ok(emp1);

  // CL: 12 quota - 3 used = 9 closing balance. maxCarry = 0 -> 0 carried forward, 9 lapsed. 2027 opening = 12
  const cl = emp1.balances.find((b) => b.leaveTypeCode === 'CL');
  assert.ok(cl);
  assert.equal(cl.yearlyQuota, 12);
  assert.equal(cl.closingBalance, 9);
  assert.equal(cl.carriedForward, 0);
  assert.equal(cl.lapsed, 9);
  assert.equal(cl.nextYearOpening, 12);

  // EL: joined 2024 (10 carried into 2025, 15 capped into 2026).
  // In 2026: 10 + 15 = 25 entitled, 2 used = 23 closing balance.
  // Carried into 2027: max 15. Lapsed beyond 15 cap: 23 - 15 = 8 days.
  // 2027 Opening balance: 10 fresh + 15 carried = 25 days.
  const el = emp1.balances.find((b) => b.leaveTypeCode === 'EL');
  assert.ok(el);
  assert.equal(el.yearlyQuota, 10);
  assert.equal(el.closingBalance, 23);
  assert.equal(el.carriedForward, 15);
  assert.equal(el.lapsed, 8);
  assert.equal(el.nextYearOpening, 25);
});

test('previewRollover restricts HOD scope to own department and forbids Faculty', async () => {
  const repo = createMockLeaveRepo();
  const service = createLeaveService(repo);

  // HOD scope is restricted to department 1 (CSE)
  const hodSummary = await service.previewRollover(hodAccess, {
    year: 2026,
  });
  assert.equal(hodSummary.totalEmployees, 1);
  assert.equal(hodSummary.records[0].department.code, 'CSE');

  // Faculty cannot preview institutional rollover
  await assert.rejects(
    () =>
      service.previewRollover(facultyAccess, {
        year: 2026,
      }),
    {
      message:
        'Only Department Heads and HR Administrators can preview leave rollover.',
    },
  );
});

test('exportRolloverCsv outputs structured CSV format with valid headers', async () => {
  const repo = createMockLeaveRepo();
  const service = createLeaveService(repo);

  const csv = await service.exportRolloverCsv(adminAccess, {
    year: 2026,
    targetYear: 2027,
  });

  assert.ok(
    csv.includes('Employee Code,Faculty Name,Department,Leave Code,Leave Name'),
  );
  assert.ok(csv.includes('JCET-CSE-001'));
  assert.ok(csv.includes('Casual Leave'));
  assert.ok(csv.includes('Earned Leave'));
});

test('executeRollover rejects non-admin callers and triggers notifications for admins', async () => {
  let capturedNotification: { role: string; dept: unknown; data: { kind?: string } } | null = null;
  const mockNotifier = {
    notifyRole: async (role: string, dept: unknown, data: unknown) => {
      capturedNotification = { role, dept, data: data as { kind?: string } };
    },
    notifyEmployee: async () => {},
  };

  const repo = createMockLeaveRepo();
  const service = createLeaveService(repo, mockNotifier as never);

  await assert.rejects(
    () =>
      service.executeRollover(hodAccess, {
        fromYear: 2026,
        toYear: 2027,
      }),
    {
      message:
        'Only institutional HR Administrators can execute year-end leave rollover.',
    },
  );

  const result = await service.executeRollover(adminAccess, {
    fromYear: 2026,
    toYear: 2027,
  });

  assert.equal(result.success, true);
  const notification = capturedNotification as { role: string; dept: unknown; data: { kind?: string } } | null;
  assert.ok(notification);
  assert.equal(notification.role, 'HOD');
  assert.equal(notification.data.kind, 'leave.rollover.completed');
});
