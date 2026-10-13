import { z } from 'zod';

export const envSchema = z.object({
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
});

export type Env = z.infer<typeof envSchema>;
