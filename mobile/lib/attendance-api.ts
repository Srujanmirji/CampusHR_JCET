import { z } from 'zod';
import { ApiError, apiFetch, type AuthUser } from './session';
import { attendanceSchema, homeUnavailable } from './home-api';

export const statuses = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
  'LATE',
] as const;
const timestamp = z.iso.datetime({ offset: true });
export const recordSchema = attendanceSchema.extend({
  id: z.uuid(),
  source: z.enum(['WEB', 'MOBILE', 'BIOMETRIC', 'MANUAL']),
  notes: z.string().nullable(),
});
const correctionSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
  date: timestamp,
  requestedCheckIn: timestamp.nullable(),
  requestedCheckOut: timestamp.nullable(),
  requestedStatus: z.enum(statuses),
  reason: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reviewNote: z.string().nullable(),
  createdAt: timestamp,
});
const metaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});
export type AttendanceRecord = z.infer<typeof recordSchema>;
export type Correction = z.infer<typeof correctionSchema>;
export function attendanceDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
export function monthRange(month: string) {
  z.string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .parse(month);
  const end = new Date(`${month}-01T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return { startDate: `${month}-01`, endDate: end.toISOString().slice(0, 10) };
}
export function shiftMonth(month: string, offset: number) {
  monthRange(month);
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
function own(
  user: AuthUser | null,
  token: string | null,
  permission = 'attendance.read',
) {
  const reason = homeUnavailable(user, token, permission);
  if (reason) throw new Error(reason);
  return user!.employeeId!;
}
function checkOwner<T extends { employeeId: string }>(
  record: T,
  employeeId: string,
): T {
  if (record.employeeId !== employeeId)
    throw new Error('Attendance response belongs to another employee.');
  return record;
}
export async function getAttendanceToday(
  user: AuthUser | null,
  token: string | null,
  date = attendanceDay(),
) {
  const employeeId = own(user, token);
  const response = await apiFetch('/attendance/today');
  const { data } = z
    .object({ data: recordSchema.nullable() })
    .parse(await response.json());
  if (data && data.date.slice(0, 10) !== date)
    throw new Error('Attendance day changed. Refresh the screen.');
  return data ? checkOwner(data, employeeId) : null;
}
export async function getAttendanceHistory(
  user: AuthUser | null,
  token: string | null,
  month: string,
) {
  const employeeId = own(user, token);
  const range = monthRange(month);
  const response = await apiFetch(
    `/attendance?${new URLSearchParams({ ...range, employeeId, page: '1', limit: '50' })}`,
  );
  const result = z
    .object({ data: z.array(recordSchema), meta: metaSchema })
    .parse(await response.json());
  if (result.meta.totalPages > 1 || result.meta.page !== 1)
    throw new Error('The server did not return the full attendance month.');
  for (const record of result.data) {
    checkOwner(record, employeeId);
    if (record.date.slice(0, 7) !== month)
      throw new Error('Attendance record is outside the selected month.');
  }
  return result.data;
}
export async function getAttendanceCorrections(
  user: AuthUser | null,
  token: string | null,
  page = 1,
) {
  const employeeId = own(user, token);
  z.number().int().positive().parse(page);
  const response = await apiFetch(
    `/attendance/corrections?${new URLSearchParams({ employeeId, page: String(page), limit: '10' })}`,
  );
  const result = z
    .object({ data: z.array(correctionSchema), meta: metaSchema })
    .parse(await response.json());
  if (result.meta.page !== page)
    throw new Error('The server returned another request page.');
  result.data.forEach((record) => checkOwner(record, employeeId));
  return result;
}
export async function getAttendancePolicy(
  user: AuthUser | null,
  token: string | null,
) {
  own(user, token);
  const response = await apiFetch('/attendance/settings');
  const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
  return z
    .object({
      data: z.object({
        workDayStart: time,
        workDayEnd: time,
        gracePeriodMinutes: z.number().nonnegative(),
        halfDayHours: z.number().positive(),
        fullDayHours: z.number().positive(),
      }),
    })
    .parse(await response.json()).data;
}
export const correctionInputSchema = z
  .object({
    date: z.iso.date(),
    checkIn: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .or(z.literal('')),
    checkOut: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .or(z.literal('')),
    requestedStatus: z.enum(statuses),
    reason: z
      .string()
      .trim()
      .min(3, 'Give a reason with at least 3 characters.')
      .max(500, 'Keep the reason within 500 characters.'),
  })
  .superRefine((value, context) => {
    if (value.date > attendanceDay())
      context.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'Choose today or an earlier attendance date.',
      });
    if (value.checkOut && (!value.checkIn || value.checkOut <= value.checkIn))
      context.addIssue({
        code: 'custom',
        path: ['checkOut'],
        message: 'Check-out must be later than check-in.',
      });
    if (
      ['PRESENT', 'LATE', 'HALF_DAY'].includes(value.requestedStatus) &&
      !value.checkIn
    )
      context.addIssue({
        code: 'custom',
        path: ['checkIn'],
        message: 'Enter the requested check-in time.',
      });
  });
export type CorrectionInput = z.infer<typeof correctionInputSchema>;
let writing = false;
async function write(path: string, body: unknown) {
  if (writing)
    throw new ApiError(
      409,
      'WRITE_PENDING',
      'Another attendance action is still pending.',
    );
  writing = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timeout);
    writing = false;
  }
}
export async function punchAttendance(
  user: AuthUser | null,
  token: string | null,
  action: 'CHECK_IN' | 'CHECK_OUT',
  date = attendanceDay(),
) {
  const employeeId = own(user, token, 'attendance.check_in');
  z.enum(['CHECK_IN', 'CHECK_OUT']).parse(action);
  z.iso.date().parse(date);
  const raw = await write('/attendance/punch', {
    source: 'MOBILE',
    action,
    date,
  });
  const { data } = z.object({ data: recordSchema }).parse(raw);
  checkOwner(data, employeeId);
  if (
    data.date.slice(0, 10) !== date ||
    !data.checkIn ||
    (action === 'CHECK_OUT' && !data.checkOut)
  )
    throw new Error(
      'The server did not confirm the requested punch. Refresh attendance.',
    );
  return data;
}
export async function requestAttendanceCorrection(
  user: AuthUser | null,
  token: string | null,
  input: CorrectionInput,
) {
  const employeeId = own(user, token, 'attendance_correction.request');
  const value = correctionInputSchema.parse(input);
  const body = {
    date: value.date,
    requestedCheckIn: value.checkIn
      ? `${value.date}T${value.checkIn}:00.000Z`
      : null,
    requestedCheckOut: value.checkOut
      ? `${value.date}T${value.checkOut}:00.000Z`
      : null,
    requestedStatus: value.requestedStatus,
    reason: value.reason,
  };
  const raw = await write('/attendance/corrections', body);
  const { data } = z.object({ data: correctionSchema }).parse(raw);
  checkOwner(data, employeeId);
  if (
    data.date.slice(0, 10) !== value.date ||
    data.status !== 'PENDING' ||
    data.requestedCheckIn !== body.requestedCheckIn ||
    data.requestedCheckOut !== body.requestedCheckOut ||
    data.requestedStatus !== body.requestedStatus ||
    data.reason !== body.reason
  )
    throw new Error('The server did not confirm a pending correction request.');
  return data;
}
export const uncertainWrite = (error: unknown) =>
  !(
    error instanceof ApiError &&
    [400, 401, 403, 404, 409, 422, 429].includes(error.status)
  );
export function recordedDuration(
  record: Pick<AttendanceRecord, 'checkIn' | 'checkOut'>,
) {
  if (!record.checkIn || !record.checkOut) return null;
  const minutes = Math.floor(
    (Date.parse(record.checkOut) - Date.parse(record.checkIn)) / 60_000,
  );
  if (minutes < 0) return null;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
