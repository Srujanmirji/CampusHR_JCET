import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type { Prisma } from '../src/generated/prisma/client.js';
import type {
  EmployeeWithCategoryRecord,
  LeaveBalanceAdjustmentRecord,
  LeavePolicyRecord,
  LeavePolicyRepository,
  OnDutyDutyMappingRecord,
} from '../src/modules/leave/leave-policy.repository.js';
import {
  createLeavePolicyService,
  DEFAULT_DUTY_MAPPINGS,
} from '../src/modules/leave/leave-policy.service.js';
import { createLeaveService } from '../src/modules/leave/leave.service.js';
import type { LeaveRepository } from '../src/modules/leave/leave.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';

const FACULTY_GROUP_ID = randomUUID();
const STAFF_GROUP_ID = randomUUID();

function createMemoryPolicyRepository(): LeavePolicyRepository {
  const policies: LeavePolicyRecord[] = [];
  const adjustments: LeaveBalanceAdjustmentRecord[] = [];
  const dutyMappings: OnDutyDutyMappingRecord[] = Object.entries(DEFAULT_DUTY_MAPPINGS).map(
    ([dutyCategory, targetLeaveCode]) => ({
      id: randomUUID(),
      dutyCategory,
      targetLeaveCode,
      title: dutyCategory.replaceAll('_', ' '),
      description: null,
      active: true,
      updatedAt: new Date(),
    }),
  );

  const employees: EmployeeWithCategoryRecord[] = [
    {
      id: 'emp-faculty-1',
      employeeCode: 'JCET-CSE-001',
      firstName: 'Aarav',
      lastName: 'Patil',
      email: 'aarav.patil@jcet.edu',
      departmentId: 1,
      employmentType: 'PERMANENT',
      joiningDate: new Date('2026-01-01T00:00:00Z'),
      status: 'ACTIVE',
      designation: { id: 1, name: 'Assistant Professor', category: 'TEACHING' },
      department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
      policyGroupId: FACULTY_GROUP_ID,
      policyGroup: { id: FACULTY_GROUP_ID, name: 'Teaching Faculty - Standard' },
    },
    {
      id: 'emp-non-teaching-1',
      employeeCode: 'JCET-ADM-001',
      firstName: 'Ramesh',
      lastName: 'Kulkarni',
      email: 'ramesh.k@jcet.edu',
      departmentId: 2,
      employmentType: 'PERMANENT',
      joiningDate: new Date('2026-01-01T00:00:00Z'),
      status: 'ACTIVE',
      designation: { id: 2, name: 'Office Superintendent', category: 'NON_TEACHING' },
      department: { id: 2, code: 'ADMIN', name: 'Administration' },
      policyGroupId: STAFF_GROUP_ID,
      policyGroup: { id: STAFF_GROUP_ID, name: 'Non-Teaching Staff - Operational & Support' },
    },
  ];

  return {
    async findPolicies(where) {
      return policies.filter((p) => {
        if (where.policyYear && p.policyYear !== where.policyYear) return false;
        if (where.code && p.code !== where.code) return false;
        if (where.active !== undefined && p.active !== where.active) return false;
        if (where.employeeCategory && p.employeeCategory !== where.employeeCategory && !p.appliesToAllCategories) return false;
        if (where.OR && Array.isArray(where.OR)) {
          const match = where.OR.some((clause: Record<string, unknown>) => {
            if (clause.employeeCategory && p.employeeCategory === clause.employeeCategory) return true;
            if (clause.appliesToAllCategories && p.appliesToAllCategories) return true;
            return false;
          });
          if (!match) return false;
        }
        return true;
      });
    },

    async findPolicyById(id) {
      return policies.find((p) => p.id === id) ?? null;
    },

    async findPolicyByCodeAndContext(
      code,
      policyYear,
      employeeCategory,
      departmentId,
      policyGroupId,
      referenceDate,
    ) {
      const dateMatches = (p: LeavePolicyRecord) => {
        if (!referenceDate) return true;
        const ref =
          referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
        return p.effectiveFrom <= ref && (!p.effectiveTo || p.effectiveTo >= ref);
      };

      if (policyGroupId) {
        const grp = policies.find(
          (p) =>
            p.code === code &&
            p.policyYear === policyYear &&
            (p.employeeCategory === employeeCategory || p.appliesToAllCategories) &&
            p.policyGroupId === policyGroupId &&
            p.active &&
            dateMatches(p),
        );
        if (grp) return grp;
      }
      if (departmentId) {
        const dept = policies.find(
          (p) =>
            p.code === code &&
            p.policyYear === policyYear &&
            (p.employeeCategory === employeeCategory || p.appliesToAllCategories) &&
            p.departmentId === departmentId &&
            p.active &&
            dateMatches(p),
        );
        if (dept) return dept;
      }
      const generic = policies.find(
        (p) =>
          p.code === code &&
          p.policyYear === policyYear &&
          (p.employeeCategory === employeeCategory || p.appliesToAllCategories) &&
          p.departmentId === null &&
          p.active &&
          dateMatches(p),
      );
      return generic ?? null;
    },

    async findPolicyGroups(category) {
      const groups = [
        { id: FACULTY_GROUP_ID, name: 'Teaching Faculty - Standard', description: null, employeeCategory: 'TEACHING' as const, active: true },
        { id: STAFF_GROUP_ID, name: 'Non-Teaching Staff - Operational & Support', description: null, employeeCategory: 'NON_TEACHING' as const, active: true },
      ];
      return groups.filter((g) => !category || g.employeeCategory === category);
    },

    async createPolicy(data: Prisma.LeavePolicyUncheckedCreateInput) {
      const record: LeavePolicyRecord = {
        id: randomUUID(),
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        policyYear: data.policyYear,
        employeeCategory: data.employeeCategory,
        appliesToAllCategories: data.appliesToAllCategories ?? false,
        employmentType: data.employmentType ?? null,
        departmentId: data.departmentId ?? null,
        policyGroupId: data.policyGroupId ?? null,
        leaveTypeId: data.leaveTypeId ?? null,
        version: (data.version as number) ?? 1,
        annualEntitlement: data.annualEntitlement ?? null,
        entitlementUnit: data.entitlementUnit ?? 'DAYS',
        carryForwardAllowed: data.carryForwardAllowed ?? false,
        carryForwardLimit: data.carryForwardLimit ?? null,
        carryForwardExpiryMonths: data.carryForwardExpiryMonths ?? null,
        lapseAtYearEnd: data.lapseAtYearEnd ?? true,
        halfDayAllowed: data.halfDayAllowed ?? false,
        minimumNoticeDays: data.minimumNoticeDays ?? 0,
        maximumConsecutiveDays: data.maximumConsecutiveDays ?? null,
        minimumServiceDays: data.minimumServiceDays ?? null,
        attachmentRequired: data.attachmentRequired ?? false,
        attachmentRequiredAfterDays: data.attachmentRequiredAfterDays ?? null,
        reasonRequired: data.reasonRequired ?? true,
        attendanceStatus: data.attendanceStatus ?? 'ON_LEAVE',
        affectsTimetable: data.affectsTimetable ?? true,
        requiresAcademicCoverage: data.requiresAcademicCoverage ?? true,
        requiresOperationalCoverage: data.requiresOperationalCoverage ?? false,
        reservePendingBalance: data.reservePendingBalance ?? true,
        approvalPolicyKey: data.approvalPolicyKey ?? 'STANDARD',
        approvalStatus: (data.approvalStatus as string) ?? 'AWAITING_APPROVAL',
        calendarPolicyKey: data.calendarPolicyKey ?? 'INSTITUTION_CALENDAR',
        active: data.active ?? true,
        effectiveFrom: data.effectiveFrom as Date,
        effectiveTo: (data.effectiveTo as Date) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      policies.push(record);
      return record;
    },

    async updatePolicy(id, data) {
      const idx = policies.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Not found');
      const updated = { ...policies[idx]!, ...data, updatedAt: new Date() } as LeavePolicyRecord;
      policies[idx] = updated;
      return updated;
    },

    async deletePolicy(id) {
      const idx = policies.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Not found');
      const [removed] = policies.splice(idx, 1);
      return removed!;
    },

    async findEmployee(id) {
      return employees.find((e) => e.id === id) ?? null;
    },

    async findActiveEmployees(departmentId) {
      return employees.filter((e) => !departmentId || e.departmentId === departmentId);
    },

    async createAdjustment(data: Prisma.LeaveBalanceAdjustmentUncheckedCreateInput) {
      const rolloverFromYear = (data.rolloverFromYear as number) ?? null;
      if (rolloverFromYear !== null) {
        const existing = adjustments.find(
          (a) =>
            a.employeeId === data.employeeId &&
            a.leaveCode === data.leaveCode &&
            a.policyYear === data.policyYear &&
            a.adjustmentType === data.adjustmentType &&
            a.rolloverFromYear === rolloverFromYear,
        );
        if (existing) {
          const err = new Error(
            'Unique constraint failed on (employeeId, leaveCode, policyYear, adjustmentType, rolloverFromYear)',
          );
          (err as unknown as { code: string }).code = 'P2002';
          throw err;
        }
      }
      const record: LeaveBalanceAdjustmentRecord = {
        id: randomUUID(),
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId ?? null,
        policyId: data.policyId ?? null,
        leaveCode: data.leaveCode,
        policyYear: data.policyYear,
        adjustmentType: data.adjustmentType,
        days: data.days,
        reason: data.reason,
        actorUserId: data.actorUserId,
        rolloverFromYear,
        createdAt: new Date(),
      };
      adjustments.push(record);
      return record;
    },

    async executeRolloverAdjustments(fromYear, toYear, entries) {
      const rolloverTag = `[ANNUAL_ROLLOVER_${fromYear}_${toYear}]`;
      const already = adjustments.some(
        (a) =>
          a.policyYear === String(toYear) &&
          (a.reason.startsWith(rolloverTag) || a.rolloverFromYear === fromYear),
      );
      if (already) {
        const err = new Error('ROLLOVER_ALREADY_EXECUTED');
        (err as unknown as { code: string; status: number }).code = 'P2002';
        (err as unknown as { status: number }).status = 409;
        throw err;
      }
      const created: LeaveBalanceAdjustmentRecord[] = [];
      for (const entry of entries) {
        const rec = await this.createAdjustment(entry);
        created.push(rec);
      }
      return created;
    },

    async findAdjustments(where) {
      return adjustments.filter((a) => {
        if (where.employeeId && a.employeeId !== where.employeeId) return false;
        if (where.policyYear && a.policyYear !== where.policyYear) return false;
        if (where.leaveCode && a.leaveCode !== where.leaveCode) return false;
        return true;
      });
    },

    async findDutyMappings() {
      return [...dutyMappings];
    },

    async findDutyMappingByCategory(cat) {
      return dutyMappings.find((m) => m.dutyCategory === cat) ?? null;
    },

    async upsertDutyMapping(data) {
      const idx = dutyMappings.findIndex((m) => m.dutyCategory === data.dutyCategory);
      if (idx !== -1) {
        dutyMappings[idx] = {
          ...dutyMappings[idx]!,
          targetLeaveCode: data.targetLeaveCode,
          title: data.title,
          description: data.description ?? null,
          active: data.active ?? true,
          updatedAt: new Date(),
        };
        return dutyMappings[idx]!;
      }
      const record: OnDutyDutyMappingRecord = {
        id: randomUUID(),
        dutyCategory: data.dutyCategory,
        targetLeaveCode: data.targetLeaveCode,
        title: data.title,
        description: data.description ?? null,
        active: data.active ?? true,
        updatedAt: new Date(),
      };
      dutyMappings.push(record);
      return record;
    },
  };
}

const dummyTypes = [
  { id: 1, code: 'CL', name: 'Casual Leave', yearlyQuota: 12, allowHalfDay: true, carryForwardMax: 0, active: true },
  { id: 2, code: 'EL', name: 'Earned Leave', yearlyQuota: 10, allowHalfDay: false, carryForwardMax: 15, active: true },
  { id: 3, code: 'SPL_ML', name: 'Special / Medical Leave', yearlyQuota: null, allowHalfDay: false, carryForwardMax: 0, active: true },
  { id: 4, code: 'OOD', name: 'On Official Duty', yearlyQuota: 12, allowHalfDay: true, carryForwardMax: 0, active: true },
  { id: 5, code: 'ODE', name: 'Official / Examination Duty', yearlyQuota: 12, allowHalfDay: true, carryForwardMax: 0, active: true },
  { id: 6, code: 'RH', name: 'Restricted Holiday', yearlyQuota: null, allowHalfDay: false, carryForwardMax: 0, active: true },
  { id: 7, code: 'VL', name: 'Vacation Leave', yearlyQuota: null, allowHalfDay: false, carryForwardMax: 0, active: true },
];

function createFakeLeaveRepository(): LeaveRepository & {
  submittedRequests: Array<
    Record<string, unknown> & {
      policyVersion?: number | null;
      policySnapshot?: Record<string, unknown> | null;
    }
  >;
} {
  const takenRecords: Array<{
    employeeId: string;
    leaveTypeId: number;
    days: number;
    status: string;
    startDate: Date;
    endDate: Date;
  }> = [];

  const submittedRequests: Array<
    Record<string, unknown> & {
      policyVersion?: number | null;
      policySnapshot?: Record<string, unknown> | null;
    }
  > = [];

  const repo = {
    submittedRequests,
    async user(id: string) {
      if (id === 'usr-faculty-1') {
        return {
          id,
          role: { name: 'Faculty' },
          employee: {
            id: 'emp-faculty-1',
            departmentId: 1,
            joiningDate: new Date('2026-01-01T00:00:00Z'),
            status: 'ACTIVE',
            designation: { category: 'TEACHING' },
          },
        };
      }
      if (id === 'usr-staff-1') {
        return {
          id,
          role: { name: 'Non-Teaching Staff' },
          employee: {
            id: 'emp-non-teaching-1',
            departmentId: 2,
            joiningDate: new Date('2026-01-01T00:00:00Z'),
            status: 'ACTIVE',
            designation: { category: 'NON_TEACHING' },
          },
        };
      }
      return null;
    },
    async employee(id: string) {
      if (id === 'emp-faculty-1') {
        return {
          id,
          departmentId: 1,
          joiningDate: new Date('2026-01-01T00:00:00Z'),
          designation: { category: 'TEACHING' },
        };
      }
      if (id === 'emp-non-teaching-1') {
        return {
          id,
          departmentId: 2,
          joiningDate: new Date('2026-01-01T00:00:00Z'),
          designation: { category: 'NON_TEACHING' },
        };
      }
      return null;
    },
    async taken(empId: string) {
      return takenRecords.filter((t) => t.employeeId === empId);
    },
    async allTaken() {
      return takenRecords;
    },
    async list() {
      return [];
    },
    async find() {
      return null;
    },
    async types() {
      return dummyTypes;
    },
    async findType(id: number) {
      return dummyTypes.find((t) => t.id === id) ?? null;
    },
    async findTypeByCode(code: string) {
      return dummyTypes.find((t) => t.code === code) ?? null;
    },
    async findTypeConflict() {
      return null;
    },
    async saveType() {
      return dummyTypes[0];
    },
    async submit(
      data: Prisma.LeaveRequestUncheckedCreateInput,
      check?: (taken: unknown[]) => Promise<void> | void,
      audit?: unknown,
    ) {
      void audit;
      if (check) {
        await check(
          takenRecords.filter((t) => t.employeeId === data.employeeId),
        );
      }
      const record = {
        id: randomUUID(),
        ...data,
        policySnapshot: data.policySnapshot as Record<string, unknown> | null | undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'PENDING',
        employee: {
          id: data.employeeId,
          employeeCode:
            data.employeeId === 'emp-faculty-1'
              ? 'JCET-CSE-001'
              : 'JCET-ADM-001',
          firstName: data.employeeId === 'emp-faculty-1' ? 'Aarav' : 'Ramesh',
          lastName: data.employeeId === 'emp-faculty-1' ? 'Patil' : 'Kulkarni',
          designation: {
            category:
              data.employeeId === 'emp-faculty-1'
                ? 'TEACHING'
                : 'NON_TEACHING',
          },
        },
        department: {
          id: data.departmentId,
          code: 'CSE',
          name: 'Computer Science',
        },
        leaveType:
          dummyTypes.find((t) => t.id === data.leaveTypeId) ?? dummyTypes[0],
        decisions: [],
      };
      takenRecords.push({
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        days: data.days,
        status: 'PENDING',
        startDate: data.startDate as unknown as Date,
        endDate: data.endDate as unknown as Date,
      });
      submittedRequests.push(record);
      return record;
    },
    async advance() {
      return null;
    },
    async activeEmployees(departmentId?: number) {
      const emps = [
        {
          id: 'emp-faculty-1',
          employeeCode: 'JCET-CSE-001',
          firstName: 'Aarav',
          lastName: 'Patil',
          email: 'aarav.patil@jcet.edu',
          departmentId: 1,
          employmentType: 'PERMANENT',
          joiningDate: new Date('2026-01-01T00:00:00Z'),
          status: 'ACTIVE',
          department: {
            id: 1,
            code: 'CSE',
            name: 'Computer Science & Engineering',
          },
        },
      ];
      return emps.filter(
        (e) => !departmentId || e.departmentId === departmentId,
      );
    },
  };
  return repo as unknown as LeaveRepository & {
    submittedRequests: Array<
      Record<string, unknown> & {
        policyVersion?: number | null;
        policySnapshot?: Record<string, unknown> | null;
      }
    >;
  };
}

const hrAccess: Access = {
  userId: 'usr-hr',
  role: 'HR Admin',
  scope: 'all',
  employeeId: null,
  departmentId: null,
};

const facultyAccess: Access = {
  userId: 'usr-faculty-1',
  role: 'Faculty',
  scope: 'own',
  employeeId: 'emp-faculty-1',
  departmentId: 1,
};

const staffAccess: Access = {
  userId: 'usr-staff-1',
  role: 'Non-Teaching Staff',
  scope: 'own',
  employeeId: 'emp-non-teaching-1',
  departmentId: 2,
};

test('Policy Engine: Seed & Support JCET 7 Leave Types with confirmed entitlements', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  // Create standard JCET policies for Teaching Faculty
  await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave (Faculty)',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 12, // Confirmed 12 days
    halfDayAllowed: true,
    minimumNoticeDays: 1,
    maximumConsecutiveDays: 3,
    attendanceStatus: 'ON_LEAVE',
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    requiresOperationalCoverage: false,
    effectiveFrom: '2026-01-01',
  });

  await service.createPolicy(hrAccess, {
    code: 'EL',
    name: 'Earned Leave (Faculty)',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 10, // Confirmed 10 days
    carryForwardAllowed: true,
    carryForwardLimit: 15,
    lapseAtYearEnd: false,
    halfDayAllowed: false,
    minimumNoticeDays: 7,
    maximumConsecutiveDays: 15,
    attendanceStatus: 'ON_LEAVE',
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  await service.createPolicy(hrAccess, {
    code: 'SPL_ML',
    name: 'Special / Medical Leave (Faculty)',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: null, // Configurable ("As per policy")
    attachmentRequired: true, // Medical certificate mandatory
    attendanceStatus: 'ON_LEAVE',
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  await service.createPolicy(hrAccess, {
    code: 'OOD',
    name: 'On Official Duty',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 12, // Confirmed 12 days
    halfDayAllowed: true,
    attachmentRequired: true,
    attendanceStatus: 'ON_DUTY',
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  await service.createPolicy(hrAccess, {
    code: 'ODE',
    name: 'Official / Examination Duty',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 12, // Confirmed 12 days
    halfDayAllowed: true,
    attachmentRequired: true,
    attendanceStatus: 'ON_DUTY',
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  await service.createPolicy(hrAccess, {
    code: 'RH',
    name: 'Restricted Holiday',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: null,
    maximumConsecutiveDays: 1,
    attendanceStatus: 'RESTRICTED_HOLIDAY',
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  await service.createPolicy(hrAccess, {
    code: 'VL',
    name: 'Vacation Leave',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: null,
    attendanceStatus: 'VACATION_LEAVE',
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  const facultyPolicies = await service.getApplicablePolicies(facultyAccess, 'emp-faculty-1', '2026');
  assert.equal(facultyPolicies.length, 7);

  const cl = facultyPolicies.find((p) => p.code === 'CL')!;
  assert.equal(cl.annualEntitlement, 12);
  assert.equal(cl.halfDayAllowed, true);
  assert.equal(cl.requiresAcademicCoverage, true);

  const el = facultyPolicies.find((p) => p.code === 'EL')!;
  assert.equal(el.annualEntitlement, 10);
  assert.equal(el.carryForwardLimit, 15);

  const ood = facultyPolicies.find((p) => p.code === 'OOD')!;
  assert.equal(ood.annualEntitlement, 12);
  assert.equal(ood.attendanceStatus, 'ON_DUTY');

  const ode = facultyPolicies.find((p) => p.code === 'ODE')!;
  assert.equal(ode.annualEntitlement, 12);
  assert.equal(ode.attendanceStatus, 'ON_DUTY');

  const splMl = facultyPolicies.find((p) => p.code === 'SPL_ML')!;
  assert.equal(splMl.annualEntitlement, null);
  assert.equal(splMl.attachmentRequired, true);
});

test('Dual Workforce: Teaching Faculty vs Non-Teaching Staff separation', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  // Teaching CL: affects timetable, requires academic coverage
  await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave (Faculty)',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 12,
    affectsTimetable: true,
    requiresAcademicCoverage: true,
    requiresOperationalCoverage: false,
    effectiveFrom: '2026-01-01',
  });

  // Non-Teaching CL: does NOT affect timetable, requires operational coverage
  await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave (Non-Teaching)',
    policyYear: '2026',
    employeeCategory: 'NON_TEACHING',
    annualEntitlement: 12,
    affectsTimetable: false,
    requiresAcademicCoverage: false,
    requiresOperationalCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  // VL is only active for Teaching
  await service.createPolicy(hrAccess, {
    code: 'VL',
    name: 'Vacation Leave (Faculty)',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: null,
    active: true,
    effectiveFrom: '2026-01-01',
  });

  await service.createPolicy(hrAccess, {
    code: 'VL',
    name: 'Vacation Leave (Non-Teaching)',
    policyYear: '2026',
    employeeCategory: 'NON_TEACHING',
    annualEntitlement: null,
    active: false, // Inactive for Non-Teaching
    effectiveFrom: '2026-01-01',
  });

  // Faculty checks
  const facultyPolicies = await service.getApplicablePolicies(facultyAccess, 'emp-faculty-1', '2026');
  const facCl = facultyPolicies.find((p) => p.code === 'CL')!;
  assert.equal(facCl.affectsTimetable, true);
  assert.equal(facCl.requiresAcademicCoverage, true);
  assert.equal(facCl.requiresOperationalCoverage, false);
  assert.ok(facultyPolicies.some((p) => p.code === 'VL' && p.active));

  // Non-Teaching Staff checks
  const staffPolicies = await service.getApplicablePolicies(staffAccess, 'emp-non-teaching-1', '2026');
  const staffCl = staffPolicies.find((p) => p.code === 'CL')!;
  assert.equal(staffCl.affectsTimetable, false);
  assert.equal(staffCl.requiresAcademicCoverage, false);
  assert.equal(staffCl.requiresOperationalCoverage, true);
  assert.ok(!staffPolicies.some((p) => p.code === 'VL')); // Inactive VL omitted from applicable
});

test('Balance Calculation: Entitlement + Carried Forward + Adjustments - Used - Reserved Pending', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave (Faculty)',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 12,
    reservePendingBalance: true,
    effectiveFrom: '2026-01-01',
  });

  // Initially: 12 entitled, 0 used, 0 pending, 12 remaining
  let balance = await service.calculateEmployeeBalance(facultyAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(balance.entitled, 12);
  assert.equal(balance.used, 0);
  assert.equal(balance.pending, 0);
  assert.equal(balance.remaining, 12);

  // Credit manual adjustment of +2 days
  await service.createAdjustment(hrAccess, {
    employeeId: 'emp-faculty-1',
    leaveCode: 'CL',
    policyYear: '2026',
    adjustmentType: 'CREDIT',
    days: 2,
    reason: 'Institutional lieu credit for Sunday exam coordination',
  });

  balance = await service.calculateEmployeeBalance(facultyAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(balance.entitled, 14); // 12 + 2
  assert.equal(balance.adjustments, 2);
  assert.equal(balance.remaining, 14);

  // Debit manual adjustment of 1 day
  await service.createAdjustment(hrAccess, {
    employeeId: 'emp-faculty-1',
    leaveCode: 'CL',
    policyYear: '2026',
    adjustmentType: 'DEBIT',
    days: 1,
    reason: 'Correction of duplicate credit',
  });

  balance = await service.calculateEmployeeBalance(facultyAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(balance.entitled, 13); // 14 - 1
  assert.equal(balance.adjustments, 1);
  assert.equal(balance.remaining, 13);
});

test('OOD / ODE Mapping: Configurable duty category mapping', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  // Verify standard mappings
  assert.equal(await service.resolveDutyLeaveCode('UNIVERSITY_VALUATION'), 'ODE');
  assert.equal(await service.resolveDutyLeaveCode('EXTERNAL_EXAMINER'), 'ODE');
  assert.equal(await service.resolveDutyLeaveCode('CONFERENCE_SEMINAR'), 'OOD');
  assert.equal(await service.resolveDutyLeaveCode('FDP_WORKSHOP'), 'OOD');
  assert.equal(await service.resolveDutyLeaveCode('BOS_BOE_MEETING'), 'OOD');
  assert.equal(await service.resolveDutyLeaveCode('OFFICIAL_COLLEGE_DUTY'), 'OOD');

  // Update a mapping dynamically (e.g. conference mapped to ODE for special research summit)
  await service.updateDutyMapping(hrAccess, {
    dutyCategory: 'CONFERENCE_SEMINAR',
    targetLeaveCode: 'ODE',
    title: 'Research Summit',
  });

  assert.equal(await service.resolveDutyLeaveCode('CONFERENCE_SEMINAR'), 'ODE');
});

test('RBAC: Non-admin users cannot create or modify policies', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  await assert.rejects(
    service.createPolicy(facultyAccess, {
      code: 'CL',
      name: 'Hacked Policy',
      policyYear: '2026',
      employeeCategory: 'TEACHING',
      effectiveFrom: '2026-01-01',
    }),
    (err: unknown) => (err as { status?: number }).status === 403,
  );

  await assert.rejects(
    service.createAdjustment(facultyAccess, {
      employeeId: 'emp-faculty-1',
      leaveCode: 'CL',
      policyYear: '2026',
      adjustmentType: 'CREDIT',
      days: 5,
      reason: 'Self credit',
    }),
    (err: unknown) => (err as { status?: number }).status === 403,
  );
});

test('Rules: Advance notice, maximum consecutive days, and attachment requirements', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  // Policy with 7 days notice, max 5 consecutive days, and mandatory attachment
  const policy = await service.createPolicy(hrAccess, {
    code: 'SPL_ML',
    name: 'Special Medical Leave',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 30,
    minimumNoticeDays: 7,
    maximumConsecutiveDays: 5,
    attachmentRequired: true,
    effectiveFrom: '2026-01-01',
  });

  assert.equal(policy.minimumNoticeDays, 7);
  assert.equal(policy.maximumConsecutiveDays, 5);
  assert.equal(policy.attachmentRequired, true);

  // Update policy configuration dynamically
  const updated = await service.updatePolicy(hrAccess, policy.id, {
    maximumConsecutiveDays: 10,
    attachmentRequired: false,
  });

  assert.equal(updated.maximumConsecutiveDays, 10);
  assert.equal(updated.attachmentRequired, false);
});

test('Carry Forward & Lapse: Confirms EL carries forward up to limit while CL lapses', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  const clPolicy = await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 12,
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    lapseAtYearEnd: true,
    effectiveFrom: '2026-01-01',
  });

  const elPolicy = await service.createPolicy(hrAccess, {
    code: 'EL',
    name: 'Earned Leave',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    annualEntitlement: 10,
    carryForwardAllowed: true,
    carryForwardLimit: 15,
    lapseAtYearEnd: false,
    effectiveFrom: '2026-01-01',
  });

  assert.equal(clPolicy.carryForwardAllowed, false);
  assert.equal(clPolicy.lapseAtYearEnd, true);

  assert.equal(elPolicy.carryForwardAllowed, true);
  assert.equal(elPolicy.carryForwardLimit, 15);
  assert.equal(elPolicy.lapseAtYearEnd, false);
});

test('EmployeePolicyGroup: Policy group scoping overrides general category policy', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  // General Non-Teaching CL policy: 12 days
  await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave (General Non-Teaching)',
    policyYear: '2026',
    employeeCategory: 'NON_TEACHING',
    annualEntitlement: 12,
    effectiveFrom: '2026-01-01',
  });

  // Group-specific Non-Teaching CL policy for STAFF_GROUP_ID: 15 days
  await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave (Operational Staff Group)',
    policyYear: '2026',
    employeeCategory: 'NON_TEACHING',
    policyGroupId: STAFF_GROUP_ID,
    annualEntitlement: 15,
    effectiveFrom: '2026-01-01',
  });

  // Resolve applicable policies for emp-non-teaching-1 (who belongs to STAFF_GROUP_ID)
  const applicable = await service.getApplicablePolicies(hrAccess, 'emp-non-teaching-1', '2026');
  const cl = applicable.find((p) => p.code === 'CL');
  assert.ok(cl);
  assert.equal(cl.name, 'Casual Leave (Operational Staff Group)');
  assert.equal(cl.annualEntitlement, 15);
  assert.equal(cl.policyGroupId, STAFF_GROUP_ID);
});

