import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { affectedClasses } from '@/data/mock/timetable';
import { getEmployee } from '@/data/mock/employees';
import { formatDate, formatTime } from '@/lib/academic';
import type { LeaveRequest } from '@/types/academic';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';

export function TimetablePreview({
  request,
  open,
  onOpenChange,
}: {
  request: LeaveRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = useAcademicWorkflow();
  const faculty = getEmployee(request.employeeId);
  const classes = affectedClasses.filter((item) => item.leaveId === request.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="timetable-preview max-w-2xl">
        <DialogHeader>
          <DialogTitle>Updated Timetable Preview</DialogTitle>
          <DialogDescription>
            Academic coverage for {faculty.name}’s approved leave period (
            {formatDate(request.start, true)}). Reflects confirmed substitute
            assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {classes.map((item) => {
            const coverage = state.coverage[item.id];
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border bg-card shadow-xs transition-colors hover:border-primary/40 space-y-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                      <Clock3 className="w-3.5 h-3.5" />
                      {formatTime(item.start)} – {formatTime(item.end)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="font-semibold text-xs"
                    >
                      {item.cohort}
                    </Badge>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatDate(item.date, true)}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {item.subject}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      Venue: <strong>{item.room}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/70 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block mb-0.5">
                      Original Faculty
                    </span>
                    <span className="font-medium text-foreground line-through opacity-75">
                      {faculty.name}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                      Substitute Faculty
                    </span>
                    {coverage?.kind === 'faculty' ? (
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-foreground text-sm font-semibold">
                          {getEmployee(coverage.facultyId).name}
                        </strong>
                        <Badge className="substitute-badge bg-emerald-600 text-white font-medium text-[11px]">
                          Substitute
                        </Badge>
                      </div>
                    ) : coverage?.kind === 'waived' ? (
                      <div>
                        <strong className="text-foreground">
                          No Substitute Required
                        </strong>
                        <p className="text-muted-foreground text-[11px] mt-0.5">
                          {coverage.reason}
                        </p>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-400 text-amber-700 bg-amber-50"
                      >
                        Needs Coverage
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
