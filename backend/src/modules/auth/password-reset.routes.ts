import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../../common/validate.js';
import { HttpError } from '../../common/http-error.js';
import { newPasswordSchema } from './auth.schema.js';
import type { createPasswordResetService } from './password-reset.service.js';
const requestSchema = z
  .object({
    email: z
      .email()
      .trim()
      .max(254)
      .transform((v) => v.toLowerCase()),
  })
  .strict();
const confirmSchema = z
  .object({
    challengeId: z.uuid(),
    code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.'),
    newPassword: newPasswordSchema,
  })
  .strict();
export function createPasswordResetRouter(
  service: ReturnType<typeof createPasswordResetService>,
  origin: string,
) {
  return Router()
    .use((req, res, next) => {
      res.set('Cache-Control', 'no-store');
      if (req.get('origin') && req.get('origin') !== new URL(origin).origin)
        throw new HttpError(
          403,
          'FORBIDDEN_ORIGIN',
          'Request origin not allowed.',
        );
      next();
    })
    .get('/options', (_req, res) => res.json({ enabled: service.enabled }))
    .post('/request', async (req, res) => {
      const input = parse(requestSchema, req.body);
      try {
        res
          .status(202)
          .json(await service.request(input.email, req.ip || 'unknown'));
      } catch (e) {
        if (e instanceof HttpError && e.status === 429)
          res.set('Retry-After', '60');
        throw e;
      }
    })
    .post('/confirm', async (req, res) => {
      const input = parse(confirmSchema, req.body);
      res.json(
        await service.confirm(
          input.challengeId,
          input.code,
          input.newPassword,
          req.ip || 'unknown',
        ),
      );
    });
}
