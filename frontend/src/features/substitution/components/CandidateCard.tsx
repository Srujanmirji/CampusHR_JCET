import { AlertTriangle, ArrowRight, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RUBRIC, type Candidate } from '../api/substitution';

export function CandidateCard({
  candidate,
  best,
  onAssign,
}: {
  candidate: Candidate;
  best: boolean;
  onAssign: (trigger: HTMLButtonElement) => void;
}) {
  const { faculty, score, points, hoursAfter, maxHours, eligible, reason } =
    candidate;

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
          <div className="match-score">
            <strong>
              {score}
              <small>/100</small>
            </strong>
            <span>Match score</span>
          </div>
        </div>

        <div className="candidate-badges">
          {best && (
            <Badge className="best-match">
              <Award aria-hidden="true" />
              Best Match
            </Badge>
          )}
          {!eligible && (
            <Badge
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive"
            >
              Workload Limit Reached
            </Badge>
          )}
        </div>

        <dl className="flex flex-col gap-1.5 border-y py-2 text-xs">
          {RUBRIC.map(({ key, label, max }) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-2"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">
                {points[key]} / {max}
              </dd>
            </div>
          ))}
        </dl>

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
