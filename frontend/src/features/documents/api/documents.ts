import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest, getSessionIdentity } from '@/services/api';

export const DOCUMENT_CATEGORY_MAP = {
  IDENTITY: 'Identity & Government Proof',
  ACADEMIC: 'Academic & Degrees',
  EMPLOYMENT: 'Employment & Experience',
  CERTIFICATION: 'Certifications & FDPs',
  OTHER: 'Other HR Documents',
} as const;

export type DocumentCategoryKey = keyof typeof DOCUMENT_CATEGORY_MAP;

export const DOCUMENT_STATUS_MAP = {
  PENDING: 'Pending Review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
} as const;

export type DocumentStatusKey = keyof typeof DOCUMENT_STATUS_MAP;

export const documentSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  category: z.enum([
    'IDENTITY',
    'ACADEMIC',
    'EMPLOYMENT',
    'CERTIFICATION',
    'OTHER',
  ]),
  title: z.string(),
  documentType: z.string(),
  fileUrl: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
  expiryDate: z.string().nullable().optional(),
  reviewedByUserId: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  employee: z.object({
    id: z.string(),
    employeeCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    department: z.object({
      id: z.number(),
      name: z.string(),
      code: z.string(),
    }),
  }),
  reviewedByUser: z
    .object({
      id: z.string(),
      email: z.string(),
      employee: z
        .object({
          firstName: z.string(),
          lastName: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

export type DocumentItem = z.infer<typeof documentSchema>;

export interface ListDocumentsResponse {
  data: DocumentItem[];
  total: number;
  page: number;
  totalPages: number;
}

export function useDocuments(params: {
  employeeId?: string;
  category?: DocumentCategoryKey;
  status?: DocumentStatusKey;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.employeeId) query.set('employeeId', params.employeeId);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  return useQuery({
    queryKey: ['documents', params],
    queryFn: async () => {
      const qs = query.toString();
      const res = (await apiRequest(
        `/documents${qs ? `?${qs}` : ''}`,
      )) as ListDocumentsResponse;
      return res;
    },
  });
}

export function usePendingDocumentsCount() {
  return useQuery({
    queryKey: ['documents', 'pending-count'],
    queryFn: async () => {
      const res = (await apiRequest('/documents/pending-count')) as {
        data: { count: number };
      };
      return res.data.count;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = (await apiRequest('/documents', {
        method: 'POST',
        body: formData,
      })) as { data: DocumentItem };
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useReviewDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: 'VERIFIED' | 'REJECTED';
      reviewNote?: string;
    }) => {
      const res = (await apiRequest(`/documents/${id}/verify`, {
        method: 'PUT',
        body: { status, reviewNote },
      })) as { data: DocumentItem };
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/documents/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export async function documentBlob(id: string): Promise<Blob> {
  z.uuid().parse(id);
  const owner = getSessionIdentity();
  if (!owner) throw new Error('Sign in to view documents.');
  const blob = (await apiRequest(`/documents/${id}/content`, {
    responseType: 'blob',
  })) as Blob;
  if (getSessionIdentity() !== owner)
    throw new Error('Session changed. Reopen documents.');
  if (
    !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
      blob.type,
    ) ||
    !blob.size ||
    blob.size > 10 * 1024 * 1024
  )
    throw new Error('Document preview is unavailable.');
  return blob;
}
export async function downloadDocument(document: DocumentItem) {
  const url = URL.createObjectURL(await documentBlob(document.id));
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = document.fileName;
  link.click();
  URL.revokeObjectURL(url);
}
