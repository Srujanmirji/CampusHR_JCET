import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartNoAxesCombined,
  CheckCircle2,
  Clock,
  Flame,
  SlidersHorizontal,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { MetricCard } from '@/components/shared/MetricCard';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useScope } from '@/features/auth/hooks/useCan';
import { useSession } from '@/features/auth/hooks/useSession';
import { listDepartments } from '@/features/departments/api/departments';
import {
  bandLabel,
  listWorkload,
  LOAD_LABEL,
  type LoadStatus,
} from '../api/workload';
import { LoadBadge } from '../components/LoadBadge';
import { ThresholdsDialog } from '../components/ThresholdsDialog';
import { WorkloadBreakdown } from '../components/WorkloadBreakdown';
import { WorkloadChart } from '../components/WorkloadChart';
import { WorkloadDrawer } from '../components/WorkloadDrawer';

const ALL = 'ALL';

export default function WorkloadPage() {
  const scopeOf = useScope();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : undefined;
  const readScope = scopeOf('workload.read');
  const isDeptScoped = readScope === 'department';
  const canConfigure = scopeOf('workload.configure') !== undefined;
  const ownView = readScope === 'own';

  const [chosenDepartmentId, setChosenDepartmentId] = useState<number>();
  const departmentId =
    isDeptScoped && user?.departmentId ? user.departmentId : chosenDepartmentId;
  const [status, setStatus] = useState<LoadStatus | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [bandsOpen, setBandsOpen] = useState(false);

  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    enabled: readScope === 'all' || isDeptScoped,
  });

  const departmentChoices =
    readScope === 'all'
      ? (departments.data ?? [])
      : (departments.data ?? []).filter((row) => row.id === user?.departmentId);
  const workload = useQuery({
    queryKey: ['workload', 'list', departmentId],
    queryFn: () => listWorkload(departmentId),
  });

  const all = workload.data ?? [];
  const query = search.trim().toLowerCase();
  const rows = all.filter(
    (row) =>
      (status === ALL || row.status === status) &&
      (!query ||
        row.faculty.name.toLowerCase().includes(query) ||
        row.faculty.employeeCode.toLowerCase().includes(query)),
  );
  const count = (value: LoadStatus) =>
    all.filter((row) => row.status === value).length;

  return (
    <PageTransition>
      <PageHeader
        title={ownView ? 'My workload' : 'Faculty workload'}
        description="Weekly teaching hours from the timetable, against each designation’s band."
        action={
          canConfigure ? (
            <Button variant="outline" onClick={() => setBandsOpen(true)}>
              <SlidersHorizontal />
              Workload bands
            </Button>
          ) : undefined
        }
      />

      {workload.isPending ? (
        <div
          role="status"
          aria-label="Loading workload"
          className="flex flex-col gap-3"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : workload.isError ? (
        <div className="rounded-xl border bg-card p-8">
          <EmptyState
            title="Couldn’t load workload"
            description={workload.error.message}
            actionLabel="Try again"
            onAction={() => void workload.refetch()}
          />
        </div>
      ) : (
        <>
          {!ownView && (
            <section
              aria-label="Workload summary"
              className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <MetricCard
                label="Faculty"
                value={all.length}
                detail="Active teaching staff"
                icon={ChartNoAxesCombined}
                index={0}
              />
              <MetricCard
                label="Normal"
                value={count('NORMAL')}
                detail="Within their band"
                icon={CheckCircle2}
                index={1}
              />
              <MetricCard
                label="Underloaded"
                value={count('UNDERLOADED')}
                detail="Below the minimum; free for more classes"
                icon={Clock}
                index={2}
              />
              <MetricCard
                label="Overloaded"
                value={count('OVERLOADED')}
                detail="Above the maximum"
                icon={Flame}
                index={3}
              />
            </section>
          )}

          {all.length > 1 && (
            <Card className="mb-6">
              <CardHeader>
                <SectionHeader
                  title="Hours a week"
                  description="How many faculty teach each weekly load"
                />
              </CardHeader>
              <CardContent>
                <WorkloadChart rows={all} />
              </CardContent>
            </Card>
          )}

          {ownView ? (
            <Card>
              <CardContent>
                {all[0] ? (
                  <WorkloadBreakdown facultyId={all[0].faculty.id} />
                ) : (
                  <EmptyState
                    title="No workload yet"
                    description="Your workload appears once you have an active teaching designation."
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="flex flex-col gap-1.5 sm:min-w-56 sm:flex-1">
                    <SearchInput
                      id="workload-search"
                      label="Search faculty"
                      placeholder="Search name or employee ID"
                      value={search}
                      onChange={setSearch}
                    />
                  </div>
                  {!ownView && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="workload-department">Department</Label>
                      <Select
                        value={departmentId ? String(departmentId) : ALL}
                        onValueChange={(value) =>
                          setChosenDepartmentId(
                            value === ALL ? undefined : Number(value),
                          )
                        }
                        disabled={departmentChoices.length < 2}
                      >
                        <SelectTrigger
                          id="workload-department"
                          className="w-full sm:w-56"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {readScope === 'all' && (
                            <SelectItem value={ALL}>All departments</SelectItem>
                          )}
                          {departmentChoices.map((row) => (
                            <SelectItem key={row.id} value={String(row.id)}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="workload-status">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        setStatus(value as LoadStatus | typeof ALL)
                      }
                    >
                      <SelectTrigger
                        id="workload-status"
                        className="w-full sm:w-44"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All statuses</SelectItem>
                        {(Object.keys(LOAD_LABEL) as LoadStatus[]).map(
                          (key) => (
                            <SelectItem key={key} value={key}>
                              {LOAD_LABEL[key]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {rows.length === 0 ? (
                  <EmptyState
                    title={all.length ? 'No faculty match' : 'No faculty yet'}
                    description={
                      all.length
                        ? 'Change the search or filters.'
                        : 'Active teaching staff appear here with their timetable hours.'
                    }
                  />
                ) : (
                  <Table className="min-w-[44rem]">
                    <TableCaption className="sr-only">
                      Weekly teaching hours per faculty member
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col" className="pl-6">
                          Faculty
                        </TableHead>
                        <TableHead scope="col">Department</TableHead>
                        <TableHead scope="col" className="text-right">
                          Theory
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          Lab
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          Total
                        </TableHead>
                        <TableHead scope="col">Band</TableHead>
                        <TableHead scope="col">Status</TableHead>
                        <TableHead scope="col" className="pr-6">
                          <span className="sr-only">Details</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.faculty.id}>
                          <TableCell className="pl-6">
                            <span className="block font-medium">
                              {row.faculty.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {row.faculty.designation.name} ·{' '}
                              {row.faculty.employeeCode}
                            </span>
                          </TableCell>
                          <TableCell>{row.faculty.department.code}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.theoryHours} h
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.labHours} h
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {row.totalHours} h
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {bandLabel(row.minHours, row.maxHours)}
                          </TableCell>
                          <TableCell>
                            <LoadBadge status={row.status} />
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenId(row.faculty.id)}
                              aria-label={`View classes for ${row.faculty.name}`}
                            >
                              Classes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <WorkloadDrawer facultyId={openId} onClose={() => setOpenId(null)} />
      {bandsOpen && <ThresholdsDialog onClose={() => setBandsOpen(false)} />}
    </PageTransition>
  );
}
