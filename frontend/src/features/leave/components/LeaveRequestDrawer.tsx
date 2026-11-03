import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  CircleDashed,
  ExternalLink,
  FileText,
  History,
  LoaderCircle,
  Paperclip,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
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
  listBalances,
  listRequests,
  LEAVE_STATUS_LABEL,
  type LeaveRequest,
} from '../api/leave';
import {
  formatDays,
  formatLeaveDate,
  getLeaveTheme,
  isMyTurn,
  leaveDates,
} from '../utils/leave';
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
      <SheetContent
        aria-describedby="leave-details-desc"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>Leave request details</SheetTitle>
          <SheetDescription id="leave-details-desc">
            Review request information, supporting evidence, academic continuity, and approval status.
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
              className="flex flex-col gap-3 pt-4"
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
  const isHod = user?.role === 'HOD';
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const myTurn = user ? isMyTurn(request, user) : false;
  const mine = user?.employeeId === request.employee.id;

  const code = request.leaveType.code;
  const theme = getLeaveTheme(code);
  const isOfficialDuty = code === 'OOD' || code === 'ODE';

  // Balances query for applicant
  const balancesQuery = useQuery({
    queryKey: ['leave', 'balances', request.employee.id],
    queryFn: listBalances,
    enabled: Boolean(user),
  });

  // History query for applicant
  const historyQuery = useQuery({
    queryKey: ['leave', 'requests', 'history', request.employee.id],
    queryFn: () => listRequests({ employeeId: request.employee.id }),
    enabled: Boolean(user),
  });

  const matchingBalance = balancesQuery.data?.find(
    (b) => b.leaveType.code === code,
  );

  const previousRequests = (historyQuery.data ?? []).filter(
    (r) => r.id !== request.id,
  );

  const act = useMutation({
    mutationFn: (action: 'approve' | 'reject' | 'cancel' | 'recommend' | 'recommend_coverage') =>
      decideLeave(request.id, action, note.trim() || undefined),
    onSuccess: (saved, action) => {
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(
        action === 'cancel'
          ? 'Your request is cancelled.'
          : action === 'reject'
            ? `Rejected ${saved.employee.name}’s leave.`
            : action === 'recommend_coverage'
              ? `Recommended ${saved.employee.name}’s leave & flagged for substitute coverage.`
              : action === 'recommend'
                ? `Recommended ${saved.employee.name}’s leave.`
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
      setProblem('Please provide a reason for rejection (at least 3 characters).');
      return;
    }
    setProblem('');
    act.mutate('reject');
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* Faculty Info Card */}
      <div className="flex items-start justify-between rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            {request.employee.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {request.employee.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {request.employee.employeeCode} · {request.department.name} ({request.department.code})
            </p>
          </div>
        </div>
        <StatusBadge status={LEAVE_STATUS_LABEL[request.status]} />
      </div>

      {/* Leave Details */}
      <section aria-label="Request Summary" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${theme.bg} ${theme.text}`}
            >
              {request.leaveType.code}
            </span>
            <span className="font-semibold text-foreground text-sm">
              {request.leaveType.name}
            </span>
          </div>
          {isOfficialDuty && (
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" />
              Official Duty
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-xs">
          <div>
            <dt className="text-muted-foreground font-medium">Dates</dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {leaveDates(request)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Working days</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
              {formatDays(request.days)}
            </dd>
          </div>
          <div className="col-span-2 border-t pt-2">
            <dt className="text-muted-foreground font-medium">Reason</dt>
            <dd className="mt-0.5 whitespace-pre-line text-foreground">
              {request.reason || '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Official Duty (OOD / ODE) Metadata */}
      {isOfficialDuty && (
        <section aria-label="Official Duty Particulars" className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-xs">
          <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="size-4" />
            Official Duty Particulars
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
            {request.dutyType && (
              <div>
                <dt className="text-muted-foreground">Duty Type</dt>
                <dd className="font-medium text-foreground">{request.dutyType}</dd>
              </div>
            )}
            {request.organisation && (
              <div>
                <dt className="text-muted-foreground">Organisation</dt>
                <dd className="font-medium text-foreground">{request.organisation}</dd>
              </div>
            )}
            {request.location && (
              <div>
                <dt className="text-muted-foreground">Location / Center</dt>
                <dd className="font-medium text-foreground">{request.location}</dd>
              </div>
            )}
            {request.referenceNumber && (
              <div>
                <dt className="text-muted-foreground">Order Reference #</dt>
                <dd className="font-mono font-medium text-foreground">{request.referenceNumber}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Supporting Document / Attachment */}
      {(request.attachmentName || request.attachmentUrl) && (
        <section aria-label="Supporting Documents" className="flex flex-col gap-2 rounded-xl border p-3.5 bg-muted/20">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Paperclip className="size-3.5" />
              Supporting Attachment
            </span>
            <span className="text-[11px] text-muted-foreground">Verified Document</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-background p-2.5 text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileText className="size-4 text-primary shrink-0" />
              <span className="truncate font-medium">{request.attachmentName || 'supporting_document.pdf'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => toast.info('Document opened in preview')}
            >
              <ExternalLink className="size-3.5 mr-1" />
              View
            </Button>
          </div>
        </section>
      )}

      {/* Leave Balance Snapshot */}
      <section aria-label="Applicant Leave Balance" className="flex flex-col gap-2 rounded-xl border bg-card p-3.5 text-xs">
        <h4 className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
          Applicant Balance Snapshot ({new Date().getFullYear()})
        </h4>
        {matchingBalance ? (
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground block text-[10px]">Entitled</span>
              <span className="font-semibold text-foreground text-sm">
                {matchingBalance.entitled !== null ? matchingBalance.entitled : 'Rule'}
              </span>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground block text-[10px]">Used</span>
              <span className="font-semibold text-foreground text-sm">{matchingBalance.used}</span>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground block text-[10px]">Pending</span>
              <span className="font-semibold text-foreground text-sm text-amber-600 dark:text-amber-400">
                {matchingBalance.pending}
              </span>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <span className="text-muted-foreground block text-[10px]">Remaining</span>
              <span className="font-semibold text-foreground text-sm">
                {matchingBalance.remaining !== null ? matchingBalance.remaining : 'Policy'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {code} entitlement: As per institutional policy
          </p>
        )}
      </section>

      {/* Academic Impact & Timetable Conflict */}
      {can('timetable.read') && <AffectedClasses request={request} />}

      {/* Previous Leave History */}
      {previousRequests.length > 0 && (
        <section aria-label="Previous Leave History" className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <History className="size-3.5" />
            Previous Requests This Year
          </div>
          <ul className="flex flex-col divide-y rounded-xl border bg-card text-xs">
            {previousRequests.slice(0, 3).map((prev) => (
              <li key={prev.id} className="flex items-center justify-between p-3">
                <div>
                  <span className="font-medium text-foreground">
                    {prev.leaveType.name} ({prev.days} {prev.days === 1 ? 'day' : 'days'})
                  </span>
                  <span className="block text-muted-foreground text-[11px]">
                    {formatLeaveDate(prev.startDate)}
                  </span>
                </div>
                <StatusBadge status={LEAVE_STATUS_LABEL[prev.status]} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Approval Steps Timeline */}
      <section aria-labelledby="leave-steps">
        <h3 id="leave-steps" className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Approval Timeline
        </h3>
        <ol className="flex flex-col gap-3 rounded-xl border bg-card p-4">
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
              <li key={step} className="flex gap-3 text-xs">
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
                          ? ' · waiting for review'
                          : ' · pending prior step'}
                    </span>
                  </p>
                  {decision && (
                    <p className="text-[11px] text-muted-foreground">
                      {dateTime.format(new Date(decision.decidedAt))}
                    </p>
                  )}
                  {decision?.note && <p className="mt-1 text-foreground italic">“{decision.note}”</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {request.status === 'CANCELLED' && (
          <p className="mt-3 text-xs text-muted-foreground">
            Cancelled by the applicant.
          </p>
        )}
      </section>

      {/* Decision Actions for HOD and Final Authority */}
      {myTurn && (
        <section
          aria-label="Your decision"
          className="flex flex-col gap-3 border-t pt-4"
        >
          <Field>
            <FieldLabel htmlFor="leave-note">Review note</FieldLabel>
            <Textarea
              id="leave-note"
              placeholder={
                isHod
                  ? 'Optional recommendation remarks; required if rejecting.'
                  : 'Optional approval remarks; required if rejecting.'
              }
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          {problem && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>{problem}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {isHod ? (
              <>
                <Button
                  disabled={act.isPending}
                  onClick={() => act.mutate('recommend')}
                >
                  {act.isPending && act.variables === 'recommend' ? (
                    <LoaderCircle className="animate-spin size-4" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Recommend approval
                </Button>
                <Button
                  variant="secondary"
                  disabled={act.isPending}
                  onClick={() => act.mutate('recommend_coverage')}
                >
                  {act.isPending && act.variables === 'recommend_coverage' ? (
                    <LoaderCircle className="animate-spin size-4" />
                  ) : (
                    <Users className="size-4" />
                  )}
                  Recommend & arrange coverage
                </Button>
              </>
            ) : (
              <Button
                disabled={act.isPending}
                onClick={() => act.mutate('approve')}
              >
                {act.isPending && act.variables === 'approve' ? (
                  <LoaderCircle className="animate-spin size-4" />
                ) : (
                  <CheckCheck className="size-4" />
                )}
                Approve Leave
              </Button>
            )}

            <Button variant="outline" disabled={act.isPending} onClick={reject}>
              {act.isPending && act.variables === 'reject' ? (
                <LoaderCircle className="animate-spin size-4" />
              ) : (
                <X className="size-4" />
              )}
              Reject
            </Button>
          </div>
        </section>
      )}

      {/* Cancellation for own pending request */}
      {mine && request.status === 'PENDING' && !myTurn && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            disabled={act.isPending}
            onClick={() => act.mutate('cancel')}
          >
            {act.isPending && act.variables === 'cancel' ? (
              <LoaderCircle className="animate-spin size-4" />
            ) : (
              <Ban className="size-4" />
            )}
            Cancel Request
          </Button>
        </div>
      )}
    </div>
  );
}
