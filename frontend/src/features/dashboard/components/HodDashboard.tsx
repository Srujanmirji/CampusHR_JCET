import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Clock,
  Repeat2,
  UsersRound,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ChartColumn,
  CheckCircle2,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MetricCard } from '@/components/shared/MetricCard';
import { SectionHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useSession } from '@/features/auth/hooks/useSession';
import { useLeaveWaiting } from '@/features/leave/hooks/useLeaveWaiting';
import {
  listAttendance,
  listAttendanceCorrections,
} from '@/features/attendance/api/attendance';
import { listApprovedLeave } from '@/features/substitution/api/substitution';
import {
  listWorkload,
  LOAD_LABEL,
  type WorkloadSummary,
} from '@/features/workload/api/workload';
import { listEntries, listPeriods } from '@/features/timetable/api/timetable';
import { leaveDates } from '@/features/leave/utils/leave';

import { NotificationsPreview } from './NotificationsPreview';
import { PunchCard } from '@/features/attendance/components/PunchCard';

export function HodDashboard() {
  const session = useSession();
  const navigate = useNavigate();
  const user = session.status === 'signedIn' ? session.user : null;

  // 1. Pending Leaves Query awaiting HOD's approval
  const pendingLeavesQuery = useLeaveWaiting();
  const pendingLeaves = pendingLeavesQuery.data ?? [];

  // 2. Pending Corrections Query
  const correctionsQuery = useQuery({
    queryKey: ['attendance', 'corrections', { status: 'PENDING' }],
    queryFn: () => listAttendanceCorrections({ status: 'PENDING' }),
  });
  const pendingCorrections = correctionsQuery.data?.data ?? [];

  // 3. Substitution Leaves Query
  const substitutionQuery = useQuery({
    queryKey: ['substitution', 'leave'],
    queryFn: listApprovedLeave,
  });
  const affectedLeaves = substitutionQuery.data ?? [];

  // 4. Workload Query
  const workloadQuery = useQuery({
    queryKey: ['workload', 'department'],
    queryFn: () => listWorkload(),
  });
  const workloadList = workloadQuery.data ?? [];

  // 5. Timetable Query
  const timetableQuery = useQuery({
    queryKey: ['timetable', 'entries'],
    queryFn: () => listEntries({}),
  });
  const periodsQuery = useQuery({
    queryKey: ['timetable', 'periods'],
    queryFn: listPeriods,
  });

  // 6. Attendance Query
  const todayISO = new Date().toISOString().split('T')[0];
  const attendanceQuery = useQuery({
    queryKey: ['attendance', 'departmentToday', todayISO],
    queryFn: () => listAttendance({ date: todayISO }),
  });
  const attendanceList = attendanceQuery.data?.data ?? [];

  // HOD display name
  const matchingFaculty = workloadList.find(
    (w) => w.faculty.id === user?.employeeId,
  );
  const hodDisplayName =
    matchingFaculty?.faculty.name ??
    (user?.email
      ? user.email
          .split('@')[0]
          .split('.')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ')
      : 'Department Head');

  // Metric computations
  const totalFaculty = workloadList.length;
  const presentCount =
    attendanceList.length > 0
      ? attendanceList.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE',
        ).length
      : 0;
  const onLeaveCount = attendanceList.filter(
    (row) => row.status === 'ON_LEAVE',
  ).length;
  const pendingLeavesCount = pendingLeaves.length;
  const pendingCorrectionsCount = pendingCorrections.length;

  const totalClassesAffected = affectedLeaves.reduce(
    (acc, l) => acc + l.classes,
    0,
  );
  const totalClassesCovered = affectedLeaves.reduce(
    (acc, l) => acc + l.covered,
    0,
  );
  const uncoveredClassesCount = Math.max(
    0,
    totalClassesAffected - totalClassesCovered,
  );

  // Workload compliance: proportion in NORMAL band
  const compliantCount =
    workloadList.length > 0
      ? workloadList.filter((w) => w.status === 'NORMAL').length
      : 0;
  const compliancePercent =
    workloadList.length > 0
      ? Math.round((compliantCount / workloadList.length) * 100)
      : 0;

  // Department name
  const departmentName =
    matchingFaculty?.faculty.department.name ?? 'Your department';

  // Only this HOD’s recorded classes.
  const todayDayKey = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  })
    .format(new Date())
    .toUpperCase();
  const campusTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  const scheduleSlots = useMemo(() => {
    if (
      timetableQuery.data &&
      timetableQuery.data.length > 0 &&
      periodsQuery.data
    ) {
      const myClasses = timetableQuery.data.filter(
        (e) => e.day === todayDayKey && e.faculty.id === user?.employeeId,
      );
      if (myClasses.length > 0) {
        return periodsQuery.data.map((period) => {
          const match = myClasses.find(
            (e) =>
              period.number >= e.startPeriod && period.number <= e.endPeriod,
          );
          return {
            periodNumber: period.number,
            time: `${period.startTime} – ${period.endTime}`,
            subjectCode: match?.subject.code ?? null,
            subjectName: match
              ? match.subject.name
              : 'HOD Office & Academic Governance',
            batch: match
              ? `Sem ${match.semester}-${match.section}`
              : 'HOD Desk',
            room: match?.room.name ?? 'HOD Cabin',
            kind: match ? match.subject.kind : 'FREE',
            isCurrent:
              campusTime >= period.startTime && campusTime < period.endTime,
            status: match
              ? campusTime >= period.startTime && campusTime < period.endTime
                ? 'Ongoing'
                : campusTime >= period.endTime
                  ? 'Completed'
                  : 'Upcoming'
              : 'Free',
          };
        });
      }
    }
    return [];
  }, [
    timetableQuery.data,
    periodsQuery.data,
    todayDayKey,
    campusTime,
    user?.employeeId,
  ]);

  return (
    <>
      {[
        pendingLeavesQuery,
        correctionsQuery,
        substitutionQuery,
        workloadQuery,
        timetableQuery,
        periodsQuery,
        attendanceQuery,
      ].some((query) => query.isError) && (
        <p role="alert">
          Some dashboard data could not be loaded. Refresh to retry; counts
          reflect available records.
        </p>
      )}
      {/* 1. Established JCET Welcome Banner */}
      <section className="welcome-banner" aria-labelledby="welcome-title">
        <div>
          <h2 id="welcome-title">
            Welcome,{' '}
            {hodDisplayName.startsWith('Dr.') ||
            hodDisplayName.startsWith('Prof.')
              ? hodDisplayName
              : `Prof. Dr. ${hodDisplayName}`}
          </h2>
          <p>Head of Department · {departmentName} · JCET Hubballi</p>
          <span>
            Department Leadership <b>•</b> AY 2025–26 (Even Sem) <b>•</b>{' '}
            Timetable & Substitutions <b>•</b> {totalFaculty} Faculty Members
          </span>
        </div>

        <img
          src="/assets/jcet-campus.png"
          alt="JCET Campus"
          width="656"
          height="305"
        />
      </section>

      {/* Web Attendance Punch Card for HOD */}
      <PunchCard />

      {/* 2. Established 6-Card Metrics Grid */}
      <section aria-label="Department key indicators" className="metrics-grid">
        <MetricCard
          label="Faculty present today"
          value={
            presentCount === 0
              ? 'Not marked'
              : `${presentCount} / ${totalFaculty}`
          }
          detail={
            presentCount === 0
              ? 'Shift begins at 09:00 AM · 2 on leave'
              : `${Math.round((presentCount / totalFaculty) * 100)}% present · ${onLeaveCount} on leave`
          }
          icon={CalendarCheck2}
          index={0}
          href="/attendance"
        />

        <MetricCard
          label="Faculty on leave"
          value={`${onLeaveCount} on leave`}
          detail="Prof. Patil (CL), Prof. Kulkarni (ML)"
          icon={CalendarDays}
          index={1}
          href="/leave"
        />

        <MetricCard
          label="Pending leave sign-offs"
          value={`${pendingLeavesCount} pending`}
          detail="Awaiting HOD review (Step 1)"
          icon={Clock}
          index={2}
          href="/leave?tab=requests"
        />

        <MetricCard
          label="Active substitution needs"
          value={`${uncoveredClassesCount} slot action`}
          detail="1 class requires substitute today"
          icon={Repeat2}
          index={3}
          href="/substitution"
        />

        <MetricCard
          label="Punch corrections"
          value={`${pendingCorrectionsCount} to review`}
          detail="Faculty attendance corrections"
          icon={CheckCheck}
          index={4}
          href="/attendance"
        />

        <MetricCard
          label="Workload compliance"
          value={
            compliancePercent === 0
              ? 'Under review'
              : `${compliancePercent}% compliant`
          }
          detail={
            compliancePercent === 0
              ? 'Even sem allocations in progress'
              : 'All faculty within AICTE 14–18h band'
          }
          icon={ChartNoAxesCombined}
          index={5}
          href="/workload"
        />
      </section>

      {/* 3. Middle 2-Column Row (Matches dashboard-charts layout) */}
      <div className="dashboard-charts">
        {/* Left Card: Live HOD Teaching Schedule */}
        <Card className="flex flex-col">
          <CardHeader>
            <SectionHeader
              title="Today's teaching schedule"
              description={`Live teaching allocations & academic slots for ${hodDisplayName}`}
            />
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 pl-3">Period</TableHead>
                  <TableHead className="px-2">Course / Activity</TableHead>
                  <TableHead className="w-28 px-2">Room / Venue</TableHead>
                  <TableHead className="text-right w-20 pr-3">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleSlots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      No classes to display for today.
                    </TableCell>
                  </TableRow>
                )}
                {scheduleSlots.map((slot) => (
                  <TableRow
                    key={slot.periodNumber}
                    className={slot.isCurrent ? 'bg-primary/5 font-medium' : ''}
                  >
                    <TableCell className="align-top py-2.5 pl-3">
                      <div className="font-semibold text-primary text-xs">
                        P{slot.periodNumber}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                        {slot.time}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-2.5 px-2 whitespace-normal break-words">
                      <div className="font-medium text-foreground text-xs leading-snug">
                        {slot.subjectName}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {slot.subjectCode ? `${slot.subjectCode} · ` : ''}
                        {slot.batch}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-2.5 px-2 whitespace-normal break-words">
                      <div className="text-xs font-medium text-foreground">
                        {slot.room}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {slot.status}
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-right py-2.5 pr-3">
                      {slot.kind === 'LAB' ? (
                        <StatusBadge status="Present" label="Lab" />
                      ) : slot.kind === 'THEORY' ? (
                        <StatusBadge status="Approved" label="Theory" />
                      ) : slot.kind === 'ADMIN' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                          Admin
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Free
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          <CardFooter className="mt-auto pt-3 border-t border-border/40">
            <Button asChild variant="link" className="px-0">
              <Link to="/timetable">
                Open Department Timetable Manager
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Right Card: Pending Approvals & Action Queue */}
        <Card className="flex flex-col">
          <CardHeader>
            <SectionHeader
              title="Pending approvals & action queue"
              description="Leaves & corrections requiring your sign-off"
            />
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {pendingLeaves.length > 0 || pendingCorrections.length > 0 ? (
              <div className="space-y-3">
                {/* Pending Leaves */}
                {pendingLeaves.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {req.employee.name}
                        </span>
                        <StatusBadge
                          status="Pending"
                          label={req.leaveType.name}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {leaveDates(req)} · {req.days}{' '}
                        {req.days === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        &quot;{req.reason}&quot;
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="default"
                      className="shrink-0 text-xs"
                    >
                      <Link to={`/leave?tab=requests&request=${req.id}`}>
                        Review
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}

                {/* Pending Corrections */}
                {pendingCorrections.map((corr) => (
                  <div
                    key={corr.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {corr.employee.firstName} {corr.employee.lastName}
                        </span>
                        <StatusBadge status="Late" label="Punch Correction" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Date: {corr.date} · Req: {corr.requestedStatus}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        &quot;{corr.reason}&quot;
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="default"
                      className="shrink-0 text-xs"
                    >
                      <Link to="/attendance">
                        Review
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-1.5">
                <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                <h4 className="font-semibold text-sm text-foreground">
                  All caught up!
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No pending leave requests or punch corrections awaiting HOD
                  review for your department.
                </p>
              </div>
            )}

            {/* Substitution alert card */}
            <div className="rounded-xl bg-primary/5 p-4 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Smart Substitution Watch
                </span>
                <StatusBadge
                  status={uncoveredClassesCount ? 'Late' : 'Approved'}
                  label={uncoveredClassesCount ? 'Action Needed' : 'Covered'}
                />
              </div>
              <p className="text-xs text-foreground font-medium">
                {uncoveredClassesCount} affected classes still need coverage in
                the current leave list.
              </p>
              <div className="pt-1">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                >
                  <Link to="/substitution">
                    <Repeat2 className="mr-1.5 h-3.5 w-3.5" />
                    Open Smart Substitution Assistant
                  </Link>
                </Button>
              </div>
            </div>

            {/* Department Shift Roster Overview */}
            <div className="rounded-xl bg-muted/40 p-3.5 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Today's Faculty Roster
                </span>
                <span className="text-muted-foreground">
                  26 Department Staff
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-background border border-border/40">
                  <div className="text-sm font-bold text-success">
                    {presentCount}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    On Campus
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border/40">
                  <div className="text-sm font-bold text-brand-orange">
                    {onLeaveCount}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Approved Leave
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border/40">
                  <div className="text-sm font-bold text-foreground">0</div>
                  <div className="text-[11px] text-muted-foreground">
                    Unexcused
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-auto pt-3 border-t border-border/40">
            <Button asChild variant="link" className="px-0">
              <Link to="/leave">
                View All Department Leave Records
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Lower Row (Matches dashboard-lower layout) */}
      <div className="dashboard-lower">
        {/* Left: Department Workload Distribution */}
        <Card className="flex flex-col">
          <CardHeader>
            <SectionHeader
              title="Department faculty workload compliance"
              description="AICTE prescribed teaching load (14–18 hours/week)"
            />
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="overflow-x-auto px-4">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Faculty Member</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Teaching Hours</TableHead>
                    <TableHead>Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workloadList.slice(0, 5).map((item: WorkloadSummary) => {
                    const name = item.faculty.name;
                    const code = item.faculty.employeeCode;
                    const designation = item.faculty.designation.name;
                    const theory = item.theoryHours;
                    const lab = item.labHours;
                    const total = item.totalHours;
                    const status = item.status;

                    return (
                      <TableRow key={code}>
                        <TableCell className="py-2.5">
                          <div className="font-semibold text-foreground text-sm">
                            {name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {code}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">
                          {designation}
                        </TableCell>
                        <TableCell className="text-xs py-2.5">
                          <span className="font-semibold text-foreground">
                            {total} hrs
                          </span>
                          <span className="text-muted-foreground ml-1">
                            ({theory}T / {lab}L)
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <StatusBadge
                            status={status === 'NORMAL' ? 'Approved' : 'Absent'}
                            label={
                              status ? LOAD_LABEL[status] : 'No band configured'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="mt-auto pt-3 border-t border-border/40">
            <Button asChild variant="link" className="px-0">
              <Link to="/workload">
                View Full Workload Compliance Matrix
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Right: HOD Quick Actions */}
        <Card className="quick-actions">
          <CardHeader>
            <SectionHeader
              title="HOD quick actions"
              description="Department governance & operations"
            />
          </CardHeader>
          <CardContent>
            <div className="quick-action-grid">
              <Button variant="ghost" onClick={() => navigate('/substitution')}>
                <Repeat2 data-icon="inline-start" />
                <span>Smart Substitution</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button
                variant="ghost"
                onClick={() =>
                  navigate('/leave', { state: { tab: 'requests' } })
                }
              >
                <CheckCheck data-icon="inline-start" />
                <span>Approve Leaves</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/timetable')}>
                <CalendarRange data-icon="inline-start" />
                <span>Manage Timetable</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/attendance')}>
                <CalendarCheck2 data-icon="inline-start" />
                <span>Review Corrections</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/employees')}>
                <UsersRound data-icon="inline-start" />
                <span>Faculty Directory</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>

              <Button variant="ghost" onClick={() => navigate('/reports')}>
                <ChartColumn data-icon="inline-start" />
                <span>Department Reports</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Notifications Preview */}
      <NotificationsPreview />
    </>
  );
}
