import { z } from 'zod';

export const examTypeSchema = z.enum([
  'VTU_SEMESTER',
  'INTERNAL_ASSESSMENT',
  'LAB_EXAM',
]);
export type ExamType = z.infer<typeof examTypeSchema>;

export const examSessionStatusSchema = z.enum([
  'UPCOMING',
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED',
]);
export type ExamSessionStatus = z.infer<typeof examSessionStatusSchema>;

export const examDutySessionSchema = z.enum(['MORNING', 'AFTERNOON']);
export type ExamDutySession = z.infer<typeof examDutySessionSchema>;

export const examDutyRoleSchema = z.enum([
  'CHIEF_SUPERINTENDENT',
  'DEPUTY_CHIEF',
  'INVIGILATOR',
  'RELIEVER',
  'SQUAD',
]);
export type ExamDutyRole = z.infer<typeof examDutyRoleSchema>;

export const examDutyStatusSchema = z.enum([
  'ASSIGNED',
  'CONFIRMED',
  'SWAP_REQUESTED',
  'SWAPPED',
  'ABSENT',
  'COMPLETED',
]);
export type ExamDutyStatus = z.infer<typeof examDutyStatusSchema>;

export const examDutySwapStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export type ExamDutySwapStatus = z.infer<typeof examDutySwapStatusSchema>;

export const createSessionSchema = z.object({
  name: z.string().trim().min(3).max(120),
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2,4}$/, 'Format as YYYY-YY (e.g. 2026-27)'),
  examType: examTypeSchema.default('VTU_SEMESTER'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format as YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format as YYYY-MM-DD'),
  status: examSessionStatusSchema.default('ACTIVE'),
  notes: z.string().trim().max(500).optional(),
});
export type CreateSessionInput = z.input<typeof createSessionSchema>;
export type CreateSessionData = z.infer<typeof createSessionSchema>;

export const createDutySchema = z.object({
  sessionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format as YYYY-MM-DD'),
  sessionTime: examDutySessionSchema.default('MORNING'),
  reportingTime: z.string().trim().max(20).default('09:00 AM'),
  roomId: z.number().int().positive().optional().nullable(),
  facultyId: z.string().uuid(),
  role: examDutyRoleSchema.default('INVIGILATOR'),
  remarks: z.string().trim().max(300).optional().nullable(),
});
export type CreateDutyInput = z.input<typeof createDutySchema>;
export type CreateDutyData = z.infer<typeof createDutySchema>;

export const autoAllotSchema = z.object({
  sessionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format as YYYY-MM-DD'),
  sessionTime: examDutySessionSchema.default('MORNING'),
  reportingTime: z.string().trim().max(20).default('09:00 AM'),
  roomIds: z.array(z.number().int().positive()).min(1),
  departmentIds: z.array(z.number().int().positive()).optional(),
  excludeFacultyIds: z.array(z.string().uuid()).optional(),
});
export type AutoAllotInput = z.input<typeof autoAllotSchema>;
export type AutoAllotData = z.infer<typeof autoAllotSchema>;

export const swapRequestSchema = z.object({
  swapWithFacultyId: z.string().uuid(),
  reason: z.string().trim().min(5).max(300),
});
export type SwapRequestInput = z.input<typeof swapRequestSchema>;
export type SwapRequestData = z.infer<typeof swapRequestSchema>;

export const swapDecideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().trim().max(300).optional(),
});
export type SwapDecideInput = z.input<typeof swapDecideSchema>;
export type SwapDecideData = z.infer<typeof swapDecideSchema>;

export const queryDutiesSchema = z.object({
  sessionId: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  facultyId: z.string().uuid().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  status: examDutyStatusSchema.optional(),
  format: z.enum(['json', 'csv']).default('json'),
});
export type QueryDutiesInput = z.input<typeof queryDutiesSchema>;
export type QueryDutiesData = z.infer<typeof queryDutiesSchema>;
