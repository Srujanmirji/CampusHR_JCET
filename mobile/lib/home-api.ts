import { z } from 'zod';
import { apiFetch, type AuthUser } from './session';
import {
  getPeriods,
  getTimetableEntries,
  type DayOfWeek,
} from './timetable-api';

export function canReadHome(user: AuthUser | null, permission: string) {
  return !!user?.permissions.some(
    (grant) =>
      grant === permission ||
      ['own', 'department', 'all'].some(
        (scope) => grant === `${permission}.${scope}`,
      ),
  );
}
export function homeUnavailable(
  user: AuthUser | null,
  token: string | null,
  permission: string,
) {
  if (!user || !token) return 'Sign in to view your summary.';
  if (token.startsWith('demo-'))
    return 'Sign in with a real account to view this summary.';
  if (permission !== 'notification.read' && !user.employeeId)
    return 'Link an employee record to view your personal summary.';
  if (!canReadHome(user, permission))
    return 'This summary is not available for your account.';
  return null;
}
function requireHome(
  user: AuthUser | null,
  token: string | null,
  permission: string,
) {
  const reason = homeUnavailable(user, token, permission);
  if (reason) throw new Error(reason);
  return user!;
}
const timestamp = z.iso.datetime({ offset: true });
export const attendanceSchema = z.object({
  employeeId: z.uuid(),
  date: timestamp,
  checkIn: timestamp.nullable(),
  checkOut: timestamp.nullable(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE']),
});
const balanceSchema = z.object({
  leaveType: z.object({
    id: z.number().int(),
    code: z.string(),
    name: z.string(),
  }),
  active: z.boolean(),
  year: z.number().int(),
  remaining: z.number().nullable(),
  pending: z.number().nonnegative(),
});
const workloadSchema = z.object({
  faculty: z.object({ id: z.uuid() }),
  totalHours: z.number().nonnegative(),
  minHours: z.number().nonnegative().nullable(),
  maxHours: z.number().nonnegative().nullable(),
  status: z.enum(['UNDERLOADED', 'NORMAL', 'OVERLOADED']).nullable(),
});
export const notificationSchema = z.object({
  kind: z.string().min(1),
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  readAt: timestamp.nullable(),
  createdAt: timestamp,
});
export async function getHomeAttendance(
  user: AuthUser | null,
  token: string | null,
  date: string,
) {
  const own = requireHome(user, token, 'attendance.read');
  const response = await apiFetch('/attendance/today');
  const { data } = z
    .object({ data: attendanceSchema.nullable() })
    .parse(await response.json());
  if (data && data.employeeId !== own.employeeId)
    throw new Error('Attendance does not belong to your employee record.');
  if (data && data.date.slice(0, 10) !== date)
    throw new Error(
      'Attendance returned a different date. Refresh later or check attendance on the web.',
    );
  return data;
}
export async function getHomeBalances(
  user: AuthUser | null,
  token: string | null,
  year: number,
) {
  const own = requireHome(user, token, 'leave.read');
  const response = await apiFetch(
    `/leave/balances?${new URLSearchParams({ employeeId: own.employeeId!, year: String(year) })}`,
  );
  const { data } = z
    .object({ data: z.array(balanceSchema) })
    .parse(await response.json());
  if (data.some((row) => row.year !== year))
    throw new Error('Leave balances are for a different year.');
  return data.filter((row) => row.active);
}
export async function getHomeWorkload(
  user: AuthUser | null,
  token: string | null,
) {
  const own = requireHome(user, token, 'workload.read');
  const response = await apiFetch(
    `/workload/faculty/${encodeURIComponent(own.employeeId!)}`,
  );
  const { data } = z
    .object({ data: workloadSchema })
    .parse(await response.json());
  if (data.faculty.id !== own.employeeId)
    throw new Error('Workload does not belong to your employee record.');
  return data;
}
export async function getHomeNotifications(
  user: AuthUser | null,
  token: string | null,
) {
  requireHome(user, token, 'notification.read');
  const response = await apiFetch('/notifications?limit=3');
  return z
    .object({ data: z.array(notificationSchema).max(3), hasMore: z.boolean() })
    .parse(await response.json()).data;
}
export async function getHomeUnread(
  user: AuthUser | null,
  token: string | null,
) {
  requireHome(user, token, 'notification.read');
  const response = await apiFetch('/notifications/unread-count');
  return z
    .object({ data: z.object({ count: z.number().int().nonnegative() }) })
    .parse(await response.json()).data.count;
}
export async function getHomeSchedule(
  user: AuthUser | null,
  token: string | null,
  day: DayOfWeek | null,
) {
  requireHome(user, token, 'timetable.read');
  if (!day) return { periods: [], entries: [] };
  const [periods, entries] = await Promise.all([
    getPeriods(token),
    getTimetableEntries(token, { day, facultyId: user!.employeeId! }),
  ]);
  if (entries.some((entry) => entry.faculty.id !== user!.employeeId))
    throw new Error('Schedule does not belong to your employee record.');
  if (
    entries.some(
      (entry) =>
        !periods.some((period) => period.number === entry.startPeriod) ||
        !periods.some((period) => period.number === entry.endPeriod),
    )
  )
    throw new Error('Period timings are missing. Refresh your schedule.');
  return { periods, entries };
}

// Only protected native destinations; ignore server query strings and never open arbitrary URLs.
export function homeNotificationRoute(
  link: string | null,
  user: AuthUser | null,
):
  | '/(tabs)/leave'
  | '/(tabs)/timetable'
  | '/(tabs)/attendance'
  | '/(tabs)/profile'
  | null {
  if (!user?.employeeId) return null;
  const path = link?.split('?')[0];
  if (
    path === '/substitution' &&
    canReadHome(user, 'substitution.read') &&
    canReadHome(user, 'timetable.read')
  )
    return '/(tabs)/timetable';
  if (path === '/leave' && canReadHome(user, 'leave.read'))
    return '/(tabs)/leave';
  if (path === '/documents' && canReadHome(user, 'document.read'))
    return '/(tabs)/profile';
  if (path === '/attendance' && canReadHome(user, 'attendance.read'))
    return '/(tabs)/attendance';
  if (path === '/timetable' && canReadHome(user, 'timetable.read'))
    return '/(tabs)/timetable';
  return null;
}

export function campusClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === name)!.value;
  const weekday = part('weekday').toUpperCase();
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    year: Number(part('year')),
    day: weekday === 'SUN' ? null : (weekday as DayOfWeek),
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}
