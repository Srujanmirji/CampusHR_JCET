import { z } from 'zod';

export const workPrioritySchema = z.enum(['NORMAL', 'HIGH', 'URGENT']);
export type WorkPriority = z.infer<typeof workPrioritySchema>;

export const workStatusSchema = z.enum([
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'COMPLETED',
  'CANCELLED',
]);
export type WorkStatus = z.infer<typeof workStatusSchema>;

export const workCategorySchema = z.enum([
  'ACADEMIC',
  'NBA_NAAC',
  'EXAMINATION',
  'STUDENT_AFFAIR',
  'EVENT',
  'ADMINISTRATIVE',
  'OTHER',
]);
export type WorkCategory = z.infer<typeof workCategorySchema>;

export const createWorkAssignmentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5),
  category: workCategorySchema.default('ADMINISTRATIVE'),
  priority: workPrioritySchema.default('NORMAL'),
  assignedToIds: z.array(z.string().uuid()).min(1),
  dueDate: z.string().min(8),
  attachmentUrl: z.string().trim().optional().nullable(),
  attachmentName: z.string().trim().max(120).optional().nullable(),
});
export type CreateWorkAssignmentInput = z.input<
  typeof createWorkAssignmentSchema
>;
export type CreateWorkAssignmentData = z.infer<
  typeof createWorkAssignmentSchema
>;

export const updateWorkStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'SUBMITTED']),
  submissionNotes: z.string().trim().max(1000).optional().nullable(),
  submissionAttachmentUrl: z.string().trim().optional().nullable(),
});
export type UpdateWorkStatusInput = z.input<typeof updateWorkStatusSchema>;
export type UpdateWorkStatusData = z.infer<typeof updateWorkStatusSchema>;

export const reviewWorkSchema = z.object({
  decision: z.enum(['APPROVE', 'REQUEST_REVISION']),
  feedback: z.string().trim().max(500).optional().nullable(),
});
export type ReviewWorkInput = z.input<typeof reviewWorkSchema>;
export type ReviewWorkData = z.infer<typeof reviewWorkSchema>;

export const queryWorkSchema = z.object({
  status: workStatusSchema.optional(),
  priority: workPrioritySchema.optional(),
  category: workCategorySchema.optional(),
  view: z.enum(['assigned-to-me', 'assigned-by-me', 'all']).default('assigned-to-me'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type QueryWorkInput = z.input<typeof queryWorkSchema>;
export type QueryWorkData = z.infer<typeof queryWorkSchema>;
