import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Undo2,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Period } from '@/features/timetable/api/timetable';
import {
  listCandidates,
  type AffectedClass,
  type Candidate,
} from '../api/substitution';
import { classTime, cohort, formatClassDate } from '../utils/format';
import { CandidateCard } from './CandidateCard';

const SHOWN = 6;

export type Choice = {
  item: AffectedClass;
  candidate: Candidate | null;
};

export function AffectedClassCard({
  leaveId,
  absentName,
  item,
  index,
  periods,
  canAssign,
  onChoose,
  onUndo,
}: {
  leaveId: string;
  absentName: string;
  item: AffectedClass;
  index: number;
  periods: Period[] | undefined;
  canAssign: boolean;
  onChoose: (choice: Choice, trigger: HTMLElement) => void;
  onUndo: (coverageId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const { entry, coverage, date } = item;
  const candidates = useQuery({
    queryKey: ['substitution', 'candidates', leaveId, entry.id, date],
    queryFn: () => listCandidates(leaveId, entry.id, date),
    enabled: canAssign && !coverage,
  });
  const best = candidates.data?.find((candidate) => candidate.eligible);
  const shown = showAll ? candidates.data : candidates.data?.slice(0, SHOWN);

  return (
    <Card
      className="affected-class-card"
      id={`class-${entry.id}-${date}`}
      tabIndex={-1}
      data-covered={Boolean(coverage)}
    >
      <CardHeader>
        <div className="affected-class-heading">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Affected class {index + 1}
            </span>
            <h2>{entry.subject.name}</h2>
            <div className="class-meta">
              <Badge variant="secondary">{cohort(entry)}</Badge>
              <span>
                <CalendarDays aria-hidden="true" />
                {formatClassDate(date)}
              </span>
              <span>
                <Clock3 aria-hidden="true" />
                {classTime(entry, periods)}
              </span>
              <span>
                <MapPin aria-hidden="true" />
                {entry.room.name}
              </span>
            </div>
            <p className="original-class-faculty">
              Original faculty: <strong>{absentName}</strong>
            </p>
          </div>
          <Badge
            variant="outline"
            className={coverage ? 'coverage-badge' : 'uncovered-badge'}
          >
            {coverage ? (
              <>
                <CheckCircle2 aria-hidden="true" />
                {coverage.kind === 'SUBSTITUTE'
                  ? 'Substitute Assigned'
                  : 'No Substitute Required'}
              </>
            ) : (
              'Needs Coverage'
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {coverage ? (
          <div className="class-covered-state flex flex-col gap-2 rounded-xl border bg-muted/40 p-4">
            <h3 className="text-base font-semibold">
              {coverage.substitute?.name ?? 'Alternative Academic Arrangement'}
            </h3>
            {coverage.note && <p className="text-sm">{coverage.note}</p>}
            {canAssign && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => onUndo(coverage.id)}
              >
                <Undo2 />
                Undo
              </Button>
            )}
          </div>
        ) : !canAssign ? (
          <p className="text-sm text-muted-foreground">
            The HOD of {entry.department.code} assigns cover for this class.
          </p>
        ) : candidates.isPending ? (
          <div
            role="status"
            aria-label="Finding available faculty"
            className="candidate-grid"
          >
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : candidates.isError ? (
          <EmptyState
            title="Couldn’t rank faculty for this class"
            description={candidates.error.message}
            actionLabel="Try again"
            onAction={() => void candidates.refetch()}
          />
        ) : (
          <>
            <div className="candidate-section-heading">
              <div>
                <h3>Smart Recommendations</h3>
                <span className="text-xs text-muted-foreground">
                  Free in this slot and not on leave, best match first
                </span>
              </div>
            </div>
            {shown?.length ? (
              <div className="candidate-grid">
                {shown.map((candidate) => (
                  <CandidateCard
                    key={candidate.faculty.id}
                    candidate={candidate}
                    best={candidate === best}
                    onAssign={(trigger) =>
                      onChoose({ item, candidate }, trigger)
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No available faculty"
                description="Everyone is teaching or on leave in this slot. Record an academic arrangement instead."
              />
            )}
            {(candidates.data?.length ?? 0) > SHOWN && (
              <Button variant="link" onClick={() => setShowAll(!showAll)}>
                {showAll
                  ? 'Show the top 6'
                  : `Show all ${candidates.data!.length} available faculty`}
              </Button>
            )}
            <div className="waiver-action">
              <p>Already arranged an alternative for this class?</p>
              <Button
                variant="link"
                onClick={(event) =>
                  onChoose({ item, candidate: null }, event.currentTarget)
                }
              >
                No substitute required
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
