import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  category: z.enum([
    'IDENTITY',
    'ACADEMIC',
    'EMPLOYMENT',
    'CERTIFICATION',
    'OTHER',
  ]),
  documentType: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(150),
  expiryDate: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.iso.date().optional().nullable(),
  ),
});

export const reviewDocumentSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  reviewNote: z.string().max(500).optional().nullable(),
});

export const listDocumentsQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  category: z
    .enum(['IDENTITY', 'ACADEMIC', 'EMPLOYMENT', 'CERTIFICATION', 'OTHER'])
    .optional(),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
