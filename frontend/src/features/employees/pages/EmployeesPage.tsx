import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmployeeProfileDrawer } from '../components/EmployeeProfileDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { employees } from '@/data/mock/employees';
import type { Employee } from '@/types/academic';
import {
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  Search,
  FilterX,
  MoreVertical,
  Eye,
  Edit,
  UserCheck,
} from 'lucide-react';

export default function EmployeesPage() {
  const workflow = useAcademicWorkflow();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [designationFilter, setDesignationFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cross-module consistency: If Prof. Asha Patil's leave is approved, show On Leave
  const ashaLeaveStatus = workflow.status('LR001');

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Dynamic effective status for Prof. Asha Patil
      const effectiveStatus =
        emp.id === 'JCET-CSE-021' && ashaLeaveStatus === 'Approved'
          ? 'On Leave'
          : emp.status;

      // Search match
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesId = emp.id.toLowerCase().includes(query);
        const matchesSpec = emp.specialization.toLowerCase().includes(query);
        const matchesEmail = emp.email.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesSpec && !matchesEmail) {
          return false;
        }
      }

      // Department filter
      if (departmentFilter !== 'ALL' && emp.department !== departmentFilter) {
        return false;
      }

      // Designation filter
      if (
        designationFilter !== 'ALL' &&
        !emp.designation.includes(designationFilter)
      ) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && emp.employmentType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [
    search,
    departmentFilter,
    designationFilter,
    typeFilter,
    statusFilter,
    ashaLeaveStatus,
  ]);

  function handleViewProfile(emp: Employee) {
    setSelectedEmployee(emp);
    setDrawerOpen(true);
  }

  function handleResetFilters() {
    setSearch('');
    setDepartmentFilter('ALL');
    setDesignationFilter('ALL');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
  }

  return (
    <PageTransition>
      <PageHeader
        title="Employee Directory"
        description="Comprehensive faculty registry and staff records across JCET departments."
        action={
          <Button
            onClick={() =>
              toast.info('Adding employees isn’t available yet.', {
                id: 'add-emp',
              })
            }
          >
            <Users className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      {/* Summary Cards */}
      <section
        aria-label="Employee summary statistics"
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label="Total Employees"
          value={186}
          detail="132 teaching · 54 non-teaching"
          icon={Users}
          index={0}
        />
        <MetricCard
          label="Teaching Staff"
          value={132}
          detail="Professors, Assoc & Asst Professors"
          icon={GraduationCap}
          index={1}
        />
        <MetricCard
          label="Non-Teaching Staff"
          value={54}
          detail="Technical instructors & administration"
          icon={Briefcase}
          index={2}
        />
        <MetricCard
          label="Departments"
          value={6}
          detail="Active academic wings"
          icon={Building2}
          index={3}
        />
      </section>

      {/* Filter and Search Bar */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search faculty by name, ID (e.g. JCET-CSE-021), or specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Depts</SelectItem>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
                <SelectItem value="ME">Mechanical</SelectItem>
                <SelectItem value="CE">Civil</SelectItem>
                <SelectItem value="AI & ML">AI & ML</SelectItem>
                <SelectItem value="MBA">MBA</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={designationFilter}
              onValueChange={setDesignationFilter}
            >
              <SelectTrigger className="w-[150px] text-xs">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Ranks</SelectItem>
                <SelectItem value="HOD">Prof & HOD</SelectItem>
                <SelectItem value="Associate">Associate Prof</SelectItem>
                <SelectItem value="Assistant">Assistant Prof</SelectItem>
                <SelectItem value="Instructor">Lab Instructor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[125px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
              </SelectContent>
            </Select>

            {(search ||
              departmentFilter !== 'ALL' ||
              designationFilter !== 'ALL' ||
              statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2 text-xs"
              >
                <FilterX className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            Showing <b>{filteredEmployees.length}</b> records
          </span>
          <span className="italic">
            Click any row or 'View Profile' to inspect full academic credentials
          </span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No employees matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isEffectiveOnLeave =
                    emp.id === 'JCET-CSE-021' && ashaLeaveStatus === 'Approved';
                  const effectiveStatus = isEffectiveOnLeave
                    ? 'On Leave'
                    : emp.status;

                  return (
                    <tr
                      key={emp.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => handleViewProfile(emp)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            {emp.photo && (
                              <AvatarImage src={emp.photo} alt={emp.name} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {emp.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">
                              {emp.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                        {emp.id}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="font-medium text-xs"
                        >
                          {emp.department}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/90">
                        {emp.designation}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {emp.employmentType}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {emp.experience}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={
                            effectiveStatus === 'On Leave'
                              ? 'Approved'
                              : effectiveStatus === 'Active'
                                ? 'Approved'
                                : 'Pending'
                          }
                          label={effectiveStatus}
                        />
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2 text-xs"
                            onClick={() => handleViewProfile(emp)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Profile
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.info(
                                    'Editing employees isn’t available yet.',
                                    {
                                      id: 'edit-emp',
                                    },
                                  )
                                }
                              >
                                <Edit className="mr-2 h-3.5 w-3.5" />
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleViewProfile(emp)}
                              >
                                <UserCheck className="mr-2 h-3.5 w-3.5" />
                                Workload & Timetable
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <EmployeeProfileDrawer
        employee={selectedEmployee}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        isEffectiveOnLeave={
          selectedEmployee?.id === 'JCET-CSE-021' &&
          ashaLeaveStatus === 'Approved'
        }
      />
    </PageTransition>
  );
}
