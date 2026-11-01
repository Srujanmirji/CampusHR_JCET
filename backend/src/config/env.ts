import { z } from 'zod';
import { isAbsolute } from 'node:path';

export const envSchema = z
  .object({
    // Required: production sets Secure cookies, so a forgotten value must not
    // silently fall back to development.
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z
      .url()
      .refine((url) => /^postgres(ql)?:\/\//.test(url), 'Use a PostgreSQL URL'),
    // Signs access tokens. Refresh tokens are random values stored hashed in the
    // database, so they need no signing secret.
    JWT_ACCESS_SECRET: z.string().min(32),
    CORS_ORIGIN: z.url(),
    // Mount a private persistent volume here when running a hosted instance.
    DOCUMENTS_DIR: z
      .string()
      .refine(isAbsolute, 'Use an absolute path')
      .optional(),
    PASSWORD_RESET_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    PASSWORD_RESET_SCRIPT_URL: z
      .url()
      .refine((value) => {
        const u = new URL(value);
        return (
          u.protocol === 'https:' &&
          u.hostname === 'script.google.com' &&
          /^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname) &&
          !u.search &&
          !u.hash &&
          !u.username &&
          !u.password
        );
      }, 'Use the Google Apps Script /exec URL')
      .optional(),
    PASSWORD_RESET_SCRIPT_SECRET: z.string().min(32).optional(),
    PASSWORD_RESET_DAILY_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(80),
    PUSH_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    EXPO_PROJECT_ID: z.uuid().optional(),
    EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      !env.PASSWORD_RESET_ENABLED ||
      !!(env.PASSWORD_RESET_SCRIPT_URL && env.PASSWORD_RESET_SCRIPT_SECRET),
    {
      message: 'Email reset needs script URL and secret.',
      path: ['PASSWORD_RESET_SCRIPT_SECRET'],
    },
  )
  .refine((env) => !env.PUSH_ENABLED || !!env.EXPO_PROJECT_ID, {
    path: ['EXPO_PROJECT_ID'],
    message: 'Required when push is enabled.',
  });

export type Env = z.infer<typeof envSchema>;
