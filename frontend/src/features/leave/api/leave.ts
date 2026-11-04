import { z } from 'zod';
import { apiRequest } from '@/services/api';

export const LEAVE_STATUS_LABEL = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
} as const;
export type LeaveStatus = keyof typeof LEAVE_STATUS_LABEL;

export const leaveTypeSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  yearlyQuota: z.number().nullable(),
  annualEntitlement: z.number().nullable().optional(),
  carryForwardAllowed: z.boolean().optional(),
  carryForwardMax: z.number(),
  allowHalfDay: z.boolean(),
  attachmentRequired: z.boolean().optional(),
  reasonRequired: z.boolean().optional(),
  minimumNoticeDays: z.number().optional(),
  maximumConsecutiveDays: z.number().optional(),
  approvalChain: z.array(z.string()).optional(),
  attendanceStatus: z.string().optional(),
  affectsTimetable: z.boolean().optional(),
  requiresCoverage: z.boolean().optional(),
  applicableEmployeeTypes: z
    .array(z.enum(['TEACHING', 'NON_TEACHING']))
    .optional(),
  active: z.boolean(),
  displayOrder: z.number().optional(),
  colorToken: z
    .enum(['blue', 'violet', 'rose', 'teal', 'cyan', 'amber', 'sky'])
    .optional(),
});
export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveTypeInput = Partial<Omit<LeaveType, 'id'>> & {
  code: string;
  name: string;
};

export const balanceSchema = z.object({
  leaveType: z.object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    colorToken: z.string().optional(),
    attendanceStatus: z.string().optional(),
  }),
  active: z.boolean(),
  year: z.number(),
  entitled: z.number().nullable(),
  carriedIn: z.number(),
  used: z.number(),
  pending: z.number(),
  remaining: z.number().nullable(),
});
export type Balance = z.infer<typeof balanceSchema>;

export const requestSchema = z.object({
  id: z.string(),
  employee: z.object({
    id: z.string(),
    employeeCode: z.string(),
    name: z.string(),
  }),
  department: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  leaveType: z.object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    colorToken: z.string().optional(),
    attendanceStatus: z.string().optional(),
  }),
  startDate: z.string(),
  endDate: z.string(),
  halfDay: z.enum(['FIRST', 'SECOND']).nullable(),
  days: z.number(),
  reason: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  approverRoles: z.array(z.string()),
  pendingRole: z.string().nullable(),
  // Duty & official assignment fields (OOD / ODE)
  dutyType: z.string().nullable().optional(),
  organisation: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  referenceNumber: z.string().nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  restrictedHolidayId: z.string().nullable().optional(),
  vacationPeriodId: z.string().nullable().optional(),
  coverageRequired: z.boolean().nullable().optional(),
  decisions: z.array(
    z.object({
      step: z.number(),
      role: z.string(),
      approved: z.boolean(),
      note: z.string().nullable(),
      decidedAt: z.string(),
      decidedBy: z.string(),
    }),
  ),
  createdAt: z.string(),
});
export type LeaveRequest = z.infer<typeof requestSchema>;

export interface LeaveApplyInput {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  halfDay: 'FIRST' | 'SECOND' | null;
  reason: string;
  dutyType?: string;
  organisation?: string;
  location?: string;
  referenceNumber?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  restrictedHolidayId?: string;
  vacationPeriodId?: string;
  coverageRequired?: boolean;
}

export interface RequestFilters {
  status?: LeaveStatus;
  awaitingMe?: boolean;
  employeeId?: string;
  /** Requests with a day in this month, YYYY-MM. */
  month?: string;
}

const list = <T extends z.ZodType>(schema: T) =>
  z.object({ data: z.array(schema) });
const one = <T extends z.ZodType>(schema: T) => z.object({ data: schema });

export async function listLeaveTypes() {
  return list(leaveTypeSchema).parse(await apiRequest('/leave/types')).data;
}

export async function saveLeaveType(
  id: number | undefined,
  input: LeaveTypeInput,
) {
  return one(leaveTypeSchema).parse(
    await apiRequest(id ? `/leave/types/${id}` : '/leave/types', {
      method: id ? 'PATCH' : 'POST',
      body: input,
    }),
  ).data;
}

