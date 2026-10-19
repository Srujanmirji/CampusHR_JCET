import { z } from 'zod';

export const punchSchema = z.object({
  source: z.enum(['WEB', 'MOBILE', 'BIOMETRIC', 'MANUAL']).default('WEB'),
  notes: z.string().max(250).optional(),
});

export const manualRecordSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  checkIn: z.string().datetime().optional().nullable(),
  checkOut: z.string().datetime().optional().nullable(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE']).default('PRESENT'),
  notes: z.string().max(250).optional().nullable(),
});

export const correctionRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  requestedCheckIn: z.string().datetime().optional().nullable(),
  requestedCheckOut: z.string().datetime().optional().nullable(),
  requestedStatus: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE']).default('PRESENT'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

export const reviewCorrectionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(500).optional().nullable(),
});

export const listAttendanceQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE']).optional(),
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
