import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/services/api';
import { entrySchema } from '@/features/timetable/api/timetable';

const statusSchema = z.enum(['UNDERLOADED', 'NORMAL', 'OVERLOADED']);
export type LoadStatus = z.infer<typeof statusSchema>;

export const LOAD_LABEL = {
  UNDERLOADED: 'Underloaded',
  NORMAL: 'Normal',
  OVERLOADED: 'Overloaded',
} as const satisfies Record<LoadStatus, string>;

/** "14–18 h", or a dash when the designation has no band. */
export const bandLabel = (min: number | null, max: number | null) =>
  min === null || max === null ? '—' : `${min}–${max} h`;

const summarySchema = z.object({
  faculty: z.object({
    id: z.string(),
    employeeCode: z.string(),
    name: z.string(),
    department: z.object({
      id: z.number(),
      code: z.string(),
      name: z.string(),
    }),
    designation: z.object({ id: z.number(), name: z.string() }),
  }),
  theoryHours: z.number(),
  labHours: z.number(),
  totalHours: z.number(),
  minHours: z.number().nullable(),
  maxHours: z.number().nullable(),
  // Null when the designation has no band.
  status: statusSchema.nullable(),
});
export type WorkloadSummary = z.infer<typeof summarySchema>;

const breakdownSchema = summarySchema.extend({
  classes: z.array(entrySchema),
});

const thresholdSchema = z.object({
  designation: z.object({ id: z.number(), name: z.string() }),
  minHours: z.number().nullable(),
  maxHours: z.number().nullable(),
  updatedAt: z.string().nullable(),
});
export type Threshold = z.infer<typeof thresholdSchema>;

export async function listWorkload(departmentId?: number) {
  const search = departmentId ? `?departmentId=${departmentId}` : '';
  return z
    .object({ data: z.array(summarySchema) })
    .parse(await apiRequest(`/workload${search}`)).data;
}

export const facultyWorkloadQuery = (id: string) =>
  queryOptions({
    queryKey: ['workload', 'faculty', id],
    queryFn: async () =>
      z
        .object({ data: breakdownSchema })
        .parse(await apiRequest(`/workload/faculty/${id}`)).data,
  });

export async function listThresholds() {
  return z
    .object({ data: z.array(thresholdSchema) })
    .parse(await apiRequest('/workload/thresholds')).data;
}

export async function saveThreshold(
  designationId: number,
  band: { minHours: number; maxHours: number },
) {
  return z.object({ data: thresholdSchema }).parse(
    await apiRequest(`/workload/thresholds/${designationId}`, {
      method: 'PUT',
      body: band,
    }),
  ).data;
}
