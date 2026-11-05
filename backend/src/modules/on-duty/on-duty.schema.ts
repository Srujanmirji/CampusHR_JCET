import { z } from 'zod';

export const ON_DUTY_CATEGORIES = [
  'UNIVERSITY_VALUATION',
  'EXTERNAL_EXAMINER',
  'CONFERENCE_SEMINAR',
  'FDP_WORKSHOP',
  'BOS_BOE_MEETING',
  'OFFICIAL_COLLEGE_DUTY',
  'OTHER',
] as const;

export type OnDutyCategory = (typeof ON_DUTY_CATEGORIES)[number];

export const ON_DUTY_STATUSES = [
  'PENDING',
  'RECOMMENDED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type OnDutyStatus = (typeof ON_DUTY_STATUSES)[number];

export const onDutyCategorySchema = z.enum(ON_DUTY_CATEGORIES);
export const onDutyStatusSchema = z.enum(ON_DUTY_STATUSES);

export const createOnDutySchema = z.object({
  category: onDutyCategorySchema.default('UNIVERSITY_VALUATION'),
  title: z.string().trim().min(3, 'Title is required').max(200),
  description: z.string().trim().min(5, 'Provide duty details and objective'),
  venue: z.string().trim().min(2, 'Venue / Organization is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  attachmentUrl: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
});

export type CreateOnDutyInput = z.input<typeof createOnDutySchema>;

export const reviewOnDutySchema = z.object({
  decision: z.enum(['RECOMMEND', 'APPROVE', 'REJECT']),
  note: z.string().optional().nullable(),
});

export type ReviewOnDutyInput = z.input<typeof reviewOnDutySchema>;

export const uploadCertificateSchema = z.object({
  attendanceCertificateUrl: z.string().min(1, 'Certificate URL is required'),
});

export type UploadCertificateInput = z.input<typeof uploadCertificateSchema>;

export const queryOnDutySchema = z.object({
  status: onDutyStatusSchema.optional(),
  category: onDutyCategorySchema.optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  employeeId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  view: z.enum(['my-requests', 'approvals-queue', 'all']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
});

export type QueryOnDutyInput = z.input<typeof queryOnDutySchema>;
