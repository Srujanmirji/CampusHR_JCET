import { apiFetch } from './session';

export type WorkCategory =
  | 'ACADEMIC'
  | 'NBA_NAAC'
  | 'EXAMINATION'
  | 'STUDENT_AFFAIR'
  | 'EVENT'
  | 'ADMINISTRATIVE'
  | 'OTHER';

export type WorkPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export type WorkStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface MobileWorkAssignment {
  id: string;
  title: string;
  description: string;
  category: WorkCategory;
  priority: WorkPriority;
  status: WorkStatus;
  assignedById: string;
  assignedBy?: {
    id: string;
    email: string;
    role?: { id: number; name: string };
    employee?: {
      id: string;
      firstName: string;
      lastName: string;
      department?: { id: number; name: string };
    } | null;
  };
  assignedToId: string;
  assignedTo?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    department?: { id: number; code: string; name: string };
    designation?: { id: number; name: string };
    phone: string | null;
    email: string;
  };
  dueDate: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  submissionNotes?: string | null;
  submissionAttachmentUrl?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileWorkMetrics {
  assigned: number;
  inProgress: number;
  submitted: number;
  completed: number;
}

export async function fetchWorkAssignments(params?: {
  view?: 'assigned-to-me' | 'assigned-by-me' | 'all';
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  data: MobileWorkAssignment[];
  total: number;
  metrics: MobileWorkMetrics;
}> {
  const searchParams = new URLSearchParams();
  if (params?.view) searchParams.set('view', params.view);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const response = await apiFetch(`/work-assignments${query}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to load work assignments: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function fetchWorkAssignmentById(
  id: string,
): Promise<MobileWorkAssignment> {
  const response = await apiFetch(`/work-assignments/${id}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch assignment: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function createWorkAssignments(data: {
  title: string;
  description: string;
  category?: string;
  priority?: string;
  assignedToIds: string[];
  dueDate: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}): Promise<MobileWorkAssignment[]> {
  const response = await apiFetch('/work-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create assignment: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function updateWorkStatus(
  id: string,
  data: {
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'CANCELLED';
    submissionNotes?: string;
    submissionAttachmentUrl?: string;
  },
): Promise<MobileWorkAssignment> {
  const response = await apiFetch(`/work-assignments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update status: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function reviewWorkAssignment(
  id: string,
  data: {
    status: 'COMPLETED' | 'IN_PROGRESS';
    reviewFeedback?: string;
  },
): Promise<MobileWorkAssignment> {
  const response = await apiFetch(`/work-assignments/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to review assignment: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function fetchAssignableEmployees(): Promise<
  Array<{
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: { id: number; code: string; name: string };
    designation?: { id: number; name: string };
  }>
> {
  const response = await apiFetch('/employees?status=ACTIVE&pageSize=100');
  if (!response.ok) return [];
  const result = await response.json();
  return result.data || [];
}
