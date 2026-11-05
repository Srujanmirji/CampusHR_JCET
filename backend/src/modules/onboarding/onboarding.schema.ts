import { z } from 'zod';

export const CANDIDATE_STATUSES = [
  'OFFER_PENDING',
  'OFFER_ISSUED',
  'OFFER_ACCEPTED',
  'DOCUMENTS_SUBMITTED',
  'ONBOARDED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const candidateStatusSchema = z.enum(CANDIDATE_STATUSES);

export const documentsChecklistSchema = z.object({
  degreeCertificate: z.boolean().default(false),
  pgMarksheet: z.boolean().default(false),
  experienceCertificate: z.boolean().default(false),
  relievingOrder: z.boolean().default(false),
  aadhaarPan: z.boolean().default(false),
  addressProof: z.boolean().default(false),
});

export type DocumentsChecklist = z.infer<typeof documentsChecklistSchema>;

export const createCandidateSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().min(8, 'Enter a valid phone number'),
  departmentId: z.number().int().positive('Select a valid department'),
  designationId: z.number().int().positive('Select a valid designation'),
  employmentType: z.enum(['PERMANENT', 'CONTRACT', 'PROBATIONARY', 'VISITING']),
  qualification: z.string().trim().min(1, 'Qualification is required'),
  specialization: z.string().trim().optional(),
  experienceYears: z.number().int().min(0).default(0),
  expectedJoiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  probationMonths: z.number().int().positive().default(12),
  noticePeriodMonths: z.number().int().positive().default(3),
  notes: z.string().optional(),
});

export type CreateCandidateInput = z.input<typeof createCandidateSchema>;

export const updateCandidateSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(8).optional(),
  departmentId: z.number().int().positive().optional(),
  designationId: z.number().int().positive().optional(),
  employmentType: z.enum(['PERMANENT', 'CONTRACT', 'PROBATIONARY', 'VISITING']).optional(),
  qualification: z.string().trim().min(1).optional(),
  specialization: z.string().trim().optional(),
  experienceYears: z.number().int().min(0).optional(),
  expectedJoiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  probationMonths: z.number().int().positive().optional(),
  noticePeriodMonths: z.number().int().positive().optional(),
  documentsChecklist: documentsChecklistSchema.partial().optional(),
  notes: z.string().optional(),
});

export type UpdateCandidateInput = z.input<typeof updateCandidateSchema>;

export const updateCandidateStatusSchema = z.object({
  status: candidateStatusSchema,
  notes: z.string().optional(),
});

export type UpdateCandidateStatusInput = z.input<typeof updateCandidateStatusSchema>;

export const completeOnboardingSchema = z.object({
  createLoginAccount: z.boolean().default(true),
  temporaryPassword: z.string().min(8).optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CompleteOnboardingInput = z.input<typeof completeOnboardingSchema>;

export const queryCandidatesSchema = z.object({
  status: candidateStatusSchema.optional(),
  departmentId: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
});

export type QueryCandidatesInput = z.input<typeof queryCandidatesSchema>;
