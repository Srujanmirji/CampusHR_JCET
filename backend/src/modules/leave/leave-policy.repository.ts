import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { StaffCategoryType } from './leave-policy.schema.js';

export interface LeavePolicyRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  policyYear: string;
  employeeCategory: StaffCategoryType;
  appliesToAllCategories: boolean;
  employmentType: string | null;
  departmentId: number | null;
  department?: { id: number; code: string; name: string } | null;
  leaveTypeId: number | null;
  leaveType?: { id: number; code: string; name: string } | null;
  annualEntitlement: number | null;
  entitlementUnit: string;
  carryForwardAllowed: boolean;
  carryForwardLimit: number;
  carryForwardExpiryMonths: number | null;
  lapseAtYearEnd: boolean;
  halfDayAllowed: boolean;
  minimumNoticeDays: number;
  maximumConsecutiveDays: number | null;
  minimumServiceDays: number | null;
  attachmentRequired: boolean;
  attachmentRequiredAfterDays: number | null;
  reasonRequired: boolean;
  attendanceStatus: string;
  affectsTimetable: boolean;
  requiresAcademicCoverage: boolean;
  requiresOperationalCoverage: boolean;
  reservePendingBalance: boolean;
  approvalPolicyKey: string | null;
  calendarPolicyKey: string | null;
  active: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceAdjustmentRecord {
  id: string;
  employeeId: string;
  employee?: { id: string; employeeCode: string; firstName: string; lastName: string };
  leaveTypeId: number | null;
  policyId: string | null;
  leaveCode: string;
  policyYear: string;
  adjustmentType: string;
  days: number;
  reason: string;
  actorUserId: string;
  actorUser?: { id: string; email: string };
  createdAt: Date;
}

export interface OnDutyDutyMappingRecord {
  id: string;
  dutyCategory: string;
  targetLeaveCode: string;
  title: string;
  description: string | null;
  active: boolean;
  updatedAt: Date;
}

export interface EmployeeWithCategoryRecord {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  employmentType: string;
  joiningDate: Date;
  status: string;
  designation: {
    id: number;
    name: string;
    category: StaffCategoryType;
  };
  department: {
    id: number;
    code: string;
    name: string;
  };
}

export interface LeavePolicyRepository {
  findPolicies(where: Prisma.LeavePolicyWhereInput): Promise<LeavePolicyRecord[]>;
  findPolicyById(id: string): Promise<LeavePolicyRecord | null>;
  findPolicyByCodeAndContext(
    code: string,
    policyYear: string,
    employeeCategory: StaffCategoryType,
    departmentId?: number | null,
  ): Promise<LeavePolicyRecord | null>;
  createPolicy(data: Prisma.LeavePolicyUncheckedCreateInput): Promise<LeavePolicyRecord>;
  updatePolicy(id: string, data: Prisma.LeavePolicyUncheckedUpdateInput): Promise<LeavePolicyRecord>;
  deletePolicy(id: string): Promise<LeavePolicyRecord>;
  findEmployee(id: string): Promise<EmployeeWithCategoryRecord | null>;
  findActiveEmployees(departmentId?: number): Promise<EmployeeWithCategoryRecord[]>;
  createAdjustment(data: Prisma.LeaveBalanceAdjustmentUncheckedCreateInput): Promise<LeaveBalanceAdjustmentRecord>;
  findAdjustments(where: Prisma.LeaveBalanceAdjustmentWhereInput): Promise<LeaveBalanceAdjustmentRecord[]>;
  findDutyMappings(): Promise<OnDutyDutyMappingRecord[]>;
  findDutyMappingByCategory(dutyCategory: string): Promise<OnDutyDutyMappingRecord | null>;
  upsertDutyMapping(data: {
    dutyCategory: string;
    targetLeaveCode: string;
    title: string;
    description?: string | null;
    active?: boolean;
  }): Promise<OnDutyDutyMappingRecord>;
}

const policyInclude = {
  department: { select: { id: true, code: true, name: true } },
  leaveType: { select: { id: true, code: true, name: true } },
} as const;

