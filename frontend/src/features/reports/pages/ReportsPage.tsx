import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { PlannedModuleBanner } from '@/components/shared/PlannedModuleBanner';
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
import {
  reportCategories,
  academicContinuityData,
  facultyByDepartmentData,
  monthlyLeaveTrends,
  type ReportCategory,
} from '@/data/mock/reports';
import {
  FileText,
  Repeat2,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Building2,
  GraduationCap,
  WalletCards,
  Award,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Repeat2,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Building2,
  GraduationCap,
  WalletCards,
  Award,
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportCategory | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleOpenReport(report: ReportCategory) {
    setSelectedReport(report);
    setPreviewOpen(true);
  }

  return (
    <PageTransition>
      <PageHeader
        title="Reports & Institutional Analytics"
        description="Accreditation dossier generation, academic continuity tracking, and campus audit metrics."
      />

      <PlannedModuleBanner route="/reports" />

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
              Academic Continuity Rate: {academicContinuityData.coverageRate}%
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              When faculty members submit leave requests, CampusHR automatically computes timetable conflicts and suggests substitute allocations to guarantee zero missed syllabus lectures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border bg-card px-4 py-2 text-center shadow-xs">
              <span className="text-[11px] text-muted-foreground">Affected Lectures</span>
              <div className="text-xl font-bold text-foreground">
                {academicContinuityData.affectedClassesThisMonth}
              </div>
            </div>
            <div className="rounded-lg border bg-card px-4 py-2 text-center shadow-xs">
              <span className="text-[11px] text-muted-foreground">Covered with Substitute</span>
              <div className="text-xl font-bold text-emerald-600">
                {academicContinuityData.classesSuccessfullyCovered}
              </div>
            </div>
            <Button
              className="gap-2"
              onClick={() => handleOpenReport(reportCategories[0])}
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
          {reportCategories.map((report) => {
            const Icon = iconMap[report.iconName] ?? FileText;
            const isContinuity = report.id === 'academic-continuity';

            return (
              <div
                key={report.id}
                onClick={() => handleOpenReport(report)}
                className={`group cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/50 hover:shadow-md ${
                  isContinuity ? 'border-primary/40 bg-card' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  {report.badge ? (
                    <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
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
                    <span className="font-bold text-sm text-foreground">{report.metricValue}</span>
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
        {/* Faculty Strength by Department */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Faculty Strength by Department</h3>
              <p className="text-xs text-muted-foreground">Headcount distribution across 6 academic wings (186 Total)</p>
            </div>
            <Badge variant="outline">Cadre Audit</Badge>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facultyByDepartmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    backgroundColor: 'var(--popover)',
                    borderColor: 'var(--border)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="employees" fill="#ea580c" radius={[4, 4, 0, 0]} name="Faculty Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Leave Trend */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Leave Trend by Quota Category</h3>
              <p className="text-xs text-muted-foreground">Monthly utilization of Casual, Medical, and Earned leaves</p>
            </div>
            <Badge variant="outline">Odd Semester</Badge>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyLeaveTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
                <Bar dataKey="Casual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Medical" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Earned" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <ReportPreviewModal
        report={selectedReport}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </PageTransition>
  );
}
