import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { listPeriods } from '@/features/timetable/api/timetable';
import { listMyClasses } from '../api/substitution';
import { classTime, cohort, formatClassDate } from '../utils/format';

/** Classes the signed-in faculty member covers for colleagues. */
export function MyCoverClasses() {
  const classes = useQuery({
    queryKey: ['substitution', 'mine'],
    queryFn: listMyClasses,
  });
  const periods = useQuery({
    queryKey: ['timetable', 'periods'],
    queryFn: listPeriods,
  });

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Classes you are covering"
          description="Substitute classes assigned to you by an HOD, from today."
        />
      </CardHeader>
      <CardContent>
        {classes.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : classes.isError ? (
          <EmptyState
            title="Couldn’t load your substitute classes"
            description={classes.error.message}
            actionLabel="Try again"
            onAction={() => void classes.refetch()}
          />
        ) : classes.data.length === 0 ? (
          <EmptyState
            title="No substitute classes"
            description="When an HOD assigns you to cover a class, it shows up here."
          />
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {classes.data.map((item) => (
              <li
                key={item.id}
                className="grid gap-1 p-3 text-sm sm:grid-cols-[9rem_1fr]"
              >
                <span className="text-muted-foreground">
                  {formatClassDate(item.date)}
                  <span className="block text-xs">
                    {classTime(item.entry, periods.data)}
                  </span>
                </span>
                <span>
                  <span className="font-medium">{item.entry.subject.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {cohort(item.entry)} · {item.entry.room.name} · for{' '}
                    {item.coveringFor.name}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
