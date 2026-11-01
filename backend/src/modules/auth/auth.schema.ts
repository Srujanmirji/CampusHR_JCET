import { z } from 'zod';
import { passwordIsValid, passwordProblem } from '@campushr/password-policy';

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
export const newPasswordSchema = z.string().superRefine((password, ctx) => {
  if (!passwordIsValid(password)) {
    ctx.addIssue({ code: 'custom', message: passwordProblem(password) });
  }
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(256),
    newPassword: newPasswordSchema,
  })
  .strict();

// 32 random bytes encoded as unpadded base64url, as issued by auth.service.
const nativeRefreshTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const nativeSessionSchema = z
  .object({ refreshToken: nativeRefreshTokenSchema })
  .strict();
export const nativeChangePasswordSchema = changePasswordSchema.extend({
  refreshToken: nativeRefreshTokenSchema,
});
