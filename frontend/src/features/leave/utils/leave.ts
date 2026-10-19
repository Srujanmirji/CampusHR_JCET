import type { LeaveRequest } from '../api/leave';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
export const formatLeaveDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00Z`));

/** "12 Oct 2026", "12 Oct 2026 – 14 Oct 2026" or "12 Oct 2026 (first half)". */
export function leaveDates(
  request: Pick<LeaveRequest, 'startDate' | 'endDate' | 'halfDay'>,
) {
  const start = formatLeaveDate(request.startDate);
  if (request.halfDay) {
    return `${start} (${request.halfDay === 'FIRST' ? 'first' : 'second'} half)`;
  }
  return request.startDate === request.endDate
    ? start
    : `${start} – ${formatLeaveDate(request.endDate)}`;
}

export const formatDays = (days: number) =>
  `${days} ${days === 1 ? 'day' : 'days'}`;

/**
 * Working days the server will count (Monday–Saturday), for a preview while
 * applying. The server's count is the one that is saved.
 */
export function previewDays(start: string, end: string, halfDay: boolean) {
  if (!start || !end || end < start) return 0;
  const first = new Date(`${start}T00:00:00Z`);
  if (halfDay) return first.getUTCDay() === 0 ? 0 : 0.5;
  let days = 0;
  for (
    let at = first.getTime();
    at <= new Date(`${end}T00:00:00Z`).getTime();
    at += 86_400_000
  ) {
    if (new Date(at).getUTCDay() !== 0) days += 1;
  }
  return days;
}

/** Whether the signed-in user decides this request next. */
export function isMyTurn(
  request: LeaveRequest,
  user: {
    role: string;
    employeeId: string | null;
    departmentId: number | null;
  },
) {
  return (
    request.status === 'PENDING' &&
    request.pendingRole === user.role &&
    request.employee.id !== user.employeeId &&
    (user.role !== 'HOD' || request.department.id === user.departmentId)
  );
}

export const thisMonth = () => new Date().toISOString().slice(0, 7);

/** YYYY-MM moved by `delta` months. */
export function shiftMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