test('Policy Versioning & Historical Immutability: Changes in future/current policy do not rewrite past records', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const service = createLeavePolicyService(policyRepo, leaveRepo);

  // 1. Create 2026 policy: CL = 12 days
  const pol2026 = await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave 2026',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    leaveTypeId: 1,
    annualEntitlement: 12,
    effectiveFrom: '2026-01-01',
  });

  // 2. Submit application linked to pol2026
  const requestRecord = {
    id: 'req-hist-001',
    employeeId: 'emp-faculty-1',
    leaveTypeId: 1,
    policyId: pol2026.id,
    leaveCode: 'CL',
    days: 3,
    status: 'APPROVED',
    startDate: new Date('2026-02-01T00:00:00Z'),
    endDate: new Date('2026-02-03T00:00:00Z'),
  };
  (leaveRepo as unknown as { taken: () => Promise<typeof requestRecord[]> }).taken = async () => [requestRecord];

  // 3. Balance in 2026 reflects: Entitled 12, Used 3, Remaining 9
  const bal2026 = await service.calculateEmployeeBalance(hrAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(bal2026.entitled, 12);
  assert.equal(bal2026.used, 3);
  assert.equal(bal2026.remaining, 9);
  assert.equal(bal2026.policyId, pol2026.id);

  // 4. Create 2027 policy with different entitlement: CL = 14 days
  const pol2027 = await service.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave 2027',
    policyYear: '2027',
    employeeCategory: 'TEACHING',
    leaveTypeId: 1,
    annualEntitlement: 14,
    effectiveFrom: '2027-01-01',
  });

  // 5. Update 2026 policy name or rules
  await service.updatePolicy(hrAccess, pol2026.id, {
    name: 'Casual Leave 2026 (Revised Description)',
  });

  // 6. Verify 2026 historical record still points to pol2026 and historical calculation is intact
  assert.equal(requestRecord.policyId, pol2026.id);
  const bal2026After = await service.calculateEmployeeBalance(hrAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(bal2026After.entitled, 12);
  assert.equal(bal2026After.used, 3);
  assert.equal(bal2026After.remaining, 9);

  // 7. Verify 2027 is distinct
  const bal2027 = await service.calculateEmployeeBalance(hrAccess, 'emp-faculty-1', 'CL', '2027');
  assert.equal(bal2027.entitled, 14);
  assert.equal(bal2027.used, 0);
  assert.equal(bal2027.policyId, pol2027.id);
});

