import { z } from 'zod';
import { apiFetch, type AuthUser } from './session';
import { campusClock, getHomeSchedule, homeUnavailable } from './home-api';
import {
  entrySchema,
  type PeriodDto,
  type TimetableEntryDto,
  type DayOfWeek,
} from './timetable-api';

const dateSchema = z.iso.date();
const personSchema = z.object({
  id: z.uuid(),
  employeeCode: z.string(),
  name: z.string(),
});
const dutySchema = z.object({
  id: z.uuid(),
  kind: z.literal('SUBSTITUTE'),
  date: dateSchema,
  substitute: personSchema,
  coveringFor: personSchema,
  note: z.string().nullable(),
  assignedAt: z.iso.datetime({ offset: true }),
  entry: entrySchema,
});
export type DatedDuty = z.infer<typeof dutySchema>;
export function dayForDate(date: string): DayOfWeek | null {
  dateSchema.parse(date);
  const index = new Date(`${date}T12:00:00Z`).getUTCDay();
  return ([null, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const)[index];
}
export function weekDates(date: string, offset = 0) {
  dateSchema.parse(date);
  const start = new Date(`${date}T12:00:00Z`);
  start.setUTCDate(
    start.getUTCDate() - ((start.getUTCDay() + 6) % 7) + offset * 7,
  );
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}
export async function getOwnSchedule(
  user: AuthUser | null,
  token: string | null,
  date: string,
) {
  return getHomeSchedule(user, token, dayForDate(date));
}
export async function getDatedDuties(
  user: AuthUser | null,
  token: string | null,
) {
  const reason = homeUnavailable(user, token, 'substitution.read');
  if (reason) throw new Error(reason);
  const response = await apiFetch('/substitution/mine');
  const { data } = z
    .object({ data: z.array(dutySchema) })
    .parse(await response.json());
  if (data.some((duty) => duty.substitute.id !== user!.employeeId))
    throw new Error('Duties do not belong to your employee record.');
  if (data.some((duty) => dayForDate(duty.date) !== duty.entry.day))
    throw new Error(
      'A duty date does not match its timetable day. Refresh or contact your HOD.',
    );
  return data;
}
export function mergeDatedDuties(
  entries: TimetableEntryDto[],
  duties: DatedDuty[],
  date: string,
  periods: PeriodDto[],
): TimetableEntryDto[] {
  const day = dayForDate(date);
  const dated = [
    ...new Map(
      duties
        .filter((duty) => duty.date === date)
        .map((duty) => [duty.id, duty]),
    ).values(),
  ];
  if (
    dated.some(
      (duty) =>
        !periods.some((p) => p.number === duty.entry.startPeriod) ||
        !periods.some((p) => p.number === duty.entry.endPeriod),
    )
  )
    throw new Error(
      'Duty period timings are missing. Refresh or contact your HOD.',
    );
  return [
    ...entries.filter((entry) => entry.day === day),
    ...dated.map((duty) => ({
      ...duty.entry,
      id: `duty-${duty.id}`,
      dutyDate: duty.date,
      isSubstitute: true,
      substituteNote: `Covering ${duty.coveringFor.name}${duty.note ? ` · ${duty.note}` : ''}`,
    })),
  ].sort((a, b) => a.startPeriod - b.startPeriod || a.id.localeCompare(b.id));
}
export function classStatus(
  date: string,
  start: number,
  end: number,
  now = campusClock(),
): string | null {
  if (date !== now.date) return null;
  return now.minutes >= end
    ? 'Completed'
    : now.minutes >= start
      ? 'In progress'
      : 'Upcoming';
}
