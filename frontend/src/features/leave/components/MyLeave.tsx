import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  listBalances,
  listLeaveTypes,
  listRequests,
  type LeaveRequest,
} from '../api/leave';
import { formatDays, getLeaveTheme } from '../utils/leave';
import { ApplyLeaveDialog } from './ApplyLeaveDialog';
import { RequestsTable } from './RequestsTable';

/** The signed-in employee's balances and requests. */
export function MyLeave({
  onOpen,
}: {
  onOpen: (request: LeaveRequest) => void;
}) {
  const session = useSession();
  const employeeId =
    session.status === 'signedIn'
      ? (session.user.employeeId ?? undefined)
      : undefined;
  const [applying, setApplying] = useState(false);
  const currentYear = new Date().getFullYear();

  const types = useQuery({
    queryKey: ['leave', 'types'],
    queryFn: listLeaveTypes,
  });
  const balances = useQuery({
    queryKey: ['leave', 'balances'],
    queryFn: listBalances,
  });
  const requests = useQuery({
    queryKey: ['leave', 'requests', 'mine', employeeId],
    queryFn: () => listRequests({ employeeId }),
    enabled: employeeId !== undefined,
  });
  const activeTypes = (types.data ?? []).filter((type) => type.active);
  const failed = [types, balances, requests].find((query) => query.isError);

  if (failed) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <EmptyState
          title="Couldn’t load your leave"
          description={failed.error?.message ?? 'Try again.'}
          actionLabel="Try again"
          onAction={() => void failed.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Faculty Leave Header & Balances */}
      <section aria-labelledby="balances-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Leave</h1>
            <p className="text-sm font-medium text-muted-foreground">Time for what matters.</p>
            <h2 id="balances-heading" className="mt-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your balances — {currentYear}
            </h2>
          </div>
          <Button
            onClick={() => setApplying(true)}
            disabled={activeTypes.length === 0}
            className="shadow-sm"
          >
            <CalendarPlus className="size-4" />
            Apply for leave
          </Button>
        </div>

        {!balances.data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : balances.data.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            HR hasn’t set up leave types yet, so there is nothing to apply for.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {balances.data.map((balance) => {
              const theme = getLeaveTheme(balance.leaveType.code);
              const isPolicyBased = balance.entitled === null || balance.remaining === null;
              const isOfficialDuty = balance.leaveType.code === 'OOD' || balance.leaveType.code === 'ODE';

              return (
                <div
                  key={balance.leaveType.id}
                  className={`group relative flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-xs ${
                    !balance.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${theme.bg} ${theme.text}`}
                      >
                        {balance.leaveType.code}
                      </span>
                      {isOfficialDuty && (
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <ShieldCheck className="size-3" />
                          Official Duty
                        </span>
                      )}
                    </div>
                    {!balance.active && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                      {balance.leaveType.name}
                    </h3>

                    {isPolicyBased ? (
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg font-semibold tracking-tight text-foreground">
                          As per policy
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                          {balance.remaining}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          remaining of {balance.entitled} entitled
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                    {isPolicyBased ? (
                      <div className="flex items-center justify-between">
                        <span>{formatDays(balance.used)} recorded</span>
                        {balance.pending > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {formatDays(balance.pending)} pending
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{balance.used} used</span>
                        <span>·</span>
                        <span className={balance.pending > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                          {balance.pending} pending
                        </span>
                        {balance.carriedIn > 0 && (
                          <>
                            <span>·</span>
                            <span>{balance.carriedIn} carried</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <SectionHeader title="My requests" description="Newest first" />
        </CardHeader>
        <CardContent className="px-0">
          {requests.isPending && requests.fetchStatus !== 'idle' ? (
            <div className="flex flex-col gap-2 px-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : requests.data?.length ? (
            <RequestsTable
              requests={requests.data}
              caption="Your leave requests"
              showEmployee={false}
              onOpen={onOpen}
            />
          ) : (
            <EmptyState
              title="No leave requests yet"
              description="Use Apply for leave to send your first request."
            />
          )}
        </CardContent>
      </Card>

      {applying && (
        <ApplyLeaveDialog
          types={activeTypes}
          balances={balances.data ?? []}
          onClose={() => setApplying(false)}
        />
      )}
    </div>
  );
}