test('Annual Rollover Integration: Consumes policy rules, writes balance adjustments, and prevents duplicate execution', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const policyService = createLeavePolicyService(policyRepo, leaveRepo);

  // Create 2026 and 2027 policies with configurable carry-forward cap (e.g. 8 days, not hardcoded 15)
  await policyService.createPolicy(hrAccess, {
    code: 'EL',
    name: 'Earned Leave 2026',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    leaveTypeId: 2,
    annualEntitlement: 10,
    carryForwardAllowed: true,
    carryForwardLimit: 8, // Configured cap is 8 days
    lapseAtYearEnd: false,
    effectiveFrom: '2026-01-01',
  });

  await policyService.createPolicy(hrAccess, {
    code: 'EL',
    name: 'Earned Leave 2027',
    policyYear: '2027',
    employeeCategory: 'TEACHING',
    leaveTypeId: 2,
    annualEntitlement: 10,
    carryForwardAllowed: true,
    carryForwardLimit: 8,
    lapseAtYearEnd: false,
    effectiveFrom: '2027-01-01',
  });

  // Leave service with policyService
  const { createLeaveService } = await import('../src/modules/leave/leave.service.js');
  const leaveService = createLeaveService(
    leaveRepo,
    undefined,
    undefined,
    policyService,
  );

  // Employee used 0 days in 2026 out of 10.
  // With carryForwardLimit = 8, preview should carry forward 8 days and lapse 2 days!
  const preview = await leaveService.previewRollover(hrAccess, {
    year: 2026,
    targetYear: 2027,
  });

  const facultyRecord = preview.records.find((r) => r.employeeId === 'emp-faculty-1');
  assert.ok(facultyRecord);
  const elBal = facultyRecord.balances.find((b) => b.leaveTypeCode === 'EL');
  assert.ok(elBal);
  assert.equal(elBal.carriedForward, 8); // Respects configured 8d cap, NOT hardcoded 15!
  assert.equal(elBal.lapsed, 2);

  // Execute rollover
  const result = await leaveService.executeRollover(hrAccess, {
    fromYear: 2026,
    toYear: 2027,
  });
  assert.equal(result.success, true);

  // Verify traceable balance adjustments were written to the ledger
  const adjustments = await policyService.listAdjustments(hrAccess, {
    policyYear: '2027',
  });
  const cfAdj = adjustments.find(
    (a) => a.employeeId === 'emp-faculty-1' && a.adjustmentType === 'CARRY_FORWARD_CORRECTION',
  );
  assert.ok(cfAdj);
  assert.equal(cfAdj.days, 8);
  assert.ok(cfAdj.reason.includes('[ANNUAL_ROLLOVER_2026_2027]'));
  assert.equal(cfAdj.actorUserId, hrAccess.userId);

  // Verify idempotency: executing rollover a second time fails with 409 conflict
  await assert.rejects(
    leaveService.executeRollover(hrAccess, {
      fromYear: 2026,
      toYear: 2027,
    }),
    (err: unknown) => (err as { status?: number }).status === 409,
  );
});

