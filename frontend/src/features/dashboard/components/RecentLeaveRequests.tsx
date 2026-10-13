import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { leaveRequests } from '@/data/mock/dashboard';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select';
import { SectionHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';

export function RecentLeaveRequests() {
  const navigate = useNavigate();
  const workflow = useAcademicWorkflow();
  const [status, setStatus] = useState('all');
  const requests = leaveRequests.filter(
    (request) => status === 'all' || workflow.status(request.id) === status,
  );
  return (
    <Card className="leave-card">
      <CardHeader>
        <SectionHeader
          title="Recent leave requests"
          description="October 2026 · sample approval queue"
          action={
            <div>
              <label htmlFor="leave-status" className="sr-only">
                Filter leave requests by status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="leave-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </CardHeader>
      <CardContent className="leave-table-content">
        {requests.length ? (
          <Table>
            <TableCaption className="sr-only">
              Sample leave requests for October 2026
            </TableCaption>
            <TableHeader>
              <TableRow>
                {[
                  'Employee',
                  'Department',
                  'Leave type',
                  'From',
                  'To',
                  'Status',
                  'Action',
                ].map((label) => (
                  <TableHead
                    scope="col"
                    key={label}
                    className={label === 'Action' ? 'text-right' : undefined}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const reqStatus = workflow.status(request.id);
                const isPending = reqStatus === 'Pending';
                return (
                  <TableRow
                    key={request.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/60 ${
                      isPending ? 'bg-primary/5 hover:bg-primary/10' : ''
                    }`}
                    onClick={() => navigate(`/leave?request=${request.id}`)}
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/leave?request=${request.id}`);
                      }
                    }}
                    aria-label={`${isPending ? 'Review' : 'View'} leave request for ${request.employee}`}
                  >
                    <TableCell>
                      <div className="employee-cell">
                        <Avatar>
                          <AvatarFallback>{request.initials}</AvatarFallback>
                        </Avatar>
                        <span>
                          <Link
                            to={`/leave?request=${request.id}`}
                            className="dashboard-leave-link block text-sm font-semibold text-foreground hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {request.employee}
                          </Link>
                          <small>{request.id}</small>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{request.department}</TableCell>
                    <TableCell>{request.type}</TableCell>
                    <TableCell>{request.from}</TableCell>
                    <TableCell>{request.to}</TableCell>
                    <TableCell>
                      <StatusBadge status={reqStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent/80">
                          Review <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          View <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No requests in this status"
            description="The sample data has no rejected leave requests. Choose all statuses to see the preview queue."
            actionLabel="Reset filter"
            onAction={() => setStatus('all')}
          />
        )}
      </CardContent>
      <CardFooter>
        <span className="text-sm text-muted-foreground">
          {requests.length} sample{' '}
          {requests.length === 1 ? 'request' : 'requests'}
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
