import type { Period } from '@/features/timetable/api/timetable';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
export const formatClassDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00Z`));

/** "10:00–10:50" for the periods a class spans; period numbers if unknown. */
export function classTime(
  entry: { startPeriod: number; endPeriod: number },
  periods: Period[] | undefined,
) {
  const start = periods?.find((period) => period.number === entry.startPeriod);
  const end = periods?.find((period) => period.number === entry.endPeriod);
  if (!start || !end) {
    return entry.startPeriod === entry.endPeriod
      ? `Period ${entry.startPeriod}`
      : `Periods ${entry.startPeriod}–${entry.endPeriod}`;
  }
  return `${start.startTime}–${end.endTime}`;
}

export const cohort = (entry: {
  department: { code: string };
  semester: number;
  section: string;
  batch: string | null;
}) =>
  `${entry.department.code} ${entry.semester}${entry.section}${entry.batch ? ` (${entry.batch})` : ''}`;
