import { z } from 'zod';

export const punchSchema = z.object({
  action: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
  date: z.iso.date().optional(),
  source: z.enum(['WEB', 'MOBILE', 'BIOMETRIC', 'MANUAL']).default('WEB'),
  notes: z.string().max(250).optional(),
});

export const manualRecordSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  checkIn: z.string().datetime().optional().nullable(),
  checkOut: z.string().datetime().optional().nullable(),
  status: z
    .enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE'])
    .default('PRESENT'),
  notes: z.string().max(250).optional().nullable(),
});

export const correctionRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  requestedCheckIn: z.string().datetime().optional().nullable(),
  requestedCheckOut: z.string().datetime().optional().nullable(),
  requestedStatus: z
    .enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE'])
    .default('PRESENT'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

export const reviewCorrectionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(500).optional().nullable(),
});

export const listAttendanceQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  employeeId: z.string().uuid().optional(),
  status: z
    .enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const attendanceSettingsSchema = z.object({
  workDayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  workDayEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  gracePeriodMinutes: z.coerce.number().int().min(0).max(120),
  halfDayHours: z.coerce.number().min(1).max(12),
  fullDayHours: z.coerce.number().min(2).max(16),
});

export type PunchInput = z.infer<typeof punchSchema>;
export type ManualRecordInput = z.infer<typeof manualRecordSchema>;
export type CorrectionRequestInput = z.infer<typeof correctionRequestSchema>;
export type ReviewCorrectionInput = z.infer<typeof reviewCorrectionSchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
export type AttendanceSettingsInput = z.infer<typeof attendanceSettingsSchema>;

export const listCorrectionsQuerySchema = z.object({
  employeeId: z.uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const biometricPunchItemSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  timestamp: z.string().min(1, 'Timestamp is required'),
  punchType: z.enum(['IN', 'OUT', 'AUTO']).default('AUTO'),
  deviceId: z.string().optional(),
  verificationType: z
    .enum(['FINGERPRINT', 'FACE', 'RFID', 'MANUAL'])
    .optional(),
});

export const biometricSyncPayloadSchema = z.object({
  deviceId: z.string().optional().default('TERMINAL_MAIN_GATE'),
  location: z.string().optional(),
  punches: z
    .array(biometricPunchItemSchema)
    .min(1, 'At least one punch is required')
    .max(5000),
});

export const biometricImportPayloadSchema = z.object({
  deviceId: z.string().optional().default('CSV_IMPORT'),
  rows: z
    .array(
      z.object({
        employeeCode: z.string().min(1),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
        checkIn: z.string().optional().nullable(),
        checkOut: z.string().optional().nullable(),
        status: z
          .enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE'])
          .optional(),
        notes: z.string().max(250).optional().nullable(),
      }),
    )
    .min(1)
    .max(5000),
});

export type BiometricPunchItem = z.infer<typeof biometricPunchItemSchema>;
export type BiometricSyncPayload = z.infer<typeof biometricSyncPayloadSchema>;
export type BiometricImportPayload = z.infer<
  typeof biometricImportPayloadSchema
>;