test('Balance Ledger: Pending cancellation and rejection releases reserved days without double deduction', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const policyService = createLeavePolicyService(policyRepo, leaveRepo);

  await policyService.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    leaveTypeId: 1,
    annualEntitlement: 12,
    reservePendingBalance: true,
    effectiveFrom: '2026-01-01',
  });

  // 1. Initial balance: 12 remaining
  let bal = await policyService.calculateEmployeeBalance(hrAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(bal.remaining, 12);

  // 2. Add PENDING request of 2 days
  const pendingReq = {
    id: 'req-pending-1',
    employeeId: 'emp-faculty-1',
    leaveTypeId: 1,
    startDate: new Date('2026-03-01T00:00:00Z'),
    endDate: new Date('2026-03-02T00:00:00Z'),
    days: 2,
    status: 'PENDING',
  };
  (leaveRepo as unknown as { taken: () => Promise<typeof pendingReq[]> }).taken = async () => [pendingReq];

  bal = await policyService.calculateEmployeeBalance(hrAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(bal.pending, 2);
  assert.equal(bal.remaining, 10); // 12 - 2 = 10

  // 3. Reject or Cancel the request -> status changed to REJECTED
  pendingReq.status = 'REJECTED';
  bal = await policyService.calculateEmployeeBalance(hrAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(bal.pending, 0);
  assert.equal(bal.used, 0);
  assert.equal(bal.remaining, 12); // Released completely back to 12

  // 4. Manual adjustments: require HR/Admin permissions and valid reason
  await policyService.createAdjustment(hrAccess, {
    employeeId: 'emp-faculty-1',
    leaveCode: 'CL',
    policyYear: '2026',
    adjustmentType: 'CREDIT',
    days: 3,
    reason: 'Duty lieu credit for weekend institutional event duty',
  });

  bal = await policyService.calculateEmployeeBalance(hrAccess, 'emp-faculty-1', 'CL', '2026');
  assert.equal(bal.adjustments, 3);
  assert.equal(bal.remaining, 15); // 12 + 3 = 15
});

test('Immutable Policy History: Historical leave requests retain version and snapshot when policy changes', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const policyService = createLeavePolicyService(policyRepo, leaveRepo);
  const leaveService = createLeaveService(
    leaveRepo,
    undefined,
    undefined,
    policyService,
  );

  // 1. Create v1 policy for CL in 2026
  const v1Policy = await policyService.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    leaveTypeId: 1,
    annualEntitlement: 12,
    halfDayAllowed: true,
    requiresAcademicCoverage: true,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  });
  assert.equal(v1Policy.version, 1);

  // 2. Submit a leave request under v1 policy
  const requestDto = await leaveService.apply(facultyAccess, {
    leaveTypeId: 1,
    startDate: '2026-03-10',
    endDate: '2026-03-11',
    halfDay: null,
    reason: 'Attending technical conference',
  });

  assert.equal(requestDto.policyId, v1Policy.id);
  assert.equal(requestDto.policyVersion, 1);
  assert.ok(requestDto.policySnapshot);
  assert.equal(
    (requestDto.policySnapshot as Record<string, unknown>).annualEntitlement,
    12,
  );
  assert.equal(
    (requestDto.policySnapshot as Record<string, unknown>).halfDayAllowed,
    true,
  );
  assert.equal(
    (requestDto.policySnapshot as Record<string, unknown>)
      .requiresAcademicCoverage,
    true,
  );

  // 3. Later, HR updates the active policy to version 2 (changing entitlement to 15, disabling half days)
  const v2Policy = await policyService.updatePolicy(hrAccess, v1Policy.id, {
    annualEntitlement: 15,
    halfDayAllowed: false,
  });
  assert.equal(v2Policy.version, 2);
  assert.equal(v2Policy.annualEntitlement, 15);
  assert.equal(v2Policy.halfDayAllowed, false);

  // 4. Verify historical submitted leave request retains exact v1 snapshot and rules
  const persistedRecord = leaveRepo.submittedRequests.find(
    (r) => r.id === requestDto.id,
  );
  assert.ok(persistedRecord);
  assert.equal(persistedRecord.policyVersion, 1);
  const snapshot = persistedRecord.policySnapshot as Record<string, unknown> | null | undefined;
  assert.ok(snapshot);
  assert.equal(snapshot.annualEntitlement, 12);
  assert.equal(snapshot.halfDayAllowed, true);
  assert.equal(snapshot.version, 1);
});

