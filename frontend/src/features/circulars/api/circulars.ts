import { apiRequest } from '@/services/api';

export interface Circular {
  id: string;
  circularNumber: string;
  title: string;
  content: string;
  category:
    | 'ACADEMIC'
    | 'ADMINISTRATIVE'
    | 'HOLIDAY'
    | 'VTU_NOTIFICATION'
    | 'EXAMINATION'
    | 'EVENT'
    | 'URGENT';
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  targetAudience: 'ALL' | 'TEACHING_ONLY' | 'NON_TEACHING_ONLY' | 'DEPARTMENT';
  targetDepartmentId?: number | null;
  targetDepartment?: { id: number; code: string; name: string } | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isPublished: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  createdById: string;
  createdBy?: {
    id: string;
    email: string;
    employee?: {
      firstName: string;
      lastName: string;
    };
  };
  hasRead?: boolean;
  readAt?: string | null;
  _count?: { receipts: number };
}

export interface ReadReceipt {
  id: string;
  circularId: string;
  userId: string;
  readAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  user: {
    id: string;
    email: string;
    employee?: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      department?: { id: number; code: string; name: string };
      designation?: { id: number; name: string };
    } | null;
  };
}

export interface CircularCompliance {
  circular: Circular;
  eligibleCount: number;
  readCount: number;
  compliancePercentage: number;
  receipts: ReadReceipt[];
}

export async function fetchCirculars(params?: {
  category?: string;
  priority?: string;
  targetAudience?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: Circular[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.priority) search.set('priority', params.priority);
  if (params?.targetAudience) search.set('targetAudience', params.targetAudience);
  if (params?.search) search.set('search', params.search);
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));

  const query = search.toString() ? `?${search.toString()}` : '';
  return (await apiRequest(`/api/v1/circulars${query}`)) as {
    data: Circular[];
    total: number;
  };
}

export async function fetchCircularById(id: string): Promise<Circular> {
  const res = (await apiRequest(`/api/v1/circulars/${id}`)) as {
    data: Circular;
  };
  return res.data;
}

export async function createCircular(data: {
  title: string;
  content: string;
  category?: string;
  priority?: string;
  targetAudience?: string;
  targetDepartmentId?: number | null;
  attachmentUrl?: string;
  attachmentName?: string;
  isPublished?: boolean;
  expiresAt?: string;
}): Promise<Circular> {
  const res = (await apiRequest('/api/v1/circulars', {
    method: 'POST',
    body: data,
  })) as { data: Circular };
  return res.data;
}

export async function acknowledgeCircular(
  id: string,
): Promise<{ acknowledged: boolean }> {
  const res = (await apiRequest(`/api/v1/circulars/${id}/acknowledge`, {
    method: 'POST',
  })) as { data: { acknowledged: boolean } };
  return res.data;
}

export async function fetchCircularCompliance(
  id: string,
): Promise<CircularCompliance> {
  const res = (await apiRequest(`/api/v1/circulars/${id}/compliance`)) as {
    data: CircularCompliance;
  };
  return res.data;
}

export async function exportComplianceCsv(id: string): Promise<Blob> {
  return (await apiRequest(`/api/v1/circulars/${id}/compliance/export`, {
    responseType: 'blob',
  })) as Blob;
}
