import { z } from 'zod';

export const workloadListSchema = z.object({
  departmentId: z.coerce.number().int().positive().optional(),
});
export type WorkloadListQuery = z.infer<typeof workloadListSchema>;

// A week has at most 6 days × 12 periods.
const hours = z.number().int().min(0).max(72);

export const thresholdInputSchema = z
  .object({ minHours: hours, maxHours: hours })
  .strict()
  .refine((band) => band.minHours <= band.maxHours, {
    message: 'The minimum cannot be above the maximum.',
    path: ['minHours'],
  });
export type ThresholdInput = z.infer<typeof thresholdInputSchema>;
