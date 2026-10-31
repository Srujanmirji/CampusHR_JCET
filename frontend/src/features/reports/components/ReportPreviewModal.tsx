import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportCategory } from '../pages/ReportsPage';
import {
  useAttendanceReport,
  useLeaveReport,
  useWorkloadReport,
  useContinuityReport,
  downloadReportCsv,
  type AttendanceReportDto,
  type LeaveReportDto,
  type WorkloadReportDto,
  type ContinuityReportDto,
} from '../api/reports';

interface ReportPreviewModalProps {
  report: ReportCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportPreviewModal({
  report,
  open,
  onOpenChange,
}: ReportPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);

  const isAttendance = report?.id === 'attendance-analytics';
  const isLeave = report?.id === 'leave-analytics';
  const isWorkload = report?.id === 'faculty-workload';
  const isContinuity = report?.id === 'academic-continuity';

  const {
    data: attendanceData,
    isLoading: loadingAttendance,
    isError: errorAttendance,
    refetch: retryAttendance,
  } = useAttendanceReport(isAttendance && open ? {} : undefined);
  const {
    data: leaveData,
    isLoading: loadingLeave,
    isError: errorLeave,
    refetch: retryLeave,
  } = useLeaveReport(isLeave && open ? {} : undefined);
  const {
    data: workloadData,
    isLoading: loadingWorkload,
    isError: errorWorkload,
    refetch: retryWorkload,
  } = useWorkloadReport(isWorkload && open ? {} : undefined);
  const {
    data: continuityData,
    isLoading: loadingContinuity,
    isError: errorContinuity,
    refetch: retryContinuity,
  } = useContinuityReport(isContinuity && open ? {} : undefined);

  if (!report) return null;

