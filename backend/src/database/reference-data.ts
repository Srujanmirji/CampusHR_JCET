import type { PrismaClient } from '../generated/prisma/client.js';
import { defaultGrants, ROLES } from '../modules/auth/permissions.js';

// Starting reference data; HR edits departments in the app afterwards.
const DEPARTMENTS = [
  ['CSE', 'Computer Science & Engineering'],
  ['ECE', 'Electronics & Communication Engineering'],
  ['ME', 'Mechanical Engineering'],
  ['CE', 'Civil Engineering'],
  ['AIML', 'Artificial Intelligence & Machine Learning'],
  ['MBA', 'Master of Business Administration'],
  ['ADMIN', 'Administration'],
] as const;
const DESIGNATIONS = [
  ['Professor', 1, 'TEACHING'],
  ['Associate Professor', 2, 'TEACHING'],
  ['Assistant Professor', 3, 'TEACHING'],
  ['Assistant Registrar / HR Officer', 2, 'NON_TEACHING'],
  ['Office Superintendent', 3, 'NON_TEACHING'],
  ['System Administrator', 3, 'NON_TEACHING'],
  ['Librarian', 3, 'NON_TEACHING'],
  ['Senior Lab Instructor', 4, 'NON_TEACHING'],
  ['Lab Instructor', 5, 'NON_TEACHING'],
  ['Technical Assistant', 5, 'NON_TEACHING'],
  ['Office Assistant', 6, 'NON_TEACHING'],
] as const;

// The approved timetable grid (frontend/DESIGN.md): seven periods with a
// short break after period 2 and lunch after period 4.
const PERIODS = [
  [1, '09:00', '10:00'],
  [2, '10:00', '10:50'],
  [3, '11:15', '12:15'],
  [4, '12:15', '13:15'],
  [5, '14:00', '15:00'],
  [6, '15:00', '16:00'],
  [7, '16:00', '17:00'],
] as const;

// Starting weekly teaching-hour bands (AICTE caps: 14 / 16 / 18 hours); the
// Principal edits them in the app.
const WORKLOAD_BANDS = [
  ['Professor', 10, 14],
  ['Associate Professor', 12, 16],
  ['Assistant Professor', 14, 18],
] as const;

/**
 * Adds missing roles, permissions, default grants, departments,
 * designations, timetable periods and workload bands. Never removes or
 * overwrites anything, so changes made later in the app are kept. Used by
 * `npm run db:seed` and the database tests.
 */
