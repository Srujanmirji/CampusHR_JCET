import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
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
