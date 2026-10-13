import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  Clock3,
  CalendarDays,
  CircleX,
  GraduationCap,
} from 'lucide-react';
import { leaveRequests, demoDate } from '@/data/mock/leaveRequests';
import { getEmployee, departmentNames } from '@/data/mock/employees';
import { formatDate } from '@/lib/academic';
import { useAcademicWorkflow } from '../useAcademicWorkflow';
import { LeaveDetailDrawer } from '../components/LeaveDetailDrawer';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { SearchInput } from '@/components/shared/SearchInput';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function LeavePage() {
  const workflow = useAcademicWorkflow();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [department, setDepartment] = useState('all');
  const trigger = useRef<HTMLElement | null>(null);
  const current = leaveRequests.find(
    (item) => item.id === params.get('request'),
  );
  const search = query.trim().toLowerCase();
  const filtered = leaveRequests.filter((request) => {
    const employee = getEmployee(request.employeeId);
    return (
      (status === 'all' || workflow.status(request.id) === status) &&
      (department === 'all' || employee.department === department) &&
      (!search ||
        `${employee.name} ${employee.id} ${employee.designation} ${employee.department} ${request.type} ${request.id}`
          .toLowerCase()
          .includes(search))
    );
  });
  const pending = leaveRequests.filter(
    (item) => workflow.status(item.id) === 'Pending',
  ).length;
  const approved = leaveRequests.filter(
    (item) =>
      workflow.status(item.id) === 'Approved' &&
      item.start.startsWith('2026-10'),
  ).length;
  const rejected = leaveRequests.filter(
    (item) => workflow.status(item.id) === 'Rejected',
  ).length;
  const onLeave = leaveRequests.filter(
    (item) =>
      workflow.status(item.id) === 'Approved' &&
      item.start <= demoDate &&
      item.end >= demoDate,
  ).length;
  function open(id: string, element: HTMLElement) {
    trigger.current = element;
    setParams({ request: id });
  }
  function close() {
    setParams({}, { replace: true });
  }
  function reset() {
    setQuery('');
    setStatus('all');
    setDepartment('all');
  }
  return (
    <PageTransition>
      <PageHeader
        title="Leave management"
        description="Review faculty leave. Keep every scheduled class accounted for."
        action={
          <Badge variant="outline" className="workflow-date">
            <CalendarDays />
            12 Oct 2026
          </Badge>
        }
      />
      <section className="workflow-metrics" aria-label="Leave request summary">
        <MetricCard
          label="Pending requests"
          value={pending}
          detail="Awaiting a review decision"
          icon={Clock3}
          index={0}
        />
        <MetricCard
          label="Approved this month"
          value={approved}
          detail="October 2026"
          icon={CalendarCheck2}
          index={1}
        />
        <MetricCard
          label="Rejected"
          value={rejected}
          detail="Decisions this month"
          icon={CircleX}
          index={2}
        />
        <MetricCard
          label="Employees currently on leave"
          value={onLeave}
          detail="As of 12 October"
          icon={CalendarDays}
          index={3}
        />
      </section>
      <aside className="academic-workflow-note">
        <GraduationCap aria-hidden="true" />
        <div>
          <strong>A leave decision is also an academic decision.</strong>
          <p>
            Review the timetable impact, then find available faculty to keep
            teaching on track.
          </p>
        </div>
        <span>Review → Approve → Cover classes</span>
      </aside>
      <Card className="leave-management-card">
        <CardHeader>
          <SectionHeader
            title="Faculty leave requests"
            description="Requests for October 2026"
            action={
              <span className="text-sm text-muted-foreground">
                {pending} pending review
              </span>
            }
          />
          <div className="leave-filters">
            <div className="leave-search-control">
              <SearchInput
                id="leave-search"
                label="Search leave requests"
                placeholder="Search faculty, employee ID or leave type..."
                value={query}
                onChange={setQuery}
              />
            </div>
            <div className="workflow-select">
              <label htmlFor="management-status">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="management-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {['all', 'Pending', 'Approved', 'Rejected'].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === 'all' ? 'All statuses' : value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="workflow-select">
              <label htmlFor="leave-department">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="leave-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All departments</SelectItem>
                    {Object.entries(departmentNames).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="workflow-table-content">
          {filtered.length ? (
            <Table>
              <TableCaption className="sr-only">
                Faculty leave requests. View details to review academic impact
                and approve or reject.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  {[
                    'Employee',
                    'Employee ID',
                    'Department',
                    'Designation',
                    'Leave type',
                    'Date range',
                    'Days',
                    'Status',
                    'Action',
                  ].map((label) => (
                    <TableHead scope="col" key={label}>
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((request) => {
                  const employee = getEmployee(request.employeeId);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="employee-cell">
                          <Avatar>
                            <AvatarImage src={employee.photo} alt="" />
                            <AvatarFallback>{employee.initials}</AvatarFallback>
                          </Avatar>
                          <Button
                            variant="link"
                            className="faculty-name-button"
                            onClick={(event) =>
                              open(request.id, event.currentTarget)
                            }
                          >
                            {employee.name}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{employee.id}</span>
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.designation}</TableCell>
                      <TableCell>{request.type}</TableCell>
                      <TableCell>
                        {formatDate(request.start)}
                        {request.end !== request.start &&
                          ` – ${formatDate(request.end)}`}
                      </TableCell>
                      <TableCell>{request.days}</TableCell>
                      <TableCell>
                        <StatusBadge status={workflow.status(request.id)} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          aria-label={`View ${employee.name} leave request`}
                          onClick={(event) =>
                            open(request.id, event.currentTarget)
                          }
                        >
                          View details
                          <ArrowRight />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No leave requests match"
              description="Try another faculty name, status or department."
              actionLabel="Clear filters"
              onAction={reset}
            />
          )}
        </CardContent>
        <CardFooter>
          <p role="status" className="text-sm text-muted-foreground">
            Showing {filtered.length} of {leaveRequests.length} requests
          </p>
        </CardFooter>
      </Card>
      <LeaveDetailDrawer
        key={current?.id ?? 'closed'}
        request={current}
        onClose={close}
        restoreFocus={() => {
          if (trigger.current?.isConnected) trigger.current.focus();
          else document.getElementById('main-content')?.focus();
        }}
      />
    </PageTransition>
  );
}
