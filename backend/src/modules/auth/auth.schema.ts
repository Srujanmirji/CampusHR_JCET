import { z } from 'zod';

export const loginSchema = z.object({
  // College email or employee ID (e.g. JCET-CSE-021); matching ignores case.
  identifier: z
    .string()
    .trim()
    .min(1)
    .max(254)
    .transform((identifier) => identifier.toLowerCase()),
  password: z.string().min(1).max(256),
  remember: z.boolean().default(false),
});

// bcrypt only uses the first 72 bytes of a password.
export const newPasswordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .refine(
    (password) => Buffer.byteLength(password) <= 72,
    'Use at most 72 bytes.',
  );
