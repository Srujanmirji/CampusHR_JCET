import { z } from 'zod';
import { apiRequest } from '@/services/api';

export const LEAVE_STATUS_LABEL = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
} as const;
export type LeaveStatus = keyof typeof LEAVE_STATUS_LABEL;

const leaveTypeSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  yearlyQuota: z.number().nullable(),
  allowHalfDay: z.boolean(),
  carryForwardMax: z.number(),
  active: z.boolean(),
});
export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveTypeInput = Omit<LeaveType, 'id'>;

const balanceSchema = z.object({
  leaveType: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  active: z.boolean(),
  year: z.number(),
  entitled: z.number().nullable(),
  carriedIn: z.number(),
  used: z.number(),
  pending: z.number(),
  remaining: z.number().nullable(),
});
export type Balance = z.infer<typeof balanceSchema>;

const requestSchema = z.object({
  id: z.string(),
  employee: z.object({
    id: z.string(),
    employeeCode: z.string(),
    name: z.string(),
  }),
  department: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  leaveType: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  startDate: z.string(),
  endDate: z.string(),
  halfDay: z.enum(['FIRST', 'SECOND']).nullable(),
  days: z.number(),
  reason: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  approverRoles: z.array(z.string()),
  pendingRole: z.string().nullable(),
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
  action: 'approve' | 'reject' | 'cancel',
  note?: string,
) {
  return one(requestSchema).parse(
    await apiRequest(`/leave/requests/${id}/${action}`, {
      method: 'PATCH',
      body: action === 'cancel' ? {} : note ? { note } : {},
    }),
  ).data;
}
