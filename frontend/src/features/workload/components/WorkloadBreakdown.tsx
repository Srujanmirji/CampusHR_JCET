import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { DAYS } from '@/features/timetable/api/timetable';
import { bandLabel, facultyWorkloadQuery } from '../api/workload';
import { LoadBadge } from './LoadBadge';

const periods = (start: number, end: number) =>
  start === end ? `P${start}` : `P${start}–${end}`;

/** One faculty member's weekly load and the classes behind it. */
export function WorkloadBreakdown({ facultyId }: { facultyId: string }) {
  const workload = useQuery(facultyWorkloadQuery(facultyId));
  const data = workload.data;

  return (
    <div className="flex flex-col gap-6">
      {workload.isError ? (
        <EmptyState
          title="Couldn’t load this workload"
          description={workload.error.message}
          actionLabel="Try again"
          onAction={() => void workload.refetch()}
        />
      ) : !data ? (
        <div
          role="status"
          aria-label="Loading workload"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <section aria-label="Weekly load">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-3xl font-semibold tabular-nums">
                {data.totalHours}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  hours a week
                </span>
              </p>
              <LoadBadge status={data.status} />
            </div>
            <progress
              className="workload-meter mt-3"
              value={Math.min(
                data.totalHours,
                data.maxHours ?? data.totalHours,
              )}
              max={data.maxHours ?? Math.max(data.totalHours, 1)}
              aria-label={`${data.totalHours} of ${data.maxHours ?? '—'} maximum hours`}
            />
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Theory</dt>
                <dd className="font-medium tabular-nums">
                  {data.theoryHours} h
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lab</dt>
                <dd className="font-medium tabular-nums">{data.labHours} h</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Band</dt>
                <dd className="font-medium tabular-nums">
                  {bandLabel(data.minHours, data.maxHours)}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="workload-classes">
            <h3 id="workload-classes" className="mb-2 text-sm font-semibold">
              Classes
            </h3>
            {data.classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes in the timetable yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-lg border">
                {data.classes.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[4.5rem_1fr_auto] items-start gap-3 p-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {DAYS[entry.day].slice(0, 3)}{' '}
                      {periods(entry.startPeriod, entry.endPeriod)}
                    </span>
                    <span>
                      <span className="font-mono font-semibold">
                        {entry.subject.code}
                      </span>{' '}
                      {entry.subject.name}
                      <span className="block text-xs text-muted-foreground">
                        {entry.department.code} {entry.semester}
                        {entry.section}
                        {entry.batch ? ` (${entry.batch})` : ''} ·{' '}
                        {entry.room.name}
                        {entry.subject.kind === 'LAB' ? ' · Lab' : ''}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {entry.endPeriod - entry.startPeriod + 1} h
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
