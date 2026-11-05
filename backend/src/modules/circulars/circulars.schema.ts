import { z } from 'zod';

export const circularCategorySchema = z.enum([
  'ACADEMIC',
  'ADMINISTRATIVE',
  'HOLIDAY',
  'VTU_NOTIFICATION',
  'EXAMINATION',
  'EVENT',
  'URGENT',
]);
export type CircularCategory = z.infer<typeof circularCategorySchema>;

export const circularPrioritySchema = z.enum(['NORMAL', 'HIGH', 'URGENT']);
export type CircularPriority = z.infer<typeof circularPrioritySchema>;

export const circularAudienceSchema = z.enum([
  'ALL',
  'TEACHING_ONLY',
  'NON_TEACHING_ONLY',
  'DEPARTMENT',
]);
export type CircularAudience = z.infer<typeof circularAudienceSchema>;

export const createCircularSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    content: z.string().trim().min(10),
    category: circularCategorySchema.default('ADMINISTRATIVE'),
    priority: circularPrioritySchema.default('NORMAL'),
    targetAudience: circularAudienceSchema.default('ALL'),
    targetDepartmentId: z.number().int().positive().optional().nullable(),
    attachmentUrl: z.string().trim().optional().nullable(),
    attachmentName: z.string().trim().max(120).optional().nullable(),
    isPublished: z.boolean().default(true),
    expiresAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.targetAudience === 'DEPARTMENT' && !data.targetDepartmentId) {
        return false;
      }
      return true;
    },
    {
      message: 'targetDepartmentId is required when targetAudience is DEPARTMENT',
      path: ['targetDepartmentId'],
    },
  );
export type CreateCircularInput = z.input<typeof createCircularSchema>;
export type CreateCircularData = z.infer<typeof createCircularSchema>;

export const updateCircularSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  content: z.string().trim().min(10).optional(),
  category: circularCategorySchema.optional(),
  priority: circularPrioritySchema.optional(),
  targetAudience: circularAudienceSchema.optional(),
  targetDepartmentId: z.number().int().positive().optional().nullable(),
  attachmentUrl: z.string().trim().optional().nullable(),
  attachmentName: z.string().trim().max(120).optional().nullable(),
  isPublished: z.boolean().optional(),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});
export type UpdateCircularInput = z.input<typeof updateCircularSchema>;
export type UpdateCircularData = z.infer<typeof updateCircularSchema>;

export const queryCircularsSchema = z.object({
  category: circularCategorySchema.optional(),
  priority: circularPrioritySchema.optional(),
  targetAudience: circularAudienceSchema.optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type QueryCircularsInput = z.input<typeof queryCircularsSchema>;
export type QueryCircularsData = z.infer<typeof queryCircularsSchema>;
