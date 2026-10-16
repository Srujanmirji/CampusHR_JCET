import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  LEAVE_STATUS_LABEL,
  listRequests,
  type LeaveStatus,
} from '@/features/leave/api/leave';
import { isMyTurn, leaveDates } from '@/features/leave/utils/leave';

const SHOWN = 5;

/** The newest leave requests the user can see, linking into /leave. */
export function RecentLeaveRequests() {
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const [status, setStatus] = useState<LeaveStatus | 'all'>('all');
  const filters = status === 'all' ? {} : { status };
  const requests = useQuery({
    queryKey: ['leave', 'requests', filters],
    queryFn: () => listRequests(filters),
  });
  const rows = (requests.data ?? []).slice(0, SHOWN);

  return (
    <Card className="leave-card">
      <CardHeader>
        <SectionHeader
          title="Recent leave requests"
          description="Newest first"
          action={
            <div>
              <label htmlFor="leave-status" className="sr-only">
                Filter leave requests by status
              </label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as LeaveStatus | 'all')
                }
              >
                <SelectTrigger id="leave-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(Object.keys(LEAVE_STATUS_LABEL) as LeaveStatus[]).map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {LEAVE_STATUS_LABEL[value]}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </CardHeader>
      <CardContent className="leave-table-content">
        {requests.isPending ? (
          <div
            role="status"
            aria-label="Loading leave requests"
            className="flex flex-col gap-2 px-4"
          >
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : requests.isError ? (
          <EmptyState
            title="Couldn’t load leave requests"
            description={requests.error.message}
            actionLabel="Try again"
            onAction={() => void requests.refetch()}
          />
        ) : rows.length ? (
          <Table>
            <TableCaption className="sr-only">
              Recent leave requests
            </TableCaption>
            <TableHeader>
              <TableRow>
                {[
                  'Employee',
                  'Department',
                  'Leave type',
                  'Dates',
                  'Status',
                  'Action',
                ].map((label) => (
                  <TableHead
                    scope="col"
                    key={label}
                    className={label === 'Action' ? 'text-right' : undefined}
                  >
                    {label === 'Action' ? (
                      <span className="sr-only">{label}</span>
                    ) : (
                      label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((request) => {
                const review = user ? isMyTurn(request, user) : false;
                const mine = user?.employeeId === request.employee.id;
                const href = `/leave?tab=${mine ? 'mine' : 'requests'}&request=${request.id}`;
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <span className="block text-sm font-semibold">
                        {request.employee.name}
                      </span>
                      <small className="text-muted-foreground">
                        {request.employee.employeeCode}
                      </small>
                    </TableCell>
                    <TableCell>{request.department.code}</TableCell>
                    <TableCell>{request.leaveType.name}</TableCell>
                    <TableCell>{leaveDates(request)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={LEAVE_STATUS_LABEL[request.status]}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant={review ? 'default' : 'ghost'}
                        size="sm"
                      >
                        <Link
                          to={href}
                          aria-label={`${review ? 'Review' : 'View'} ${request.employee.name}’s leave request`}
                        >
                          {review ? 'Review' : 'View'}
                          <ArrowRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={
              status === 'all'
                ? 'No leave requests yet'
                : 'No requests in this status'
            }
            description="New requests show up here."
            {...(status === 'all'
              ? {}
              : {
                  actionLabel: 'Show all statuses',
                  onAction: () => setStatus('all'),
                })}
          />
        )}
      </CardContent>
      <CardFooter>
        <span className="text-sm text-muted-foreground">
          {requests.data
            ? `${rows.length} of ${requests.data.length} ${requests.data.length === 1 ? 'request' : 'requests'}`
            : ' '}
        </span>
        <Button asChild variant="link">
          <Link to="/leave">
            View all requests
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
