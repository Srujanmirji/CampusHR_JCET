import { z } from 'zod';

export const reportQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    format: z.enum(['json', 'csv']).default('json'),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    path: ['to'],
    message: 'To date must be on or after from date.',
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;
