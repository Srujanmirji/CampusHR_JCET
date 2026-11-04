import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  attendanceSettingsSchema,
  biometricImportPayloadSchema,
  biometricSyncPayloadSchema,
  correctionRequestSchema,
  listAttendanceQuerySchema,
  listCorrectionsQuerySchema,
  manualRecordSchema,
  punchSchema,
  reviewCorrectionSchema,
} from './attendance.schema.js';
import type { AttendanceService } from './attendance.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createAttendanceRouter(
  auth: AuthService,
  attendance: AttendanceService,
  biometricSyncSecret?: string,
) {
  const canRead = requirePermission(auth, 'attendance.read');
  const canCheckIn = requirePermission(auth, 'attendance.check_in');
  const canRecord = requirePermission(auth, 'attendance.record');
  const canRequestCorrection = requirePermission(
    auth,
    'attendance_correction.request',
  );
  const canApproveCorrection = requirePermission(
    auth,
    'attendance_correction.approve',
  );
  const canManageSettings = requirePermission(auth, 'settings.manage');

  const authenticateMachineOrUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const keyHeader = req.get('x-biometric-key');
      const secret =
        biometricSyncSecret ||
        process.env.BIOMETRIC_SYNC_SECRET ||
        'jcet-biometric-terminal-secret-2026';

      if (keyHeader && keyHeader === secret) {
        res.locals.access = {
          userId: 'system:biometric-daemon',
          scope: 'all',
          employeeId: null,
          departmentId: null,
        } satisfies Access;
        return next();
      }

      // Fall back to standard JWT auth with attendance.record permission
      const [scheme, token] = req.get('authorization')?.split(' ') ?? [];
      if (scheme !== 'Bearer' || !token) {
        throw new HttpError(
          401,
          'UNAUTHORIZED_BIOMETRIC',
          'Valid x-biometric-key header or HR Admin bearer token required.',
        );
      }
      const tokenPayload = await auth.authenticateAccessToken(token);
      res.locals.auth = tokenPayload;
      res.locals.access = await auth.authorize(
        tokenPayload.userId,
        'attendance.record',
      );
      next();
    } catch (err) {
      next(err);
    }
  };

  return (
    Router()
      // 1. Self Check-in / Check-out
      .post('/punch', ...canCheckIn, async (req, res) => {
        const input = parse(punchSchema, req.body);
        const record = await attendance.punch(access(res), input);
        res.status(200).json({ data: record });
      })

      // 2. Today's attendance for the logged-in user
      .get('/today', ...canRead, async (_req, res) => {
        const record = await attendance.today(access(res));
        res.json({ data: record });
      })

      // 3. List attendance records (daily, date range, department, status)
      .get('/', ...canRead, async (req, res) => {
        const query = parse(listAttendanceQuerySchema, req.query);
        const result = await attendance.list(access(res), query);
        res.json(result);
      })

      // 4. Manual record entry (Super Admin / HR)
      .post('/record', ...canRecord, async (req, res) => {
        const input = parse(manualRecordSchema, req.body);
        const record = await attendance.manualRecord(access(res), input);
        res.status(201).json({ data: record });
      })

      // 5. Corrections - Request
      .post('/corrections', ...canRequestCorrection, async (req, res) => {
        const input = parse(correctionRequestSchema, req.body);
        const correction = await attendance.requestCorrection(
          access(res),
          input,
        );
        res.status(201).json({ data: correction });
      })

      // 6. Corrections - List
      .get('/corrections', ...canRead, async (req, res) => {
        const query = parse(listCorrectionsQuerySchema, req.query);
        const result = await attendance.listCorrections(access(res), query);
        res.json(result);
      })

      // 7. Corrections - Approve / Reject
      .patch('/corrections/:id', ...canApproveCorrection, async (req, res) => {
        const id = z.string().uuid().safeParse(req.params.id);
        if (!id.success) {
          throw new HttpError(
            404,
            'NOT_FOUND',
            'Correction request not found.',
          );
        }
        const input = parse(reviewCorrectionSchema, req.body);
        const updated = await attendance.reviewCorrection(
          access(res),
          id.data,
          input,
        );
        res.json({ data: updated });
      })

      // 8. Attendance Policy Settings
      .get('/settings', ...canRead, async (_req, res) => {
        res.json({ data: await attendance.getSettings() });
      })
      .put('/settings', ...canManageSettings, async (req, res) => {
        const input = parse(attendanceSettingsSchema, req.body);
        const updated = await attendance.updateSettings(access(res), input);
        res.json({ data: updated });
      })

      // 9. Biometric Machine Sync (Machine Webhook / Terminal Push)
      .post('/biometric/sync', authenticateMachineOrUser, async (req, res) => {
        const input = parse(biometricSyncPayloadSchema, req.body);
        const result = await attendance.syncBiometricPunches(
          input,
          req.get('x-device-id') || input.deviceId,
        );
        res.status(200).json({ data: result });
      })

      // 10. Biometric CSV / Log File Import (eSSL, ZKTeco logs)
      .post('/biometric/import', ...canRecord, async (req, res) => {
        const input = parse(biometricImportPayloadSchema, req.body);
        const result = await attendance.importBiometricRows(input);
        res.status(200).json({ data: result });
      })

      // 11. Biometric Sync Statistics
      .get('/biometric/stats', ...canRead, async (_req, res) => {
        const stats = await attendance.getBiometricStats();
        res.json({ data: stats });
      })

      // 12. Biometric Registered Campus Terminals
      .get('/biometric/devices', ...canRead, async (_req, res) => {
        const devices = await attendance.getBiometricDevices();
        res.json({ data: devices });
      })
  );
}
