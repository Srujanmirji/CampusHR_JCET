import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format')
    .optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
