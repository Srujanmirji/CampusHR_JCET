import { z } from 'zod';

// Whole or half days.
const days = (max: number) =>
  z
    .number()
    .min(0)
    .max(max)
    .refine((value) => Number.isInteger(value * 2), 'Use whole or half days.');

export const leaveTypeInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{1,6}$/, 'Use 1–6 letters, e.g. CL.'),
    name: z.string().trim().min(2).max(60),
    yearlyQuota: days(366).nullable(),
    allowHalfDay: z.boolean().default(false),
    carryForwardMax: days(366).default(0),
    active: z.boolean().default(true),
  })
  .strict();
export type LeaveTypeInput = z.infer<typeof leaveTypeInputSchema>;

export const leaveTypeUpdateSchema = leaveTypeInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'Nothing to change.');
export type LeaveTypeUpdate = z.infer<typeof leaveTypeUpdateSchema>;

export const leaveApplySchema = z
  .object({
    leaveTypeId: z.number().int().positive(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    halfDay: z.enum(['FIRST', 'SECOND']).nullable().default(null),
    reason: z.string().trim().min(3).max(500),
  })
  .strict()
  .refine((input) => input.startDate <= input.endDate, {
    message: 'The last day cannot be before the first.',
    path: ['endDate'],
  })
  .refine((input) => !input.halfDay || input.startDate === input.endDate, {
    message: 'A half day covers one date only.',
    path: ['halfDay'],
  })
  .refine(
    (input) => input.startDate.slice(0, 4) === input.endDate.slice(0, 4),
    {
      message: 'Leave across 31 December: apply separately for each year.',
      path: ['endDate'],
    },
  );
export type LeaveApplyInput = z.infer<typeof leaveApplySchema>;

export const leaveListSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  employeeId: z.uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  // Requests waiting for the caller's decision.
  awaitingMe: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export type LeaveListQuery = z.infer<typeof leaveListSchema>;

export const balanceQuerySchema = z.object({
  employeeId: z.uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export type BalanceQuery = z.infer<typeof balanceQuerySchema>;

export const approveSchema = z
  .object({ note: z.string().trim().max(500).optional() })
  .strict();
export const rejectSchema = z
  .object({
    note: z.string().trim().min(3, 'Say why, in a few words.').max(500),
  })
  .strict();
