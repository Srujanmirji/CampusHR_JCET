import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReportCategory } from '@/data/mock/reports';
import { academicContinuityData } from '@/data/mock/reports';
import { FileText, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportPreviewModalProps {
  report: ReportCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportPreviewModal({ report, open, onOpenChange }: ReportPreviewModalProps) {
  if (!report) return null;

  const isAcademicContinuity = report.id === 'academic-continuity';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{report.category}</Badge>
                {report.badge && (
                  <Badge variant="secondary" className="font-semibold text-primary">
                    {report.badge}
                  </Badge>
                )}
              </div>
              <DialogTitle className="mt-1 text-xl font-bold">{report.title}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                {report.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Executive Metric Callout */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">{report.metricLabel}</span>
              <div className="mt-1 text-2xl font-bold text-primary">{report.metricValue}</div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">Audit Status</span>
              <div className="mt-1 text-sm font-bold text-emerald-600">Verified</div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">Cycle</span>
              <div className="mt-1 text-sm font-bold">Odd Sem 2026</div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <span className="text-muted-foreground">Timestamp</span>
              <div className="mt-1 text-sm font-bold">{report.updatedAt}</div>
            </div>
          </div>

          {/* Academic Continuity Detailed Section */}
          {isAcademicContinuity ? (
            <div className="rounded-xl border p-4 space-y-4">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Teaching Continuity Breakdown (October 2026)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded border bg-card p-2.5">
                  <span className="text-muted-foreground">Total Faculty Leaves</span>
                  <div className="text-lg font-bold">{academicContinuityData.facultyLeavesHandled}</div>
                </div>
                <div className="rounded border bg-card p-2.5">
                  <span className="text-muted-foreground">Affected Lectures</span>
                  <div className="text-lg font-bold">{academicContinuityData.affectedClassesThisMonth}</div>
                </div>
                <div className="rounded border bg-card p-2.5">
                  <span className="text-muted-foreground">Substitutes Assigned</span>
                  <div className="text-lg font-bold text-emerald-600">
                    {academicContinuityData.classesSuccessfullyCovered}
                  </div>
                </div>
                <div className="rounded border bg-card p-2.5">
                  <span className="text-muted-foreground">Uncovered Lectures</span>
                  <div className="text-lg font-bold text-amber-600">
                    {academicContinuityData.uncoveredClasses}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 font-semibold border-b">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Course & Room</th>
                      <th className="p-2.5">Original Faculty</th>
                      <th className="p-2.5">Substitute Faculty</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2.5 font-mono">2026-10-12</td>
                      <td className="p-2.5 font-medium">DBMS · LH-203</td>
                      <td className="p-2.5">Prof. Asha Patil</td>
                      <td className="p-2.5 font-semibold text-primary">Prof. Priya Kulkarni</td>
                      <td className="p-2.5 text-right">
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                          Covered
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono">2026-10-12</td>
                      <td className="p-2.5 font-medium">DBMS Lab · Lab 2</td>
                      <td className="p-2.5">Prof. Asha Patil</td>
                      <td className="p-2.5 font-semibold text-primary">Prof. Priya Kulkarni</td>
                      <td className="p-2.5 text-right">
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                          Covered
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono">2026-10-10</td>
                      <td className="p-2.5 font-medium">Thermodynamics · LH-104</td>
                      <td className="p-2.5">Dr. Mahesh B</td>
                      <td className="p-2.5">Prof. Kiran Hiremath</td>
                      <td className="p-2.5 text-right">
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                          Covered
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-4">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Executive Report Dataset
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Contains validated departmental returns, VTU compliance metrics, AICTE cadre benchmarks, and staff workload distribution matrices.
              </p>
              <div className="mt-3 rounded border bg-muted/20 p-3 space-y-1 font-mono text-[11px]">
                <div>• Source System: CampusHR Biometric & Timetable Core</div>
                <div>• Generation Mode: Automated Nightly Aggregation</div>
                <div>• Format: Standard VTU/NBA Annexure Compliant</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3">
          <span className="text-[11px] text-muted-foreground">
            Export generated reports in official JCET college letterhead format.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Export will be enabled after backend integration.', { id: 'rep-excel' })}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              size="sm"
              onClick={() => toast.info('Export will be enabled after backend integration.', { id: 'rep-pdf' })}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
