import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, CircleDashed, LoaderCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/features/auth/hooks/useCan';
import { useSession } from '@/features/auth/hooks/useSession';
import { ApiError } from '@/services/api';
import {
  decideLeave,
  getRequest,
  LEAVE_STATUS_LABEL,
  type LeaveRequest,
} from '../api/leave';
import { formatDays, isMyTurn, leaveDates } from '../utils/leave';
import { AffectedClasses } from './AffectedClasses';

const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const errorText = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Something went wrong. Try again.';

export function LeaveRequestDrawer({
  requestId,
  onClose,
}: {
  requestId: string | null;
  onClose: () => void;
}) {
  // Keeps showing the last request while the sheet slides closed.
  const [shownId, setShownId] = useState(requestId);
  if (requestId && requestId !== shownId) setShownId(requestId);
  const id = requestId ?? shownId;
  const request = useQuery({
    queryKey: ['leave', 'request', id],
    queryFn: () => getRequest(id!),
    enabled: id !== null,
  });

  return (
    <Sheet
      open={requestId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>Leave request details</SheetTitle>
          <SheetDescription>
            {request.data
              ? `${request.data.employee.name} · ${request.data.department.code} · ${request.data.employee.employeeCode}`
              : 'Dates, reason and each approval step.'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {request.isError ? (
            <EmptyState
              title="Couldn’t load this request"
              description={errorText(request.error)}
              actionLabel="Try again"
              onAction={() => void request.refetch()}
            />
          ) : !request.data ? (
            <div
              role="status"
              aria-label="Loading request"
              className="flex flex-col gap-3"
            >
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <RequestDetails
              key={
                request.data.id +
                request.data.status +
                request.data.decisions.length
              }
              request={request.data}
              onDone={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RequestDetails({
  request,
  onDone,
}: {
  request: LeaveRequest;
  onDone: () => void;
}) {
  const session = useSession();
  const can = useCan();
  const user = session.status === 'signedIn' ? session.user : null;
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const myTurn = user ? isMyTurn(request, user) : false;
  const mine = user?.employeeId === request.employee.id;

  const act = useMutation({
    mutationFn: (action: 'approve' | 'reject' | 'cancel') =>
      decideLeave(request.id, action, note.trim() || undefined),
    onSuccess: (saved, action) => {
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(
        action === 'cancel'
          ? 'Your request is cancelled.'
          : action === 'reject'
            ? `Rejected ${saved.employee.name}’s leave.`
            : saved.status === 'APPROVED'
              ? `Approved ${saved.employee.name}’s leave.`
              : `Approved; now with the ${saved.pendingRole}.`,
      );
      onDone();
    },
    onError: (error) => setProblem(errorText(error)),
  });

  function reject() {
    if (note.trim().length < 3) {
      setProblem('Say why you are rejecting it, in a few words.');
      return;
    }
    setProblem('');
    act.mutate('reject');
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <section aria-label="Request" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-lg font-semibold">{request.leaveType.name}</p>
          <StatusBadge status={LEAVE_STATUS_LABEL[request.status]} />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Dates</dt>
            <dd>{leaveDates(request)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Working days</dt>
            <dd className="tabular-nums">{formatDays(request.days)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Reason</dt>
            <dd className="whitespace-pre-line">{request.reason}</dd>
          </div>
        </dl>
      </section>

      {can('timetable.read') && <AffectedClasses request={request} />}

      <section aria-labelledby="leave-steps">
        <h3 id="leave-steps" className="mb-2 text-sm font-semibold">
          Approval steps
        </h3>
        <ol className="flex flex-col gap-3">
          {request.approverRoles.map((role, step) => {
            const decision = request.decisions.find(
              (item) => item.step === step,
            );
            const current =
              request.status === 'PENDING' &&
              request.pendingRole === role &&
              !decision;
            const Icon = decision
              ? decision.approved
                ? Check
                : X
              : CircleDashed;
            return (
              <li key={step} className="flex gap-3 text-sm">
                <Icon
                  aria-hidden="true"
                  className={
                    decision
                      ? decision.approved
                        ? 'mt-0.5 size-4 shrink-0 text-success'
                        : 'mt-0.5 size-4 shrink-0 text-destructive'
                      : 'mt-0.5 size-4 shrink-0 text-muted-foreground'
                  }
                />
                <div>
                  <p className="font-medium">
                    {role}
                    <span className="font-normal text-muted-foreground">
                      {decision
                        ? ` · ${decision.approved ? 'approved' : 'rejected'} by ${decision.decidedBy}`
                        : current
                          ? ' · waiting'
                          : ' · not reached'}
                    </span>
                  </p>
                  {decision && (
                    <p className="text-xs text-muted-foreground">
                      {dateTime.format(new Date(decision.decidedAt))}
                    </p>
                  )}
                  {decision?.note && <p className="mt-1">“{decision.note}”</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {request.status === 'CANCELLED' && (
          <p className="mt-3 text-sm text-muted-foreground">
            Cancelled by the applicant.
          </p>
        )}
      </section>

      {myTurn && (
        <section
          aria-label="Your decision"
          className="flex flex-col gap-3 border-t pt-4"
        >
          <Field>
            <FieldLabel htmlFor="leave-note">Note</FieldLabel>
            <Textarea
              id="leave-note"
              placeholder="Optional when approving; needed when rejecting."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          {problem && <FieldError>{problem}</FieldError>}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={act.isPending}
              onClick={() => act.mutate('approve')}
            >
              {act.isPending && act.variables === 'approve' ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Check />
              )}
              Approve Leave
            </Button>
            <Button variant="outline" disabled={act.isPending} onClick={reject}>
              {act.isPending && act.variables === 'reject' ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Ban />
              )}
              Reject Leave
            </Button>
          </div>
        </section>
      )}

      {mine && request.status === 'PENDING' && (
        <section
          aria-label="Your request"
          className="flex flex-col gap-3 border-t pt-4"
        >
          {problem && <FieldError>{problem}</FieldError>}
          <Button
            variant="outline"
            className="self-start"
            disabled={act.isPending}
            onClick={() => act.mutate('cancel')}
          >
            {act.isPending && <LoaderCircle className="animate-spin" />}
            Cancel request
          </Button>
        </section>
      )}
    </div>
  );
}
