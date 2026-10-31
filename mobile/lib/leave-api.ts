import { z } from 'zod';
import { ApiError, apiFetch } from './session';

export interface LeaveTypeDto {
  id: number;
  code: string;
  name: string;
  yearlyQuota: number | null;
  allowHalfDay: boolean;
  carryForwardMax: number;
  active: boolean;
}

export interface LeaveBalanceDto {
  leaveType: {
    id: number;
    code: string;
    name: string;
  };
  active: boolean;
  year: number;
  entitled: number | null;
  carriedIn: number;
  used: number;
  pending: number;
  remaining: number | null;
}

export interface LeaveDecisionDto {
  step: number;
  role: string;
  approved: boolean;
  note: string | null;
  decidedAt: string;
  decidedBy?: string;
}

export interface LeaveRequestDto {
  id: string;
  employee: {
    id: string;
    employeeCode: string;
    name: string;
  };
  department: {
    id: number;
    code: string;
    name: string;
  };
  leaveType: {
    id: number;
    code: string;
    name: string;
    allowHalfDay?: boolean;
  };
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  halfDay: 'FIRST' | 'SECOND' | null;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approverRoles: string[];
  pendingRole: string | null;
  decisions: LeaveDecisionDto[];
  createdAt?: string;
}

export interface LeaveApplyPayload {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  halfDay?: 'FIRST' | 'SECOND' | null;
  reason: string;
}

const named = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
});
const typeSchema = named.extend({
  yearlyQuota: z.number().nonnegative().nullable(),
  allowHalfDay: z.boolean(),
  carryForwardMax: z.number().nonnegative(),
  active: z.boolean(),
});
const balanceSchema = z.object({
  leaveType: named,
  active: z.boolean(),
  year: z.number().int(),
  entitled: z.number().nullable(),
  carriedIn: z.number().nonnegative(),
  used: z.number().nonnegative(),
  pending: z.number().nonnegative(),
  remaining: z.number().nullable(),
});
export const requestSchema = z.object({
  id: z.uuid(),
  employee: z.object({
    id: z.uuid(),
    employeeCode: z.string(),
    name: z.string(),
  }),
  department: named,
  leaveType: named.extend({ allowHalfDay: z.boolean().optional() }),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  halfDay: z.enum(['FIRST', 'SECOND']).nullable(),
  days: z.number().positive(),
  reason: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  approverRoles: z.array(z.string()),
  pendingRole: z.string().nullable(),
  decisions: z.array(
    z.object({
      step: z.number().int().nonnegative(),
      role: z.string(),
      approved: z.boolean(),
      note: z.string().nullable(),
      decidedAt: z.iso.datetime({ offset: true }),
      decidedBy: z.string().optional(),
    }),
  ),
  createdAt: z.iso.datetime({ offset: true }).optional(),
});
export const leaveInputSchema = z
  .object({
    leaveTypeId: z.number().int().positive(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    halfDay: z.enum(['FIRST', 'SECOND']).nullable().optional(),
    reason: z
      .string()
      .trim()
      .min(3, 'Give a reason with at least 3 characters.')
      .max(500, 'Keep the reason within 500 characters.'),
  })
  .superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (value.endDate < value.startDate)
      fail('End date cannot be before start date.');
    if (value.startDate.slice(0, 4) !== value.endDate.slice(0, 4))
      fail('Apply separately for each calendar year.');
    if (value.halfDay && value.startDate !== value.endDate)
      fail('Half-day leave must cover one date.');
    if (
      value.startDate === value.endDate &&
      new Date(value.startDate).getUTCDay() === 0
    )
      fail('Sundays do not count as leave days.');
  });
export const uncertainLeaveWrite = (error: unknown) =>
  !(
    error instanceof ApiError &&
    [400, 401, 403, 404, 409, 422, 429].includes(error.status)
  );