export async function seedReferenceData(prisma: PrismaClient) {
  for (const name of ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    for (const key of defaultGrants(name)) {
      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key.replaceAll('.', ' ') },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  for (const [code, name] of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  }
  for (const [name, level, category] of DESIGNATIONS) {
    await prisma.designation.upsert({
      where: { name },
      update: {},
      create: { name, level, category },
    });
  }
  for (const [number, startTime, endTime] of PERIODS) {
    await prisma.period.upsert({
      where: { number },
      update: {},
      create: { number, startTime, endTime },
    });
  }
  for (const [name, minHours, maxHours] of WORKLOAD_BANDS) {
    // Skipped if HR has renamed the designation since.
    const designation = await prisma.designation.findUnique({
      where: { name },
    });
    if (!designation) continue;
    await prisma.workloadThreshold.upsert({
      where: { designationId: designation.id },
      update: {},
      create: { designationId: designation.id, minHours, maxHours },
    });
  }

  // JCET 7 Leave Categories
  const LEAVE_TYPES = [
    { code: 'CL', name: 'Casual Leave', yearlyQuota: 12, allowHalfDay: true, carryForwardMax: 0 },
    { code: 'EL', name: 'Earned Leave', yearlyQuota: 10, allowHalfDay: false, carryForwardMax: 15 },
    { code: 'SPL_ML', name: 'Special / Medical Leave', yearlyQuota: null, allowHalfDay: false, carryForwardMax: 0 },
    { code: 'OOD', name: 'On Official Duty', yearlyQuota: 12, allowHalfDay: true, carryForwardMax: 0 },
    { code: 'ODE', name: 'Official / Examination Duty', yearlyQuota: 12, allowHalfDay: true, carryForwardMax: 0 },
    { code: 'RH', name: 'Restricted Holiday', yearlyQuota: null, allowHalfDay: false, carryForwardMax: 0 },
    { code: 'VL', name: 'Vacation Leave', yearlyQuota: null, allowHalfDay: false, carryForwardMax: 0 },
  ] as const;

  const createdLeaveTypes = new Map<string, number>();

  for (const type of LEAVE_TYPES) {
    const record = await prisma.leaveType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        yearlyQuota: type.yearlyQuota,
        allowHalfDay: type.allowHalfDay,
        carryForwardMax: type.carryForwardMax,
      },
      create: {
        code: type.code,
        name: type.name,
        yearlyQuota: type.yearlyQuota,
        allowHalfDay: type.allowHalfDay,
        carryForwardMax: type.carryForwardMax,
        active: true,
      },
    });
    createdLeaveTypes.set(type.code, record.id);
  }

  // Baseline Leave Policies for 2026 (both Teaching and Non-Teaching)
  const facultyGroup = await prisma.employeePolicyGroup.upsert({
    where: { name: 'Teaching Faculty - Standard' },
    update: {
      description: 'Standard academic workforce policy group for Teaching Faculty at JCET.',
      employeeCategory: 'TEACHING',
      active: true,
    },
    create: {
      name: 'Teaching Faculty - Standard',
      description: 'Standard academic workforce policy group for Teaching Faculty at JCET.',
      employeeCategory: 'TEACHING',
      active: true,
    },
  });

  const staffGroup = await prisma.employeePolicyGroup.upsert({
    where: { name: 'Non-Teaching Staff - Operational & Support' },
    update: {
      description: 'Standard operational workforce policy group for Non-Teaching Staff at JCET.',
      employeeCategory: 'NON_TEACHING',
      active: true,
    },
    create: {
      name: 'Non-Teaching Staff - Operational & Support',
      description: 'Standard operational workforce policy group for Non-Teaching Staff at JCET.',
      employeeCategory: 'NON_TEACHING',
      active: true,
    },
  });

  // Assign existing employees without policyGroupId to their respective default group
  const allEmps = await prisma.employee.findMany({
    where: { policyGroupId: null },
    include: { designation: { select: { category: true } } },
  });
  for (const emp of allEmps) {
    const groupId = emp.designation.category === 'TEACHING' ? facultyGroup.id : staffGroup.id;
    await prisma.employee.update({
      where: { id: emp.id },
      data: { policyGroupId: groupId },
    });
  }

  const defaultPolicies = [
    // Casual Leave (CL) - 12 days initial supplied
    {
      code: 'CL',
      name: 'Casual Leave (Teaching Faculty)',
      description: 'Casual Leave for teaching faculty: 12 days baseline. Half-day and break rules subject to institutional confirmation.',
      policyYear: '2026',
      employeeCategory: 'TEACHING' as const,
      annualEntitlement: 12,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: true,
      minimumNoticeDays: 1,
      maximumConsecutiveDays: 3,
      attachmentRequired: false,
      attendanceStatus: 'ON_LEAVE',
      affectsTimetable: true,
      requiresAcademicCoverage: true,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'FACULTY_STANDARD_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },
    {
      code: 'CL',
      name: 'Casual Leave (Non-Teaching Staff)',
      description: 'Casual Leave for non-teaching staff: 12 days baseline. Half-day rules subject to institutional confirmation.',
      policyYear: '2026',
      employeeCategory: 'NON_TEACHING' as const,
      annualEntitlement: 12,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: true,
      minimumNoticeDays: 1,
      maximumConsecutiveDays: 3,
      attachmentRequired: false,
      attendanceStatus: 'ON_LEAVE',
      affectsTimetable: false,
      requiresAcademicCoverage: false,
      requiresOperationalCoverage: true,
      approvalPolicyKey: 'NON_TEACHING_STANDARD_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },

    // Earned Leave (EL) - 10 days initial supplied (carry-forward cap unconfirmed)
    {
      code: 'EL',
      name: 'Earned Leave (Teaching Faculty)',
      description: 'Earned Leave for teaching faculty: 10 days baseline. Carry forward cap awaiting institutional approval.',
      policyYear: '2026',
      employeeCategory: 'TEACHING' as const,
      annualEntitlement: 10,
      carryForwardAllowed: true,
      carryForwardLimit: null,
      lapseAtYearEnd: false,
      halfDayAllowed: false,
      minimumNoticeDays: 7,
      maximumConsecutiveDays: 15,
      attachmentRequired: false,
      attendanceStatus: 'ON_LEAVE',
      affectsTimetable: true,
      requiresAcademicCoverage: true,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'FACULTY_STANDARD_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },
    {
      code: 'EL',
      name: 'Earned Leave (Non-Teaching Staff)',
      description: 'Earned Leave for non-teaching staff: 10 days baseline. Carry forward cap awaiting institutional approval.',
      policyYear: '2026',
      employeeCategory: 'NON_TEACHING' as const,
      annualEntitlement: 10,
      carryForwardAllowed: true,
      carryForwardLimit: null,
      lapseAtYearEnd: false,
      halfDayAllowed: false,
      minimumNoticeDays: 7,
      maximumConsecutiveDays: 15,
      attachmentRequired: false,
      attendanceStatus: 'ON_LEAVE',
      affectsTimetable: false,
      requiresAcademicCoverage: false,
      requiresOperationalCoverage: true,
      approvalPolicyKey: 'NON_TEACHING_STANDARD_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },

    // Special Leave / Medical Leave (SPL_ML) - Configurable (Medical Leave, not Maternity)
    {
      code: 'SPL_ML',
      name: 'Special / Medical Leave (Teaching Faculty)',
      description: 'Special Leave / Medical Leave for faculty. Medical certificate requirement subject to institutional confirmation.',
      policyYear: '2026',
      employeeCategory: 'TEACHING' as const,
      annualEntitlement: null,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: false,
      minimumNoticeDays: 0,
      maximumConsecutiveDays: 30,
      attachmentRequired: true,
      attachmentRequiredAfterDays: null,
      attendanceStatus: 'ON_LEAVE',
      affectsTimetable: true,
      requiresAcademicCoverage: true,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'MEDICAL_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },
    {
      code: 'SPL_ML',
      name: 'Special / Medical Leave (Non-Teaching Staff)',
      description: 'Special Leave / Medical Leave for non-teaching staff. Medical certificate requirement subject to institutional confirmation.',
      policyYear: '2026',
      employeeCategory: 'NON_TEACHING' as const,
      annualEntitlement: null,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: false,
      minimumNoticeDays: 0,
      maximumConsecutiveDays: 30,
      attachmentRequired: true,
      attachmentRequiredAfterDays: null,
      attendanceStatus: 'ON_LEAVE',
      affectsTimetable: false,
      requiresAcademicCoverage: false,
      requiresOperationalCoverage: true,
      approvalPolicyKey: 'MEDICAL_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },

    // On Official Duty (OOD) - 12 days initial supplied
    {
      code: 'OOD',
      name: 'On Official Duty',
      description: 'Official institutional and university assignments (VTU work, meetings, conferences). Attendance marked Official Duty.',
      policyYear: '2026',
      employeeCategory: 'TEACHING' as const,
      annualEntitlement: 12,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: true,
      minimumNoticeDays: 2,
      maximumConsecutiveDays: 5,
      attachmentRequired: true,
      attendanceStatus: 'ON_DUTY',
      affectsTimetable: true,
      requiresAcademicCoverage: true,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'OFFICIAL_DUTY',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },

    // Official / Examination Duty (ODE) - 12 days initial supplied
    {
      code: 'ODE',
      name: 'Official / Examination Duty',
      description: 'Official University Examination and Valuation duty (VTU valuation, invigilation squad). Attendance marked Official Duty.',
      policyYear: '2026',
      employeeCategory: 'TEACHING' as const,
      annualEntitlement: 12,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: true,
      minimumNoticeDays: 2,
      maximumConsecutiveDays: 6,
      attachmentRequired: true,
      attendanceStatus: 'ON_DUTY',
      affectsTimetable: true,
      requiresAcademicCoverage: true,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'OFFICIAL_DUTY',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },

    // Restricted Holiday (RH)
    {
      code: 'RH',
      name: 'Restricted Holiday (Teaching Faculty)',
      description: 'Restricted Holiday chosen from approved Academic Calendar Restricted Holiday Master.',
      policyYear: '2026',
      employeeCategory: 'TEACHING' as const,
      annualEntitlement: null,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: false,
      minimumNoticeDays: 3,
      maximumConsecutiveDays: 1,
      attachmentRequired: false,
      attendanceStatus: 'RESTRICTED_HOLIDAY',
      affectsTimetable: true,
      requiresAcademicCoverage: true,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'FACULTY_STANDARD_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },
    {
      code: 'RH',
      name: 'Restricted Holiday (Non-Teaching Staff)',
      description: 'Restricted Holiday chosen from approved Academic Calendar Restricted Holiday Master.',
      policyYear: '2026',
      employeeCategory: 'NON_TEACHING' as const,
      annualEntitlement: null,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: false,
      minimumNoticeDays: 3,
      maximumConsecutiveDays: 1,
      attachmentRequired: false,
      attendanceStatus: 'RESTRICTED_HOLIDAY',
      affectsTimetable: false,
      requiresAcademicCoverage: false,
      requiresOperationalCoverage: true,
      approvalPolicyKey: 'NON_TEACHING_STANDARD_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },

    // Vacation Leave (VL)
    {
      code: 'VL',
      name: 'Vacation Leave (Teaching Faculty)',
      description: 'Vacation leave taken during declared summer/winter vacation periods for eligible faculty.',
      policyYear: '2026',
      employeeCategory: 'TEACHING' as const,
      annualEntitlement: null,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: false,
      minimumNoticeDays: 7,
      maximumConsecutiveDays: 30,
      attachmentRequired: false,
      attendanceStatus: 'VACATION_LEAVE',
      affectsTimetable: true,
      requiresAcademicCoverage: true,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'VACATION_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: true,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },
    {
      code: 'VL',
      name: 'Vacation Leave (Non-Teaching Staff)',
      description: 'Vacation leave is not applicable to non-teaching operational staff by default.',
      policyYear: '2026',
      employeeCategory: 'NON_TEACHING' as const,
      annualEntitlement: null,
      carryForwardAllowed: false,
      carryForwardLimit: null,
      lapseAtYearEnd: true,
      halfDayAllowed: false,
      minimumNoticeDays: 7,
      maximumConsecutiveDays: 0,
      attachmentRequired: false,
      attendanceStatus: 'VACATION_LEAVE',
      affectsTimetable: false,
      requiresAcademicCoverage: false,
      requiresOperationalCoverage: false,
      approvalPolicyKey: 'NON_TEACHING_STANDARD_LEAVE',
      approvalStatus: 'AWAITING_APPROVAL',
      active: false,
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    },
  ];

  for (const pol of defaultPolicies) {
    const leaveTypeId = createdLeaveTypes.get(pol.code);
    await prisma.leavePolicy.upsert({
      where: {
        code_policyYear_employeeCategory_departmentId_policyGroupId: {
          code: pol.code,
          policyYear: pol.policyYear,
          employeeCategory: pol.employeeCategory,
          departmentId: null as unknown as number,
          policyGroupId: null as unknown as string,
        },
      },
      update: {
        name: pol.name,
        description: pol.description,
        annualEntitlement: pol.annualEntitlement,
        carryForwardAllowed: pol.carryForwardAllowed,
        carryForwardLimit: pol.carryForwardLimit,
        lapseAtYearEnd: pol.lapseAtYearEnd,
        halfDayAllowed: pol.halfDayAllowed,
        minimumNoticeDays: pol.minimumNoticeDays,
        maximumConsecutiveDays: pol.maximumConsecutiveDays,
        attachmentRequired: pol.attachmentRequired,
        attendanceStatus: pol.attendanceStatus,
        affectsTimetable: pol.affectsTimetable,
        requiresAcademicCoverage: pol.requiresAcademicCoverage,
        requiresOperationalCoverage: pol.requiresOperationalCoverage,
        approvalPolicyKey: pol.approvalPolicyKey,
        approvalStatus: pol.approvalStatus,
        active: pol.active,
        leaveTypeId,
      },
      create: {
        ...pol,
        departmentId: null,
        policyGroupId: null,
        leaveTypeId,
      },
    });
  }

  // Default OOD / ODE mappings
  const dutyMappings = [
    {
      dutyCategory: 'UNIVERSITY_VALUATION',
      targetLeaveCode: 'ODE',
      title: 'University Valuation',
      description: 'VTU Central Valuation / Paper Evaluation duty.',
    },
    {
      dutyCategory: 'EXTERNAL_EXAMINER',
      targetLeaveCode: 'ODE',
      title: 'External Examiner',
      description: 'VTU External Practical / Project Viva Examination.',
    },
    {
      dutyCategory: 'CONFERENCE_SEMINAR',
      targetLeaveCode: 'OOD',
      title: 'Conference / Seminar',
      description: 'National / International Academic Conference presentation or attendance.',
    },
    {
      dutyCategory: 'FDP_WORKSHOP',
      targetLeaveCode: 'OOD',
      title: 'FDP / Workshop',
      description: 'Faculty Development Program, training program, or technical workshop.',
    },
    {
      dutyCategory: 'BOS_BOE_MEETING',
      targetLeaveCode: 'OOD',
      title: 'BOS / BOE Meeting',
      description: 'Board of Studies or Board of Examiners meeting.',
    },
    {
      dutyCategory: 'OFFICIAL_COLLEGE_DUTY',
      targetLeaveCode: 'OOD',
      title: 'Official College Duty',
      description: 'Institutional administrative duty, admission work, or institutional representation.',
    },
  ];

  for (const m of dutyMappings) {
    await prisma.onDutyDutyMapping.upsert({
      where: { dutyCategory: m.dutyCategory },
      update: {
        targetLeaveCode: m.targetLeaveCode,
        title: m.title,
        description: m.description,
        active: true,
      },
      create: m,
    });
  }
}
