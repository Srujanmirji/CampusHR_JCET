import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { listRequests, type LeaveRequest } from '../api/leave';
import { shiftMonth, thisMonth } from '../utils/leave';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHOWN_PER_DAY = 3;
const monthTitle = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayTitle = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** Every date of the month as YYYY-MM-DD, with Monday-first padding. */
function monthDays(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const padding = (first.getUTCDay() + 6) % 7;
  const days = Array.from(
    { length: count },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
  );
  return { padding, days };
}

const isSunday = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).getUTCDay() === 0;

/** Approved and pending leave on each day of a month. */
export function LeaveCalendar({
  month,
  onMonthChange,
  onOpen,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  onOpen: (request: LeaveRequest) => void;
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const requests = useQuery({
    queryKey: ['leave', 'requests', { month }],
    queryFn: () => listRequests({ month }),
  });
  const { padding, days } = monthDays(month);
  const live = (requests.data ?? []).filter(
    (request) => request.status === 'APPROVED' || request.status === 'PENDING',
  );
  const onDay = (day: string) =>
    isSunday(day)
      ? []
      : live.filter(
          (request) => request.startDate <= day && request.endDate >= day,
        );
  const busyDays = days.filter((day) => onDay(day).length > 0);
  const weeks = Array.from(
    { length: Math.ceil((padding + days.length) / 7) },
    (_, week) =>
      Array.from({ length: 7 }, (_, weekday) => {
        const index = week * 7 + weekday - padding;
        return days[index] ?? null;
      }),
  );
  const title = monthTitle.format(new Date(`${month}-01T00:00:00Z`));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold" aria-live="polite">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => onMonthChange(shiftMonth(month, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              onClick={() => onMonthChange(thisMonth())}
            >
              This month
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <p className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i aria-hidden="true" className="size-3 rounded-xs bg-primary" />
            Approved
          </span>
          <span className="flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="size-3 rounded-xs border border-dashed border-primary"
            />
            Waiting for approval
          </span>
          <span>Sundays are not leave days.</span>
        </p>
      </CardHeader>
      <CardContent>
        {requests.isPending ? (
          <Skeleton
            role="status"
            aria-label="Loading the calendar"
            className="h-96 w-full"
          />
        ) : requests.isError ? (
          <EmptyState
            title="Couldn’t load the calendar"
            description={requests.error.message}
            actionLabel="Try again"
            onAction={() => void requests.refetch()}
          />
        ) : (
          <>
            {/* Month grid on desktops; chips are compact for a pointer. */}
            <table className="hidden w-full table-fixed border-collapse text-sm lg:table">
              <caption className="sr-only">Leave in {title}</caption>
              <thead>
                <tr>
                  {WEEKDAYS.map((weekday) => (
                    <th
                      key={weekday}
                      scope="col"
                      className="pb-2 text-left text-xs font-medium text-muted-foreground"
                    >
                      {weekday}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, row) => (
                  <tr key={row}>
                    {week.map((day, column) =>
                      day ? (
                        <td
                          key={day}
                          className={cn(
                            'h-28 border p-1.5 align-top',
                            isSunday(day) && 'bg-muted/50',
                          )}
                        >
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Number(day.slice(8))}
                          </span>
                          <DayChips
                            compact
                            requests={onDay(day)}
                            limit={SHOWN_PER_DAY}
                            onOpen={onOpen}
                            onMore={() => setOpenDay(day)}
                          />
                        </td>
                      ) : (
                        <td
                          key={`pad-${row}-${column}`}
                          className="border bg-muted/20"
                        />
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Day-by-day list on phones and tablets, with full-size targets. */}
            {busyDays.length > 0 && (
              <div className="lg:hidden">
                <ul className="flex flex-col divide-y rounded-lg border">
                  {busyDays.map((day) => (
                    <li key={day} className="flex flex-col gap-2 p-3">
                      <span className="text-sm font-medium">
                        {dayTitle.format(new Date(`${day}T00:00:00Z`))}
                      </span>
                      <DayChips requests={onDay(day)} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {busyDays.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Nobody is on leave in {title}.
              </p>
            )}
          </>
        )}
      </CardContent>
      {openDay && (
        <Dialog open onOpenChange={(open) => !open && setOpenDay(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {dayTitle.format(new Date(`${openDay}T00:00:00Z`))}
              </DialogTitle>
              <DialogDescription>Everyone on leave that day.</DialogDescription>
            </DialogHeader>
            <DayChips
              requests={onDay(openDay)}
              onOpen={(request) => {
                setOpenDay(null);
                onOpen(request);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function DayChips({
  compact = false,
  requests,
  limit,
  onOpen,
  onMore,
}: {
  compact?: boolean;
  requests: LeaveRequest[];
  limit?: number;
  onOpen: (request: LeaveRequest) => void;
  onMore?: () => void;
}) {
  const shown = limit ? requests.slice(0, limit) : requests;
  const hidden = requests.length - shown.length;
  return (
    <ul className="mt-1 flex flex-col gap-1">
      {shown.map((request) => (
        <li key={request.id}>
          <button
            type="button"
            aria-label={`${request.employee.name}, ${request.leaveType.name}${request.halfDay ? ', half day' : ''}${request.status === 'PENDING' ? ', waiting for approval' : ''}`}
            onClick={() => onOpen(request)}
            className={cn(
              'flex w-full items-center gap-1 truncate rounded-sm text-left',
              compact
                ? 'min-h-6 px-1.5 py-0.5 text-xs'
                : 'min-h-11 px-3 text-sm',
              request.status === 'APPROVED'
                ? 'bg-primary text-primary-foreground'
                : 'border border-dashed border-primary text-primary',
            )}
          >
            <span className="truncate">{request.employee.name}</span>
            <span className="shrink-0 opacity-80">
              {request.leaveType.code}
              {request.halfDay ? ' ½' : ''}
            </span>
          </button>
        </li>
      ))}
      {hidden > 0 && onMore && (
        <li>
          <button
            type="button"
            onClick={onMore}
            className="min-h-6 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            +{hidden} more
          </button>
        </li>
      )}
    </ul>
  );
}
