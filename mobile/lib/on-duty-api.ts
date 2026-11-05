import { apiFetch } from './session';

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

export interface MobileOnDutyRequest {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    department?: {
      id: number;
      code: string;
      name: string;
    };
    designation?: {
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
  hodReviewedBy?: { id: string; email: string } | null;
  hodReviewedAt: string | null;
  hodNote: string | null;
  finalApprovedById: string | null;
  finalApprovedBy?: { id: string; email: string } | null;
  finalApprovedAt: string | null;
  finalNote: string | null;
  createdAt: string;
}

export interface MobileOnDutyMetrics {
  total: number;
  pending: number;
  recommended: number;
  approved: number;
  valuation: number;
  totalDutyDays: number;
}

export interface MobileOnDutyListResponse {
  data: MobileOnDutyRequest[];
  metrics: MobileOnDutyMetrics;
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export async function fetchOnDutyRequests(filters?: {
  status?: string;
  category?: string;
  view?: string;
  page?: number;
  pageSize?: number;
}): Promise<MobileOnDutyListResponse> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (filters?.category && filters.category !== 'ALL') params.set('category', filters.category);
  if (filters?.view) params.set('view', filters.view);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/on-duty${queryStr}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to fetch On-Duty requests');
  }
  return res.json();
}

export async function getOnDutyRequest(id: string): Promise<MobileOnDutyRequest> {
  const res = await apiFetch(`/on-duty/${id}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to fetch On-Duty request');
  }
  const json = await res.json();
  return json.data;
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
}): Promise<MobileOnDutyRequest> {
  const res = await apiFetch('/on-duty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to submit On-Duty application');
  }
  const json = await res.json();
  return json.data;
}

export async function reviewOnDuty(
  id: string,
  payload: {
    decision: 'RECOMMEND' | 'APPROVE' | 'REJECT';
    note?: string | null;
  },
): Promise<MobileOnDutyRequest> {
  const res = await apiFetch(`/on-duty/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to review On-Duty request');
  }
  const json = await res.json();
  return json.data;
}

export async function uploadOnDutyCertificate(
  id: string,
  certificateUrl: string,
): Promise<MobileOnDutyRequest> {
  const res = await apiFetch(`/on-duty/${id}/certificate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendanceCertificateUrl: certificateUrl }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to upload attendance certificate');
  }
  const json = await res.json();
  return json.data;
}

export async function cancelOnDuty(id: string): Promise<MobileOnDutyRequest> {
  const res = await apiFetch(`/on-duty/${id}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to cancel On-Duty request');
  }
  const json = await res.json();
  return json.data;
}
