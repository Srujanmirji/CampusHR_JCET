import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LEAVE_STATUS_LABEL, type LeaveRequest } from '../api/leave';
import { formatDays, leaveDates } from '../utils/leave';

export function RequestsTable({
  requests,
  caption,
  showEmployee,
  onOpen,
}: {
  requests: LeaveRequest[];
  caption: string;
  showEmployee: boolean;
  onOpen: (request: LeaveRequest) => void;
}) {
  return (
    <Table className="min-w-[44rem]">
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {showEmployee && (
            <TableHead scope="col" className="pl-6">
              Employee
            </TableHead>
          )}
          <TableHead scope="col" className={showEmployee ? '' : 'pl-6'}>
            Leave type
          </TableHead>
          <TableHead scope="col">Dates</TableHead>
          <TableHead scope="col" className="text-right">
            Days
          </TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col" className="pr-6">
            <span className="sr-only">Details</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            {showEmployee && (
              <TableCell className="pl-6">
                <span className="block font-medium">
                  {request.employee.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {request.department.code} · {request.employee.employeeCode}
                </span>
              </TableCell>
            )}
            <TableCell className={showEmployee ? '' : 'pl-6'}>
              {request.leaveType.name}
            </TableCell>
            <TableCell>{leaveDates(request)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatDays(request.days)}
            </TableCell>
            <TableCell>
              <StatusBadge status={LEAVE_STATUS_LABEL[request.status]} />
              {request.pendingRole && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  With {request.pendingRole}
                </span>
              )}
            </TableCell>
            <TableCell className="pr-6 text-right">
              <Button
                variant="outline"
                aria-label={`View ${showEmployee ? `${request.employee.name}’s ` : ''}${request.leaveType.name} request`}
                onClick={() => onOpen(request)}
              >
                Details
                <ArrowRight />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
