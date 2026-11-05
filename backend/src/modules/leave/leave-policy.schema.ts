import { z } from 'zod';

export const StaffCategoryEnum = z.enum(['TEACHING', 'NON_TEACHING']);
export type StaffCategoryType = z.infer<typeof StaffCategoryEnum>;

export const EmploymentTypeEnum = z.enum(['PERMANENT', 'CONTRACT', 'PROBATIONARY', 'VISITING']);
export type EmploymentType = z.infer<typeof EmploymentTypeEnum>;

export const LeaveAdjustmentTypeEnum = z.enum([
  'CREDIT',
  'DEBIT',
  'OPENING_CORRECTION',
  'CARRY_FORWARD_CORRECTION',
  'LAPSE',
]);
export type LeaveAdjustmentType = z.infer<typeof LeaveAdjustmentTypeEnum>;

export const createLeavePolicySchema = z.object({
  code: z.string().trim().min(1).max(20).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  policyYear: z.string().trim().min(4).max(20),
  employeeCategory: StaffCategoryEnum,
  appliesToAllCategories: z.boolean().default(false),
  employmentType: EmploymentTypeEnum.nullable().optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  policyGroupId: z.string().uuid().nullable().optional(),
  leaveTypeId: z.number().int().positive().nullable().optional(),
  annualEntitlement: z.number().min(0).max(365).nullable().optional(),
  entitlementUnit: z.string().default('DAYS'),
  carryForwardAllowed: z.boolean().default(false),
  carryForwardLimit: z.number().min(0).max(365).nullable().optional(),
  carryForwardExpiryMonths: z.number().int().positive().nullable().optional(),
  lapseAtYearEnd: z.boolean().default(true),
  halfDayAllowed: z.boolean().default(false),
  minimumNoticeDays: z.number().int().min(0).default(0),
  maximumConsecutiveDays: z.number().int().min(1).max(365).nullable().optional(),
  minimumServiceDays: z.number().int().min(0).nullable().optional(),
  attachmentRequired: z.boolean().default(false),
  attachmentRequiredAfterDays: z.number().min(0).nullable().optional(),
  reasonRequired: z.boolean().default(true),
  attendanceStatus: z.string().default('ON_LEAVE'),
  affectsTimetable: z.boolean().default(true),
  requiresAcademicCoverage: z.boolean().default(true),
  requiresOperationalCoverage: z.boolean().default(false),
  reservePendingBalance: z.boolean().default(true),
  approvalPolicyKey: z.string().default('STANDARD'),
  approvalStatus: z.enum(['DRAFT', 'AWAITING_APPROVAL', 'APPROVED']).default('AWAITING_APPROVAL'),
  calendarPolicyKey: z.string().default('INSTITUTION_CALENDAR'),
  active: z.boolean().default(true),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
});
export type CreateLeavePolicyInput = z.input<typeof createLeavePolicySchema>;

export const updateLeavePolicySchema = createLeavePolicySchema.partial();
export type UpdateLeavePolicyInput = z.input<typeof updateLeavePolicySchema>;

export const queryLeavePolicySchema = z.object({
  policyYear: z.string().optional(),
  employeeCategory: StaffCategoryEnum.optional(),
  departmentId: z.coerce.number().int().optional(),
  policyGroupId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  code: z.string().optional(),
});
export type QueryLeavePolicyInput = z.infer<typeof queryLeavePolicySchema>;

export const createLeaveBalanceAdjustmentSchema = z.object({
  employeeId: z.string().uuid(),
  leaveCode: z.string().trim().min(1).max(20).transform((s) => s.toUpperCase()),
  policyYear: z.string().trim().min(4).max(20),
  adjustmentType: LeaveAdjustmentTypeEnum,
  days: z.number().positive('Days must be greater than 0'),
  reason: z.string().trim().min(3).max(500),
});
export type CreateLeaveBalanceAdjustmentInput = z.infer<typeof createLeaveBalanceAdjustmentSchema>;

export const queryLeaveBalanceAdjustmentSchema = z.object({
  employeeId: z.string().uuid().optional(),
  policyYear: z.string().optional(),
  leaveCode: z.string().optional(),
});
export type QueryLeaveBalanceAdjustmentInput = z.infer<typeof queryLeaveBalanceAdjustmentSchema>;

export const updateOnDutyDutyMappingSchema = z.object({
  dutyCategory: z.string().trim().min(2).max(100),
  targetLeaveCode: z.enum(['ODE', 'OOD']),
  title: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});
export type UpdateOnDutyDutyMappingInput = z.infer<typeof updateOnDutyDutyMappingSchema>;
