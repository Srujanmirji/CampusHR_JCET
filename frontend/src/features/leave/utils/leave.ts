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

/** Institutional holidays observed at JCET Hubballi (`MM-DD`). */
export const CAMPUS_HOLIDAYS: Readonly<Record<string, string>> = {
  '01-26': 'Republic Day',
  '05-01': 'May Day',
  '08-15': 'Independence Day',
  '10-02': 'Gandhi Jayanti',
  '11-01': 'Karnataka Rajyotsava',
  '12-25': 'Christmas',
};

export const holidayName = (iso: string): string | undefined =>
  CAMPUS_HOLIDAYS[iso] ?? CAMPUS_HOLIDAYS[iso.slice(5)];

export interface AcademicTimelineEvent {
  id: string;
  date: string;
  title: string;
  category: 'EXAM' | 'HOLIDAY' | 'ACADEMIC' | 'EVENT';
  detail: string;
}

export const ACADEMIC_TIMELINE_EVENTS: readonly AcademicTimelineEvent[] = [
  {
    id: 'cie-1',
    date: '2026-09-14 – 2026-09-16',
    title: 'VTU CIE-1 Internal Assessment',
    category: 'EXAM',
    detail:
      'First Continuous Internal Evaluation across Semesters 3, 5, and 7.',
  },
  {
    id: 'gandhi-jayanti',
    date: '2026-10-02',
    title: 'Gandhi Jayanti',
    category: 'HOLIDAY',
    detail: 'National Holiday · Campus closed (excluded from leave count).',
  },
  {
    id: 'cie-2',
    date: '2026-10-26 – 2026-10-28',
    title: 'VTU CIE-2 Internal Assessment',
    category: 'EXAM',
    detail: 'Second Continuous Internal Evaluation & portion review.',
  },
  {
    id: 'rajyotsava',
    date: '2026-11-01',
    title: 'Karnataka Rajyotsava',
    category: 'HOLIDAY',
    detail: 'State Holiday · JCET Hubballi campus celebration.',
  },
  {
    id: 'cie-3',
    date: '2026-11-23 – 2026-11-25',
    title: 'VTU CIE-3 & Lab Internals',
    category: 'EXAM',
    detail: 'Final IA tests and laboratory internal practical evaluations.',
  },
  {
    id: 'last-working-day',
    date: '2026-12-05',
    title: 'Odd Semester Last Working Day',
    category: 'ACADEMIC',
    detail: 'Final IA marks freeze and attendance shortage submission to VTU.',
  },
  {
    id: 'christmas',
    date: '2026-12-25',
    title: 'Christmas',
    category: 'HOLIDAY',
    detail: 'Public Holiday · Campus closed (excluded from leave count).',
  },
];

/**
 * Working days the server will count (Monday–Saturday, excluding campus
 * holidays), for a preview while applying. The server's count is the one that
 * is saved.
 */
export function previewDays(start: string, end: string, halfDay: boolean) {
  if (!start || !end || end < start) return 0;
  const first = new Date(`${start}T00:00:00Z`);
  if (halfDay) {
    return first.getUTCDay() === 0 || Boolean(holidayName(start)) ? 0 : 0.5;
  }
  let days = 0;
  for (
    let at = first.getTime();
    at <= new Date(`${end}T00:00:00Z`).getTime();
    at += 86_400_000
  ) {
    const current = new Date(at);
    const iso = current.toISOString().slice(0, 10);
    if (current.getUTCDay() !== 0 && !holidayName(iso)) days += 1;
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
