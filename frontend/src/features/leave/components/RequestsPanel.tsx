import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchInput } from '@/components/shared/SearchInput';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LEAVE_STATUS_LABEL,
  listRequests,
  type LeaveRequest,
  type LeaveStatus,
} from '../api/leave';
import { RequestsTable } from './RequestsTable';

export type RequestsView = 'MINE_TO_DECIDE' | LeaveStatus | 'ALL';

/** Requests in the user's scope, or those waiting for their decision. */
export function RequestsPanel({
  view,
  onViewChange,
  canDecide,
  onOpen,
}: {
  view: RequestsView;
  onViewChange: (view: RequestsView) => void;
  canDecide: boolean;
  onOpen: (request: LeaveRequest) => void;
}) {
  const [search, setSearch] = useState('');
  const filters =
    view === 'MINE_TO_DECIDE'
      ? { awaitingMe: true }
      : view === 'ALL'
        ? {}
        : { status: view };
  const requests = useQuery({
    queryKey: ['leave', 'requests', filters],
    queryFn: () => listRequests(filters),
  });
  const query = search.trim().toLowerCase();
  const rows = (requests.data ?? []).filter(
    (request) =>
      !query ||
      `${request.employee.name} ${request.employee.employeeCode} ${request.leaveType.name} ${request.department.code}`
        .toLowerCase()
        .includes(query),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5 sm:min-w-56 sm:flex-1">
            <SearchInput
              id="leave-search"
              label="Search leave requests"
              placeholder="Search name, employee ID or leave type"
              value={search}
              onChange={setSearch}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-view">Show</Label>
            <Select
              value={view}
              onValueChange={(value) => onViewChange(value as RequestsView)}
            >
              <SelectTrigger id="leave-view" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canDecide && (
                  <SelectItem value="MINE_TO_DECIDE">Waiting for me</SelectItem>
                )}
                {(Object.keys(LEAVE_STATUS_LABEL) as LeaveStatus[]).map(
                  (status) => (
                    <SelectItem key={status} value={status}>
                      {LEAVE_STATUS_LABEL[status]}
                    </SelectItem>
                  ),
                )}
                <SelectItem value="ALL">All requests</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {requests.isPending ? (
          <div
            role="status"
            aria-label="Loading requests"
            className="flex flex-col gap-2 px-6"
          >
            <Skeleton className="h-12 w-full" />
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
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              query
                ? 'No leave requests match'
                : view === 'MINE_TO_DECIDE'
                  ? 'Nothing is waiting for you'
                  : 'No leave requests here'
            }
            description={
              query
                ? 'Try another name or employee ID.'
                : 'New requests show up here.'
            }
          />
        ) : (
          <RequestsTable
            requests={rows}
            caption="Leave requests. Open one to see its approval steps."
            showEmployee
            onOpen={onOpen}
          />
        )}
      </CardContent>
      {requests.data && (
        <CardFooter>
          <p role="status" className="text-sm text-muted-foreground">
            Showing {rows.length} of {requests.data.length}{' '}
            {requests.data.length === 1 ? 'request' : 'requests'}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
