import { z } from 'zod';
import { apiRequest } from '@/services/api';
import { entrySchema } from '@/features/timetable/api/timetable';

const personSchema = z.object({
  id: z.string(),
  employeeCode: z.string(),
  name: z.string(),
});

const leaveSchema = z.object({
  id: z.string(),
  employee: personSchema,
  department: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  leaveType: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  startDate: z.string(),
  endDate: z.string(),
  halfDay: z.enum(['FIRST', 'SECOND']).nullable(),
  days: z.number(),
});
export type ApprovedLeave = z.infer<typeof leaveSchema>;

const coverageSchema = z.object({
  id: z.string(),
  kind: z.enum(['SUBSTITUTE', 'NOT_NEEDED']),
  substitute: personSchema.nullable(),
  note: z.string().nullable(),
  assignedAt: z.string(),
});
export type Coverage = z.infer<typeof coverageSchema>;

const affectedClassSchema = z.object({
  date: z.string(),
  hours: z.number(),
  entry: entrySchema,
  coverage: coverageSchema.nullable(),
});
export type AffectedClass = z.infer<typeof affectedClassSchema>;

const pointsSchema = z.object({
  subject: z.number(),
  availability: z.number(),
  department: z.number(),
  workload: z.number(),
  experience: z.number(),
});
export type Points = z.infer<typeof pointsSchema>;

const candidateSchema = z.object({
  faculty: personSchema.extend({
    department: z.object({ id: z.number(), code: z.string() }),
    designation: z.string(),
  }),
  score: z.number(),
  points: pointsSchema,
  hoursAfter: z.number(),
  maxHours: z.number().nullable(),
  eligible: z.boolean(),
  reason: z.string().nullable(),
});
export type Candidate = z.infer<typeof candidateSchema>;

const myClassSchema = coverageSchema.extend({
  date: z.string(),
  entry: entrySchema,
  coveringFor: personSchema,
});
export type MyClass = z.infer<typeof myClassSchema>;

/** The visible rubric: what each part of a score is out of. */
export const RUBRIC: { key: keyof Points; label: string; max: number }[] = [
  { key: 'subject', label: 'Subject match', max: 35 },
  { key: 'availability', label: 'Availability', max: 25 },
  { key: 'department', label: 'Department', max: 15 },
  { key: 'workload', label: 'Workload headroom', max: 15 },
  { key: 'experience', label: 'Experience', max: 10 },
];

const data = <T extends z.ZodType>(schema: T) => z.object({ data: schema });

export async function listApprovedLeave() {
  return data(
    z.array(
      z.object({
        leave: leaveSchema,
        classes: z.number(),
        covered: z.number(),
      }),
    ),
  ).parse(await apiRequest('/substitution/leave')).data;
}

export async function getLeaveClasses(leaveId: string) {
  return data(
    z.object({ leave: leaveSchema, classes: z.array(affectedClassSchema) }),
  ).parse(await apiRequest(`/substitution/leave/${leaveId}`)).data;
}

export async function listCandidates(
  leaveId: string,
  entryId: string,
  date: string,
) {
  const search = new URLSearchParams({ entryId, date });
  return data(z.array(candidateSchema)).parse(
    await apiRequest(`/substitution/leave/${leaveId}/candidates?${search}`),
  ).data;
}

export async function assignCoverage(input: {
  leaveRequestId: string;
  timetableEntryId: string;
  date: string;
  substituteId: string | null;
  note?: string;
}) {
  return data(coverageSchema).parse(
    await apiRequest('/substitution/assignments', {
      method: 'POST',
      body: input,
    }),
  ).data;
}

export async function removeCoverage(id: string) {
  await apiRequest(`/substitution/assignments/${id}`, { method: 'DELETE' });
}

export async function listMyClasses() {
  return data(z.array(myClassSchema)).parse(
    await apiRequest('/substitution/mine'),
  ).data;
}
