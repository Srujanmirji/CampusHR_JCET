import { z } from 'zod';
import { apiRequest } from '@/services/api';

export const ATTENDANCE_STATUS_MAP = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
  LATE: 'Late',
} as const;

export type AttendanceStatusKey = keyof typeof ATTENDANCE_STATUS_MAP;

export const attendanceRecordSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  checkIn: z.string().nullable().optional(),
  checkOut: z.string().nullable().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE']),
  source: z.enum(['WEB', 'MOBILE', 'BIOMETRIC', 'MANUAL']),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  employee: z.object({
    id: z.string(),
    employeeCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    departmentId: z.number(),
    department: z.object({
      id: z.number(),
      code: z.string(),
      name: z.string(),
    }),
  }),
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

export const correctionRecordSchema = z.object({
  id: z.string(),
  attendanceId: z.string().nullable().optional(),
  employeeId: z.string(),
  date: z.string(),
  requestedCheckIn: z.string().nullable().optional(),
  requestedCheckOut: z.string().nullable().optional(),
  requestedStatus: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE']),
  reason: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  reviewedByUserId: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  employee: z.object({
    id: z.string(),
    employeeCode: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    departmentId: z.number(),
    department: z.object({
      id: z.number(),
      code: z.string(),
      name: z.string(),
    }),
  }),
  reviewedByUser: z
    .object({
      id: z.string(),
      email: z.string(),
      employee: z
        .object({
          firstName: z.string(),
          lastName: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

export type AttendanceCorrection = z.infer<typeof correctionRecordSchema>;

export interface PunchInput {
  source?: 'WEB' | 'MOBILE' | 'BIOMETRIC' | 'MANUAL';
  notes?: string;
}

export interface ManualRecordInput {
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: AttendanceStatusKey;
  notes?: string | null;
}

export interface CorrectionRequestInput {
  date: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  requestedStatus?: AttendanceStatusKey;
  reason: string;
}

export interface ReviewCorrectionInput {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string | null;
}

export interface ListAttendanceFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: number;
  employeeId?: string;
  status?: AttendanceStatusKey;
  page?: number;
  limit?: number;
}

export interface AttendanceSettings {
  workDayStart: string;
  workDayEnd: string;
  gracePeriodMinutes: number;
  halfDayHours: number;
  fullDayHours: number;
}

const oneAttendance = z.object({ data: attendanceRecordSchema.nullable() });
const oneCorrection = z.object({ data: correctionRecordSchema });
const listAttendanceResponse = z.object({
  data: z.array(attendanceRecordSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
const listCorrectionResponse = z.object({
  data: z.array(correctionRecordSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export async function punchAttendance(input: PunchInput = {}) {
  const res = await apiRequest('/attendance/punch', {
    method: 'POST',
    body: input,
  });
  return oneAttendance.parse(res).data;
}

export async function getTodayAttendance(): Promise<AttendanceRecord | null> {
  const res = await apiRequest('/attendance/today');
  return oneAttendance.parse(res).data;
}

export async function listAttendance(filters: ListAttendanceFilters = {}) {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.departmentId) params.set('departmentId', String(filters.departmentId));
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const url = `/attendance${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await apiRequest(url);
  return listAttendanceResponse.parse(res);
}

export async function recordManualAttendance(input: ManualRecordInput) {
  const res = await apiRequest('/attendance/record', {
    method: 'POST',
    body: input,
  });
  return oneAttendance.parse(res).data;
}

export async function requestAttendanceCorrection(input: CorrectionRequestInput) {
  const res = await apiRequest('/attendance/corrections', {
    method: 'POST',
    body: input,
  });
  return oneCorrection.parse(res).data;
}

export async function listAttendanceCorrections(filters: {
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const url = `/attendance/corrections${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await apiRequest(url);
  return listCorrectionResponse.parse(res);
}

export async function reviewAttendanceCorrection(id: string, input: ReviewCorrectionInput) {
  const res = await apiRequest(`/attendance/corrections/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return oneCorrection.parse(res).data;
}

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const res = await apiRequest('/attendance/settings');
  return (res as { data: AttendanceSettings }).data;
}

export async function updateAttendanceSettings(input: AttendanceSettings): Promise<AttendanceSettings> {
  const res = await apiRequest('/attendance/settings', {
    method: 'PUT',
    body: input,
  });
  return (res as { data: AttendanceSettings }).data;
}