// shortcut: no server idempotency key; add one before allowing automatic write retries.
let writing = false;
async function writeLeave(path: string, method: string, body?: unknown) {
  if (writing)
    throw new ApiError(
      409,
      'WRITE_PENDING',
      'Another leave action is still pending.',
    );
  writing = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await apiFetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    return z.object({ data: requestSchema }).parse(await res.json()).data;
  } finally {
    clearTimeout(timeout);
    writing = false;
  }
}

// Fixtures are available only to explicitly selected demo sessions.
const INITIAL_DEMO_TYPES: LeaveTypeDto[] = [
  {
    id: 1,
    code: 'CL',
    name: 'Casual Leave',
    yearlyQuota: 15,
    allowHalfDay: true,
    carryForwardMax: 0,
    active: true,
  },
  {
    id: 2,
    code: 'DL',
    name: 'Duty Leave (Academic / Conf)',
    yearlyQuota: 10,
    allowHalfDay: false,
    carryForwardMax: 0,
    active: true,
  },
  {
    id: 3,
    code: 'RH',
    name: 'Restricted Holiday',
    yearlyQuota: 2,
    allowHalfDay: false,
    carryForwardMax: 0,
    active: true,
  },
  {
    id: 4,
    code: 'EL',
    name: 'Earned Leave',
    yearlyQuota: 30,
    allowHalfDay: false,
    carryForwardMax: 15,
    active: true,
  },
];

const INITIAL_DEMO_BALANCES: LeaveBalanceDto[] = [
  {
    leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
    active: true,
    year: 2026,
    entitled: 15,
    carriedIn: 0,
    used: 5.5,
    pending: 1,
    remaining: 8.5,
  },
  {
    leaveType: { id: 2, code: 'DL', name: 'Duty Leave' },
    active: true,
    year: 2026,
    entitled: 10,
    carriedIn: 0,
    used: 2,
    pending: 0,
    remaining: 8,
  },
  {
    leaveType: { id: 3, code: 'RH', name: 'Restricted Holiday' },
    active: true,
    year: 2026,
    entitled: 2,
    carriedIn: 0,
    used: 1,
    pending: 0,
    remaining: 1,
  },
];

let demoRequestsStore: LeaveRequestDto[] = [
  {
    id: 'req-demo-001',
    employee: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    department: {
      id: 1,
      code: 'CSE',
      name: 'Computer Science & Engineering',
    },
    leaveType: {
      id: 1,
      code: 'CL',
      name: 'Casual Leave',
      allowHalfDay: true,
    },
    startDate: '2026-10-22',
    endDate: '2026-10-22',
    halfDay: null,
    days: 1.0,
    reason:
      'Attending VTU syllabus revision committee meeting at Belagavi campus.',
    status: 'PENDING',
    approverRoles: ['HOD', 'HR Admin'],
    pendingRole: 'HOD',
    decisions: [],
  },
  {
    id: 'req-demo-002',
    employee: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    department: {
      id: 1,
      code: 'CSE',
      name: 'Computer Science & Engineering',
    },
    leaveType: {
      id: 1,
      code: 'CL',
      name: 'Casual Leave',
      allowHalfDay: true,
    },
    startDate: '2026-09-15',
    endDate: '2026-09-16',
    halfDay: null,
    days: 2.0,
    reason: 'Family function in Hubballi.',
    status: 'APPROVED',
    approverRoles: ['HOD', 'HR Admin'],
    pendingRole: null,
    decisions: [
      {
        step: 1,
        role: 'HOD',
        approved: true,
        note: 'Approved. Classes adjusted with Prof. Priya Kulkarni.',
        decidedAt: '2026-09-14T10:30:00Z',
        decidedBy: 'Dr. Ramesh K',
      },
      {
        step: 2,
        role: 'HR Admin',
        approved: true,
        note: 'Verified and balance updated.',
        decidedAt: '2026-09-14T14:15:00Z',
        decidedBy: 'HR Office',
      },
    ],
  },
];

