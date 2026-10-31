// Disposable in-memory API for home.smoke.mjs and simulator checks. Loopback only.
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createProfilePreview,
  profilePermissions,
} from './profile-fixtures.mjs';
import { createEmployeeService } from '../../backend/src/modules/employees/employee.service.ts';
import { createEmployeeRouter } from '../../backend/src/modules/employees/employee.routes.ts';
import { createDocumentsService } from '../../backend/src/modules/documents/documents.service.ts';
import { createDocumentsRouter } from '../../backend/src/modules/documents/documents.routes.ts';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { createApp } from '../../backend/src/app.ts';
import { envSchema } from '../../backend/src/config/env.ts';
import { createAuthService } from '../../backend/src/modules/auth/auth.service.ts';
import { requirePermission } from '../../backend/src/middleware/auth.ts';
import {
  createMemoryAuthRepository,
  unusedPrisma,
} from '../../backend/test/fakes.ts';
import { homeFixtures, homeUser } from './home-fixtures.mjs';
import {
  scheduleFixture,
  schedulePeriods,
  scheduleUser,
} from './schedule-fixtures.mjs';

import { createMemoryAttendanceRepository } from '../../backend/test/attendance-memory.ts';
import { createAttendanceService } from '../../backend/src/modules/attendance/attendance.service.ts';
import { createAttendanceRouter } from '../../backend/src/modules/attendance/attendance.routes.ts';
import { attendanceUser } from './attendance-fixtures.mjs';
import { createLeaveService } from '../../backend/src/modules/leave/leave.service.ts';
import { createLeaveRouter } from '../../backend/src/modules/leave/leave.routes.ts';
import {
  createLeavePreviewRepository,
  leavePermissions,
} from './leave-fixtures.mjs';
import { createSubstitutionService } from '../../backend/src/modules/substitution/substitution.service.ts';
import { createSubstitutionRouter } from '../../backend/src/modules/substitution/substitution.routes.ts';
import {
  createCoveragePreviewRepository,
  coveragePermissions,
  recipientUser,
} from './coverage-fixtures.mjs';
import { createRealtime } from '../../backend/src/modules/notifications/notifications.realtime.ts';
import { createNotificationService } from '../../backend/src/modules/notifications/notifications.service.ts';
import { createNotificationRouter } from '../../backend/src/modules/notifications/notifications.routes.ts';
import {
  createNotificationPreviewRepository,
  notificationUsers,
} from './notification-fixtures.mjs';
const previewUsers = [
  {
    ...scheduleUser,
    role: 'Faculty',
    id: '12121212-1212-4212-8212-121212121212',
    email: 'faculty-check@jcet.test',
    permissions: [
      ...profilePermissions,
      ...coveragePermissions,
      ...scheduleUser.permissions,
      ...attendanceUser.permissions,
      ...leavePermissions,
    ],
    status: 'ACTIVE',
    passwordHash: await bcrypt.hash('home-check-only', 4),
    employeeCode: 'IOS004',
  },
  {
    ...scheduleUser,
    permissions: [
      'report.read.department',
      ...profilePermissions,
      ...coveragePermissions,
      ...scheduleUser.permissions.filter((p) => p !== 'substitution.read.own'),
      ...attendanceUser.permissions,
      ...leavePermissions,
    ],
    status: 'ACTIVE',
    passwordHash: await bcrypt.hash('home-check-only', 4),
    employeeCode: 'IOS004',
  },
  {
    ...scheduleUser,
    permissions: [
      'report.read.department',
      ...profilePermissions,
      ...coveragePermissions,
      ...scheduleUser.permissions.filter((p) => p !== 'substitution.read.own'),
      ...attendanceUser.permissions,
      ...leavePermissions,
    ],
    id: '22222222-2222-4222-8222-222222222222',
    email: 'no-employee@jcet.test',
    status: 'ACTIVE',
    employeeId: null,
    passwordHash: await bcrypt.hash('home-check-only', 4),
    employeeCode: 'IOS004ADMIN',
  },
  {
    ...recipientUser,
    permissions: [...recipientUser.permissions, ...profilePermissions],
    status: 'ACTIVE',
    passwordHash: await bcrypt.hash('home-check-only', 4),
    employeeCode: 'COV001',
  },
];
const memory = createMemoryAuthRepository(previewUsers);
const env = envSchema.parse({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost/test',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  CORS_ORIGIN: globalThis.process.env.PREVIEW_ORIGIN || 'http://[::1]:8081',
});
const auth = createAuthService(memory.repo, env.JWT_ACCESS_SECRET);
const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
let attendanceRouter = createAttendanceRouter(
  auth,
  createAttendanceService(createMemoryAttendanceRepository()),
);
const leaveRouter = () =>
  createLeaveRouter(
    auth,
    createLeaveService(createLeavePreviewRepository(previewUsers), {
      notifyRole: async () => {},
      notifyEmployee: async () => {},
    }),
  );
