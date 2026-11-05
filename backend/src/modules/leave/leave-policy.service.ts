import { HttpError } from '../../common/http-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import type { AcademicCalendarService } from '../academic-calendar/academic-calendar.service.js';
import {
  createLeavePolicySchema,
  type CreateLeaveBalanceAdjustmentInput,
  type CreateLeavePolicyInput,
  type QueryLeaveBalanceAdjustmentInput,
  type QueryLeavePolicyInput,
  type StaffCategoryType,
  type UpdateLeavePolicyInput,
  type UpdateOnDutyDutyMappingInput,
} from './leave-policy.schema.js';
import type {
  EmployeeWithCategoryRecord,
  LeaveBalanceAdjustmentRecord,
  LeavePolicyRecord,
  LeavePolicyRepository,
  OnDutyDutyMappingRecord,
} from './leave-policy.repository.js';
import type { LeaveRepository } from './leave.repository.js';

const invalid = (message: string) => new HttpError(400, 'VALIDATION_ERROR', message);
const forbidden = (message: string) => new HttpError(403, 'FORBIDDEN', message);
const notFound = (message = 'Resource not found') => new HttpError(404, 'NOT_FOUND', message);

export interface ComputedLeaveBalance {
  leaveCode: string;
  leaveName: string;
  policyId: string;
  policyYear: string;
  employeeCategory: StaffCategoryType;
  entitled: number | null;
  carriedIn: number;
  adjustments: number;
  used: number;
  pending: number;
  remaining: number | null;
  allowHalfDay: boolean;
  attachmentRequired: boolean;
  requiresAcademicCoverage: boolean;
  requiresOperationalCoverage: boolean;
  attendanceStatus: string;
  isPolicyBased: boolean;
}

export interface LeavePolicyService {
  listPolicies(access: Access, query: QueryLeavePolicyInput): Promise<LeavePolicyRecord[]>;
  getApplicablePolicies(access: Access, employeeId?: string, policyYear?: string): Promise<LeavePolicyRecord[]>;
  getPolicyById(access: Access, id: string): Promise<LeavePolicyRecord>;
  createPolicy(access: Access, input: CreateLeavePolicyInput): Promise<LeavePolicyRecord>;
  updatePolicy(access: Access, id: string, input: UpdateLeavePolicyInput): Promise<LeavePolicyRecord>;
  deletePolicy(access: Access, id: string): Promise<LeavePolicyRecord>;
  getEmployee(employeeId: string): Promise<EmployeeWithCategoryRecord>;
  calculateEmployeeBalance(
    access: Access,
    employeeId: string,
    leaveCode: string,
    policyYear?: string,
  ): Promise<ComputedLeaveBalance>;
  calculateAllBalances(
    access: Access,
    employeeId: string,
    policyYear?: string,
  ): Promise<ComputedLeaveBalance[]>;
  createAdjustment(access: Access, input: CreateLeaveBalanceAdjustmentInput): Promise<LeaveBalanceAdjustmentRecord>;
  listAdjustments(access: Access, query: QueryLeaveBalanceAdjustmentInput): Promise<LeaveBalanceAdjustmentRecord[]>;
  getPolicyGroups(access: Access, category?: StaffCategoryType): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
    employeeCategory: StaffCategoryType;
    active: boolean;
  }>>;
  getDutyMappings(access: Access): Promise<OnDutyDutyMappingRecord[]>;
  updateDutyMapping(access: Access, input: UpdateOnDutyDutyMappingInput): Promise<OnDutyDutyMappingRecord>;
  resolveDutyLeaveCode(dutyCategory: string): Promise<'ODE' | 'OOD'>;
}

export const DEFAULT_DUTY_MAPPINGS: Record<string, 'ODE' | 'OOD'> = {
  UNIVERSITY_VALUATION: 'ODE',
  EXTERNAL_EXAMINER: 'ODE',
  CONFERENCE_SEMINAR: 'OOD',
  FDP_WORKSHOP: 'OOD',
  BOS_BOE_MEETING: 'OOD',
  OFFICIAL_COLLEGE_DUTY: 'OOD',
};

