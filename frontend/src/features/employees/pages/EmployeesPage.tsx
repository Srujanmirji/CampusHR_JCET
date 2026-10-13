import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  GraduationCap,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCan } from '@/features/auth/hooks/useCan';
import { listDepartments } from '@/features/departments/api/departments';
import {
  EMPLOYMENT_TYPES,
  listEmployees,
  type Employee,
  type EmployeeFilters,
} from '../api/employees';
import { EmployeeFormSheet } from '../components/EmployeeFormSheet';
import { EmployeeProfileDrawer } from '../components/EmployeeProfileDrawer';
import { initialsOf } from '../utils/initials';

const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;
const ALL = 'ALL';

export default function EmployeesPage() {
  const can = useCan();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState<EmployeeFilters['status']>('ACTIVE');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The dashboard's "Add Employee" quick action opens the form directly.
  const [form, setForm] = useState<{ open: boolean; employee?: Employee }>({
    open: Boolean(
      (location.state as { addEmployee?: boolean } | null)?.addEmployee &&
      can('employee.create'),
    ),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const filters: EmployeeFilters = {
    search: debouncedSearch || undefined,
    departmentId: departmentId === ALL ? undefined : Number(departmentId),
    category:
      category === ALL ? undefined : (category as EmployeeFilters['category']),
    status,
    page,
    pageSize: PAGE_SIZE,
  };
  const employees = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => listEmployees(filters),
    placeholderData: keepPreviousData,
  });
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  });

  // Keep the open drawer in step with the latest data.
  const current =
    (selected && employees.data?.data.find((row) => row.id === selected.id)) ??
    selected;
  const meta = employees.data?.meta;
  const pages = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  const filtered =
    Boolean(search) ||
    departmentId !== ALL ||
    category !== ALL ||
    status !== 'ACTIVE';

  function open(employee: Employee) {
    setSelected(employee);
    setDrawerOpen(true);
  }
  function resetFilters() {
    setSearch('');
    setDepartmentId(ALL);
    setCategory(ALL);
    setStatus('ACTIVE');
    setPage(1);
  }
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <PageTransition>
      <PageHeader
        title="Employee Directory"
        description="Faculty and staff records across JCET departments."
        action={
          can('employee.create') ? (
            <Button onClick={() => setForm({ open: true })}>
              <UserPlus />
              Add employee
            </Button>
          ) : undefined
        }
      />

      <section
        aria-label="Employee summary"
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label={status === 'ACTIVE' ? 'Employees' : 'Archived'}
          value={meta?.total ?? '—'}
          detail={filtered ? 'Matching your filters' : 'In your directory'}
          icon={Users}
          index={0}
        />
        <MetricCard
          label="Teaching"
          value={meta?.teaching ?? '—'}
          detail="Professors and lecturers"
          icon={GraduationCap}
          index={1}
        />
        <MetricCard
          label="Non-teaching"
          value={meta?.nonTeaching ?? '—'}
          detail="Technical and administrative"
          icon={Briefcase}
          index={2}
        />
        <MetricCard
          label="Departments"
          value={departments.data?.length ?? '—'}
          detail="Including Administration"
          icon={Building2}
          index={3}
        />
      </section>

      <div className="mb-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="employee-search">Search</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="employee-search"
                type="search"
                placeholder="Name, email or employee ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-department">Department</Label>
              <Select
                value={departmentId}
                onValueChange={change(setDepartmentId)}
              >
                <SelectTrigger id="filter-department" className="lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All departments</SelectItem>
                  {departments.data?.map((department) => (
                    <SelectItem
                      key={department.id}
                      value={String(department.id)}
                    >
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-category">Staff</Label>
              <Select value={category} onValueChange={change(setCategory)}>
                <SelectTrigger id="filter-category" className="lg:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All staff</SelectItem>
                  <SelectItem value="TEACHING">Teaching</SelectItem>
                  <SelectItem value="NON_TEACHING">Non-teaching</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                value={status}
                onValueChange={change((value) =>
                  setStatus(value as EmployeeFilters['status']),
                )}
              >
                <SelectTrigger id="filter-status" className="lg:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {filtered && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="self-start lg:self-end"
            >
              <FilterX />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {employees.isPending ? (
          <div
            role="status"
            aria-label="Loading employees"
            className="flex flex-col gap-3 p-4"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : employees.isError ? (
          <div className="p-8">
            <EmptyState
              title="Couldn’t load employees"
              description={employees.error.message}
              actionLabel="Try again"
              onAction={() => void employees.refetch()}
            />
          </div>
        ) : employees.data.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={filtered ? 'No employees match' : 'No employees yet'}
              description={
                filtered
                  ? 'Try another name, department or status.'
                  : can('employee.create')
                    ? 'Add the first employee to start the directory.'
                    : 'Employees appear here once HR adds them.'
              }
              actionLabel={filtered ? 'Reset filters' : undefined}
              onAction={filtered ? resetFilters : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Employees</caption>
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Employee
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Employee ID
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Department
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Designation
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.data.data.map((employee) => (
                  <tr
                    key={employee.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => open(employee)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initialsOf(employee)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            className="min-h-11 text-left font-semibold text-foreground underline-offset-4 hover:underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              open(employee);
                            }}
                          >
                            {employee.firstName} {employee.lastName}
                            {employee.isHod && (
                              <Badge
                                variant="outline"
                                className="ml-2 align-middle"
                              >
                                HOD
                              </Badge>
                            )}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {employee.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {employee.employeeCode}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {employee.department.code}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {employee.designation.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {EMPLOYMENT_TYPES[employee.employmentType]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          employee.status === 'ACTIVE' ? 'Active' : 'Inactive'
                        }
                        label={
                          employee.status === 'ACTIVE' ? 'Active' : 'Archived'
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span role="status">
              {meta.total} {meta.total === 1 ? 'employee' : 'employees'}
              {pages > 1 && ` · page ${page} of ${pages}`}
            </span>
            {pages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next page"
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <EmployeeProfileDrawer
        employee={current}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={() => {
          setDrawerOpen(false);
          setForm({ open: true, employee: current ?? undefined });
        }}
      />
      <EmployeeFormSheet
        open={form.open}
        employee={form.employee}
        onOpenChange={(next) => setForm((state) => ({ ...state, open: next }))}
      />
    </PageTransition>
  );
}
