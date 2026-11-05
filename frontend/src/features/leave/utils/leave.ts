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

/** Format annual entitlement: fixed number or "As per policy" (never "Unlimited"). */
export function formatEntitlement(quota: number | null | undefined): string {
  if (quota === null || quota === undefined) return 'As per policy';
  return `${quota} ${quota === 1 ? 'day' : 'days'}`;
}

/** Format remaining balance: returns "As per policy" for unmetered/rule-based categories. */
export function formatRemaining(
  remaining: number | null | undefined,
  entitled: number | null | undefined,
): string {
  if (
    remaining === null ||
    remaining === undefined ||
    entitled === null ||
    entitled === undefined
  ) {
    return 'As per policy';
  }
  return `${remaining} remaining`;
}

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

/**
 * Approved Restricted Holiday (RH) calendar for JCET Hubballi.
 */
export interface RestrictedHolidayOption {
  id: string;
  name: string;
  date: string;
  dayOfWeek: string;
}

export const JCET_RESTRICTED_HOLIDAYS: readonly RestrictedHolidayOption[] = [
  {
    id: 'rh-shivaratri',
    name: 'Maha Shivaratri',
    date: '2026-02-16',
    dayOfWeek: 'Monday',
  },
  {
    id: 'rh-ugadi',
    name: 'Chandramana Ugadi',
    date: '2026-03-20',
    dayOfWeek: 'Friday',
  },
  {
    id: 'rh-good-friday',
    name: 'Good Friday',
    date: '2026-04-03',
    dayOfWeek: 'Friday',
  },
  {
    id: 'rh-varamahalakshmi',
    name: 'Varamahalakshmi Vrata',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
  },
  {
    id: 'rh-janmashtami',
    name: 'Krishna Janmashtami',
    date: '2026-09-04',
    dayOfWeek: 'Friday',
  },
  {
    id: 'rh-guru-nanak',
    name: 'Guru Nanak Jayanti',
    date: '2026-11-24',
    dayOfWeek: 'Tuesday',
  },
  {
    id: 'rh-christmas-eve',
    name: 'Christmas Eve',
    date: '2026-12-24',
    dayOfWeek: 'Thursday',
  },
];

/**
 * Institutional vacation windows declared by JCET Hubballi / VTU.
 */
export interface VacationPeriodOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
}

export const JCET_VACATION_PERIODS: readonly VacationPeriodOption[] = [
  {
    id: 'vac-summer-2026',
    name: 'Even Semester Summer Vacation 2026',
    startDate: '2026-06-15',
    endDate: '2026-07-15',
    description:
      'Annual summer vacation for eligible teaching faculty upon completion of semester exams.',
  },
  {
    id: 'vac-winter-2026',
    name: 'Odd Semester Winter Vacation 2026',
    startDate: '2026-12-15',
    endDate: '2026-12-31',
    description: 'Winter vacation between odd and even semesters.',
  },
];

/** Official Duty options for On Official Duty (OOD). */
export const OOD_DUTY_TYPES = [
  'VTU Academic Work',
  'University Examination Work',
  'Official Academic Meeting',
  'Institutional Representation',
  'Academic Committee Duty',
  'Official Conference / Workshop',
  'Official Institutional Visit',
] as const;

/** Examination duty options for Official Duty / Examination Duty (ODE). */
export const ODE_DUTY_TYPES = [
  'VTU Examination Invigilation',
  'Central Valuation / Evaluation',
  'Flying Squad / Special Squad',
  'External Lab Examiner',
  'Deputy Chief Superintendent',
] as const;

/**
 * JCET Leave Color Badges & Tokens:
 * CL: Blue / Indigo
 * EL: Violet
 * SPL_ML: Rose / Coral
 * OOD: Green / Teal
 * ODE: Cyan / Teal
 * RH: Amber
 * VL: Sky / Cyan
 */
export const LEAVE_TYPE_THEMES: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
    dotColor: string;
  }
> = {
  CL: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    badgeVariant: 'outline',
    dotColor: '#2563eb',
  },
  EL: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    badgeVariant: 'outline',
    dotColor: '#7c3aed',
  },
  SPL_ML: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    badgeVariant: 'outline',
    dotColor: '#e11d48',
  },
  OOD: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeVariant: 'outline',
    dotColor: '#059669',
  },
  ODE: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    badgeVariant: 'outline',
    dotColor: '#0891b2',
  },
  RH: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    badgeVariant: 'outline',
    dotColor: '#d97706',
  },
  VL: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    badgeVariant: 'outline',
    dotColor: '#0284c7',
  },
};

export function getLeaveTheme(code: string) {
  return (
    LEAVE_TYPE_THEMES[code] ?? {
      bg: 'bg-muted/50',
      text: 'text-foreground',
      border: 'border-border',
      badgeVariant: 'outline',
      dotColor: '#64748b',
    }
  );
}

/** Attendance status mapped to each leave category. */
export const LEAVE_ATTENDANCE_STATUS: Record<string, string> = {
  CL: 'Leave',
  EL: 'Leave',
  SPL_ML: 'Medical / Special Leave',
  OOD: 'Official Duty',
  ODE: 'Official / Examination Duty',
  RH: 'Restricted Holiday',
  VL: 'Vacation Leave',
};

/**
 * Working days the server will count (Monday–Saturday, excluding campus
 * holidays), for a preview while applying.
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

export interface AcademicTimelineEvent {
  id: string;
  title: string;
  date: string;
  category: 'EXAM' | 'HOLIDAY' | 'ACADEMIC' | 'EVENT';
  detail: string;
  description?: string;
}

export const ACADEMIC_TIMELINE_EVENTS: AcademicTimelineEvent[] = [
  {
    id: 'cie-1',
    title: 'Continuous Internal Evaluation (CIE-I)',
    date: '2026-03-09 to 2026-03-12',
    category: 'EXAM',
    detail: 'Internal assessment for odd & even semester courses.',
  },
  {
    id: 'tech-symp',
    title: 'JCET TechSparks Annual Technical Symposium',
    date: '2026-04-10',
    category: 'EVENT',
    detail: 'State-level technical paper & coding competition.',
  },
  {
    id: 'cie-2',
    title: 'Continuous Internal Evaluation (CIE-II)',
    date: '2026-05-18 to 2026-05-21',
    category: 'EXAM',
    detail: 'Second internal test & lab examination review.',
  },
  {
    id: 'vtu-theory',
    title: 'VTU Semester End Examinations (Theory)',
    date: '2026-06-15 to 2026-07-04',
    category: 'EXAM',
    detail: 'University final theory examination & central evaluation.',
  },
  {
    id: 'vtu-lab',
    title: 'VTU Practical / Laboratory Examinations',
    date: '2026-07-06 to 2026-07-18',
    category: 'EXAM',
    detail: 'External lab exam invigilation & practical assessment.',
  },
  {
    id: 'summer-vac',
    title: 'Summer Vacation Period',
    date: '2026-07-01 to 2026-07-31',
    category: 'ACADEMIC',
    detail: 'Eligible faculty vacation window as per JCET regulations.',
  },
];
