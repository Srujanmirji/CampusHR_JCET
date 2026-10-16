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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Initial state for demo sessions when backend is offline
const INITIAL_DEMO_TYPES: LeaveTypeDto[] = [
  { id: 1, code: 'CL', name: 'Casual Leave', yearlyQuota: 15, allowHalfDay: true, carryForwardMax: 0, active: true },
  { id: 2, code: 'DL', name: 'Duty Leave (Academic / Conf)', yearlyQuota: 10, allowHalfDay: false, carryForwardMax: 0, active: true },
  { id: 3, code: 'RH', name: 'Restricted Holiday', yearlyQuota: 2, allowHalfDay: false, carryForwardMax: 0, active: true },
  { id: 4, code: 'EL', name: 'Earned Leave', yearlyQuota: 30, allowHalfDay: false, carryForwardMax: 15, active: true },
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
    reason: 'Attending VTU syllabus revision committee meeting at Belagavi campus.',
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

export async function getLeaveTypes(token: string | null): Promise<LeaveTypeDto[]> {
  if (token && !token.startsWith('demo-')) {
    try {
      const res = await fetch(`${API_BASE_URL}/leave/types`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const body = await res.json();
        return body.data || [];
      }
    } catch {
      // Fall through to fallback
    }
  }
  return INITIAL_DEMO_TYPES;
}

export async function getLeaveBalances(token: string | null): Promise<LeaveBalanceDto[]> {
  if (token && !token.startsWith('demo-')) {
    try {
      const res = await fetch(`${API_BASE_URL}/leave/balances`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const body = await res.json();
        return body.data || [];
      }
    } catch {
      // Fall through
    }
  }
  return INITIAL_DEMO_BALANCES;
}

export async function getLeaveRequests(
  token: string | null,
  options?: { awaitingMe?: boolean; status?: string }
): Promise<LeaveRequestDto[]> {
  if (token && !token.startsWith('demo-')) {
    try {
      const params = new URLSearchParams();
      if (options?.awaitingMe) params.set('awaitingMe', 'true');
      if (options?.status) params.set('status', options.status);

      const url = `${API_BASE_URL}/leave/requests${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const body = await res.json();
        return body.data || [];
      }
    } catch {
      // Fall through
    }
  }

  // Demo fallback
  let list = [...demoRequestsStore];
  if (options?.awaitingMe) {
    list = list.filter((r) => r.status === 'PENDING' && r.pendingRole === 'HOD');
  } else if (options?.status) {
    list = list.filter((r) => r.status === options.status);
  }
  return list;
}

export async function applyForLeave(
  token: string | null,
  payload: LeaveApplyPayload,
  currentUser: { id: string; name?: string; employeeCode?: string; role: string }
): Promise<LeaveRequestDto> {
  if (token && !token.startsWith('demo-')) {
    const res = await fetch(`${API_BASE_URL}/leave/requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error?.message || body?.message || 'Failed to submit leave request.');
    }
    return body.data;
  }

  // Demo calculation: calculate days between start and end
  const start = new Date(payload.startDate);
  const end = new Date(payload.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const countDays = payload.halfDay ? 0.5 : diffDays;

  const type = INITIAL_DEMO_TYPES.find((t) => t.id === payload.leaveTypeId) || INITIAL_DEMO_TYPES[0];

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
  deciderName?: string
): Promise<LeaveRequestDto> {
  if (!approved && (!note || note.trim().length < 3)) {
    throw new Error('Please provide a rejection reason (minimum 3 characters).');
  }

  if (token && !token.startsWith('demo-')) {
    const action = approved ? 'approve' : 'reject';
    const res = await fetch(`${API_BASE_URL}/leave/requests/${requestId}/${action}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ note: note?.trim() }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error?.message || body?.message || `Failed to ${action} leave request.`);
    }
    return body.data;
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

export async function cancelLeaveRequest(token: string | null, requestId: string): Promise<void> {
  if (token && !token.startsWith('demo-')) {
    const res = await fetch(`${API_BASE_URL}/leave/requests/${requestId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error?.message || body?.message || 'Failed to cancel leave request.');
    }
    return;
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
