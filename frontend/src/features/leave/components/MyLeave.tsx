import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
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
import { formatDays } from '../utils/leave';
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
      <section aria-labelledby="balances-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="balances-heading" className="text-base font-semibold">
            Balance this year
          </h2>
          <Button
            onClick={() => setApplying(true)}
            disabled={activeTypes.length === 0}
          >
            <CalendarPlus />
            Apply for leave
          </Button>
        </div>
        {!balances.data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        ) : balances.data.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            HR hasn’t set up leave types yet, so there is nothing to apply for.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {balances.data.map((balance) => (
              <li
                key={balance.leaveType.id}
                className="rounded-xl border bg-card p-4"
              >
                <p className="text-sm text-muted-foreground">
                  {balance.leaveType.name}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {balance.remaining === null ? 'No limit' : balance.remaining}
                  {balance.remaining !== null && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      of {balance.entitled} left
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDays(balance.used)} taken
                  {balance.pending > 0 &&
                    ` · ${formatDays(balance.pending)} waiting`}
                  {balance.carriedIn > 0 &&
                    ` · ${formatDays(balance.carriedIn)} carried over`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

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