export async function listBalances() {
  return list(balanceSchema).parse(await apiRequest('/leave/balances')).data;
}

export async function listRequests(filters: RequestFilters) {
  const search = new URLSearchParams();
  if (filters.status) search.set('status', filters.status);
  if (filters.awaitingMe) search.set('awaitingMe', 'true');
  if (filters.employeeId) search.set('employeeId', filters.employeeId);
  if (filters.month) search.set('month', filters.month);
  return list(requestSchema).parse(
    await apiRequest(`/leave/requests?${search}`),
  ).data;
}

export async function getRequest(id: string) {
  return one(requestSchema).parse(await apiRequest(`/leave/requests/${id}`))
    .data;
}

export async function applyLeave(input: LeaveApplyInput) {
  return one(requestSchema).parse(
    await apiRequest('/leave/requests', { method: 'POST', body: input }),
  ).data;
}

export async function decideLeave(
  id: string,
  action: 'approve' | 'reject' | 'cancel' | 'recommend' | 'recommend_coverage',
  note?: string,
) {
  const isApproveType =
    action === 'approve' ||
    action === 'recommend' ||
    action === 'recommend_coverage';
  const apiEndpoint =
    action === 'cancel'
      ? `/leave/requests/${id}/cancel`
      : isApproveType
        ? `/leave/requests/${id}/approve`
        : `/leave/requests/${id}/reject`;

  const finalNote =
    action === 'recommend_coverage'
      ? `Recommended with coverage requirement. ${note ?? ''}`.trim()
      : action === 'recommend'
        ? `Recommended. ${note ?? ''}`.trim()
        : note;

  return one(requestSchema).parse(
    await apiRequest(apiEndpoint, {
      method: 'PATCH',
      body: action === 'cancel' ? {} : finalNote ? { note: finalNote } : {},
    }),
  ).data;
}

export interface EmployeeRolloverRecord {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: { id: number; code: string; name: string };
  joiningDate: string;
  balances: Array<{
    leaveTypeId: number;
    leaveTypeCode: string;
    leaveTypeName: string;
    yearlyQuota: number | null;
    carryForwardMax: number;
    closingBalance: number | null;
    carriedForward: number;
    lapsed: number;
    encashed: number;
    nextYearOpening: number | null;
  }>;
}

export interface RolloverSummary {
  fromYear: number;
  toYear: number;
  totalEmployees: number;
  totalDaysCarriedForward: number;
  totalDaysLapsed: number;
  totalDaysEncashed: number;
  departmentSummaries: Array<{
    departmentCode: string;
    departmentName: string;
    employeeCount: number;
    carriedForward: number;
    lapsed: number;
    encashed: number;
  }>;
  records: EmployeeRolloverRecord[];
}

export interface RolloverQuery {
  year?: number;
  targetYear?: number;
  departmentId?: number;
  encashSurplusEL?: boolean;
}

export interface RolloverExecuteInput {
  fromYear: number;
  toYear: number;
  departmentId?: number;
  encashSurplusEL?: boolean;
  notes?: string;
}

export async function previewLeaveRollover(
  query: RolloverQuery = {},
): Promise<RolloverSummary> {
  const search = new URLSearchParams();
  if (query.year) search.set('year', String(query.year));
  if (query.targetYear) search.set('targetYear', String(query.targetYear));
  if (query.departmentId)
    search.set('departmentId', String(query.departmentId));
  if (query.encashSurplusEL) search.set('encashSurplusEL', 'true');

  const res = await apiRequest(`/leave/rollover/preview?${search}`);
  return (res as { data: RolloverSummary }).data;
}

export async function executeLeaveRollover(
  input: RolloverExecuteInput,
): Promise<{ success: boolean; executedAt: string; summary: RolloverSummary }> {
  const res = await apiRequest('/leave/rollover/execute', {
    method: 'POST',
    body: input,
  });
  return res as {
    success: boolean;
    executedAt: string;
    summary: RolloverSummary;
  };
}