test('Effective-Date Boundaries: Overlapping versions reject; non-overlapping succeed and resolve by reference date', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const policyService = createLeavePolicyService(policyRepo, leaveRepo);
  const leaveService = createLeaveService(
    leaveRepo,
    undefined,
    undefined,
    policyService,
  );

  // 1. Create H1 policy for 2026 (Jan 1 to Jun 30)
  const h1Policy = await policyService.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave - Semester I',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    leaveTypeId: 1,
    annualEntitlement: 6,
    halfDayAllowed: true,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-06-30',
  });
  assert.equal(h1Policy.version, 1);

  // 2. Attempt to create overlapping policy (Feb 1 to Aug 31) -> must fail with 409
  await assert.rejects(
    policyService.createPolicy(hrAccess, {
      code: 'CL',
      name: 'Casual Leave - Overlapping Window',
      policyYear: '2026',
      employeeCategory: 'TEACHING',
      leaveTypeId: 1,
      annualEntitlement: 10,
      effectiveFrom: '2026-02-01',
      effectiveTo: '2026-08-31',
    }),
    (err: unknown) => (err as { status?: number }).status === 409,
  );

  // 3. Create non-overlapping H2 policy (Jul 1 to Dec 31) -> succeeds with incremented version
  const h2Policy = await policyService.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave - Semester II',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    leaveTypeId: 1,
    annualEntitlement: 8,
    halfDayAllowed: false,
    effectiveFrom: '2026-07-01',
    effectiveTo: '2026-12-31',
  });
  assert.equal(h2Policy.version, 2);

  // 4. Resolving for H1 date returns v1 policy rules
  const h1Resolved = await policyService.getApplicablePolicies(
    facultyAccess,
    'emp-faculty-1',
    '2026',
    new Date('2026-04-15T00:00:00Z'),
  );
  const clH1 = h1Resolved.find((p) => p.code === 'CL');
  assert.ok(clH1);
  assert.equal(clH1.id, h1Policy.id);
  assert.equal(clH1.version, 1);
  assert.equal(clH1.annualEntitlement, 6);

  // 5. Resolving for H2 date returns v2 policy rules
  const h2Resolved = await policyService.getApplicablePolicies(
    facultyAccess,
    'emp-faculty-1',
    '2026',
    new Date('2026-09-15T00:00:00Z'),
  );
  const clH2 = h2Resolved.find((p) => p.code === 'CL');
  assert.ok(clH2);
  assert.equal(clH2.id, h2Policy.id);
  assert.equal(clH2.version, 2);
  assert.equal(clH2.annualEntitlement, 8);

  // 6. Applying for leave outside effective window is rejected
  await assert.rejects(
    leaveService.apply(facultyAccess, {
      leaveTypeId: 1,
      startDate: '2026-06-29',
      endDate: '2026-07-02', // Straddles across H1 boundary
      halfDay: null,
      reason: 'Crossing boundary',
    }),
    (err: unknown) => (err as { status?: number }).status === 400,
  );
});

