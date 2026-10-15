import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useScope } from '@/features/auth/hooks/useCan';
import { formatLeaveDate, leaveDates } from '@/features/leave/utils/leave';
import { listPeriods } from '@/features/timetable/api/timetable';
import { ApiError } from '@/services/api';
import {
  getLeaveClasses,
  listApprovedLeave,
  removeCoverage,
} from '../api/substitution';
import {
  AffectedClassCard,
  type Choice,
} from '../components/AffectedClassCard';
import { CoverageDialog } from '../components/CoverageDialog';
import { MyCoverClasses } from '../components/MyCoverClasses';

export default function SubstitutionPage() {
  const scopeOf = useScope();
  const readScope = scopeOf('substitution.read');
  const canAssign = scopeOf('substitution.assign') !== undefined;
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<Choice | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const leaves = useQuery({
    queryKey: ['substitution', 'leave'],
    queryFn: listApprovedLeave,
    enabled: readScope !== 'own',
  });
  const periods = useQuery({
    queryKey: ['timetable', 'periods'],
    queryFn: listPeriods,
  });
  const leaveId = params.get('leave') ?? leaves.data?.[0]?.leave.id ?? null;
  const detail = useQuery({
    queryKey: ['substitution', 'classes', leaveId],
    queryFn: () => getLeaveClasses(leaveId!),
    enabled: leaveId !== null && readScope !== 'own',
  });
  const undo = useMutation({
    mutationFn: removeCoverage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['substitution'] });
      toast.success('Assignment undone; the class needs cover again.');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Couldn’t undo.'),
  });

  if (readScope === 'own') {
    return (
      <PageTransition>
        <PageHeader
          title="Smart faculty substitution"
          description="Classes you cover while a colleague is on leave."
        />
        <MyCoverClasses />
      </PageTransition>
    );
  }

  const classes = detail.data?.classes ?? [];
  const covered = classes.filter((item) => item.coverage).length;
  const assigned = classes.filter(
    (item) => item.coverage?.kind === 'SUBSTITUTE',
  ).length;
  const complete = classes.length > 0 && covered === classes.length;
  const leave = detail.data?.leave;

  return (
    <PageTransition>
      <PageHeader
        title="Smart faculty substitution"
        description="Keep teaching on track when a faculty member is on leave."
        action={
          leaves.data?.length ? (
            <div className="workflow-select substitution-leave-select">
              <label htmlFor="substitution-leave">Approved leave</label>
              <Select
                value={leaveId ?? ''}
                onValueChange={(id) => setParams({ leave: id })}
              >
                <SelectTrigger id="substitution-leave">
                  <SelectValue placeholder="Choose approved leave" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {leaves.data.map(
                      ({ leave: item, classes: total, covered: done }) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.employee.name} ·{' '}
                          {formatLeaveDate(item.startDate)} ({done}/{total})
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : undefined
        }
      />

      {leaves.isPending ||
      (detail.isPending && detail.fetchStatus !== 'idle') ? (
        <div
          role="status"
          aria-label="Loading substitution"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : leaves.isError || detail.isError ? (
        <Card>
          <CardContent>
            <EmptyState
              title="Couldn’t load substitution"
              description={
                (leaves.error ?? detail.error)?.message ?? 'Try again.'
              }
              actionLabel="Try again"
              onAction={() => {
                void leaves.refetch();
                void detail.refetch();
              }}
            />
          </CardContent>
        </Card>
      ) : !leave ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No classes need cover"
              description="When leave is approved for someone who teaches, their classes on those days show up here."
            />
            <div className="flex justify-center">
              <Button asChild variant="outline">
                <Link to="/leave">Go to Leave management</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ol
            className="workflow-steps"
            aria-label="Academic workflow progress"
          >
            <li data-done="true">
              <Check aria-hidden="true" />
              Leave approved
            </li>
            <li data-done={complete}>
              <GraduationCap aria-hidden="true" />
              Find substitutes
            </li>
            <li data-done={complete}>
              <ClipboardCheck aria-hidden="true" />
              Classes accounted for
            </li>
          </ol>
          <Card className="substitution-leave-info">
            <CardHeader>
              <SectionHeader
                title="Leave information"
                action={<StatusBadge status="Approved" />}
              />
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Absent faculty
                  </dt>
                  <dd className="font-semibold">{leave.employee.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Department</dt>
                  <dd>{leave.department.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Leave</dt>
                  <dd>
                    {leave.leaveType.name} · {leaveDates(leave)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Affected classes
                  </dt>
                  <dd>
                    {classes.length} scheduled{' '}
                    {classes.length === 1 ? 'class' : 'classes'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <section
            className="coverage-progress"
            aria-labelledby="coverage-title"
          >
            <div>
              <h2 id="coverage-title">
                {classes.length} {classes.length === 1 ? 'Class' : 'Classes'}{' '}
                Affected
              </h2>
              <p>
                {complete
                  ? 'Every affected class has a recorded coverage decision.'
                  : 'Assign a substitute or record why one is not required for each class.'}
              </p>
            </div>
            <div>
              <strong aria-live="polite">
                {covered} / {classes.length} Covered
              </strong>
              <progress
                max={Math.max(1, classes.length)}
                value={covered}
                aria-label={`${covered} of ${classes.length} affected classes covered`}
              />
            </div>
          </section>
          {!complete && canAssign && (
            <p className="ranking-method">
              <GraduationCap aria-hidden="true" />
              <span>
                <strong>Smart Recommendation:</strong> faculty free in the slot
                are scored out of 100 — subject 35, availability 25, department
                15, workload headroom 15, experience 10. You make the final
                choice.
              </span>
            </p>
          )}
          {classes.map((item, index) => (
            <AffectedClassCard
              key={`${item.entry.id}-${item.date}`}
              leaveId={leave.id}
              absentName={leave.employee.name}
              item={item}
              index={index}
              periods={periods.data}
              canAssign={canAssign}
              onChoose={(next, element) => {
                trigger.current = element;
                setChoice(next);
              }}
              onUndo={(id) => undo.mutate(id)}
            />
          ))}
          {complete && (
            <section
              className="workflow-success rounded-xl border p-6"
              aria-labelledby="workflow-success-title"
              role="status"
            >
              <div className="flex items-start gap-4">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-7 shrink-0 text-success"
                />
                <div className="flex flex-col gap-2">
                  <h2 id="workflow-success-title" className="text-xl font-bold">
                    All Classes Covered
                  </h2>
                  <p className="text-sm font-semibold">
                    No classes left uncovered
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All {classes.length} classes affected by{' '}
                    {leave.employee.name}’s leave have cover ({assigned}{' '}
                    {assigned === 1 ? 'substitute' : 'substitutes'} assigned
                    {covered - assigned > 0
                      ? `, ${covered - assigned} without a substitute`
                      : ''}
                    ).
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 border-t pt-4">
                <Button asChild variant="outline">
                  <Link to="/leave">
                    <ArrowLeft />
                    Return to Leave Management
                  </Link>
                </Button>
              </div>
            </section>
          )}
        </>
      )}
      {choice && leave && (
        <CoverageDialog
          leaveId={leave.id}
          choice={choice}
          periods={periods.data}
          onClose={() => setChoice(null)}
          restoreFocus={() => {
            const card = document.getElementById(
              `class-${choice.item.entry.id}-${choice.item.date}`,
            );
            if (trigger.current?.isConnected) trigger.current.focus();
            else card?.focus();
          }}
        />
      )}
    </PageTransition>
  );
}
