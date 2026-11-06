import { createPasswordResetService } from './modules/auth/password-reset.service.js';
import { createPasswordResetRouter } from './modules/auth/password-reset.routes.js';
import { createEmailService } from './modules/email/email.service.js';
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
import { createAttendanceRepository } from './modules/attendance/attendance.repository.js';
import { createAttendanceRouter } from './modules/attendance/attendance.routes.js';
import { createAttendanceService } from './modules/attendance/attendance.service.js';
import { createDepartmentRepository } from './modules/departments/department.repository.js';
import {
  createDepartmentRouter,
  createDesignationRouter,
} from './modules/departments/department.routes.js';
import { createDepartmentService } from './modules/departments/department.service.js';
import { createDocumentsRepository } from './modules/documents/documents.repository.js';
import { createDocumentsRouter } from './modules/documents/documents.routes.js';
import { createDocumentsService } from './modules/documents/documents.service.js';
import { createEmployeeRepository } from './modules/employees/employee.repository.js';
import { createEmployeeRouter } from './modules/employees/employee.routes.js';
import { createEmployeeService } from './modules/employees/employee.service.js';
import { createLeaveRepository } from './modules/leave/leave.repository.js';
import { createLeaveRouter } from './modules/leave/leave.routes.js';
import { createLeaveService } from './modules/leave/leave.service.js';
import { createLeavePolicyRepository } from './modules/leave/leave-policy.repository.js';
import { createLeavePolicyService } from './modules/leave/leave-policy.service.js';
import {
  createLeavePolicyRouter,
  createLeaveBalancesRouter,
  createLeaveAdjustmentsRouter,
} from './modules/leave/leave-policy.routes.js';
import {
  createPushRepository,
  createPushRouter,
} from './modules/notifications/notifications.push.js';
import { createNotificationRepository } from './modules/notifications/notifications.repository.js';
import type { Realtime } from './modules/notifications/notifications.realtime.js';
import { createNotificationRouter } from './modules/notifications/notifications.routes.js';
import { createNotificationService } from './modules/notifications/notifications.service.js';
import { createReportsRepository } from './modules/reports/reports.repository.js';
import { createReportsRouter } from './modules/reports/reports.routes.js';
import { createReportsService } from './modules/reports/reports.service.js';
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
import { createExamDutyRepository } from './modules/exam-duty/exam-duty.repository.js';
import { createExamDutyService } from './modules/exam-duty/exam-duty.service.js';
import { createExamDutyRouter } from './modules/exam-duty/exam-duty.routes.js';
import { createCircularRepository } from './modules/circulars/circulars.repository.js';
import { createCircularService } from './modules/circulars/circulars.service.js';
import { createCircularRouter } from './modules/circulars/circulars.routes.js';
import { createWorkAssignmentRepository } from './modules/work-assignments/work-assignments.repository.js';
import { createWorkAssignmentService } from './modules/work-assignments/work-assignments.service.js';
import { createWorkAssignmentRouter } from './modules/work-assignments/work-assignments.routes.js';
import { createOnboardingRepository } from './modules/onboarding/onboarding.repository.js';
import { createOnboardingService } from './modules/onboarding/onboarding.service.js';
import { createOnboardingRouter } from './modules/onboarding/onboarding.routes.js';
import { createOnDutyRepository } from './modules/on-duty/on-duty.repository.js';
import { createOnDutyService } from './modules/on-duty/on-duty.service.js';
import { createOnDutyRouter } from './modules/on-duty/on-duty.routes.js';
import { createAcademicCalendarRepository } from './modules/academic-calendar/academic-calendar.repository.js';
import { createAcademicCalendarService } from './modules/academic-calendar/academic-calendar.service.js';
import {
  createAcademicCalendarRouter,
  createAcademicYearsRouter,
  createSemestersRouter,
  createHolidaysRouter,
  createRestrictedHolidaysRouter,
} from './modules/academic-calendar/academic-calendar.routes.js';

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
    realtime,
  }: {
    authRepository: AuthRepository;
    prisma: PrismaClient;
    webDir?: string;
    /** Live unread counts; absent in tests that need no sockets. */
    realtime?: Pick<Realtime, 'publish'> &
      Partial<Pick<Realtime, 'disconnect'>>;
  },
) {
  const auth = createAuthService(authRepository, env.JWT_ACCESS_SECRET);
  const emailService = createEmailService(env.RESEND_API_KEY, env.RESEND_FROM);
  const notifications = createNotificationService(
    createNotificationRepository(prisma, env.PUSH_ENABLED),
    realtime,
    emailService,
  );
  const departments = createDepartmentService(
    createDepartmentRepository(prisma),
  );
  const app = express();
  app.locals.notifier = notifications.notifier;
  app.disable('x-powered-by');
  // Behind Railway's proxy: take the client address from X-Forwarded-For, so
  // sign-in rate limits count people, not the proxy.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === 'development' ? true : env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  // Liveness stays independent from database readiness.
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'campushr-api' });
  });
  app.get('/api/v1/ready', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Readiness timeout')),
            3000,
          );
        }),
      ]);
      res.json({ status: 'ready', service: 'campushr-api' });
    } catch {
      res.status(503).json({ status: 'unavailable', service: 'campushr-api' });
    } finally {
      clearTimeout(timeout);
    }
  });
  app.use(
    '/api/v1/auth/password-reset',
    createPasswordResetRouter(
      createPasswordResetService(prisma, env, (id) =>
        realtime?.disconnect?.(id),
      ),
      env.CORS_ORIGIN,
    ),
  );
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
  app.use(
    '/api/v1/attendance',
    createAttendanceRouter(
      auth,
      createAttendanceService(
        createAttendanceRepository(prisma),
        notifications.notifier,
      ),
      env.BIOMETRIC_SYNC_SECRET,
    ),
  );
  app.use(
    '/api/v1/documents',
    createDocumentsRouter(
      auth,
      createDocumentsService(
        createDocumentsRepository(prisma),
        notifications.notifier,
        prisma,
      ),
      env.DOCUMENTS_DIR,
    ),
  );
  app.use('/uploads/documents', (_req, res) =>
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Use authenticated document access.',
      },
    }),
  );
  app.use('/api/v1/departments', createDepartmentRouter(auth, departments));
  app.use('/api/v1/designations', createDesignationRouter(auth, departments));

  const academicCalendarRepo = createAcademicCalendarRepository(prisma);
  const academicCalendarService = createAcademicCalendarService(academicCalendarRepo);
  const leaveRepo = createLeaveRepository(prisma);
  const leavePolicyRepo = createLeavePolicyRepository(prisma);
  const leavePolicyService = createLeavePolicyService(leavePolicyRepo, leaveRepo, academicCalendarService);
  const leaveService = createLeaveService(leaveRepo, notifications.notifier, academicCalendarService, leavePolicyService);

  app.use(
    '/api/v1/leave',
    createLeaveRouter(auth, leaveService),
  );
  app.use(
    '/api/v1/leave-policies',
    createLeavePolicyRouter(auth, leavePolicyService),
  );
  app.use(
    '/api/v1/leave-balances',
    createLeaveBalancesRouter(auth, leavePolicyService),
  );
  app.use(
    '/api/v1/leave-adjustments',
    createLeaveAdjustmentsRouter(auth, leavePolicyService),
  );
  app.use(
    '/api/v1/notifications/push',
    createPushRouter(auth, createPushRepository(prisma), {
      enabled: env.PUSH_ENABLED,
      projectId: env.EXPO_PROJECT_ID,
    }),
  );
  app.use(
    '/api/v1/notifications',
    createNotificationRouter(auth, notifications),
  );
  app.use(
    '/api/v1/reports',
    createReportsRouter(
      auth,
      createReportsService(createReportsRepository(prisma)),
    ),
  );
  app.use(
    '/api/v1/substitution',
    createSubstitutionRouter(
      auth,
      createSubstitutionService(
        createSubstitutionRepository(prisma),
        notifications.notifier,
        academicCalendarService,
      ),
    ),
  );
  app.use(
    '/api/v1/timetable',
    createTimetableRouter(
      auth,
      createTimetableService(
        createTimetableRepository(prisma),
        academicCalendarService,
      ),
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
  app.use(
    '/api/v1/exam-duty',
    createExamDutyRouter(
      auth,
      createExamDutyService(
        createExamDutyRepository(prisma),
        notifications.notifier,
      ),
    ),
  );
  app.use(
    '/api/v1/circulars',
    createCircularRouter(
      auth,
      createCircularService(
        createCircularRepository(prisma),
        notifications.notifier,
      ),
    ),
  );
  app.use(
    '/api/v1/work-assignments',
    createWorkAssignmentRouter(
      auth,
      createWorkAssignmentService(
        createWorkAssignmentRepository(prisma),
        notifications.notifier,
      ),
    ),
  );
  app.use(
    '/api/v1/onboarding',
    createOnboardingRouter(
      auth,
      createOnboardingService(
        createOnboardingRepository(prisma),
        notifications.notifier,
      ),
    ),
  );
  app.use(
    '/api/v1/on-duty',
    createOnDutyRouter(
      auth,
      createOnDutyService(
        createOnDutyRepository(prisma),
        notifications.notifier,
      ),
    ),
  );
  app.use(
    '/api/v1/academic-calendar',
    createAcademicCalendarRouter(auth, academicCalendarService),
  );
  app.use(
    '/api/v1/academic-years',
    createAcademicYearsRouter(auth, academicCalendarService),
  );
  app.use(
    '/api/v1/semesters',
    createSemestersRouter(auth, academicCalendarService),
  );
  app.use(
    '/api/v1/holidays',
    createHolidaysRouter(auth, academicCalendarService),
  );
  app.use(
    '/api/v1/restricted-holidays',
    createRestrictedHolidaysRouter(auth, academicCalendarService),
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