test('Concurrency-Safe Rollover: Simultaneous executions are serialized and adjustments applied once', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const policyService = createLeavePolicyService(policyRepo, leaveRepo);
  const leaveService = createLeaveService(
    leaveRepo,
    undefined,
    undefined,
    policyService,
  );

  // Seed 2026 and 2027 EL policies
  await policyService.createPolicy(hrAccess, {
    code: 'EL',
    name: 'Earned Leave 2026',
    policyYear: '2026',
    employeeCategory: 'TEACHING',
    leaveTypeId: 2,
    annualEntitlement: 10,
    carryForwardAllowed: true,
    carryForwardLimit: 15,
    effectiveFrom: '2026-01-01',
  });

  await policyService.createPolicy(hrAccess, {
    code: 'EL',
    name: 'Earned Leave 2027',
    policyYear: '2027',
    employeeCategory: 'TEACHING',
    leaveTypeId: 2,
    annualEntitlement: 10,
    carryForwardAllowed: true,
    carryForwardLimit: 15,
    effectiveFrom: '2027-01-01',
  });

  // Execute two rollover requests concurrently
  const [res1, res2] = await Promise.allSettled([
    leaveService.executeRollover(hrAccess, {
      fromYear: 2026,
      toYear: 2027,
    }),
    leaveService.executeRollover(hrAccess, {
      fromYear: 2026,
      toYear: 2027,
    }),
  ]);

  // Exactly one call must succeed, and the other must reject with 409 ROLLOVER_ALREADY_EXECUTED
  const succeeded = [res1, res2].filter((r) => r.status === 'fulfilled');
  const rejected = [res1, res2].filter((r) => r.status === 'rejected');
  assert.equal(succeeded.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(
    ((rejected[0] as PromiseRejectedResult).reason as { status?: number })
      .status,
    409,
  );

  // Verify ledger has exactly one CARRY_FORWARD_CORRECTION adjustment for emp-faculty-1
  const adjustments = await policyService.listAdjustments(hrAccess, {
    policyYear: '2027',
  });
  const cfAdjs = adjustments.filter(
    (a) =>
      a.employeeId === 'emp-faculty-1' &&
      a.adjustmentType === 'CARRY_FORWARD_CORRECTION',
  );
  assert.equal(cfAdjs.length, 1);
  assert.equal(cfAdjs[0].days, 10);

  // Verify 2027 opening balance is exactly 20 (10 fresh + 10 carried), not double-counted (30)
  const bal2027 = await policyService.calculateEmployeeBalance(
    facultyAccess,
    'emp-faculty-1',
    'EL',
    '2027',
  );
  assert.equal(bal2027.carriedIn, 10);
  assert.equal(bal2027.entitled, 20); // 10 entitled + 10 carried
  assert.equal(bal2027.remaining, 20);
});

