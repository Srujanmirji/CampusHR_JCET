import { apiRequest } from '@/services/api';

export type OnDutyCategory =
  | 'UNIVERSITY_VALUATION'
  | 'EXTERNAL_EXAMINER'
  | 'CONFERENCE_SEMINAR'
  | 'FDP_WORKSHOP'
  | 'BOS_BOE_MEETING'
  | 'OFFICIAL_COLLEGE_DUTY'
  | 'OTHER';

export type OnDutyStatus =
  | 'PENDING'
  | 'RECOMMENDED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface OnDutyRequest {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    department: {
      id: number;
      code: string;
      name: string;
    };
    designation: {
      id: number;
      name: string;
      category: 'TEACHING' | 'NON_TEACHING';
    };
  };
  category: OnDutyCategory;
  title: string;
  description: string;
  venue: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: OnDutyStatus;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attendanceCertificateUrl: string | null;
  hodReviewedById: string | null;
  hodReviewedBy?: {
    id: string;
    email: string;
  } | null;
  hodReviewedAt: string | null;
  hodNote: string | null;
  finalApprovedById: string | null;
  finalApprovedBy?: {
    id: string;
    email: string;
  } | null;
  finalApprovedAt: string | null;
  finalNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnDutyMetrics {
  total: number;
  pending: number;
  recommended: number;
  approved: number;
  rejected: number;
}

export interface OnDutyListResponse {
  data: OnDutyRequest[];
  metrics: OnDutyMetrics;
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export async function fetchOnDutyRequests(filters: {
  status?: string;
  category?: string;
  departmentId?: number;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  view?: string;
  page?: number;
  pageSize?: number;
}): Promise<OnDutyListResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.departmentId) params.set('departmentId', String(filters.departmentId));
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.view) params.set('view', filters.view);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return (await apiRequest(`/api/v1/on-duty${queryStr}`)) as OnDutyListResponse;
}

export async function getOnDutyRequest(id: string): Promise<{ data: OnDutyRequest }> {
  return (await apiRequest(`/api/v1/on-duty/${id}`)) as { data: OnDutyRequest };
}

export async function applyOnDuty(payload: {
  category?: OnDutyCategory;
  title: string;
  description: string;
  venue: string;
  startDate: string;
  endDate: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}): Promise<{ data: OnDutyRequest }> {
  return (await apiRequest('/api/v1/on-duty', {
    method: 'POST',
    body: payload,
  })) as { data: OnDutyRequest };
}

export async function reviewOnDuty(
  id: string,
  payload: {
    decision: 'RECOMMEND' | 'APPROVE' | 'REJECT';
    note?: string | null;
  },
): Promise<{ data: OnDutyRequest }> {
  return (await apiRequest(`/api/v1/on-duty/${id}/review`, {
    method: 'POST',
    body: payload,
  })) as { data: OnDutyRequest };
}

export async function uploadOnDutyCertificate(
  id: string,
  payload: { attendanceCertificateUrl: string },
): Promise<{ data: OnDutyRequest }> {
  return (await apiRequest(`/api/v1/on-duty/${id}/certificate`, {
    method: 'POST',
    body: payload,
  })) as { data: OnDutyRequest };
}

export async function cancelOnDuty(id: string): Promise<{ data: OnDutyRequest }> {
  return (await apiRequest(`/api/v1/on-duty/${id}/cancel`, {
    method: 'POST',
  })) as { data: OnDutyRequest };
}
