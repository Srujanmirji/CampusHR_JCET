import { z } from 'zod';
import { newPasswordSchema } from '../auth/auth.schema.js';

const roleId = z.number().int().positive();

export const loginCreateSchema = z
  .object({ employeeId: z.uuid(), roleId, password: newPasswordSchema })
  .strict();
export type LoginCreateInput = z.infer<typeof loginCreateSchema>;

export const loginUpdateSchema = z
  .object({
    roleId: roleId.optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    // Set by HR until password reset by email exists.
    password: newPasswordSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'Nothing to change.');
export type LoginUpdateInput = z.infer<typeof loginUpdateSchema>;