  async function handleExportCsv() {
    try {
      setDownloading(true);
      if (isAttendance) {
        await downloadReportCsv('attendance');
      } else if (isLeave) {
        await downloadReportCsv('leave');
      } else if (isWorkload) {
        await downloadReportCsv('workload');
      } else if (isContinuity) {
        await downloadReportCsv('continuity');
      } else {
        await downloadReportCsv('attendance');
      }
      toast.success('Report CSV downloaded successfully.');
    } catch {
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const queryError = isAttendance
    ? errorAttendance
    : isLeave
      ? errorLeave
      : isWorkload
        ? errorWorkload
        : errorContinuity;
  const loading = isAttendance
    ? loadingAttendance
    : isLeave
      ? loadingLeave
      : isWorkload
        ? loadingWorkload
        : loadingContinuity;
  const records = isAttendance
    ? attendanceData?.records
    : isLeave
      ? leaveData?.records
      : isWorkload
        ? workloadData?.records
        : continuityData?.records;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="report-print sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{report.category}</Badge>
                {report.badge && (
                  <Badge
                    variant="secondary"
                    className="font-semibold text-primary"
                  >
                    {report.badge}
                  </Badge>
                )}
              </div>
              <DialogTitle className="mt-1 text-xl font-bold">
                {report.title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                {report.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {queryError && (
          <div role="alert">
            Report unavailable.{' '}
            <Button
              onClick={() => {
                if (isAttendance) void retryAttendance();
                if (isLeave) void retryLeave();
                if (isWorkload) void retryWorkload();
                if (isContinuity) void retryContinuity();
              }}
            >
              Retry
            </Button>
          </div>
        )}
        {!loading && !queryError && records?.length === 0 && (
          <p role="status">No records found for this report.</p>
        )}
        <div className="space-y-4 py-2 text-xs">
          {/* Executive Metric Callout */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">
                {report.metricLabel}
              </span>
              <div className="mt-1 text-2xl font-bold text-primary">
                {report.metricValue}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">Data Status</span>
              <div className="mt-1 text-sm font-bold text-emerald-600">
                {queryError ? 'Unavailable' : loading ? 'Loading' : 'Loaded'}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">Institution</span>
              <div className="mt-1 text-sm font-bold">JCET Hubballi</div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">Mode</span>
              <div className="mt-1 text-sm font-bold text-primary">
                Live Query
              </div>
            </div>
          </div>

          {/* 1. Academic Continuity Table */}
          {isContinuity && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Smart Substitution & Syllabus Continuity
                </h4>
                <Badge variant="secondary">
                  Coverage: {continuityData?.summary.coverageRate ?? '—'}%
                </Badge>
              </div>

              {loadingContinuity ? (
                <div className="py-8 text-center text-muted-foreground flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />{' '}
                  Loading live records...
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Subject</th>
                        <th className="p-2.5">Original Faculty</th>
                        <th className="p-2.5">Substitute Assigned</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(continuityData?.records ?? []).map(
                        (row: ContinuityReportDto['records'][number]) => (
                          <tr key={row.id}>
                            <td className="p-2.5 font-mono text-[11px]">
                              {row.date}
                            </td>
                            <td className="p-2.5 font-medium">{row.subject}</td>
                            <td className="p-2.5">{row.originalFaculty}</td>
                            <td className="p-2.5 font-semibold text-primary">
                              {row.substituteFaculty ??
                                (row.kind === 'NOT_NEEDED'
                                  ? 'Not needed'
                                  : 'Unassigned')}
                            </td>
                            <td className="p-2.5 text-right">
                              <Badge
                                variant="outline"
                                className={
                                  row.status === 'COVERED'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-amber-500 text-amber-600'
                                }
                              >
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. Attendance Analytics Table */}
          {isAttendance && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Staff Attendance & Compliance Records
                </h4>
                <Badge variant="secondary">
                  Avg Rate: {attendanceData?.summary.averageRate ?? 95}%
                </Badge>
              </div>

              {loadingAttendance ? (
                <div className="py-8 text-center text-muted-foreground flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />{' '}
                  Loading attendance...
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Dept</th>
                        <th className="p-2.5 text-center">Present</th>
                        <th className="p-2.5 text-center">Late</th>
                        <th className="p-2.5 text-center">Absent</th>
                        <th className="p-2.5 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(attendanceData?.records ?? []).map(
                        (row: AttendanceReportDto['records'][number]) => (
                          <tr key={row.employeeId}>
                            <td className="p-2.5 font-mono text-[11px]">
                              {row.employeeCode}
                            </td>
                            <td className="p-2.5 font-medium">{row.name}</td>
                            <td className="p-2.5 font-semibold text-primary">
                              {row.department}
                            </td>
                            <td className="p-2.5 text-center text-emerald-600 font-semibold">
                              {row.present}
                            </td>
                            <td className="p-2.5 text-center text-amber-600">
                              {row.late}
                            </td>
                            <td className="p-2.5 text-center text-rose-600">
                              {row.absent}
                            </td>
                            <td className="p-2.5 text-right font-bold">
                              {row.attendanceRate}%
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. Leave Utilization Table */}
          {isLeave && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Departmental Leave Quota Distribution
                </h4>
                <Badge variant="secondary">
                  Total Leave Days: {leaveData?.summary.totalDays ?? 0}
                </Badge>
              </div>

              {loadingLeave ? (
                <div className="py-8 text-center text-muted-foreground flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />{' '}
                  Loading leave records...
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Staff Name</th>
                        <th className="p-2.5">Dept</th>
                        <th className="p-2.5 text-center">CL</th>
                        <th className="p-2.5 text-center">ML</th>
                        <th className="p-2.5 text-center">EL</th>
                        <th className="p-2.5 text-right">Total Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(leaveData?.records ?? []).map(
                        (row: LeaveReportDto['records'][number]) => (
                          <tr key={row.employeeId}>
                            <td className="p-2.5 font-mono text-[11px]">
                              {row.employeeCode}
                            </td>
                            <td className="p-2.5 font-medium">{row.name}</td>
                            <td className="p-2.5 font-semibold text-primary">
                              {row.department}
                            </td>
                            <td className="p-2.5 text-center">{row.clDays}</td>
                            <td className="p-2.5 text-center">{row.mlDays}</td>
                            <td className="p-2.5 text-center">{row.elDays}</td>
                            <td className="p-2.5 text-right font-bold text-rose-600">
                              {row.totalApprovedDays}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. Faculty Workload Table */}
          {isWorkload && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  VTU / AICTE Weekly Workload Compliance
                </h4>
                <Badge variant="secondary">
                  Normal Load: {workloadData?.summary.normal ?? 0} Faculty
                </Badge>
              </div>

              {loadingWorkload ? (
                <div className="py-8 text-center text-muted-foreground flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />{' '}
                  Loading workload data...
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Faculty Name</th>
                        <th className="p-2.5">Dept</th>
                        <th className="p-2.5 text-center">Theory Hrs</th>
                        <th className="p-2.5 text-center">Lab Hrs</th>
                        <th className="p-2.5 text-center">Total Hrs</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(workloadData?.records ?? []).map(
                        (row: WorkloadReportDto['records'][number]) => (
                          <tr key={row.facultyId}>
                            <td className="p-2.5 font-mono text-[11px]">
                              {row.employeeCode}
                            </td>
                            <td className="p-2.5 font-medium">{row.name}</td>
                            <td className="p-2.5 font-semibold text-primary">
                              {row.department}
                            </td>
                            <td className="p-2.5 text-center">
                              {row.theoryHours}
                            </td>
                            <td className="p-2.5 text-center">
                              {row.labHours}
                            </td>
                            <td className="p-2.5 text-center font-bold">
                              {row.totalHours} hrs
                            </td>
                            <td className="p-2.5 text-right">
                              <Badge
                                variant="outline"
                                className={
                                  row.status === 'NORMAL'
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-amber-500 text-amber-600'
                                }
                              >
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!isContinuity && !isAttendance && !isLeave && !isWorkload && (
            <div className="rounded-xl border p-4">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Executive Report Dataset
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Contains validated departmental returns, VTU compliance metrics,
                AICTE cadre benchmarks, and staff workload distribution
                matrices.
              </p>
              <div className="mt-3 rounded border bg-muted/20 p-3 space-y-1 font-mono text-[11px]">
                <div>• Source System: CampusHR Biometric & Timetable Core</div>
                <div>• Generation Mode: Live PostgreSQL Aggregation</div>
                <div>• Format: Standard VTU/NBA Annexure Compliant</div>
              </div>
            </div>
          )}
        </div>

        <div
          data-report-controls
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3"
        >
          <span className="text-[11px] text-muted-foreground">
            Download recorded report data as CSV.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={downloading || loading || queryError}
              onClick={handleExportCsv}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Export CSV / Excel
            </Button>
            <Button
              size="sm"
              disabled={loading || queryError}
              onClick={() => window.print()}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
