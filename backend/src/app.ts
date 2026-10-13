import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';

export function createApp(
  env: Env,
  { authRepository }: { authRepository: AuthRepository },
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  // Liveness only: database readiness is added when domain models are finalized.
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'campushr-api' });
  });
  app.use(
    '/api/v1/auth',
    createAuthRouter(createAuthService(authRepository, env.JWT_ACCESS_SECRET), {
      secureCookies: env.NODE_ENV === 'production',
      allowedOrigin: env.CORS_ORIGIN,
    }),
  );
  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });
  app.use(errorHandler);
  return app;
}
