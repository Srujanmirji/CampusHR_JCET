import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ShieldCheck,
  CalendarDays,
  CalendarRange,
  Award,
  BookOpen,
  Send,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/shared/MetricCard';
import { NotificationsPreview } from './NotificationsPreview';
import { PunchCard } from '@/features/attendance/components/PunchCard';
import { useSession } from '@/features/auth/hooks/useSession';
import { useReportsSummary } from '@/features/reports/api/reports';
import { useLeaveWaiting } from '@/features/leave/hooks/useLeaveWaiting';
import { listWorkload } from '@/features/workload/api/workload';
import { listDepartments } from '@/features/departments/api/departments';

export function PrincipalDashboard() {
  const navigate = useNavigate();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const executiveSummaryQuery = useReportsSummary();
  const summary = executiveSummaryQuery.data;
  const leaveWaitingQuery = useLeaveWaiting();
  const pendingLeaves = leaveWaitingQuery.data ?? [];
  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  });
  const departments = departmentsQuery.data ?? [];

  const workloadQuery = useQuery({
    queryKey: ['workload', 'department'],
    queryFn: () => listWorkload(),
  });
  const principalDisplayName =
    user?.email?.split('@')[0].replaceAll('.', ' ') ?? 'Principal';
  const totalEmployees = summary?.headcount.total ?? 0;
  const teachingStaff = summary?.headcount.teaching ?? 0;
  const nonTeachingStaff = summary?.headcount.nonTeaching ?? 0;
  const doctoratesCount = summary?.headcount.doctorates ?? 0;
  const doctoratePercentage = teachingStaff
    ? Math.round((doctoratesCount / teachingStaff) * 100)
    : 0;
  const attendanceRate = summary?.attendance.todayRate ?? 0;
  const presentCount = summary?.attendance.present ?? 0;
  const onLeaveCount = summary?.attendance.onLeave ?? 0;
  const workloadCompliance = summary?.workload.normalLoadPercentage ?? 0;
  const departmentHealthMatrix = departments.map((department) => {
    const faculty = (workloadQuery.data ?? []).filter(
      (row) =>
        row.faculty.department.id === department.id && row.status !== null,
    );
    return {
      code: department.code,
      name: department.name,
      facultyCount: department.staff.teaching,
      attendanceRate:
        summary?.attendance.departmentAverages.find(
          (row) => row.department === department.code,
        )?.rate ?? 0,
      workloadCompliance:
        workloadQuery.isSuccess && faculty.length
          ? `${Math.round((faculty.filter((row) => row.status === 'NORMAL').length / faculty.length) * 100)}%`
          : '—',
    };
  });
  const cadre = summary?.headcount.cadre ?? {
    professors: 0,
    associateProfessors: 0,
    assistantProfessors: 0,
    others: 0,
  };
  if (executiveSummaryQuery.isPending)
    return <p role="status">Loading campus summary…</p>;
  if (executiveSummaryQuery.isError)
    return (
      <div role="alert">
        Campus summary unavailable.{' '}
        <Button onClick={() => void executiveSummaryQuery.refetch()}>
          Retry
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      {(departmentsQuery.isError ||
        workloadQuery.isError ||
        leaveWaitingQuery.isError) && (
        <p role="alert">
          Some department, workload or approval data could not be loaded.
          Refresh the page to retry.
        </p>
      )}
      {/* 1. Principal Executive Welcome Banner */}
      <section
        className="welcome-banner"
        aria-labelledby="principal-welcome-title"
      >
        <div>
          <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-sm mb-2 border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
            Institutional Governance & Leadership
          </span>
          <h2 id="principal-welcome-title">Welcome, {principalDisplayName}</h2>
          <p>Principal & Academic Head · JCET Hubballi</p>
          <span>
            Institutional Governance <b>•</b> {departments.length} Departments{' '}
            <b>•</b> {totalEmployees} Campus Staff
          </span>
        </div>
        <img
          src="/assets/jcet-campus.png"
          alt="JCET Hubballi campus visual"
          width="656"
          height="305"
        />
      </section>

      {/* 2. Web Attendance Punch Card for Principal */}
      <PunchCard />

      {/* 3. Institutional KPI Metrics Grid */}
      <section
        aria-label="Campus Key Performance Indicators"
        className="metrics-grid"
      >
        <MetricCard
          label="Campus Attendance Today"
          value={`${attendanceRate}%`}
          detail={`${presentCount} on campus • ${onLeaveCount} on leave`}
          icon={UserCheck}
          index={0}
          href="/attendance"
        />
        <MetricCard
          label="Faculty Workload Compliance"
          value={`${workloadCompliance}%`}
          detail="Faculty within their configured workload bands"
          icon={BarChart3}
          index={1}
          href="/workload"
        />
        <MetricCard
          label="Teaching Staff"
          value={teachingStaff}
          detail="Active teaching employees"
          icon={Award}
          index={2}
          href="/departments"
        />
        <MetricCard
          label="Executive Leave Sign-Offs"
          value={pendingLeaves.length}
          detail="Pending institutional & HOD escalations"
          icon={CalendarDays}
          index={3}
          href="/leave"
        />
        <MetricCard
          label="Doctorate Faculty Cadre"
          value={`${doctoratesCount} Ph.D`}
          detail={`${doctoratePercentage}% of teaching faculty • Research active`}
          icon={GraduationCap}
          index={4}
          href="/reports"
        />
        <MetricCard
          label="Academic Departments"
          value={`${departments.length} Active`}
          detail="Departments registered in CampusHR"
          icon={Building2}
          index={5}
          href="/departments"
        />
      </section>

      {/* 3. Middle 2-Column Row: Department Health Matrix & Executive Approvals Queue */}
      <div className="dashboard-charts">
        {/* Left: Department-wise Health & Attendance Matrix */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Department Academic & Attendance Matrix
                  </CardTitle>
                  <CardDescription>
                    Recorded attendance and configured workload bands
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                Current records
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left table-fixed">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3 w-28">Dept</th>
                    <th className="py-2.5 px-3 w-20 text-center">Faculty</th>
                    <th className="py-2.5 px-3 w-24 text-center">Attendance</th>
                    <th className="py-2.5 px-3 w-28 text-center">Workload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {departmentHealthMatrix.map((dept) => (
                    <tr
                      key={dept.code}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <div className="font-semibold text-primary">
                          {dept.code}
                        </div>
                        <div
                          className="text-xs text-muted-foreground truncate"
                          title={dept.name}
                        >
                          {dept.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-foreground font-mono">
                        {dept.facultyCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-medium text-foreground">
                          {dept.attendanceRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-medium text-foreground">
                          {dept.workloadCompliance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {departments.length} registered departments
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-primary"
            >
              <Link to="/reports">
                View Detailed Reports
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Right: Executive Approvals Queue & Governance Watch */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary/15 text-secondary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Executive Governance & Sign-Offs
                  </CardTitle>
                  <CardDescription>
                    Leaves requiring Principal sanction & institutional
                    compliance
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {pendingLeaves.length} Awaiting
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {pendingLeaves.length > 0 ? (
              <div className="space-y-2.5">
                {pendingLeaves.slice(0, 3).map((leave) => (
                  <div
                    key={leave.id}
                    className="p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {leave.employee?.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs uppercase font-mono"
                        >
                          {leave.leaveType?.name ?? 'Leave'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {leave.startDate} to {leave.endDate} •{' '}
                        <span className="font-medium text-foreground">
                          {leave.days} day(s)
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-xs gap-1 shrink-0"
                    >
                      <Link to="/leave">Review</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border/80 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  All Executive Leaves Up to Date
                </p>
                <p className="text-xs text-muted-foreground">
                  No pending institutional leave requests currently awaiting
                  Principal review.
                </p>
              </div>
            )}

            {/* AICTE Continuity and Ratio Governance Callouts */}
            <div className="pt-2 space-y-2">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-primary">
                    AICTE Faculty-Student Ratio
                  </p>
                  <p className="text-muted-foreground">
                    Student counts are not recorded here. Faculty-student ratios
                    require an institutional review.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Accreditation & Governance Status
                  </p>
                  <p className="text-muted-foreground">
                    Accreditation status requires an institutional review; it is
                    not calculated from staff records.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Principal has final sign-off authority
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-primary"
            >
              <Link to="/leave">
                Manage All Approvals
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Lower 2-Column Row: Teaching Cadre Distribution & Principal Quick Actions */}
      <div className="dashboard-lower">
        {/* Left: Teaching Cadre & Research Distribution */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Teaching Cadre & Research Distribution
                  </CardTitle>
                  <CardDescription>
                    Cadre proportion across {teachingStaff} academic teaching
                    staff
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {doctoratePercentage}% Ph.D
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="space-y-3">
              {/* Professors */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-foreground">Professors</span>
                  <span className="text-muted-foreground font-mono">
                    {cadre.professors} faculty
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((cadre.professors / (teachingStaff || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Associate Professors */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-foreground">Associate Professors</span>
                  <span className="text-muted-foreground font-mono">
                    {cadre.associateProfessors} faculty
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((cadre.associateProfessors / (teachingStaff || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Assistant Professors */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-foreground">Assistant Professors</span>
                  <span className="text-muted-foreground font-mono">
                    {cadre.assistantProfessors} faculty
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((cadre.assistantProfessors / (teachingStaff || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Non-Teaching Support Cadre:
              </span>
              <span className="font-semibold text-foreground font-mono">
                {nonTeachingStaff} staff across campus
              </span>
            </div>
          </CardContent>
          <CardFooter className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Active employee designation counts
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-primary"
            >
              <Link to="/employees">
                View Faculty Directory
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Right: Principal Executive Quick Actions */}
        <Card className="quick-actions flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary/15 text-secondary">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Principal Executive Actions
                </CardTitle>
                <CardDescription>
                  Institutional governance & administrative operations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="quick-action-grid">
              <Button variant="ghost" onClick={() => navigate('/reports')}>
                <FileSpreadsheet data-icon="inline-start" />
                <span>Executive Summary & Reports</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/leave')}>
                <CheckCheck data-icon="inline-start" />
                <span>Executive Leave Sign-Offs</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/workload')}>
                <BarChart3 data-icon="inline-start" />
                <span>AICTE Workload & Teaching Bands</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/timetable')}>
                <CalendarRange data-icon="inline-start" />
                <span>Campus Timetable Master</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/departments')}>
                <Building2 data-icon="inline-start" />
                <span>Academic Departments Health</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/notifications')}
              >
                <Send data-icon="inline-start" />
                <span>Campus-Wide Broadcast</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
          <CardFooter className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Institutional executive controls
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              JCET E265
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* 5. Campus Notifications & Broadcasts Preview */}
      <NotificationsPreview />
    </div>
  );
}
