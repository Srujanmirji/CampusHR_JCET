import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { employees } from '@/data/mock/employees';
import type { WorkloadRecord } from '@/types/academic';
import { Clock, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WorkloadDrawerProps {
  record: WorkloadRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkloadDrawer({ record, open, onOpenChange }: WorkloadDrawerProps) {
  if (!record) return null;

  const faculty = employees.find((e) => e.id === record.facultyId);
  if (!faculty) return null;

  const percentage = Math.min(100, Math.round((record.total / record.capacity) * 100));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-lg overflow-y-auto sm:max-w-xl"
        showCloseButton={true}
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-start gap-3.5">
            <Avatar className="h-14 w-14 border border-border">
              {faculty.photo && <AvatarImage src={faculty.photo} alt={faculty.name} />}
              <AvatarFallback className="bg-primary/10 font-bold text-primary">
                {faculty.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg font-bold">{faculty.name}</SheetTitle>
                <Badge
                  variant={
                    record.status === 'At Capacity' || record.status === 'Overloaded'
                      ? 'destructive'
                      : record.status === 'Near Limit'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {record.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {faculty.designation} · {faculty.department} · {faculty.id}
              </p>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Weekly workload breakdown, teaching allocations, and free substitution slots.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Main Capacity Card */}
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Weekly Teaching Workload</span>
                <div className="mt-0.5 text-2xl font-bold">
                  {record.total} / {record.capacity}{' '}
                  <span className="text-sm font-normal text-muted-foreground">hours / week</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Capacity Used</span>
                <div className="text-lg font-bold text-primary">{percentage}%</div>
              </div>
            </div>

            <div className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  record.status === 'At Capacity'
                    ? 'bg-red-500'
                    : record.status === 'Near Limit'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {record.status === 'At Capacity' && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Maximum VTU teaching hours reached. Smart Substitution engine automatically locks this faculty.
                </span>
              </div>
            )}
          </div>

          {/* Detailed Breakdown */}
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              Teaching Allocation Breakdown
            </h4>
            <div className="space-y-2 text-xs">
              {record.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="text-foreground/90">{item.label}</span>
                  <span className="font-mono font-bold text-foreground">{item.hours}h</span>
                </div>
              ))}
            </div>

            <div className="mt-3 border-t pt-3">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded bg-muted/40 p-2">
                  <span className="text-muted-foreground">Theory</span>
                  <div className="font-mono font-bold">{record.theory}h</div>
                </div>
                <div className="rounded bg-muted/40 p-2">
                  <span className="text-muted-foreground">Labs</span>
                  <div className="font-mono font-bold">{record.lab}h</div>
                </div>
                <div className="rounded bg-muted/40 p-2">
                  <span className="text-muted-foreground">Projects</span>
                  <div className="font-mono font-bold">{record.project}h</div>
                </div>
                <div className="rounded bg-muted/40 p-2">
                  <span className="text-muted-foreground">Mentoring</span>
                  <div className="font-mono font-bold">{record.mentoring}h</div>
                </div>
              </div>
            </div>
          </div>

          {/* Free Slots */}
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <h4 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Free Timetable Slots (Available for Substitution)
            </h4>
            <p className="mb-3 text-xs text-muted-foreground">
              These unoccupied lecture periods are factored into the Smart Substitution algorithm.
            </p>
            <div className="space-y-2 text-xs">
              {record.freeSlots.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-semibold text-foreground">{slot.day}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{slot.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
