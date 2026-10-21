import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge, type Status } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  UserCheck,
  UserX,
  CalendarDays,
  Clock,
  TrendingUp,
  Download,
  FilterX,
  Building,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCan, useScope } from '@/features/auth/hooks/useCan';
import { useSession } from '@/features/auth/hooks/useSession';
import { listDepartments } from '@/features/departments/api/departments';
import {
  listAttendance,
  listAttendanceCorrections,
  type AttendanceRecord,
} from '../api/attendance';
import { PunchCard } from '../components/PunchCard';
import { CorrectionsQueueDrawer } from '../components/CorrectionsQueueDrawer';

export default function AttendancePage() {
  const can = useCan();
  const scopeOf = useScope();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : undefined;
  const readScope = scopeOf('attendance.read');
  const isDeptScoped = readScope === 'department';
  const canApprove = can('attendance_correction.approve');

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  });

  const userDept = departments?.find((d) => d.id === user?.departmentId);
  const userDeptCode = userDept?.code ?? 'CSE';

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const departmentFilter = isDeptScoped ? userDeptCode : selectedDeptFilter;

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const todayIso = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [queueOpen, setQueueOpen] = useState(false);

  // 1. Fetch live attendance records
  const { data: attendanceResponse, isLoading } = useQuery({
    queryKey: ['attendance', 'list', selectedDate],
    queryFn: () => listAttendance({ date: selectedDate, limit: 100 }),
  });

  // 2. Fetch pending corrections count for HOD / HR
  const { data: pendingCorrections } = useQuery({
    queryKey: ['attendance', 'corrections', 'pending'],
    queryFn: () => listAttendanceCorrections({ status: 'PENDING' }),
    enabled: Boolean(canApprove),
  });

  const rawRecords = useMemo(
    () => attendanceResponse?.data || [],
    [attendanceResponse],
  );

  // 3. Filter records client-side for immediate responsive search
  const filteredRecords = useMemo(() => {
    return rawRecords.filter((record: AttendanceRecord) => {
      if (departmentFilter !== 'ALL' && record.employee.department.code !== departmentFilter) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        const mapped =
          record.status === 'PRESENT'
            ? 'Present'
            : record.status === 'LATE'
              ? 'Late'
              : record.status === 'HALF_DAY'
                ? 'Half Day'
                : record.status === 'ON_LEAVE'
                  ? 'On Leave'
                  : 'Absent';
        if (mapped !== statusFilter) return false;
      }
      return true;
    });
  }, [rawRecords, departmentFilter, statusFilter]);

  // 4. Calculate live metrics
  const metrics = useMemo(() => {
    const present = rawRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absent = rawRecords.filter((r) => r.status === 'ABSENT').length;
    const onLeave = rawRecords.filter((r) => r.status === 'ON_LEAVE').length;
    const late = rawRecords.filter((r) => r.status === 'LATE').length;
    const total = rawRecords.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;
    return { present, absent, onLeave, late, rate, total };
  }, [rawRecords]);

  // 5. Mock trend / overview visual data
  const trendData = [
    { date: 'Mon', Present: Math.max(metrics.present, 12), Leave: 2, Absent: 1 },
    { date: 'Tue', Present: Math.max(metrics.present, 14), Leave: 1, Absent: 0 },
    { date: 'Wed', Present: Math.max(metrics.present, 15), Leave: 3, Absent: 1 },
    { date: 'Thu', Present: Math.max(metrics.present, 13), Leave: 2, Absent: 2 },
    { date: 'Fri', Present: Math.max(metrics.present, 16), Leave: 1, Absent: 0 },
    { date: 'Sat', Present: Math.max(metrics.present, 11), Leave: 4, Absent: 1 },
  ];

  const pendingCount = pendingCorrections?.data?.length || 0;

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (checkIn?: string | null, checkOut?: string | null) => {
    if (!checkIn || !checkOut) return '—';
    const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000;
    return `${Math.max(0, diff).toFixed(1)} hrs`;
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.info('No attendance records available to export for this date.');
      return;
    }
    const headers = ['Employee Code', 'Name', 'Department', 'Date', 'Check In', 'Check Out', 'Status', 'Gateway'];
    const rows = filteredRecords.map((r) => [
      r.employee.employeeCode,
      `"${r.employee.firstName} ${r.employee.lastName}"`,
      r.employee.department.code,
      r.date.split('T')[0],
      r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : 'N/A',
      r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : 'N/A',
      r.status,
      r.source,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JCET_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance CSV downloaded successfully.');
  };

  return (
    <PageTransition>
      <PageHeader
        title="Attendance Management"
        description="Daily biometric verification, punch logs, and departmental attendance monitoring."
        action={
          <div className="flex items-center gap-2">
            {canApprove && (
              <Button
                variant={pendingCount > 0 ? 'default' : 'outline'}
                onClick={() => setQueueOpen(true)}
                className="relative"
              >
                <Inbox className="mr-2 h-4 w-4" />
                Corrections Queue
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-amber-400 text-black px-1.5 py-0 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Day Log
            </Button>
          </div>
        }
      />

      {/* Self Punch Card Component */}
      <div className="mb-6">
        <PunchCard />
      </div>

      {/* Summary Cards */}
      <section
        aria-label="Attendance key metrics"
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <MetricCard
          label="Present Today"
          value={metrics.present}
          detail="Verified biometric check-ins"
          icon={UserCheck}
          index={0}
        />
        <MetricCard
          label="Absent"
          value={metrics.absent}
          detail="Unexcused day absences"
          icon={UserX}
          index={1}
        />
        <MetricCard
          label="On Leave"
          value={metrics.onLeave}
          detail="Approved college leaves"
          icon={CalendarDays}
          index={2}
        />
        <MetricCard
          label="Late Arrivals"
          value={metrics.late}
          detail="Checked in after grace period"
          icon={Clock}
          index={3}
        />
        <MetricCard
          label="Attendance Rate"
          value={`${metrics.rate}%`}
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
              <h3 className="font-semibold text-foreground">
                Weekly Attendance Pattern
              </h3>
              <p className="text-xs text-muted-foreground">
                Presence vs absences across academic departments
              </p>
            </div>
            <Badge variant="outline">Current Week</Badge>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
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
            <h3 className="font-semibold text-foreground">
              {isDeptScoped ? 'Department Attendance Status' : 'Departments Status'}
            </h3>
            <Building className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Current verified attendance compliance
          </p>
          <div className="space-y-3.5">
            {[
              { code: 'CSE', name: 'Computer Science & Engg', rate: 96 },
              { code: 'ECE', name: 'Electronics & Comm', rate: 94 },
              { code: 'AIML', name: 'AI & Machine Learning', rate: 98 },
              { code: 'ME', name: 'Mechanical Engg', rate: 91 },
              { code: 'CE', name: 'Civil Engg', rate: 90 },
            ]
              .filter((dept) => !isDeptScoped || dept.code === userDeptCode)
              .map((dept) => (
                <div key={dept.code}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {dept.name} ({dept.code})
                    </span>
                    <span className="font-bold text-foreground">{dept.rate}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${dept.rate}%`,
                        backgroundColor:
                          dept.rate >= 95 ? '#10b981' : dept.rate >= 92 ? '#3b82f6' : '#f59e0b',
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
            <Select
              value={departmentFilter}
              onValueChange={setSelectedDeptFilter}
              disabled={isDeptScoped}
            >
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {!isDeptScoped && <SelectItem value="ALL">All Departments</SelectItem>}
                {(!isDeptScoped || userDeptCode === 'CSE') && (
                  <SelectItem value="CSE">Computer Science & Engineering</SelectItem>
                )}
                {!isDeptScoped && (
                  <>
                    <SelectItem value="ECE">Electronics & Communication</SelectItem>
                    <SelectItem value="AIML">Artificial Intelligence & ML</SelectItem>
                    <SelectItem value="ME">Mechanical Engineering</SelectItem>
                    <SelectItem value="CE">Civil Engineering</SelectItem>
                    <SelectItem value="MBA">MBA</SelectItem>
                    <SelectItem value="ADMIN">Administration</SelectItem>
                  </>
                )}
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
                <SelectItem value="Absent">Absent</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {((!isDeptScoped && departmentFilter !== 'ALL') || statusFilter !== 'ALL' || selectedDate !== todayIso) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDeptFilter('ALL');
                  setStatusFilter('ALL');
                  setSelectedDate(todayIso);
                }}
                className="h-9 px-2 text-xs"
              >
                <FilterX className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Showing <b>{filteredRecords.length}</b> records for {selectedDate}
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
                <th className="px-4 py-3">Source Gateway</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Loading verified punch logs...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No punch records found for {selectedDate}. Use "Punch In" above to record today's attendance.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item: AttendanceRecord) => {
                  const emp = item.employee;
                  const initials = `${emp.firstName[0] || ''}${emp.lastName[0] || ''}`.toUpperCase();
                  const mappedStatus: Status =
                    item.status === 'PRESENT'
                      ? 'Present'
                      : item.status === 'LATE'
                        ? 'Late'
                        : item.status === 'HALF_DAY'
                          ? 'Half Day'
                          : item.status === 'ON_LEAVE'
                            ? 'On Leave'
                            : 'Absent';

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground">
                              {emp.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {emp.department.code}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatTime(item.checkIn)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatTime(item.checkOut)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {calculateHours(item.checkIn, item.checkOut)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {item.source}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={mappedStatus} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Corrections Queue Drawer for HOD / HR */}
      {canApprove && (
        <CorrectionsQueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />
      )}
    </PageTransition>
  );
}
