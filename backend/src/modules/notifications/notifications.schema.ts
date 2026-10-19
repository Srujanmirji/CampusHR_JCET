import { z } from 'zod';

export const listSchema = z.object({
  // Id of the last notification already shown; the next page follows it.
  after: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListQuery = z.infer<typeof listSchema>;

export const announcementSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(3).max(1000),
    // Omit for everyone (HR, Principal, Super Admin); HODs send to their own.
    departmentId: z.number().int().positive().optional(),
  })
  .strict();
export type AnnouncementInput = z.infer<typeof announcementSchema>;