export async function getLeaveTypes(
  token: string | null,
): Promise<LeaveTypeDto[]> {
  if (!token) throw new Error('Sign in to load leave records.');
  if (token.startsWith('demo-')) return INITIAL_DEMO_TYPES;
  const response = await apiFetch('/leave/types');
  return z.object({ data: z.array(typeSchema) }).parse(await response.json())
    .data;
}
export async function getLeaveBalances(
  token: string | null,
  employeeId?: string,
  year?: number,
): Promise<LeaveBalanceDto[]> {
  if (!token) throw new Error('Sign in to load leave records.');
  if (token.startsWith('demo-')) return INITIAL_DEMO_BALANCES;
  const params = new URLSearchParams();
  if (employeeId) params.set('employeeId', employeeId);
  if (year) params.set('year', String(year));
  const response = await apiFetch(`/leave/balances?${params}`);
  const data = z
    .object({ data: z.array(balanceSchema) })
    .parse(await response.json()).data;
  if (year && data.some((row) => row.year !== year))
    throw new Error('Balances belong to another year.');
  return data;
}
export async function getLeaveRequests(
  token: string | null,
  options?: {
    awaitingMe?: boolean;
    status?: string;
    employeeId?: string;
    year?: number;
  },
): Promise<LeaveRequestDto[]> {
  if (!token) throw new Error('Sign in to load leave records.');
  if (!token.startsWith('demo-')) {
    const params = new URLSearchParams();
    if (options?.awaitingMe) params.set('awaitingMe', 'true');
    if (options?.status) params.set('status', options.status);
    if (options?.employeeId) params.set('employeeId', options.employeeId);
    if (options?.year) params.set('year', String(options.year));
    const response = await apiFetch(`/leave/requests?${params}`);
    const data = z
      .object({ data: z.array(requestSchema) })
      .parse(await response.json()).data;
    if (
      options?.employeeId &&
      data.some((r) => r.employee.id !== options.employeeId)
    )
      throw new Error('Leave response belongs to another employee.');
    if (
      options?.year &&
      data.some((r) => !r.startDate.startsWith(String(options.year)))
    )
      throw new Error('Leave response belongs to another year.');
    return data;
  }
  let list = [...demoRequestsStore];
  if (options?.awaitingMe)
    list = list.filter(
      (r) => r.status === 'PENDING' && r.pendingRole === 'HOD',
    );
  else if (options?.status)
    list = list.filter((r) => r.status === options.status);
  return list;
}

