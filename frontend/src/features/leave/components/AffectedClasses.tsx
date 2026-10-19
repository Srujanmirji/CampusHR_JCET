import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { listEntries, type Day } from '@/features/timetable/api/timetable';
import type { LeaveRequest } from '../api/leave';
import { formatLeaveDate } from '../utils/leave';

const WEEKDAYS: (Day | null)[] = [
  null,
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];

/** Classes the applicant teaches on the days of their leave. */
export function AffectedClasses({ request }: { request: LeaveRequest }) {
  const entries = useQuery({
    queryKey: ['timetable', 'entries', { facultyId: request.employee.id }],
    queryFn: () => listEntries({ facultyId: request.employee.id }),
  });
  if (entries.isPending) return <Skeleton className="h-16 w-full" />;
  if (entries.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn’t load the timetable for this leave.
      </p>
    );
  }
  const classes: { date: string; entry: (typeof entries.data)[number] }[] = [];
  for (
    let at = new Date(`${request.startDate}T00:00:00Z`);
    at <= new Date(`${request.endDate}T00:00:00Z`);
    at = new Date(at.getTime() + 86_400_000)
  ) {
    const day = WEEKDAYS[at.getUTCDay()];
    for (const entry of entries.data) {
      if (entry.day === day) {
        classes.push({ date: at.toISOString().slice(0, 10), entry });
      }
    }
  }

  return (
    <section aria-labelledby="leave-impact" className="flex flex-col gap-2">
      <h3 id="leave-impact" className="text-sm font-semibold">
        Academic Impact
      </h3>
      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No classes in the timetable on these days.
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm text-warning-ink">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            {classes.length} {classes.length === 1 ? 'class' : 'classes'}{' '}
            affected
            {request.halfDay ? ' that day (check which half)' : ''}
          </p>
          <ul className="flex flex-col divide-y rounded-lg border">
            {classes.map(({ date, entry }) => (
              <li
                key={`${date}-${entry.id}`}
                className="grid grid-cols-[6.5rem_1fr] gap-3 p-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {formatLeaveDate(date)}
                  <span className="block text-xs">
                    {entry.startPeriod === entry.endPeriod
                      ? `Period ${entry.startPeriod}`
                      : `Periods ${entry.startPeriod}–${entry.endPeriod}`}
                  </span>
                </span>
                <span>
                  <span className="font-medium">{entry.subject.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {entry.subject.code} · {entry.department.code}{' '}
                    {entry.semester}
                    {entry.section}
                    {entry.batch ? ` (${entry.batch})` : ''} · {entry.room.name}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
