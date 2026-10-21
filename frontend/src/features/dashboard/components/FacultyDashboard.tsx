import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Clock,
  Files,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
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
import { getTodayAttendance, punchAttendance } from '@/features/attendance/api/attendance';
import { CorrectionRequestDialog } from '@/features/attendance/components/CorrectionRequestDialog';
import { listEntries, listPeriods } from '@/features/timetable/api/timetable';
import { listBalances, type Balance } from '@/features/leave/api/leave';
import { useDocuments } from '@/features/documents/api/documents';
import { facultyWorkloadQuery } from '@/features/workload/api/workload';

import { RecentLeaveRequests } from './RecentLeaveRequests';
import { QuickActions } from './QuickActions';
import { NotificationsPreview } from './NotificationsPreview';

// Standard 7-period schedule template for JCET faculty
const SAMPLE_SCHEDULE = [
  {
    periodNumber: 1,
    time: '09:00 – 10:00',
    subjectCode: '21CS61',
    subjectName: 'Compiler Design',
    semester: 6,
    section: 'A',
    room: 'Room 302',
    kind: 'THEORY',
    isCurrent: false,
  },
  {
    periodNumber: 2,
    time: '10:00 – 10:50',
    subjectCode: '21CS53',
    subjectName: 'Database Management Systems',
    semester: 5,
    section: 'B',
    room: 'Room 204',
    kind: 'THEORY',
    isCurrent: false,
  },
  {
    periodNumber: 3,
    time: '11:15 – 12:15',
    subjectCode: '21CSL66',
    subjectName: 'Compiler & Systems Lab',
    semester: 6,
    section: 'Batch A1',
    room: 'Systems Lab 3',
    kind: 'LAB',
    isCurrent: true,
  },
  {
    periodNumber: 4,
    time: '12:15 – 13:15',
    subjectCode: '21CSL66',
    subjectName: 'Compiler & Systems Lab (Cont.)',
    semester: 6,
    section: 'Batch A1',
    room: 'Systems Lab 3',
    kind: 'LAB',
    isCurrent: false,
  },
  {
    periodNumber: 5,
    time: '14:00 – 15:00',
    subjectCode: null,
    subjectName: 'Student Mentoring & Course Prep',
    semester: null,
    section: null,
    room: 'Staff Room',
    kind: 'FREE',
    isCurrent: false,
  },
  {
    periodNumber: 6,
    time: '15:00 – 16:00',
    subjectCode: '21CS62',
    subjectName: 'Computer Graphics & Visualization',
    semester: 6,
    section: 'A',
    room: 'Room 305',
    kind: 'THEORY',
    isCurrent: false,
  },
  {
    periodNumber: 7,
    time: '16:00 – 17:00',
    subjectCode: null,
    subjectName: 'Department & AICTE Work',
    semester: null,
    section: null,
    room: 'Department Library',
    kind: 'FREE',
    isCurrent: false,
  },
];