export async function applyForLeave(
  token: string | null,
  payload: LeaveApplyPayload,
  currentUser: {
    id: string;
    name?: string;
    employeeCode?: string;
    role: string;
  },
): Promise<LeaveRequestDto> {
  if (!token) throw new Error('Sign in to update leave records.');
  if (!token.startsWith('demo-')) {
    const value = leaveInputSchema.parse(payload);
    const data = await writeLeave('/leave/requests', 'POST', value);
    if (
      data.employee.id !== currentUser.id ||
      data.status !== 'PENDING' ||
      data.startDate !== value.startDate ||
      data.endDate !== value.endDate ||
      data.leaveType.id !== value.leaveTypeId ||
      data.halfDay !== (value.halfDay ?? null) ||
      data.reason !== value.reason
    )
      throw new Error(
        'The server did not confirm the requested leave. Check request history.',
      );
    return data;
  }

  // Demo calculation: calculate days between start and end
  const start = new Date(payload.startDate);
  const end = new Date(payload.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const countDays = payload.halfDay ? 0.5 : diffDays;

  const type =
    INITIAL_DEMO_TYPES.find((t) => t.id === payload.leaveTypeId) ||
    INITIAL_DEMO_TYPES[0];

  const newRequest: LeaveRequestDto = {
    id: `req-${Date.now()}`,
    employee: {
      id: currentUser.id,
      employeeCode: currentUser.employeeCode || 'JCET-FACULTY',
      name: currentUser.name || 'Faculty Member',
    },
    department: {
      id: 1,
      code: 'CSE',
      name: 'Computer Science & Engineering',
    },
    leaveType: {
      id: type.id,
      code: type.code,
      name: type.name,
      allowHalfDay: type.allowHalfDay,
    },
    startDate: payload.startDate,
    endDate: payload.endDate,
    halfDay: payload.halfDay || null,
    days: countDays,
    reason: payload.reason,
    status: 'PENDING',
    approverRoles: ['HOD', 'HR Admin'],
    pendingRole: 'HOD',
    decisions: [],
  };

  demoRequestsStore = [newRequest, ...demoRequestsStore];
  return newRequest;
}

export async function decideLeaveRequest(
  token: string | null,
  requestId: string,
  approved: boolean,
  note?: string,
  deciderName?: string,
): Promise<LeaveRequestDto> {
  if (!approved && (!note || note.trim().length < 3)) {
    throw new Error(
      'Please provide a rejection reason (minimum 3 characters).',
    );
  }

  if (!token) throw new Error('Sign in to update leave records.');
  if (!token.startsWith('demo-')) {
    if ((note?.trim().length ?? 0) > 500)
      throw new ApiError(
        400,
        'INVALID_NOTE',
        'Keep the note within 500 characters.',
      );
    const action = approved ? 'approve' : 'reject';
    const data = await writeLeave(
      `/leave/requests/${requestId}/${action}`,
      'PATCH',
      { note: note?.trim() },
    );
    if (
      data.id !== requestId ||
      !data.decisions.some(
        (d) => d.approved === approved && d.note === (note?.trim() || null),
      ) ||
      (approved
        ? !['PENDING', 'APPROVED'].includes(data.status)
        : data.status !== 'REJECTED')
    )
      throw new Error(
        'The server did not confirm this decision. Refresh requests.',
      );
    return data;
  }

  // Demo fallback
  const index = demoRequestsStore.findIndex((r) => r.id === requestId);
  if (index === -1) {
    throw new Error('Leave request not found.');
  }

  const req = demoRequestsStore[index];
  const updatedDecision: LeaveDecisionDto = {
    step: 1,
    role: 'HOD',
    approved,
    note: note?.trim() || (approved ? 'Recommended and approved.' : null),
    decidedAt: new Date().toISOString(),
    decidedBy: deciderName || 'Dr. Ramesh K (HOD)',
  };

  const updatedReq: LeaveRequestDto = {
    ...req,
    status: approved ? 'APPROVED' : 'REJECTED',
    pendingRole: null,
    decisions: [...req.decisions, updatedDecision],
  };

  demoRequestsStore[index] = updatedReq;
  return updatedReq;
}

export async function cancelLeaveRequest(
  token: string | null,
  requestId: string,
): Promise<LeaveRequestDto | undefined> {
  if (!token) throw new Error('Sign in to update leave records.');
  if (!token.startsWith('demo-')) {
    const data = await writeLeave(
      `/leave/requests/${requestId}/cancel`,
      'PATCH',
    );
    if (data.id !== requestId || data.status !== 'CANCELLED')
      throw new Error(
        'The server did not confirm cancellation. Refresh requests.',
      );
    return data;
  }

  const index = demoRequestsStore.findIndex((r) => r.id === requestId);
  if (index !== -1) {
    demoRequestsStore[index] = {
      ...demoRequestsStore[index],
      status: 'CANCELLED',
      pendingRole: null,
    };
  }
}

export async function getLeaveRequest(token: string | null, id: string) {
  if (!token || token.startsWith('demo-'))
    throw new Error('Sign in to check this request.');
  const response = await apiFetch(`/leave/requests/${id}`);
  const data = z
    .object({ data: requestSchema })
    .parse(await response.json()).data;
  if (data.id !== id) throw new Error('The server returned another request.');
  return data;
}
