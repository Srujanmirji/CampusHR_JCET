import { apiRequest } from '@/services/api';

export interface WorkAssignment {
  id: string;
  title: string;
  description: string;
  category:
    | 'ACADEMIC'
    | 'NBA_NAAC'
    | 'EXAMINATION'
    | 'STUDENT_AFFAIR'
    | 'EVENT'
    | 'ADMINISTRATIVE'
    | 'OTHER';
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED';
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

export interface WorkMetrics {
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
}): Promise<{ data: WorkAssignment[]; total: number; metrics: WorkMetrics }> {
  const search = new URLSearchParams();
  if (params?.view) search.set('view', params.view);
  if (params?.status) search.set('status', params.status);
  if (params?.priority) search.set('priority', params.priority);
  if (params?.category) search.set('category', params.category);
  if (params?.search) search.set('search', params.search);
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));

  const query = search.toString() ? `?${search.toString()}` : '';
  return (await apiRequest(`/api/v1/work-assignments${query}`)) as {
    data: WorkAssignment[];
    total: number;
    metrics: WorkMetrics;
  };
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
}): Promise<WorkAssignment[]> {
  const res = (await apiRequest('/api/v1/work-assignments', {
    method: 'POST',
    body: data,
  })) as { data: WorkAssignment[] };
  return res.data;
}

export async function updateWorkStatus(
  id: string,
  data: {
    status: 'IN_PROGRESS' | 'SUBMITTED';
    submissionNotes?: string;
    submissionAttachmentUrl?: string;
  },
): Promise<WorkAssignment> {
  const res = (await apiRequest(`/api/v1/work-assignments/${id}/status`, {
    method: 'PATCH',
    body: data,
  })) as { data: WorkAssignment };
  return res.data;
}

export async function reviewWorkAssignment(
  id: string,
  data: {
    decision: 'APPROVE' | 'REQUEST_REVISION';
    feedback?: string;
  },
): Promise<WorkAssignment> {
  const res = (await apiRequest(`/api/v1/work-assignments/${id}/review`, {
    method: 'POST',
    body: data,
  })) as { data: WorkAssignment };
  return res.data;
}
