import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useReportsSummary } from '../api/reports';
import {
  FileText,
  Repeat2,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Building2,
  GraduationCap,
  Award,
  ArrowRight,
  type LucideIcon,
  Loader2,
} from 'lucide-react';

export interface ReportCategory {
  id: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
  metricLabel: string;
  metricValue: string;
  iconName: string;
  updatedAt: string;
}

const iconMap: Record<string, LucideIcon> = {
  Repeat2,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Building2,
  GraduationCap,
  Award,
};

export default function ReportsPage() {
  const { data: summary, isLoading } = useReportsSummary();
  const [selectedReport, setSelectedReport] = useState<ReportCategory | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const continuityRate = summary?.continuity.coverageRate ?? 94;
  const affectedLectures = summary?.continuity.affectedClasses ?? 18;
  const coveredLectures = summary?.continuity.classesCovered ?? 17;

  const dynamicCategories: ReportCategory[] = [
    {
      id: 'academic-continuity',
      title: 'Academic Continuity Report',
      category: 'Academics & Operations',
      description:
        'Tracks teaching continuity, affected lectures due to faculty leaves, Smart Substitution assignments, and coverage efficiency.',
      badge: 'Key Executive KPI',
      metricLabel: 'Coverage Rate',
      metricValue: `${continuityRate}%`,
      iconName: 'Repeat2',
      updatedAt: 'Live synchronization',
    },
    {
      id: 'attendance-analytics',
      title: 'Attendance Report',
      category: 'Workforce & Compliance',
      description:
        'Daily check-ins, late arrivals, half-day leaves, and department-wise attendance averages across campus.',
      metricLabel: 'Campus Attendance',
      metricValue: `${summary?.attendance.todayRate ?? 94.2}%`,
      iconName: 'CalendarCheck2',
      updatedAt: 'Today',
    },
    {
      id: 'leave-analytics',
      title: 'Leave Analytics & Trends',
      category: 'HR Management',
      description:
        'Monthly distribution of Casual, Medical, and Earned leaves, departmental absence frequencies, and quota utilization.',
      metricLabel: 'Monthly Leave Days',
      metricValue: `${summary?.leave.monthlyLeaveDays ?? 38} Days`,
      iconName: 'CalendarDays',
      updatedAt: 'October 2026 cycle',
    },
    {
      id: 'faculty-workload',
      title: 'Faculty Workload Distribution',
      category: 'Academics & Accreditation',
      description:
        'Audit of VTU/AICTE teaching hours per week across Professors, Associate Professors, and Assistant Professors.',
      metricLabel: 'Faculty at Normal Load',
      metricValue: `${summary?.workload.normalLoadPercentage ?? 81.8}%`,
      iconName: 'ChartNoAxesCombined',
      updatedAt: 'Weekly audit',
    },
    {
      id: 'department-strength',
      title: 'Department Strength & Cadre Ratio',
      category: 'Institutional Planning',
      description:
        'Cadre ratio breakdown (Professors to Assistant Professors), teaching to non-teaching allocations.',
      metricLabel: 'Total Headcount',
      metricValue: `${summary?.headcount.total ?? 60} Staff`,
      iconName: 'Building2',
      updatedAt: 'Live return',
    },
    {
      id: 'faculty-qualification',
      title: 'Faculty Qualification Profile',
      category: 'Accreditation',
      description:
        'Breakdown of Ph.D holders, pursuing Ph.D scholars, M.Tech specialists for NBA/NAAC criteria.',
      metricLabel: 'Doctorate Ratio',
      metricValue: summary?.headcount.total
        ? `${Math.round((summary.headcount.doctorates / summary.headcount.total) * 100)}%`
        : '48.5%',
      iconName: 'GraduationCap',
      updatedAt: 'NBA Cycle 2026',
    },
    {
      id: 'naac-nba-reporting',
      title: 'NAAC / NBA Faculty Metric Dossier',
      category: 'Compliance & Audit',
      description:
        'Automated Criteria 2.1, 2.2, 2.4 datasets with faculty retention rate, student-teacher ratio, and sanction letters.',
      badge: 'VTU / NBA Audit',
      metricLabel: 'Audit Readiness',
      metricValue: '96%',
      iconName: 'Award',
      updatedAt: 'Autumn 2026 cycle',
    },
  ];

  function handleOpenReport(report: ReportCategory) {
    setSelectedReport(report);
    setPreviewOpen(true);
  }

  const deptAttendanceData = summary?.attendance.departmentAverages.length
    ? summary.attendance.departmentAverages
    : [
        { department: 'CSE', rate: 95.2 },
        { department: 'ECE', rate: 93.8 },
        { department: 'MECH', rate: 91.5 },
        { department: 'CIVIL', rate: 94.0 },
      ];

  const leaveTrendsData = summary?.leave.monthlyTrends.length
    ? summary.leave.monthlyTrends
    : [
        { month: 'Jul 2026', CL: 16, ML: 4, EL: 2, other: 1 },
        { month: 'Aug 2026', CL: 18, ML: 5, EL: 3, other: 1 },
        { month: 'Sep 2026', CL: 22, ML: 6, EL: 4, other: 2 },
        { month: 'Oct 2026', CL: 26, ML: 7, EL: 4, other: 1 },
      ];

  return (
    <PageTransition>
      <PageHeader
        title="Reports & Institutional Analytics"
        description="Accreditation dossier generation, academic continuity tracking, and campus audit metrics."
      />

      {/* Featured KPI: Academic Continuity Banner */}
      <div className="mb-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-semibold">
                High-Impact Operational Metric
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Smart Substitution Efficacy
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Academic Continuity Rate: {continuityRate}%
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              When faculty members submit leave requests, CampusHR automatically
              computes timetable conflicts and suggests substitute allocations
              to guarantee zero missed syllabus lectures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border bg-card px-4 py-2 text-center shadow-xs">
              <span className="text-[11px] text-muted-foreground">
                Affected Lectures
              </span>
              <div className="text-xl font-bold text-foreground">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /> : affectedLectures}
              </div>
            </div>
            <div className="rounded-lg border bg-card px-4 py-2 text-center shadow-xs">
              <span className="text-[11px] text-muted-foreground">
                Covered with Substitute
              </span>
              <div className="text-xl font-bold text-emerald-600">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600" /> : coveredLectures}
              </div>
            </div>
            <Button
              className="gap-2"
              onClick={() => handleOpenReport(dynamicCategories[0])}
            >
              <Repeat2 className="h-4 w-4" />
              View Continuity Dossier
            </Button>
          </div>
        </div>
      </div>

      {/* Report Categories Grid */}
      <div className="mb-8">
        <h3 className="mb-4 text-base font-bold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Executive Audit & Statutory Reports
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dynamicCategories.map((report) => {
            const Icon = iconMap[report.iconName] ?? FileText;
            const isContinuity = report.id === 'academic-continuity';

            return (
              <div
                key={report.id}
                onClick={() => handleOpenReport(report)}
                className={`group cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/50 hover:shadow-md ${
                  isContinuity
                    ? 'border-primary/40 bg-card'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  {report.badge ? (
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-[10px] text-primary"
                    >
                      {report.badge}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {report.category.split(' ')[0]}
                    </Badge>
                  )}
                </div>

                <h4 className="mt-3.5 font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {report.title}
                </h4>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {report.description}
                </p>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">
                      {report.metricLabel}
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {report.metricValue}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Preview <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Department-wise Attendance Rate */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                Attendance Rate by Department
              </h3>
              <p className="text-xs text-muted-foreground">
                Average daily presence percentage across departments
              </p>
            </div>
            <Badge variant="outline">Live Attendance</Badge>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptAttendanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.3}
                />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    backgroundColor: 'var(--popover)',
                    borderColor: 'var(--border)',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [`${Number(value)}%`, 'Attendance Rate']}
                />
                <Bar
                  dataKey="rate"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  name="Attendance Rate"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Leave Trend */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                Leave Trend by Quota Category
              </h3>
              <p className="text-xs text-muted-foreground">
                Monthly utilization of Casual, Medical, and Earned leaves
              </p>
            </div>
            <Badge variant="outline">Odd Semester</Badge>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leaveTrendsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.3}
                />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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
                <Bar
                  dataKey="CL"
                  stackId="a"
                  fill="#ea580c"
                  name="Casual Leave"
                />
                <Bar
                  dataKey="ML"
                  stackId="a"
                  fill="#0284c7"
                  name="Medical Leave"
                />
                <Bar
                  dataKey="EL"
                  stackId="a"
                  fill="#10b981"
                  name="Earned Leave"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <ReportPreviewModal
        report={selectedReport}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </PageTransition>
  );
}
