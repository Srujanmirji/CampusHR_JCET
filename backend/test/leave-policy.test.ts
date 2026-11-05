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
import type { LeaveRepository } from '../src/modules/leave/leave.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';

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
      joiningDate: new Date('2024-01-01T00:00:00Z'),
      status: 'ACTIVE',
      designation: { id: 1, name: 'Assistant Professor', category: 'TEACHING' },
      department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    },
    {
      id: 'emp-non-teaching-1',
      employeeCode: 'JCET-ADM-001',
      firstName: 'Ramesh',
      lastName: 'Kulkarni',
      email: 'ramesh.k@jcet.edu',
      departmentId: 2,
      employmentType: 'PERMANENT',
      joiningDate: new Date('2024-01-01T00:00:00Z'),
      status: 'ACTIVE',
      designation: { id: 2, name: 'Office Superintendent', category: 'NON_TEACHING' },
      department: { id: 2, code: 'ADMIN', name: 'Administration' },
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

    async findPolicyByCodeAndContext(code, policyYear, employeeCategory, departmentId) {
      if (departmentId) {
        const dept = policies.find(
          (p) =>
            p.code === code &&
            p.policyYear === policyYear &&
            (p.employeeCategory === employeeCategory || p.appliesToAllCategories) &&
            p.departmentId === departmentId &&
            p.active,
        );
        if (dept) return dept;
      }
      const generic = policies.find(
        (p) =>
          p.code === code &&
          p.policyYear === policyYear &&
          (p.employeeCategory === employeeCategory || p.appliesToAllCategories) &&
          p.departmentId === null &&
          p.active,
      );
      return generic ?? null;
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
        leaveTypeId: data.leaveTypeId ?? null,
        annualEntitlement: data.annualEntitlement ?? null,
        entitlementUnit: data.entitlementUnit ?? 'DAYS',
        carryForwardAllowed: data.carryForwardAllowed ?? false,
        carryForwardLimit: data.carryForwardLimit ?? 0,
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
        createdAt: new Date(),
      };
      adjustments.push(record);
      return record;
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

function createFakeLeaveRepository(): LeaveRepository {
  const takenRecords: Array<{
    employeeId: string;
    leaveTypeId: number;
    days: number;
    status: string;
    startDate: string;
    endDate: string;
  }> = [];

  const repo = {
    async user() { return null; },
    async employee() { return null; },
    async taken(empId: string) {
      return takenRecords.filter((t) => t.employeeId === empId);
    },
    async allTaken() { return takenRecords; },
    async list() { return []; },
    async find() { return null; },
    async types() {
      return dummyTypes;
    },
    async findType(id: number) {
      return dummyTypes.find((t) => t.id === id) ?? null;
    },
    async findTypeByCode(code: string) {
      return dummyTypes.find((t) => t.code === code) ?? null;
    },
    async findTypeConflict() { return null; },
    async saveType() { return dummyTypes[0]; },
    async submit() { return null; },
    async advance() { return null; },
    async activeEmployees() { return []; },
  };
  return repo as unknown as LeaveRepository;
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
    reason: 'Institutional compensation credit for Sunday exam coordination',
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

