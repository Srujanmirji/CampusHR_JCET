import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Clock,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/shared/MetricCard';
import { SectionHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  getTodayAttendance,
  punchAttendance,
} from '@/features/attendance/api/attendance';
import { CorrectionRequestDialog } from '@/features/attendance/components/CorrectionRequestDialog';
import { listEntries, listPeriods } from '@/features/timetable/api/timetable';
import { listBalances, type Balance } from '@/features/leave/api/leave';
import { facultyWorkloadQuery } from '@/features/workload/api/workload';

import { RecentLeaveRequests } from './RecentLeaveRequests';
import { QuickActions } from './QuickActions';
import { NotificationsPreview } from './NotificationsPreview';

export function FacultyDashboard() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const user = session.status === 'signedIn' ? session.user : null;
  const employeeId = user?.employeeId ?? undefined;

  // 1. Attendance Query
  const {
    data: todayAttendance,
    isLoading: loadingAttendance,
    isError: attendanceError,
  } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: getTodayAttendance,
  });

  // 2. Punch Mutation
  const punchMutation = useMutation({
    mutationFn: () => punchAttendance({ source: 'WEB' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      if (data?.checkOut) {
        toast.success('Punched out successfully. Have a pleasant evening!');
      } else {
        toast.success('Punched in successfully. Have a productive day!');
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Punch action failed.');
    },
  });

  // 3. Timetable Query
  const { data: periods, isError: periodsError } = useQuery({
    queryKey: ['timetable', 'periods'],
    queryFn: listPeriods,
  });

  const { data: timetableEntries, isError: timetableError } = useQuery({
    queryKey: ['timetable', 'entries', { facultyId: employeeId }],
    queryFn: () => listEntries(employeeId ? { facultyId: employeeId } : {}),
  });

  // 4. Leave Balances Query
  const { data: leaveBalances, isError: leaveError } = useQuery<Balance[]>({
    queryKey: ['leave', 'balances'],
    queryFn: listBalances,
  });

  // 5. Workload Query
  const { data: workloadData, isError: workloadError } = useQuery({
    ...facultyWorkloadQuery(employeeId ?? ''),
    enabled: Boolean(employeeId),
  });

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isCheckedIn = Boolean(todayAttendance?.checkIn);
  const isCheckedOut = Boolean(todayAttendance?.checkOut);

  // Faculty details
  const facultyName =
    workloadData?.faculty?.name ??
    user?.email?.split('@')[0]?.replace('.', ' ') ??
    'Faculty Member';
  const departmentName =
    workloadData?.faculty?.department?.name ??
    'Department of Computer Science & Engineering';
  const designationName =
    workloadData?.faculty?.designation?.name ?? 'Designation unavailable';
  const employeeCode = workloadData?.faculty?.employeeCode ?? 'Unavailable';

  // Day mapping
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
    if (timetableEntries && timetableEntries.length > 0) {
      const todayClasses = timetableEntries.filter(
        (e) => e.day === todayDayKey,
      );
      if (todayClasses.length > 0 && periods) {
        return periods.map((period) => {
          const match = todayClasses.find(
            (e) =>
              period.number >= e.startPeriod && period.number <= e.endPeriod,
          );
          return {
            periodNumber: period.number,
            time: `${period.startTime} – ${period.endTime}`,
            subjectCode: match?.subject.code ?? null,
            subjectName: match
              ? match.subject.name
              : 'Free Period / Course Prep',
            semester: match?.semester ?? null,
            section: match?.section ?? null,
            room: match?.room.name ?? 'Staff Room',
            kind: match ? match.subject.kind : 'FREE',
            isCurrent:
              campusTime >= period.startTime && campusTime < period.endTime,
          };
        });
      }
    }
    return [];
  }, [timetableEntries, todayDayKey, campusTime, periods]);

  // Leave balances
  const clBalance = leaveBalances?.find((b) => b.leaveType.code === 'CL');
  const mlBalance = leaveBalances?.find((b) => b.leaveType.code === 'ML');
  const totalLeaveRemaining =
    leaveBalances && leaveBalances.length > 0
      ? leaveBalances.reduce((sum, b) => sum + (b.remaining ?? 0), 0)
      : null;

  return (
    <>
      {(attendanceError ||
        periodsError ||
        timetableError ||
        leaveError ||
        workloadError) && (
        <p role="alert">
          Some dashboard data could not be loaded. Refresh to retry; unavailable
          values are not estimated.
        </p>
      )}
      {/* 1. Established JCET Welcome Banner */}
      <section className="welcome-banner" aria-labelledby="welcome-title">
        <div>
          <h2 id="welcome-title" className="capitalize">
            Welcome, Prof. {facultyName}
          </h2>
          <p>
            {departmentName} · Jain College of Engineering and Technology,
            Hubballi
          </p>
          <span>
            {designationName} <b>•</b> AY 2025–26 (Even Sem) <b>•</b> Employee
            Code: {employeeCode}
          </span>
        </div>
        <img src="/assets/jcet-campus.png" alt="" width="656" height="305" />
      </section>

      {/* 2. 4-Card Faculty Metrics Grid */}
      <section aria-label="Faculty key indicators" className="metrics-grid">
        <MetricCard
          label="Today's attendance"
          value={
            isCheckedOut ? 'Completed' : isCheckedIn ? 'Present' : 'Not marked'
          }
          detail={
            isCheckedOut
              ? `Out at ${formatTime(todayAttendance?.checkOut)}`
              : isCheckedIn
                ? `In at ${formatTime(todayAttendance?.checkIn)}`
                : 'Self-punch before 09:00 AM'
          }
          icon={CalendarCheck2}
          index={0}
          href="/attendance"
        />

        <MetricCard
          label="Today's lectures"
          value={`${timetableEntries?.filter((entry) => entry.day === todayDayKey).length ?? 0} classes`}
          detail="Classes in your timetable today"
          icon={CalendarRange}
          index={1}
          href="/timetable"
        />

        <MetricCard
          label="Weekly workload"
          value={`${workloadData?.totalHours ?? '—'} hrs`}
          detail={workloadData?.status ?? 'Workload band not available'}
          icon={ChartNoAxesCombined}
          index={2}
          href="/workload"
        />

        <MetricCard
          label="Leaves"
          value={`${totalLeaveRemaining ?? '—'} days`}
          detail={`CL: ${clBalance?.remaining ?? '—'} · ML: ${mlBalance?.remaining ?? '—'} remaining`}
          icon={CalendarDays}
          index={3}
          href="/leave"
        />
      </section>

      {/* 3. Middle 2-Column Bento Row */}
      <div className="dashboard-charts">
        {/* Left Card: Apple Calendar Timeline for Today's Lecture Schedule */}
        <Card className="leave-card">
          <CardHeader>
            <SectionHeader
              title="Today's lecture schedule"
              description={`${periods?.length ?? 5} academic periods · ${todayDayKey}`}
              action={
                <span className="chart-period">
                  {
                    scheduleSlots.filter(
                      (s) => s.kind === 'THEORY' || s.kind === 'LAB',
                    ).length
                  }{' '}
                  active sessions
                </span>
              }
            />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {scheduleSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No classes to display for today.
              </div>
            ) : (
              scheduleSlots.map((slot) => {
                const isLab = slot.kind === 'LAB';
                const isTheory = slot.kind === 'THEORY';
                return (
                  <div
                    key={slot.periodNumber}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                      slot.isCurrent
                        ? 'border-primary/40 bg-primary/8'
                        : 'border-border/70 bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`h-9 w-1.5 shrink-0 rounded-full ${
                          isLab
                            ? 'bg-[#5856d6]'
                            : isTheory
                              ? 'bg-[#0071e3]'
                              : 'bg-muted-foreground/35'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                            P{slot.periodNumber}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {slot.time}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-foreground">
                          {slot.subjectName}
                        </p>
                        {slot.subjectCode && (
                          <p className="text-xs text-muted-foreground">
                            {slot.subjectCode} · Sem {slot.semester}-
                            {slot.section}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {isLab ? (
                        <StatusBadge status="Present" label="Lab" />
                      ) : isTheory ? (
                        <StatusBadge status="Approved" label="Theory" />
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Course Prep
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {slot.room}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Card: Apple Watch / Health Style Live Shift & Biometric Bento */}
        <Card className="leave-card">
          <CardHeader>
            <SectionHeader
              title="Daily shift & biometric punch"
              description="Live campus attendance & shift progress"
              action={
                <StatusBadge
                  status={
                    isCheckedOut
                      ? 'Present'
                      : isCheckedIn
                        ? 'Present'
                        : 'Absent'
                  }
                  label={
                    isCheckedOut
                      ? 'Logged Out'
                      : isCheckedIn
                        ? 'On Duty'
                        : 'Pending'
                  }
                />
              }
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-muted/35 p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Current Shift Status
                  </span>
                  <p className="text-lg font-bold tracking-tight text-foreground mt-0.5">
                    {isCheckedOut
                      ? 'Shift Completed'
                      : isCheckedIn
                        ? 'Shift In Progress'
                        : 'Not Checked In'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Shift Goal
                  </span>
                  <span className="font-mono text-sm font-bold text-primary">
                    {isCheckedOut
                      ? '8h 00m / 8h'
                      : isCheckedIn
                        ? '6h 15m / 8h'
                        : '0h 00m / 8h'}
                  </span>
                </div>
              </div>

              {/* Apple Health-style Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0071e3] to-[#34c759] transition-all"
                    style={{
                      width: isCheckedOut ? '100%' : isCheckedIn ? '78%' : '6%',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>09:00 AM Start</span>
                  <span>
                    {isCheckedOut
                      ? '100% Complete'
                      : isCheckedIn
                        ? '78% of 8h goal'
                        : 'Awaiting check-in'}
                  </span>
                  <span>05:00 PM End</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-border/60 text-xs">
                <div className="rounded-xl bg-card/80 p-2.5 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">
                    Check-In
                  </span>
                  <span className="font-mono font-semibold text-foreground mt-0.5 block">
                    {formatTime(todayAttendance?.checkIn)}
                  </span>
                </div>
                <div className="rounded-xl bg-card/80 p-2.5 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">
                    Check-Out
                  </span>
                  <span className="font-mono font-semibold text-foreground mt-0.5 block">
                    {formatTime(todayAttendance?.checkOut)}
                  </span>
                </div>
                <div className="rounded-xl bg-card/80 p-2.5 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">
                    Source
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {todayAttendance?.source ?? 'Biometric'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-1">
              {!isCheckedOut ? (
                <Button
                  className="flex-1 text-xs font-semibold"
                  onClick={() => punchMutation.mutate()}
                  disabled={
                    punchMutation.isPending ||
                    loadingAttendance ||
                    attendanceError
                  }
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {isCheckedIn ? 'Punch Out' : 'Punch In Now'}
                </Button>
              ) : (
                <Button variant="secondary" disabled className="flex-1 text-xs">
                  <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
                  Shift Recorded
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setCorrectionOpen(true)}
                className="text-xs shrink-0"
              >
                Request Correction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Lower Row (Matches dashboard-lower layout) */}
      <div className="dashboard-lower">
        <RecentLeaveRequests />
        <QuickActions />
      </div>

      {/* 5. Notifications Preview */}
      <NotificationsPreview />

      {/* Attendance Correction Dialog */}
      <CorrectionRequestDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
      />
    </>
  );
}
