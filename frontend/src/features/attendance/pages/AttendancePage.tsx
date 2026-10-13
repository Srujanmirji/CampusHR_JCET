import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PlannedModuleBanner } from '@/components/shared/PlannedModuleBanner';
import { Button } from '@/components/ui/button';
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
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { employees } from '@/data/mock/employees';
import {
  mockDailyAttendance,
  departmentAttendanceRates,
  monthlyAttendanceTrend,
} from '@/data/mock/attendance';
import type { AttendanceStatus } from '@/types/academic';
import {
  UserCheck,
  UserX,
  CalendarDays,
  Clock,
  TrendingUp,
  Download,
  FilterX,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AttendancePage() {
  const workflow = useAcademicWorkflow();
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-12');

  const ashaLeaveStatus = workflow.status('LR001');

  // Filter attendance records
  const filteredRecords = useMemo(() => {
    return mockDailyAttendance
      .map((record) => {
        const emp = employees.find((e) => e.id === record.employeeId);
        // Dynamic status if Prof. Asha Patil's leave approved
        const effectiveStatus: AttendanceStatus =
          record.employeeId === 'JCET-CSE-021' && ashaLeaveStatus === 'Approved'
            ? 'On Leave'
            : record.status;

        const effectiveCheckIn =
          effectiveStatus === 'On Leave' ? '—' : record.checkIn;
        const effectiveCheckOut =
          effectiveStatus === 'On Leave' ? '—' : record.checkOut;
        const effectiveWorkingHours =
          effectiveStatus === 'On Leave' ? '—' : record.workingHours;

        return {
          ...record,
          status: effectiveStatus,
          checkIn: effectiveCheckIn,
          checkOut: effectiveCheckOut,
          workingHours: effectiveWorkingHours,
          employee: emp,
        };
      })
      .filter((item) => {
        if (!item.employee) return false;
        if (departmentFilter !== 'ALL' && item.employee.department !== departmentFilter) {
          return false;
        }
        if (statusFilter !== 'ALL' && item.status !== statusFilter) {
          return false;
        }
        return true;
      });
  }, [departmentFilter, statusFilter, ashaLeaveStatus]);

  return (
    <PageTransition>
      <PageHeader
        title="Attendance Management"
        description="Daily biometric verification, punch logs, and departmental attendance monitoring."
        action={
          <Button
            variant="outline"
            onClick={() =>
              toast.info('Attendance export report will be enabled after backend integration.', {
                id: 'export-att',
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export Day Log
          </Button>
        }
      />

      <PlannedModuleBanner route="/attendance" />

      {/* Summary Cards */}
      <section aria-label="Attendance key metrics" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Present Today"
          value={162}
          detail="87.1% verified biometric check-ins"
          icon={UserCheck}
          index={0}
        />
        <MetricCard
          label="Absent"
          value={8}
          detail="Unexcused day absences"
          icon={UserX}
          index={1}
        />
        <MetricCard
          label="On Leave"
          value={11}
          detail="Casual, Medical & Earned"
          icon={CalendarDays}
          index={2}
        />
        <MetricCard
          label="Late Arrivals"
          value={5}
          detail="Checked in after 09:00 AM"
          icon={Clock}
          index={3}
        />
        <MetricCard
          label="Attendance Rate"
          value="94%"
          detail="Institution-wide average"
          icon={TrendingUp}
          index={4}
        />
      </section>

      {/* Grid: Trend Chart & Department Attendance */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Monthly Trend Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Monthly Attendance Trend</h3>
              <p className="text-xs text-muted-foreground">October 2026 daily presence vs absences across JCET</p>
            </div>
            <Badge variant="outline">Past 12 Days</Badge>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAttendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    backgroundColor: 'var(--popover)',
                    borderColor: 'var(--border)',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Attendance Compact Section */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Department Attendance</h3>
            <Building className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Today's verified biometric presence percentage</p>
          <div className="space-y-3.5">
            {departmentAttendanceRates.map((dept) => (
              <div key={dept.department}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{dept.name} ({dept.department})</span>
                  <span className="font-bold text-foreground">{dept.rate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${dept.rate}%`,
                      backgroundColor:
                        dept.rate >= 95
                          ? '#10b981'
                          : dept.rate >= 92
                            ? '#3b82f6'
                            : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Table Filter Bar */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filter Log:
            </span>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
                <SelectItem value="ME">Mechanical</SelectItem>
                <SelectItem value="CE">Civil</SelectItem>
                <SelectItem value="AI & ML">AI & ML</SelectItem>
                <SelectItem value="MBA">MBA</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Half Day">Half Day</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-10-12">Today (Oct 12)</SelectItem>
                <SelectItem value="2026-10-11">Yesterday (Oct 11)</SelectItem>
                <SelectItem value="2026-10-10">Saturday (Oct 10)</SelectItem>
              </SelectContent>
            </Select>

            {(departmentFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDepartmentFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="h-9 px-2 text-xs"
              >
                <FilterX className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Showing <b>{filteredRecords.length}</b> verified punches for {selectedDate}
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Working Hours</th>
                <th className="px-4 py-3">Biometric Gateway</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No punch records found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const emp = item.employee!;
                  return (
                    <tr key={item.employeeId} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {emp.photo && <AvatarImage src={emp.photo} alt={emp.name} />}
                            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                              {emp.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">{emp.name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{emp.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {emp.department}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{item.checkIn}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.checkOut}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{item.workingHours}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.biometricTerminal}</td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge
                          status={
                            item.status === 'Present'
                              ? 'Approved'
                              : item.status === 'On Leave'
                                ? 'Approved'
                                : item.status === 'Late'
                                  ? 'Pending'
                                  : 'Rejected'
                          }
                          label={item.status}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