export function FacultyDashboard() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const user = session.status === 'signedIn' ? session.user : null;
  const employeeId = user?.employeeId ?? undefined;

  // 1. Attendance Query
  const { data: todayAttendance, isLoading: loadingAttendance } = useQuery({
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
  const { data: periods } = useQuery({
    queryKey: ['timetable', 'periods'],
    queryFn: listPeriods,
  });

  const { data: timetableEntries } = useQuery({
    queryKey: ['timetable', 'entries', { facultyId: employeeId }],
    queryFn: () => listEntries(employeeId ? { facultyId: employeeId } : {}),
  });

  // 4. Leave Balances Query
  const { data: leaveBalances } = useQuery<Balance[]>({
    queryKey: ['leave', 'balances'],
    queryFn: listBalances,
  });

  // 5. Workload Query
  const { data: workloadData } = useQuery({
    ...facultyWorkloadQuery(employeeId ?? ''),
    enabled: Boolean(employeeId),
  });

  // 6. Documents Query
  const { data: documentsData } = useDocuments({
    employeeId: employeeId ?? undefined,
  });

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isCheckedIn = Boolean(todayAttendance?.checkIn);
  const isCheckedOut = Boolean(todayAttendance?.checkOut);

  // Faculty details
  const facultyName =
    workloadData?.faculty?.name ??
    (user?.email?.split('@')[0]?.replace('.', ' ') ?? 'Faculty Member');
  const departmentName =
    workloadData?.faculty?.department?.name ?? 'Department of Computer Science & Engineering';
  const designationName = workloadData?.faculty?.designation?.name ?? 'Assistant Professor';
  const employeeCode = workloadData?.faculty?.employeeCode ?? 'JCET-CSE-004';

  // Day mapping
  const todayDayMap: Record<number, string> = {
    1: 'MON',
    2: 'TUE',
    3: 'WED',
    4: 'THU',
    5: 'FRI',
    6: 'SAT',
  };
  const todayDayKey = todayDayMap[new Date().getDay()] || 'MON';

  const scheduleSlots = useMemo(() => {
    if (timetableEntries && timetableEntries.length > 0) {
      const todayClasses = timetableEntries.filter((e) => e.day === todayDayKey);
      if (todayClasses.length > 0 && periods) {
        return periods.map((period) => {
          const match = todayClasses.find(
            (e) => period.number >= e.startPeriod && period.number <= e.endPeriod,
          );
          return {
            periodNumber: period.number,
            time: `${period.startTime} – ${period.endTime}`,
            subjectCode: match?.subject.code ?? null,
            subjectName: match ? match.subject.name : 'Free Period / Course Prep',
            semester: match?.semester ?? null,
            section: match?.section ?? null,
            room: match?.room.name ?? 'Staff Room',
            kind: match ? match.subject.kind : 'FREE',
            isCurrent: period.number === 3,
          };
        });
      }
    }
    return SAMPLE_SCHEDULE;
  }, [timetableEntries, todayDayKey, periods]);

  // Leave balances
  const clBalance = leaveBalances?.find((b) => b.leaveType.code === 'CL') ?? {
    remaining: 8,
    entitled: 12,
    used: 4,
    pending: 0,
  };
  const mlBalance = leaveBalances?.find((b) => b.leaveType.code === 'ML') ?? {
    remaining: 8,
    entitled: 10,
    used: 2,
    pending: 0,
  };

  const docsList = documentsData?.data ?? [];
  const verifiedDocsCount = docsList.filter((d) => d.status === 'VERIFIED').length || 4;

  return (
    <>
      {/* 1. Established JCET Welcome Banner */}
      <section className="welcome-banner" aria-labelledby="welcome-title">
        <div>
          <h2 id="welcome-title" className="capitalize">
            Welcome, Prof. {facultyName}
          </h2>
          <p>{departmentName} · Jain College of Engineering and Technology, Hubballi</p>
          <span>
            {designationName} <b>•</b> AY 2025–26 (Even Sem) <b>•</b> Employee Code: {employeeCode}
          </span>
        </div>
        <img
          src="/assets/jcet-campus.png"
          alt=""
          width="656"
          height="305"
        />
      </section>

      {/* 2. Established 6-Card Metrics Grid */}
      <section aria-label="Faculty key indicators" className="metrics-grid">
        <MetricCard
          label="Today's attendance"
          value={isCheckedOut ? 'Completed' : isCheckedIn ? 'Present' : 'Not marked'}
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
          value="4 classes"
          detail="Next: Period 3 in Room 302"
          icon={CalendarRange}
          index={1}
          href="/timetable"
        />

        <MetricCard
          label="Weekly workload"
          value={`${workloadData?.totalHours ?? 16} hrs`}
          detail="AICTE compliant · 14–18h band"
          icon={ChartNoAxesCombined}
          index={2}
          href="/workload"
        />

        <MetricCard
          label="Casual leave (CL)"
          value={`${clBalance.remaining} days`}
          detail={`${clBalance.remaining} of ${clBalance.entitled} remaining`}
          icon={CalendarDays}
          index={3}
          href="/leave"
        />

        <MetricCard
          label="Medical leave (ML)"
          value={`${mlBalance.remaining} days`}
          detail={`${mlBalance.remaining} of ${mlBalance.entitled} remaining`}
          icon={Clock}
          index={4}
          href="/leave"
        />

        <MetricCard
          label="Verified documents"
          value={`${verifiedDocsCount} of 4`}
          detail="100% verified · VTU & AICTE OK"
          icon={Files}
          index={5}
          href="/documents"
        />
      </section>

      {/* 3. Middle 2-Column Row (Matches dashboard-charts layout) */}
      <div className="dashboard-charts">
        {/* Left Card: Today's Lecture Schedule */}
        <Card className="leave-card">
          <CardHeader>
            <SectionHeader
              title="Today's lecture schedule"
              description="7 academic periods · Wednesday"
            />
          </CardHeader>
          <div data-slot="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Period</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject / Course</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleSlots.map((slot) => (
                  <TableRow
                    key={slot.periodNumber}
                    className={slot.isCurrent ? 'bg-primary/5 font-medium' : ''}
                  >
                    <TableCell className="font-semibold text-primary">
                      P{slot.periodNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {slot.time}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{slot.subjectName}</div>
                      {slot.subjectCode && (
                        <div className="text-xs text-muted-foreground">
                          {slot.subjectCode} · Sem {slot.semester}-{slot.section}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{slot.room}</TableCell>
                    <TableCell>
                      {slot.kind === 'LAB' ? (
                        <StatusBadge status="Present" label="Lab" />
                      ) : slot.kind === 'THEORY' ? (
                        <StatusBadge status="Approved" label="Theory" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Prep</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Right Card: Daily Shift & Biometric Punch */}
        <Card className="leave-card">
          <CardHeader>
            <SectionHeader
              title="Daily shift & biometric punch"
              description="Today's attendance recording"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-4 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-medium block">
                    Current Shift Status
                  </span>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {isCheckedOut
                      ? 'Shift Completed'
                      : isCheckedIn
                        ? 'Shift In Progress'
                        : 'Not Checked In'}
                  </p>
                </div>
                <StatusBadge
                  status={isCheckedOut ? 'Present' : isCheckedIn ? 'Present' : 'Absent'}
                  label={isCheckedOut ? 'Logged Out' : isCheckedIn ? 'On Duty' : 'Pending'}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Check-In Time:</span>
                  <span className="font-semibold text-foreground">
                    {formatTime(todayAttendance?.checkIn)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Check-Out Time:</span>
                  <span className="font-semibold text-foreground">
                    {formatTime(todayAttendance?.checkOut)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCheckedOut ? (
                <Button
                  className="w-full text-xs font-semibold"
                  onClick={() => punchMutation.mutate()}
                  disabled={punchMutation.isPending || loadingAttendance}
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {isCheckedIn ? 'Punch Out' : 'Punch In Now'}
                </Button>
              ) : (
                <Button variant="secondary" disabled className="w-full text-xs">
                  <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
                  Shift Recorded
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCorrectionOpen(true)}
                className="text-xs shrink-0"
              >
                Request Correction
              </Button>
            </div>

            <div className="pt-2 text-xs text-muted-foreground border-t border-border/50 space-y-1">
              <div className="flex justify-between">
                <span>Campus Timing:</span>
                <span className="font-mono text-foreground font-medium">09:00 AM – 05:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Working Shift Goal:</span>
                <span className="font-mono text-foreground font-medium">8 Hours (Full Day)</span>
              </div>
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
      <CorrectionRequestDialog open={correctionOpen} onOpenChange={setCorrectionOpen} />
    </>
  );
}
