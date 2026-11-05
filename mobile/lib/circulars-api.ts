import { apiFetch } from './session';

export type CircularCategory =
  | 'ACADEMIC'
  | 'ADMINISTRATIVE'
  | 'HOLIDAY'
  | 'VTU_NOTIFICATION'
  | 'EXAMINATION'
  | 'EVENT'
  | 'URGENT';

export type CircularPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export type CircularAudience =
  | 'ALL'
  | 'TEACHING_ONLY'
  | 'NON_TEACHING_ONLY'
  | 'DEPARTMENT';

export interface MobileCircular {
  id: string;
  circularNumber: string;
  title: string;
  content: string;
  category: CircularCategory;
  priority: CircularPriority;
  targetAudience: CircularAudience;
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

export interface MobileCircularCompliance {
  circular: MobileCircular;
  eligibleCount: number;
  readCount: number;
  compliancePercentage: number;
  receipts: Array<{
    id: string;
    userId: string;
    readAt: string;
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
  }>;
}

export async function fetchCirculars(params?: {
  category?: string;
  priority?: string;
  targetAudience?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: MobileCircular[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.targetAudience) searchParams.set('targetAudience', params.targetAudience);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const response = await apiFetch(`/circulars${query}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to load circulars: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function fetchCircularById(id: string): Promise<MobileCircular> {
  const response = await apiFetch(`/circulars/${id}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch circular: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function acknowledgeCircular(id: string): Promise<{ acknowledged: boolean }> {
  const response = await apiFetch(`/circulars/${id}/acknowledge`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to acknowledge circular: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
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
}): Promise<MobileCircular> {
  const response = await apiFetch('/circulars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create circular: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function fetchCircularCompliance(id: string): Promise<MobileCircularCompliance> {
  const response = await apiFetch(`/circulars/${id}/compliance`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch compliance: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}