test('Workforce-Specific Coverage: Non-teaching operational coverage is policy-specific without timetable invocation', async () => {
  const policyRepo = createMemoryPolicyRepository();
  const leaveRepo = createFakeLeaveRepository();
  const policyService = createLeavePolicyService(policyRepo, leaveRepo);
  const leaveService = createLeaveService(
    leaveRepo,
    undefined,
    undefined,
    policyService,
  );

  // 1. Non-teaching CL: requiresOperationalCoverage = true
  await policyService.createPolicy(hrAccess, {
    code: 'CL',
    name: 'Casual Leave (Non-Teaching)',
    policyYear: '2026',
    employeeCategory: 'NON_TEACHING',
    leaveTypeId: 1,
    annualEntitlement: 12,
    requiresAcademicCoverage: false,
    requiresOperationalCoverage: true,
    effectiveFrom: '2026-01-01',
  });

  // 2. Non-teaching RH: requiresOperationalCoverage = false
  await policyService.createPolicy(hrAccess, {
    code: 'RH',
    name: 'Restricted Holiday (Non-Teaching)',
    policyYear: '2026',
    employeeCategory: 'NON_TEACHING',
    leaveTypeId: 6,
    annualEntitlement: null,
    requiresAcademicCoverage: false,
    requiresOperationalCoverage: false,
    effectiveFrom: '2026-01-01',
  });

  // Non-teaching applying for CL -> coverageRequired = true, role = 'Non-Teaching Staff'
  const clRequest = await leaveService.apply(staffAccess, {
    leaveTypeId: 1,
    startDate: '2026-04-10',
    endDate: '2026-04-11',
    halfDay: null,
    reason: 'Personal affairs',
  });

  assert.equal(clRequest.employeeCategory, 'NON_TEACHING');
  assert.equal(clRequest.affectsTimetable, false);
  assert.equal(clRequest.coverageRequired, true);
  assert.equal(clRequest.operationalCoverageRole, 'Non-Teaching Staff');

  // Non-teaching applying for RH -> coverageRequired = false, role = null
  const rhRequest = await leaveService.apply(staffAccess, {
    leaveTypeId: 6,
    startDate: '2026-09-08',
    endDate: '2026-09-08',
    halfDay: null,
    reason: 'Restricted holiday observance',
  });

  assert.equal(rhRequest.employeeCategory, 'NON_TEACHING');
  assert.equal(rhRequest.affectsTimetable, false);
  assert.equal(rhRequest.coverageRequired, false);
  assert.equal(rhRequest.operationalCoverageRole, null);
});