let leave = leaveRouter();
const coverageRouter = () =>
  createSubstitutionRouter(
    auth,
    createSubstitutionService(createCoveragePreviewRepository(), {
      notifyRole: async () => {},
      notifyEmployee: async () => {},
    }),
  );
let coverage = coverageRouter();
const realtime = createRealtime();
let notificationRepo = createNotificationPreviewRepository();
const notificationRouter = () =>
  createNotificationRouter(
    auth,
    createNotificationService(notificationRepo, realtime),
  );
let notifications = notificationRouter();
let mode = globalThis.process.env.PREVIEW_MODE || 'normal';
const paths = [];
app.get('/test-state', (_req, res) => res.json({ mode, paths }));
app.post('/test-mode/:mode', async (req, res) => {
  mode = req.params.mode;
  if (mode === 'notifications-live') {
    notificationRepo = createNotificationPreviewRepository();
    notifications = notificationRouter();
  }
  if (mode === 'coverage-live') coverage = coverageRouter();
  if (mode === 'leave-live') leave = leaveRouter();
  if (mode === 'attendance-live')
    attendanceRouter = createAttendanceRouter(
      auth,
      createAttendanceService(createMemoryAttendanceRepository()),
    );
  if (mode === 'profile-live') {
    for (const file of fs.readdirSync(documentDir))
      fs.unlinkSync(path.join(documentDir, file));
    profilePreview = createProfilePreview(documentDir);
    await profilePreview.seed();
    profileRouter = createEmployeeRouter(
      auth,
      createEmployeeService(profilePreview.employeeRepo),
    );
    documentRouter = createDocumentsRouter(
      auth,
      createDocumentsService(profilePreview.documentRepo),
      documentDir,
    );
  }
  paths.length = 0;
  res.sendStatus(204);
});
app.post('/test-notifications/:target', async (req, res) => {
  const userId = notificationUsers[req.params.target];
  if (!userId) return res.sendStatus(404);
  await notificationRepo.create([userId], {
    kind: 'announcement',
    title: `Live update for ${req.params.target}`,
    body: 'Created by the disposable verification API.',
  });
  realtime.publish(userId);
  return res.sendStatus(201);
});
app.post('/test-sockets/disconnect', (_req, res) => {
  for (const socket of liveIo.sockets.sockets.values()) socket.conn.close();
  res.sendStatus(204);
});
const parts = new globalThis.Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
}).formatToParts(new Date());
const part = (name) => parts.find((p) => p.type === name).value;
const date = `${part('year')}-${part('month')}-${part('day')}`;
const fixtures = homeFixtures(date, part('weekday').toUpperCase());
// Attendance follows UTC; the teaching timetable follows the campus calendar.
fixtures['/attendance/today'] = homeFixtures(
  new Date().toISOString().slice(0, 10),
)['/attendance/today'];
fixtures['/timetable/periods'] = { data: schedulePeriods };
fixtures['/substitution/mine'] = {
  data:
    part('weekday') === 'Sun'
      ? []
      : [scheduleFixture(date, part('weekday').toUpperCase())],
};
app.get(
  '/api/v1/workload',
  ...requirePermission(auth, 'workload.read'),
  (_req, res) =>
    res.json({
      data: [
        {
          faculty: {
            id: homeUser.employeeId,
            employeeCode: 'IOS004',
            name: 'Home Test',
            department: {
              id: 1,
              code: 'CSE',
              name: 'Computer Science & Engineering',
            },
          },
          totalHours: 12,
          minHours: 10,
          maxHours: 18,
          status: 'NORMAL',
        },
      ],
    }),
);
app.get(
  '/api/v1/reports/summary',
  ...requirePermission(auth, 'report.read'),
  (_req, res) =>
    res.json({
      data: {
        headcount: { total: 34 },
        attendance: { present: 31 },
        continuity: {
          affectedClasses: 10,
          classesCovered: 8,
          coverageRate: 80,
          uncoveredClasses: 2,
        },
      },
    }),
);
for (const [path, permission] of [
  ['/attendance/today', 'attendance.read'],
  ['/leave/balances', 'leave.read'],
  [`/workload/faculty/${homeUser.employeeId}`, 'workload.read'],
  ['/notifications', 'notification.read'],
  ['/notifications/unread-count', 'notification.read'],
  ['/timetable/periods', 'timetable.read'],
  ['/timetable/entries', 'timetable.read'],
  ['/substitution/mine', 'substitution.read'],
]) {
  app.get(
    `/api/v1${path}`,
    ...requirePermission(auth, permission),
    (req, res, next) => {
      // Interactive demos must read the same repositories that accept writes.
      // The other modes retain isolated summaries/error injection for checks.
      const interactive = mode === 'interactive';
      if (
        (interactive || mode.startsWith('notifications-')) &&
        (path === '/notifications' || path === '/notifications/unread-count')
      )
        return next();
      if (
        (interactive || mode.startsWith('coverage-')) &&
        path === '/substitution/mine'
      )
        return next();
      if (
        path === '/leave/balances' &&
        (interactive || mode.startsWith('leave-'))
      )
        return next();
      if (
        path === '/attendance/today' &&
        (interactive || mode.startsWith('attendance-')) &&
        mode !== 'attendance-error'
      )
        return next();
      paths.push(req.originalUrl);
      if (
        mode.startsWith('coverage-') &&
        path === '/timetable/entries' &&
        req.query.facultyId === recipientUser.employeeId
      )
        return res.json({ data: [] });
      if (
        (mode === 'duties-error' && path === '/substitution/mine') ||
        (mode === 'timetable-error' && path === '/timetable/entries')
      )
        return res.status(503).json({
          error: {
            code: 'CHECK',
            message: 'Schedule test source unavailable.',
          },
        });
      if (mode === 'duties-undone' && path === '/substitution/mine')
        return res.json({ data: [] });
      if (mode === 'bad-duty-periods' && path === '/substitution/mine') {
        const result = globalThis.structuredClone(fixtures[path]);
        result.data[0].entry.endPeriod = 99;
        return res.json(result);
      }
      if (mode === 'foreign-duty' && path === '/substitution/mine') {
        const result = globalThis.structuredClone(fixtures[path]);
        result.data[0].substitute.id = homeUser.id;
        return res.json(result);
      }

      if (path === '/attendance/today' && mode === 'attendance-error')
        return res.status(503).json({
          error: {
            code: 'CHECK',
            message: 'Attendance check temporarily unavailable.',
          },
        });
      if (mode === 'empty')
        return res.json(
          path === '/attendance/today'
            ? { data: null }
            : path === '/notifications/unread-count'
              ? { data: { count: 0 } }
              : path === '/notifications'
                ? { data: [], hasMore: false }
                : path.startsWith('/workload/')
                  ? fixtures[path]
                  : { data: [] },
        );
      if (mode === 'unlimited' && path === '/leave/balances') {
        const result = globalThis.structuredClone(fixtures[path]);
        result.data[0].remaining = null;
        return res.json(result);
      }
      if (
        path === '/leave/balances' &&
        req.query.employeeId !== homeUser.employeeId
      )
        return res.sendStatus(400);
      if (
        path === '/timetable/entries' &&
        req.query.facultyId !== homeUser.employeeId
      )
        return res.sendStatus(400);
      return res.json(fixtures[path]);
    },
  );
}
app.use('/api/v1/attendance', (req, res, next) => {
  paths.push(`${req.method} ${req.originalUrl}`);
  if (
    mode === 'attendance-history-error' &&
    req.path === '/' &&
    req.method === 'GET'
  )
    return res.status(503).json({
      error: {
        code: 'CHECK',
        message: 'Attendance history temporarily unavailable.',
      },
    });
  if (mode === 'attendance-punch-refused' && req.path === '/punch')
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Mobile punch is not permitted.' },
    });
  if (
    mode === 'attendance-correction-refused' &&
    req.path === '/corrections' &&
    req.method === 'POST'
  )
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Correction rejected for this test.',
      },
    });
  if (
    (mode === 'attendance-punch-uncertain' && req.path === '/punch') ||
    (mode === 'attendance-correction-uncertain' &&
      req.path === '/corrections' &&
      req.method === 'POST')
  ) {
    const send = res.json.bind(res);
    res.json = () => {
      res.status(503);
      return send({
        error: {
          code: 'RESPONSE_LOST',
          message: 'Write response could not be confirmed.',
        },
      });
    };
  }
  return attendanceRouter(req, res, next);
});
app.use('/api/v1/leave', (req, res, next) => {
  paths.push(`${req.method} ${req.originalUrl}`);
  if (mode === 'leave-error' && req.path === '/balances')
    return res.status(503).json({
      error: {
        code: 'CHECK',
        message: 'Leave balances temporarily unavailable.',
      },
    });
  if (mode === 'leave-refused' && req.method !== 'GET')
    return res.status(400).json({
      error: { code: 'CHECK', message: 'Leave write refused for this test.' },
    });
  if (mode === 'leave-uncertain' && req.method !== 'GET') {
    const send = res.json.bind(res);
    res.json = () => {
      res.status(503);
      return send({
        error: {
          code: 'RESPONSE_LOST',
          message: 'Write response could not be confirmed.',
        },
      });
    };
  }
  return leave(req, res, next);
});
app.use('/api/v1/substitution', (req, res, next) => {
  paths.push(`${req.method} ${req.originalUrl}`);
  if (
    mode === 'coverage-error' &&
    req.method === 'GET' &&
    req.path.endsWith('/candidates')
  )
    return res.status(503).json({
      error: {
        code: 'CHECK',
        message: 'Candidate search temporarily unavailable.',
      },
    });
  if (mode === 'coverage-refused' && req.method === 'POST')
    return res.status(409).json({
      error: {
        code: 'NOT_AVAILABLE',
        message: 'This candidate is no longer available. Refresh candidates.',
      },
    });
  if (mode === 'coverage-uncertain' && req.method === 'POST') {
    const send = res.json.bind(res);
    res.json = () => {
      res.status(503);
      return send({
        error: {
          code: 'RESPONSE_LOST',
          message: 'Write response could not be confirmed.',
        },
      });
    };
  }
  if (mode === 'coverage-undo-uncertain' && req.method === 'DELETE') {
    const end = res.end.bind(res);
    res.end = () => {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      return end(
        JSON.stringify({
          error: {
            code: 'RESPONSE_LOST',
            message: 'Undo response could not be confirmed.',
          },
        }),
      );
    };
  }
  return coverage(req, res, next);
});
app.use('/api/v1/notifications', (req, res, next) => {
  paths.push(`${req.method} ${req.originalUrl}`);
  if (
    mode === 'notifications-error' &&
    req.method === 'GET' &&
    req.path === '/'
  )
    return res.status(503).json({
      error: {
        code: 'CHECK',
        message: 'Notification inbox temporarily unavailable.',
      },
    });
  if (mode === 'notifications-refused' && req.method === 'PATCH')
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Read update denied for this test.',
      },
    });
  if (mode === 'notifications-uncertain' && req.method === 'PATCH') {
    const end = res.end.bind(res);
    res.end = () => {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      return end(
        JSON.stringify({
          error: {
            code: 'RESPONSE_LOST',
            message: 'Read update response could not be confirmed.',
          },
        }),
      );
    };
  }
  return notifications(req, res, next);
});
const documentDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'campushr-profile-preview-'),
);
let profilePreview = createProfilePreview(documentDir);
await profilePreview.seed();
let profileRouter = createEmployeeRouter(
  auth,
  createEmployeeService(profilePreview.employeeRepo),
);
let documentRouter = createDocumentsRouter(
  auth,
  createDocumentsService(profilePreview.documentRepo),
  documentDir,
);
for (const prefix of ['employees', 'documents'])
  app.use(`/api/v1/${prefix}`, (req, res, next) => {
    paths.push(`${req.method} ${req.originalUrl}`);
    if (mode === 'profile-error' && req.method === 'GET')
      return res.status(503).json({
        error: { code: 'CHECK', message: 'Profile temporarily unavailable.' },
      });
    if (
      mode === 'profile-refused' &&
      req.method !== 'GET' &&
      req.method !== 'HEAD'
    )
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'This update is not permitted.',
        },
      });
    if (mode === 'profile-uncertain' && req.method === 'POST') {
      const send = res.json.bind(res);
      res.json = () => {
        res.status(503);
        return send({
          error: {
            code: 'RESPONSE_LOST',
            message: 'Upload response unconfirmed.',
          },
        });
      };
    }
    return (prefix === 'employees' ? profileRouter : documentRouter)(
      req,
      res,
      next,
    );
  });
for (const signal of ['SIGINT', 'SIGTERM'])
  globalThis.process.once(signal, () => {
    fs.rmSync(documentDir, { recursive: true, force: true });
    globalThis.process.exit(0);
  });
app.use('/api/v1', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  return res.status(501).json({
    error: {
      code: 'FIXTURE_ONLY',
      message: 'This preview API only serves Home fixtures.',
    },
  });
});
app.use(createApp(env, { authRepository: memory.repo, prisma: unusedPrisma }));
app.use((error, _req, res, next) => {
  void next;
  return res.status(error.status || 500).json({
    error: { code: error.code || 'CHECK_FAILED', message: error.message },
  });
});
const previewHost = globalThis.process.env.PREVIEW_HOST || '::1';
if (!['::1', '127.0.0.1'].includes(previewHost))
  throw new Error('Preview API must bind to loopback.');
const server = app.listen(4011, previewHost, () =>
  globalThis.console.log(
    'Disposable Home test API listening on loopback port 4011; no database.',
  ),
);

const liveIo = realtime.attach(server, {
  origin: env.CORS_ORIGIN,
  verify: (token) => auth.verifyAccessToken(token).userId,
});
