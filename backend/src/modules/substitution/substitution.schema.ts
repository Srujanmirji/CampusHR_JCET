import { z } from 'zod';

export const leaveListSchema = z.object({
  // Approved leave ending on or after this date; default today.
  from: z.iso.date().optional(),
});

export const candidatesSchema = z.object({
  entryId: z.uuid(),
  date: z.iso.date(),
});

export const assignSchema = z
  .object({
    leaveRequestId: z.uuid(),
    timetableEntryId: z.uuid(),
    date: z.iso.date(),
    // null: the class goes ahead without a substitute (see note).
    substituteId: z.uuid().nullable(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((input) => input.substituteId || (input.note?.length ?? 0) >= 3, {
    message: 'Describe how the class will be handled without a substitute.',
    path: ['note'],
  });
export type AssignInput = z.infer<typeof assignSchema>;