export function createLeavePolicyRepository(prisma: PrismaClient): LeavePolicyRepository {
  return {
    async findPolicies(where: Prisma.LeavePolicyWhereInput) {
      return (await prisma.leavePolicy.findMany({
        where,
        include: policyInclude,
        orderBy: [{ policyYear: 'desc' }, { code: 'asc' }],
      })) as unknown as LeavePolicyRecord[];
    },

    async findPolicyById(id: string) {
      return (await prisma.leavePolicy.findUnique({
        where: { id },
        include: policyInclude,
      })) as unknown as LeavePolicyRecord | null;
    },

    async findPolicyByCodeAndContext(
      code: string,
      policyYear: string,
      employeeCategory: StaffCategoryType,
      departmentId?: number | null,
    ) {
      // First check department-specific policy, fall back to institution-wide (departmentId = null)
      if (departmentId) {
        const deptPolicy = await prisma.leavePolicy.findFirst({
          where: {
            code,
            policyYear,
            employeeCategory,
            departmentId,
            active: true,
          },
          include: policyInclude,
        });
        if (deptPolicy) return deptPolicy as unknown as LeavePolicyRecord;
      }

      const instPolicy = await prisma.leavePolicy.findFirst({
        where: {
          code,
          policyYear,
          employeeCategory,
          departmentId: null,
          active: true,
        },
        include: policyInclude,
      });

      if (instPolicy) return instPolicy as unknown as LeavePolicyRecord;

      // Also check if there is an appliesToAllCategories policy
      const genericPolicy = await prisma.leavePolicy.findFirst({
        where: {
          code,
          policyYear,
          appliesToAllCategories: true,
          active: true,
        },
        include: policyInclude,
      });

      return genericPolicy as unknown as LeavePolicyRecord | null;
    },

    async createPolicy(data: Prisma.LeavePolicyUncheckedCreateInput) {
      return (await prisma.leavePolicy.create({
        data,
        include: policyInclude,
      })) as unknown as LeavePolicyRecord;
    },

    async updatePolicy(id: string, data: Prisma.LeavePolicyUncheckedUpdateInput) {
      return (await prisma.leavePolicy.update({
        where: { id },
        data,
        include: policyInclude,
      })) as unknown as LeavePolicyRecord;
    },

    async deletePolicy(id: string) {
      return (await prisma.leavePolicy.delete({
        where: { id },
        include: policyInclude,
      })) as unknown as LeavePolicyRecord;
    },

    async findEmployee(id: string) {
      return (await prisma.employee.findUnique({
        where: { id },
        include: {
          designation: { select: { id: true, name: true, category: true } },
          department: { select: { id: true, code: true, name: true } },
        },
      })) as unknown as EmployeeWithCategoryRecord | null;
    },

    async findActiveEmployees(departmentId?: number) {
      return (await prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          ...(departmentId ? { departmentId } : {}),
        },
        include: {
          designation: { select: { id: true, name: true, category: true } },
          department: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ departmentId: 'asc' }, { employeeCode: 'asc' }],
      })) as unknown as EmployeeWithCategoryRecord[];
    },

    async createAdjustment(data: Prisma.LeaveBalanceAdjustmentUncheckedCreateInput) {
      return (await prisma.leaveBalanceAdjustment.create({
        data,
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
          actorUser: { select: { id: true, email: true } },
        },
      })) as unknown as LeaveBalanceAdjustmentRecord;
    },

    async findAdjustments(where: Prisma.LeaveBalanceAdjustmentWhereInput) {
      return (await prisma.leaveBalanceAdjustment.findMany({
        where,
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
          actorUser: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })) as unknown as LeaveBalanceAdjustmentRecord[];
    },

    async findDutyMappings() {
      return (await prisma.onDutyDutyMapping.findMany({
        orderBy: { dutyCategory: 'asc' },
      })) as unknown as OnDutyDutyMappingRecord[];
    },

    async findDutyMappingByCategory(dutyCategory: string) {
      return (await prisma.onDutyDutyMapping.findUnique({
        where: { dutyCategory },
      })) as unknown as OnDutyDutyMappingRecord | null;
    },

    async upsertDutyMapping(data: {
      dutyCategory: string;
      targetLeaveCode: string;
      title: string;
      description?: string | null;
      active?: boolean;
    }) {
      return (await prisma.onDutyDutyMapping.upsert({
        where: { dutyCategory: data.dutyCategory },
        update: {
          targetLeaveCode: data.targetLeaveCode,
          title: data.title,
          description: data.description,
          active: data.active ?? true,
        },
        create: {
          dutyCategory: data.dutyCategory,
          targetLeaveCode: data.targetLeaveCode,
          title: data.title,
          description: data.description,
          active: data.active ?? true,
        },
      })) as unknown as OnDutyDutyMappingRecord;
    },
  };
}
