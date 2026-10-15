import { z } from 'zod';

export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const id = z.number().int().positive();

export const entryInputSchema = z
  .object({
    departmentId: id,
    semester: z.number().int().min(1).max(8),
    section: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{1,2}$/, 'Use a letter, e.g. A.'),
    batch: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{1,4}$/, 'Use a short batch name, e.g. A1.')
      .or(z.literal('').transform(() => null))
      .nullable()
      .optional()
      .transform((batch) => batch ?? null),
    subjectId: id,
    facultyId: z.uuid(),
    roomId: id,
    day: z.enum(WEEKDAYS),
    startPeriod: z.number().int().min(1).max(12),
    endPeriod: z.number().int().min(1).max(12),
  })
  .strict()
  .refine((entry) => entry.endPeriod >= entry.startPeriod, {
    message: 'The last period cannot be before the first.',
    path: ['endPeriod'],
  });
export type EntryInput = z.infer<typeof entryInputSchema>;

export const entryListSchema = z.object({
  departmentId: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  section: z.string().trim().toUpperCase().max(2).optional(),
  facultyId: z.uuid().optional(),
});
export type EntryListQuery = z.infer<typeof entryListSchema>;

export const subjectInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,12}$/, 'Use the VTU code, e.g. BCS501.'),
    name: z.string().trim().min(2).max(120),
    departmentId: id,
    semester: z.number().int().min(1).max(8),
    kind: z.enum(['THEORY', 'LAB']),
  })
  .strict();
export type SubjectInput = z.infer<typeof subjectInputSchema>;

export const subjectListSchema = z.object({
  departmentId: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
});

export const roomInputSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    kind: z.enum(['CLASSROOM', 'LAB']),
  })
  .strict();
export type RoomInput = z.infer<typeof roomInputSchema>;
