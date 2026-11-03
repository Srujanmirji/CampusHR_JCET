import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type Candidate } from '../api/substitution';

export function CandidateCard({
  candidate,
  best,
  onAssign,
}: {
  candidate: Candidate;
  best: boolean;
  onAssign: (trigger: HTMLButtonElement) => void;
}) {
  const { faculty, points, hoursAfter, maxHours, eligible, reason } = candidate;

  const isAtCapacity =
    !eligible &&
    (reason?.toLowerCase().includes('limit') ||
      reason?.toLowerCase().includes('capacity') ||
      reason?.toLowerCase().includes('hour') ||
      (maxHours !== null && hoursAfter > maxHours));

  const status = best
    ? 'Recommended'
    : eligible
      ? 'Available'
      : isAtCapacity
        ? 'At capacity'
        : 'Unavailable';

  const statusBadgeClass = {
    Recommended:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
    Available:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
    'At capacity':
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
    Unavailable:
      'border-destructive/40 bg-destructive/10 text-destructive',
  }[status];

  return (
    <Card
      className={cn(
        'candidate-card',
        best && 'border-primary shadow-sm',
        !eligible && 'border-destructive/30 bg-card/60',
      )}
      data-best={best}
    >
      <CardContent className="flex flex-col gap-3.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-primary">
              {faculty.name}
            </h4>
            <p className="truncate text-xs text-muted-foreground">
              {faculty.designation} · {faculty.department.code}
            </p>
          </div>
          <Badge variant="outline" className={cn('font-semibold', statusBadgeClass)}>
            {status}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5 border-y py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Period availability</span>
            <span className="font-medium text-foreground">
              {points.availability > 0 ? 'Free this period' : 'Has conflict'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subject experience</span>
            <span className="font-medium text-foreground">
              {points.subject > 0 ? 'Recorded experience' : 'Department peer'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Department match</span>
            <span className="font-medium text-foreground">{faculty.department.code}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-xs">
          <span className="flex justify-between text-muted-foreground">
            Hours that week with this class
            <strong
              className={cn(
                'tabular-nums',
                eligible ? 'text-foreground' : 'text-destructive',
              )}
            >
              {hoursAfter}
              {maxHours !== null && ` / ${maxHours}`} h
            </strong>
          </span>
          {maxHours !== null && (
            <progress
              className="workload-meter"
              max={maxHours}
              value={Math.min(hoursAfter, maxHours)}
              aria-label={`${faculty.name}: ${hoursAfter} of ${maxHours} hours that week`}
            />
          )}
        </div>

        {reason && (
          <p className="flex items-start gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0"
            />
            {reason}
          </p>
        )}

        <Button
          variant={best ? 'accent' : 'outline'}
          className="mt-auto w-full"
          disabled={!eligible}
          aria-label={`Assign ${faculty.name}`}
          onClick={(event) => onAssign(event.currentTarget)}
        >
          {eligible ? 'Assign Faculty' : 'Cannot Assign'}
          {eligible && <ArrowRight />}
        </Button>
      </CardContent>
    </Card>
  );
}
