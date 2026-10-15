// Substitution rules that need no database (features/SMART_SUBSTITUTION.md).

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
] as const;
// A half-day's morning ends at lunch (frontend/DESIGN.md: lunch after period 4).
const AFTERNOON_FROM = '13:00';

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const weekdayOf = (date: Date) => WEEKDAYS[date.getUTCDay()]!;

/** Working dates of a leave (Sundays skipped), as YYYY-MM-DD. */
export function leaveDates(start: Date, end: Date) {
  const dates: string[] = [];
  for (let at = start.getTime(); at <= end.getTime(); at += DAY_MS) {
    const day = new Date(at);
    if (day.getUTCDay() !== 0) dates.push(isoDate(day));
  }
  return dates;
}

/**
 * Whether a class falls in the half of the day a half-day leave covers:
 * FIRST is the morning, SECOND the afternoon.
 */
export function inHalf(
  half: 'FIRST' | 'SECOND' | null,
  entry: { startPeriod: number; endPeriod: number },
  periodStarts: Map<number, string>,
) {
  if (!half) return true;
  if (half === 'FIRST') {
    return (periodStarts.get(entry.startPeriod) ?? '') < AFTERNOON_FROM;
  }
  return (periodStarts.get(entry.endPeriod) ?? '') >= AFTERNOON_FROM;
}

/** Monday and Sunday of the week holding `date`. */
export function weekOf(date: Date) {
  const monday = new Date(
    date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS,
  );
  return { monday, sunday: new Date(monday.getTime() + 6 * DAY_MS) };
}

export const overlaps = (
  a: { startPeriod: number; endPeriod: number },
  b: { startPeriod: number; endPeriod: number },
) => a.startPeriod <= b.endPeriod && b.startPeriod <= a.endPeriod;

export interface CandidateFacts {
  teachesSubject: boolean;
  /** Teaches a subject of the same kind (theory or lab) in the department. */
  teachesSameKindInDepartment: boolean;
  /** No class in the period just before or after. */
  freeAround: boolean;
  sameDepartment: boolean;
  /** Weekly hours including this class and other substitutions that week. */
  hoursAfter: number;
  maxHours: number | null;
  experienceYears: number | null;
}

/** The visible 35/25/15/15/10 rubric, out of 100. */
export const RUBRIC = {
  subject: 35,
  availability: 25,
  department: 15,
  workload: 15,
  experience: 10,
} as const;

export function scoreCandidate(facts: CandidateFacts) {
  const points = {
    subject: facts.teachesSubject
      ? RUBRIC.subject
      : facts.teachesSameKindInDepartment
        ? 15
        : 0,
    availability: facts.freeAround ? RUBRIC.availability : 12,
    department: facts.sameDepartment ? RUBRIC.department : 5,
    // More hours left under the weekly maximum earn more; no band: midway.
    workload:
      facts.maxHours === null || facts.maxHours === 0
        ? 7
        : Math.round(
            (RUBRIC.workload * Math.max(0, facts.maxHours - facts.hoursAfter)) /
              facts.maxHours,
          ),
    experience: Math.min(
      RUBRIC.experience,
      Math.max(0, facts.experienceYears ?? 0),
    ),
  };
  const total = Object.values(points).reduce((sum, value) => sum + value, 0);
  return { points, total };
}
