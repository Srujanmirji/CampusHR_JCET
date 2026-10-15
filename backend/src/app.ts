import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import type { PrismaClient } from './generated/prisma/client.js';
import { errorHandler } from './middleware/error.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createDepartmentRepository } from './modules/departments/department.repository.js';
import {
  createDepartmentRouter,
  createDesignationRouter,
} from './modules/departments/department.routes.js';
import { createDepartmentService } from './modules/departments/department.service.js';
import { createEmployeeRepository } from './modules/employees/employee.repository.js';
import { createEmployeeRouter } from './modules/employees/employee.routes.js';
import { createEmployeeService } from './modules/employees/employee.service.js';
import { createLeaveRepository } from './modules/leave/leave.repository.js';
import { createLeaveRouter } from './modules/leave/leave.routes.js';
import { createLeaveService } from './modules/leave/leave.service.js';
import { createSubstitutionRepository } from './modules/substitution/substitution.repository.js';
import { createSubstitutionRouter } from './modules/substitution/substitution.routes.js';
import { createSubstitutionService } from './modules/substitution/substitution.service.js';
import { createTimetableRepository } from './modules/timetable/timetable.repository.js';
import { createTimetableRouter } from './modules/timetable/timetable.routes.js';
import { createTimetableService } from './modules/timetable/timetable.service.js';
import { createUserRepository } from './modules/users/users.repository.js';
import { createUserRouter } from './modules/users/users.routes.js';
import { createUserService } from './modules/users/users.service.js';
import { createWorkloadRepository } from './modules/workload/workload.repository.js';
import { createWorkloadRouter } from './modules/workload/workload.routes.js';
import { createWorkloadService } from './modules/workload/workload.service.js';

// The built web app (`npm run build --workspace @campushr/web`). In production
// the API serves it from the same address, so the SameSite=Strict refresh
// cookie reaches /api/v1/auth without a shared custom domain (SETUP.md).
const WEB_DIST = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

export function createApp(
  env: Env,
  {
    authRepository,
    prisma,
    webDir = WEB_DIST,
  }: { authRepository: AuthRepository; prisma: PrismaClient; webDir?: string },
) {
  const auth = createAuthService(authRepository, env.JWT_ACCESS_SECRET);
  const departments = createDepartmentService(
    createDepartmentRepository(prisma),
  );
  const app = express();
  app.disable('x-powered-by');
  // Behind Railway's proxy: take the client address from X-Forwarded-For, so
  // sign-in rate limits count people, not the proxy.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  // Liveness only: database readiness is added when domain models are finalized.
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'campushr-api' });
  });
  app.use(
    '/api/v1/auth',
    createAuthRouter(auth, {
      secureCookies: env.NODE_ENV === 'production',
      allowedOrigin: env.CORS_ORIGIN,
    }),
  );
  app.use(
    '/api/v1/employees',
    createEmployeeRouter(
      auth,
      createEmployeeService(createEmployeeRepository(prisma)),
    ),
  );
  app.use('/api/v1/departments', createDepartmentRouter(auth, departments));
  app.use('/api/v1/designations', createDesignationRouter(auth, departments));
  app.use(
    '/api/v1/leave',
    createLeaveRouter(auth, createLeaveService(createLeaveRepository(prisma))),
  );
  app.use(
    '/api/v1/substitution',
    createSubstitutionRouter(
      auth,
      createSubstitutionService(createSubstitutionRepository(prisma)),
    ),
  );
  app.use(
    '/api/v1/timetable',
    createTimetableRouter(
      auth,
      createTimetableService(createTimetableRepository(prisma)),
    ),
  );
  app.use(
    '/api/v1/users',
    createUserRouter(auth, createUserService(createUserRepository(prisma))),
  );
  app.use(
    '/api/v1/workload',
    createWorkloadRouter(
      auth,
      createWorkloadService(createWorkloadRepository(prisma)),
    ),
  );
  if (env.NODE_ENV === 'production' && existsSync(webDir)) {
    app.use(express.static(webDir, { index: false, maxAge: '1h' }));
    // Every other page is the single-page app; it routes in the browser.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      res.set('Cache-Control', 'no-cache').sendFile(join(webDir, 'index.html'));
    });
  }
  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });
  app.use(errorHandler);
  return app;
}