export function createLeavePolicyService(
  policyRepo: LeavePolicyRepository,
  leaveRepo: LeaveRepository,
  calendarService?: AcademicCalendarService,
): LeavePolicyService {
  void calendarService;

  async function resolveEmployee(employeeId?: string | null): Promise<EmployeeWithCategoryRecord> {
    if (!employeeId) throw invalid('Employee ID is required');
    const employee = await policyRepo.findEmployee(employeeId);
    if (!employee) throw notFound('Employee not found');
    return employee;
  }

  function assertManage(access: Access) {
    if (access.role !== 'Super Admin' && access.role !== 'HR Admin') {
      throw forbidden('Only HR Administrators and Super Admins can manage leave policies');
    }
  }

  return {
    async listPolicies(access: Access, query: QueryLeavePolicyInput) {
      const where: Parameters<typeof policyRepo.findPolicies>[0] = {};
      if (query.policyYear) where.policyYear = query.policyYear;
      if (query.employeeCategory) where.employeeCategory = query.employeeCategory;
      if (query.code) where.code = query.code.toUpperCase();
      if (query.active !== undefined) where.active = query.active;

      if (access.scope === 'department' && access.departmentId) {
        where.OR = [
          { departmentId: access.departmentId },
          { departmentId: null },
        ];
      } else if (query.departmentId !== undefined) {
        where.departmentId = query.departmentId;
      }

      return policyRepo.findPolicies(where);
    },

    async getApplicablePolicies(access: Access, employeeId?: string, policyYear?: string) {
      const targetId = employeeId ?? access.employeeId;
      const employee = await resolveEmployee(targetId);

      // Verify scope
      if (
        access.scope === 'own' &&
        employee.id !== access.employeeId
      ) {
        throw forbidden('You can only view your own applicable leave policies');
      }
      if (
        access.scope === 'department' &&
        access.departmentId &&
        employee.departmentId !== access.departmentId
      ) {
        throw forbidden('You cannot view policies for employees of other departments');
      }

      const year = policyYear ?? String(new Date().getUTCFullYear());
      const policies = await policyRepo.findPolicies({
        policyYear: year,
        active: true,
        OR: [
          { employeeCategory: employee.designation.category },
          { appliesToAllCategories: true },
        ],
        AND: [
          {
            OR: [
              { departmentId: employee.departmentId },
              { departmentId: null },
            ],
          },
          {
            OR: [
              { employmentType: employee.employmentType as unknown as Prisma.LeavePolicyWhereInput['employmentType'] },
              { employmentType: null },
            ],
          },
          {
            OR: [
              { policyGroupId: employee.policyGroupId },
              { policyGroupId: null },
            ],
          },
        ],
      });

      // Filter and pick group-specific or department-specific if both exist for same code
      const uniqueByCode = new Map<string, LeavePolicyRecord>();
      for (const pol of policies) {
        const existing = uniqueByCode.get(pol.code);
        if (!existing) {
          uniqueByCode.set(pol.code, pol);
        } else if (pol.policyGroupId && !existing.policyGroupId) {
          // Group-specific overrides general policy
          uniqueByCode.set(pol.code, pol);
        } else if (pol.departmentId && !existing.departmentId) {
          // Department specific overrides generic
          uniqueByCode.set(pol.code, pol);
        }
      }

      return Array.from(uniqueByCode.values());
    },

    async getPolicyById(_access: Access, id: string) {
      const policy = await policyRepo.findPolicyById(id);
      if (!policy) throw notFound('Leave policy not found');
      return policy;
    },

    async createPolicy(access: Access, rawInput: CreateLeavePolicyInput) {
      assertManage(access);
      const input = createLeavePolicySchema.parse(rawInput);

      if (input.effectiveTo && new Date(input.effectiveTo) < new Date(input.effectiveFrom)) {
        throw invalid('effectiveTo date cannot be earlier than effectiveFrom date');
      }

      // Check duplicate
      const policies = await policyRepo.findPolicies({
        code: input.code,
        policyYear: input.policyYear,
        employeeCategory: input.employeeCategory,
      });
      const duplicate = policies.find(
        (p) =>
          (p.departmentId ?? null) === (input.departmentId ?? null) &&
          (p.policyGroupId ?? null) === (input.policyGroupId ?? null),
      );
      if (duplicate) {
        throw new HttpError(
          409,
          'DUPLICATE_POLICY',
          `Policy for code ${input.code} already exists for year ${input.policyYear}, category ${input.employeeCategory}${input.policyGroupId ? ` and group ${input.policyGroupId}` : ''}`,
        );
      }

      return policyRepo.createPolicy({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        policyYear: input.policyYear,
        employeeCategory: input.employeeCategory,
        appliesToAllCategories: input.appliesToAllCategories ?? false,
        employmentType: input.employmentType ?? null,
        departmentId: input.departmentId ?? null,
        policyGroupId: input.policyGroupId ?? null,
        approvalStatus: input.approvalStatus ?? 'AWAITING_APPROVAL',
        leaveTypeId: input.leaveTypeId ?? null,
        annualEntitlement: input.annualEntitlement ?? null,
        entitlementUnit: input.entitlementUnit ?? 'DAYS',
        carryForwardAllowed: input.carryForwardAllowed ?? false,
        carryForwardLimit: input.carryForwardLimit ?? null,
        carryForwardExpiryMonths: input.carryForwardExpiryMonths ?? null,
        lapseAtYearEnd: input.lapseAtYearEnd ?? true,
        halfDayAllowed: input.halfDayAllowed ?? false,
        minimumNoticeDays: input.minimumNoticeDays ?? 0,
        maximumConsecutiveDays: input.maximumConsecutiveDays ?? null,
        minimumServiceDays: input.minimumServiceDays ?? null,
        attachmentRequired: input.attachmentRequired ?? false,
        attachmentRequiredAfterDays: input.attachmentRequiredAfterDays ?? null,
        reasonRequired: input.reasonRequired ?? true,
        attendanceStatus: input.attendanceStatus ?? 'ON_LEAVE',
        affectsTimetable: input.affectsTimetable ?? true,
        requiresAcademicCoverage: input.requiresAcademicCoverage ?? true,
        requiresOperationalCoverage: input.requiresOperationalCoverage ?? false,
        reservePendingBalance: input.reservePendingBalance ?? true,
        approvalPolicyKey: input.approvalPolicyKey ?? 'STANDARD',
        calendarPolicyKey: input.calendarPolicyKey ?? 'INSTITUTION_CALENDAR',
        active: input.active ?? true,
        effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00Z`),
        effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00Z`) : null,
      });
    },

    async updatePolicy(access: Access, id: string, input: UpdateLeavePolicyInput) {
      assertManage(access);
      const existing = await policyRepo.findPolicyById(id);
      if (!existing) throw notFound('Leave policy not found');

      if (input.effectiveFrom && input.effectiveTo) {
        if (new Date(input.effectiveTo) < new Date(input.effectiveFrom)) {
          throw invalid('effectiveTo date cannot be earlier than effectiveFrom date');
        }
      }

      const updateData: Parameters<typeof policyRepo.updatePolicy>[1] = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.policyGroupId !== undefined) updateData.policyGroupId = input.policyGroupId;
      if (input.approvalStatus !== undefined) updateData.approvalStatus = input.approvalStatus;
      if (input.annualEntitlement !== undefined) updateData.annualEntitlement = input.annualEntitlement;
      if (input.carryForwardAllowed !== undefined) updateData.carryForwardAllowed = input.carryForwardAllowed;
      if (input.carryForwardLimit !== undefined) updateData.carryForwardLimit = input.carryForwardLimit;
      if (input.carryForwardExpiryMonths !== undefined) updateData.carryForwardExpiryMonths = input.carryForwardExpiryMonths;
      if (input.lapseAtYearEnd !== undefined) updateData.lapseAtYearEnd = input.lapseAtYearEnd;
      if (input.halfDayAllowed !== undefined) updateData.halfDayAllowed = input.halfDayAllowed;
      if (input.minimumNoticeDays !== undefined) updateData.minimumNoticeDays = input.minimumNoticeDays;
      if (input.maximumConsecutiveDays !== undefined) updateData.maximumConsecutiveDays = input.maximumConsecutiveDays;
      if (input.minimumServiceDays !== undefined) updateData.minimumServiceDays = input.minimumServiceDays;
      if (input.attachmentRequired !== undefined) updateData.attachmentRequired = input.attachmentRequired;
      if (input.attachmentRequiredAfterDays !== undefined) updateData.attachmentRequiredAfterDays = input.attachmentRequiredAfterDays;
      if (input.reasonRequired !== undefined) updateData.reasonRequired = input.reasonRequired;
      if (input.attendanceStatus !== undefined) updateData.attendanceStatus = input.attendanceStatus;
      if (input.affectsTimetable !== undefined) updateData.affectsTimetable = input.affectsTimetable;
      if (input.requiresAcademicCoverage !== undefined) updateData.requiresAcademicCoverage = input.requiresAcademicCoverage;
      if (input.requiresOperationalCoverage !== undefined) updateData.requiresOperationalCoverage = input.requiresOperationalCoverage;
      if (input.reservePendingBalance !== undefined) updateData.reservePendingBalance = input.reservePendingBalance;
      if (input.approvalPolicyKey !== undefined) updateData.approvalPolicyKey = input.approvalPolicyKey;
      if (input.active !== undefined) updateData.active = input.active;
      if (input.effectiveFrom) updateData.effectiveFrom = new Date(`${input.effectiveFrom}T00:00:00Z`);
      if (input.effectiveTo !== undefined) {
        updateData.effectiveTo = input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00Z`) : null;
      }

      return policyRepo.updatePolicy(id, updateData);
    },

    async deletePolicy(access: Access, id: string) {
      assertManage(access);
      const existing = await policyRepo.findPolicyById(id);
      if (!existing) throw notFound('Leave policy not found');
      return policyRepo.deletePolicy(id);
    },

    async getEmployee(employeeId: string) {
      return resolveEmployee(employeeId);
    },

    async calculateEmployeeBalance(
      access: Access,
      employeeId: string,
      leaveCode: string,
      policyYear?: string,
    ): Promise<ComputedLeaveBalance> {
      const employee = await resolveEmployee(employeeId);
      const year = policyYear ?? String(new Date().getUTCFullYear());
      const numYear = parseInt(year.slice(0, 4), 10);

      // Find applicable policy
      const policy = await policyRepo.findPolicyByCodeAndContext(
        leaveCode.toUpperCase(),
        year,
        employee.designation.category,
        employee.departmentId,
        employee.policyGroupId,
      );

      if (!policy) {
        throw notFound(`No active leave policy found for ${leaveCode} in ${year}`);
      }

      // Fetch taken records for employee
      const taken = await leaveRepo.taken(employee.id);

      // Calculate approved and pending days in this year for this leave type or code
      let used = 0;
      let pending = 0;
      for (const t of taken) {
        const tYear = t.startDate.getUTCFullYear();
        const matchesType = policy.leaveTypeId ? t.leaveTypeId === policy.leaveTypeId : false;
        if (tYear === numYear && matchesType) {
          if (t.status === 'APPROVED') {
            used += t.days;
          } else if (t.status === 'PENDING') {
            pending += t.days;
          }
        }
      }

      // Calculate carriedIn from previous years if carryForwardAllowed
      let carriedIn = 0;
      if (policy.carryForwardAllowed && policy.annualEntitlement !== null) {
        const joiningYear = employee.joiningDate.getUTCFullYear();
        const maxCarry = policy.carryForwardLimit;
        for (let y = joiningYear; y < numYear; y++) {
          let prevUsed = 0;
          for (const t of taken) {
            if (t.startDate.getUTCFullYear() === y && t.status === 'APPROVED' && t.leaveTypeId === policy.leaveTypeId) {
              prevUsed += t.days;
            }
          }
          const left = policy.annualEntitlement + carriedIn - prevUsed;
          carriedIn = maxCarry !== null ? Math.min(maxCarry, Math.max(0, left)) : Math.max(0, left);
        }
      }

      // Fetch balance adjustments for employee in this year and leaveCode
      const adjustmentsList = await policyRepo.findAdjustments({
        employeeId: employee.id,
        policyYear: year,
        leaveCode: policy.code,
      });

      let adjustments = 0;
      for (const adj of adjustmentsList) {
        if (adj.adjustmentType === 'CREDIT' || adj.adjustmentType === 'OPENING_CORRECTION') {
          adjustments += adj.days;
        } else if (adj.adjustmentType === 'DEBIT' || adj.adjustmentType === 'LAPSE') {
          adjustments -= adj.days;
        } else if (adj.adjustmentType === 'CARRY_FORWARD_CORRECTION') {
          adjustments += adj.days;
        }
      }

      const isPolicyBased = policy.annualEntitlement === null;
      let entitled: number | null = null;
      let remaining: number | null = null;

      if (!isPolicyBased && policy.annualEntitlement !== null) {
        entitled = policy.annualEntitlement + carriedIn + adjustments;
        const reservedPending = policy.reservePendingBalance ? pending : 0;
        remaining = entitled - used - reservedPending;
      }

      return {
        leaveCode: policy.code,
        leaveName: policy.name,
        policyId: policy.id,
        policyYear: policy.policyYear,
        employeeCategory: policy.employeeCategory,
        entitled,
        carriedIn,
        adjustments,
        used,
        pending,
        remaining,
        allowHalfDay: policy.halfDayAllowed,
        attachmentRequired: policy.attachmentRequired,
        requiresAcademicCoverage: policy.requiresAcademicCoverage,
        requiresOperationalCoverage: policy.requiresOperationalCoverage,
        attendanceStatus: policy.attendanceStatus,
        isPolicyBased,
      };
    },

    async calculateAllBalances(
      access: Access,
      employeeId: string,
      policyYear?: string,
    ): Promise<ComputedLeaveBalance[]> {
      const applicablePolicies = await this.getApplicablePolicies(access, employeeId, policyYear);
      const results: ComputedLeaveBalance[] = [];
      for (const policy of applicablePolicies) {
        const balance = await this.calculateEmployeeBalance(
          access,
          employeeId,
          policy.code,
          policyYear,
        );
        results.push(balance);
      }
      return results;
    },

    async createAdjustment(access: Access, input: CreateLeaveBalanceAdjustmentInput) {
      assertManage(access);
      const employee = await resolveEmployee(input.employeeId);

      // Verify policy exists
      const policy = await policyRepo.findPolicyByCodeAndContext(
        input.leaveCode,
        input.policyYear,
        employee.designation.category,
        employee.departmentId,
        employee.policyGroupId,
      );

      return policyRepo.createAdjustment({
        employeeId: employee.id,
        leaveTypeId: policy?.leaveTypeId ?? null,
        policyId: policy?.id ?? null,
        leaveCode: input.leaveCode.toUpperCase(),
        policyYear: input.policyYear,
        adjustmentType: input.adjustmentType,
        days: input.days,
        reason: input.reason,
        actorUserId: access.userId,
      });
    },

    async listAdjustments(access: Access, query: QueryLeaveBalanceAdjustmentInput) {
      const where: Parameters<typeof policyRepo.findAdjustments>[0] = {};
      if (query.employeeId) where.employeeId = query.employeeId;
      if (query.policyYear) where.policyYear = query.policyYear;
      if (query.leaveCode) where.leaveCode = query.leaveCode.toUpperCase();

      if (access.scope === 'own' && access.employeeId) {
        where.employeeId = access.employeeId;
      }

      return policyRepo.findAdjustments(where);
    },

    async getPolicyGroups(_access: Access, category?: StaffCategoryType) {
      void _access;
      return policyRepo.findPolicyGroups(category);
    },

    async getDutyMappings(_access: Access) {
      void _access;
      const mappings = await policyRepo.findDutyMappings();
      if (mappings.length === 0) {
        // Return default duty mappings
        return Object.entries(DEFAULT_DUTY_MAPPINGS).map(([dutyCategory, targetLeaveCode]) => ({
          id: dutyCategory,
          dutyCategory,
          targetLeaveCode,
          title: dutyCategory.replaceAll('_', ' '),
          description: null,
          active: true,
          updatedAt: new Date(),
        }));
      }
      return mappings;
    },

    async updateDutyMapping(access: Access, input: UpdateOnDutyDutyMappingInput) {
      assertManage(access);
      return policyRepo.upsertDutyMapping({
        dutyCategory: input.dutyCategory,
        targetLeaveCode: input.targetLeaveCode,
        title: input.title ?? input.dutyCategory.replaceAll('_', ' '),
        description: input.description ?? null,
        active: input.active ?? true,
      });
    },

    async resolveDutyLeaveCode(dutyCategory: string): Promise<'ODE' | 'OOD'> {
      const mapping = await policyRepo.findDutyMappingByCategory(dutyCategory);
      if (mapping && mapping.active) {
        return mapping.targetLeaveCode as 'ODE' | 'OOD';
      }
      return DEFAULT_DUTY_MAPPINGS[dutyCategory] ?? 'OOD';
    },
  };
}
