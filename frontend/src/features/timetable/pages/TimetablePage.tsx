import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { employees } from '@/data/mock/employees';
import {
  weeklyTimetableCSE5A,
  timetableDays,
  timeSlots,
} from '@/data/mock/timetable';
import type { TimetableClass } from '@/types/academic';
import { MapPin, UserCheck, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function TimetablePage() {
  const workflow = useAcademicWorkflow();
  const [department, setDepartment] = useState('CSE');
  const [semester, setSemester] = useState('5th Semester');
  const [section, setSection] = useState('A');
  const [facultyFilter, setFacultyFilter] = useState('ALL');

  const [selectedSlot, setSelectedSlot] = useState<TimetableClass | null>(null);
  const [slotDetailOpen, setSlotDetailOpen] = useState(false);

  const coverage = workflow.state.coverage;

  // Render weekly grid
  // Rows: timeSlots, Columns: timetableDays
  const gridData = useMemo(() => {
    return timeSlots.map((slot) => {
      const daysRecord: Record<string, TimetableClass | undefined> = {};
      timetableDays.forEach((day) => {
        const found = weeklyTimetableCSE5A.find((c) => {
          if (c.day !== day) return false;
          // Check slot matching
          if (c.id === 'TT002' || c.isLab) {
            // Lab spans 02:00 - 04:00 PM (both period-5 and period-6)
            if (slot.id === 'period-5') return true;
            if (slot.id === 'period-6') return false; // covered by span
          }
          if (slot.id === 'period-2')
            return c.id === 'TT001' || c.timeSlot.includes('10:00');
          if (slot.id === 'period-1') return c.timeSlot.includes('09:00');
          if (slot.id === 'period-3') return c.timeSlot.includes('11:15');
          if (slot.id === 'period-4') return c.timeSlot.includes('12:15');
          if (slot.id === 'period-5')
            return c.timeSlot.includes('02:00') && !c.isLab;
          if (slot.id === 'period-7') return c.timeSlot.includes('04:00');
          return false;
        });

        // Filter by faculty if selected
        if (
          found &&
          facultyFilter !== 'ALL' &&
          found.facultyId !== facultyFilter
        ) {
          daysRecord[day] = undefined;
        } else {
          daysRecord[day] = found;
        }
      });
      return { slot, daysRecord };
    });
  }, [facultyFilter]);

  function handleSlotClick(cls: TimetableClass) {
    setSelectedSlot(cls);
    setSlotDetailOpen(true);
  }

  // Active substitute info for a class
  function getSubstituteInfo(cls: TimetableClass) {
    const cov = coverage[cls.id];
    if (cov && cov.kind === 'faculty') {
      const sub = employees.find((e) => e.id === cov.facultyId);
      return {
        isSubstitute: true,
        substituteName: sub?.name ?? 'Assigned Substitute',
        substituteId: cov.facultyId,
        originalFaculty: cls.facultyName,
      };
    }
    return {
      isSubstitute: false,
      substituteName: null,
      substituteId: null,
      originalFaculty: cls.facultyName,
    };
  }

  return (
    <PageTransition>
      <PageHeader
        title="Institutional Timetable"
        description="Weekly course matrix, laboratory allocations, and live Smart Substitution status."
        action={
          <Button
            variant="outline"
            onClick={() =>
              toast.info('Timetable printing isn’t available yet.', {
                id: 'export-tt',
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Download Schedule PDF
          </Button>
        }
      />

      {/* Filter Header */}
      <div className="mb-6 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Department
              </span>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSE">Computer Science (CSE)</SelectItem>
                  <SelectItem value="ECE">Electronics (ECE)</SelectItem>
                  <SelectItem value="ME">Mechanical (ME)</SelectItem>
                  <SelectItem value="CE">Civil (CE)</SelectItem>
                  <SelectItem value="AI & ML">AI & ML</SelectItem>
                  <SelectItem value="MBA">MBA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Semester
              </span>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3rd Semester">3rd Semester</SelectItem>
                  <SelectItem value="5th Semester">5th Semester</SelectItem>
                  <SelectItem value="7th Semester">7th Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Section
              </span>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger className="w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Faculty (Optional)
              </span>
              <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue placeholder="All Faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Faculty</SelectItem>
                  <SelectItem value="JCET-CSE-021">Prof. Asha Patil</SelectItem>
                  <SelectItem value="JCET-CSE-025">
                    Prof. Priya Kulkarni
                  </SelectItem>
                  <SelectItem value="JCET-CSE-007">
                    Dr. Rahul Deshpande
                  </SelectItem>
                  <SelectItem value="JCET-CSE-018">
                    Prof. Deepa Shetty
                  </SelectItem>
                  <SelectItem value="JCET-CSE-032">Dr. Kavya Rao</SelectItem>
                  <SelectItem value="JCET-CSE-001">Dr. Ramesh K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Regular Class
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              [Substitute] Reassigned
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-blue-600">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Laboratory Slot
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="w-32 border-r p-3 text-center">Time</th>
                {timetableDays.map((day) => (
                  <th
                    key={day}
                    className="min-w-[170px] border-r p-3 text-center last:border-r-0"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {gridData.map(({ slot, daysRecord }) => (
                <tr
                  key={slot.id}
                  className="transition-colors hover:bg-muted/10"
                >
                  <td className="border-r bg-muted/20 p-2.5 text-center font-mono text-xs font-medium text-muted-foreground">
                    <div className="font-semibold text-foreground">
                      {slot.label}
                    </div>
                  </td>
                  {timetableDays.map((day) => {
                    const cls = daysRecord[day];
                    if (!cls) {
                      return (
                        <td
                          key={day}
                          className="border-r p-2 text-center text-xs text-muted-foreground/40 last:border-r-0"
                        >
                          —
                        </td>
                      );
                    }

                    const subInfo = getSubstituteInfo(cls);

                    return (
                      <td
                        key={day}
                        rowSpan={cls.isLab ? 2 : 1}
                        className={`border-r p-2.5 align-top last:border-r-0 ${
                          cls.isLab ? 'bg-blue-500/5' : ''
                        }`}
                      >
                        <div
                          onClick={() => handleSlotClick(cls)}
                          className={`group cursor-pointer rounded-lg border p-2.5 transition-all hover:shadow-md ${
                            subInfo.isSubstitute
                              ? 'border-amber-400 bg-amber-500/10 shadow-xs'
                              : cls.isLab
                                ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20'
                                : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs text-foreground group-hover:text-primary">
                              {cls.subject}
                            </span>
                            {subInfo.isSubstitute && (
                              <Badge
                                variant="outline"
                                className="border-amber-500 bg-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                              >
                                [Substitute]
                              </Badge>
                            )}
                          </div>

                          <div className="mt-1.5 space-y-1 text-xs">
                            <div className="flex items-center gap-1 text-foreground/90 font-medium">
                              <UserCheck className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span
                                className={
                                  subInfo.isSubstitute
                                    ? 'font-bold text-amber-800 dark:text-amber-200'
                                    : ''
                                }
                              >
                                {subInfo.isSubstitute
                                  ? subInfo.substituteName
                                  : cls.facultyName}
                              </span>
                            </div>

                            {subInfo.isSubstitute && (
                              <div className="text-[10px] text-muted-foreground">
                                Orig: {cls.facultyName}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-mono">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {cls.room}
                              </span>
                              <span className="font-mono text-[10px] font-semibold">
                                {cls.cohort}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Detail Dialog */}
      <Dialog open={slotDetailOpen} onOpenChange={setSlotDetailOpen}>
        <DialogContent className="max-w-md">
          {selectedSlot && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedSlot.subjectCode}</Badge>
                  {getSubstituteInfo(selectedSlot).isSubstitute && (
                    <Badge
                      variant="outline"
                      className="border-amber-500 bg-amber-500/10 text-amber-600"
                    >
                      [Substitute Assigned]
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-bold">
                  {selectedSlot.subject}
                </DialogTitle>
                <DialogDescription>
                  {selectedSlot.day} · {selectedSlot.timeRange} ·{' '}
                  {selectedSlot.room}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 text-xs">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-muted-foreground">
                    Faculty Allocation:
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm font-semibold">
                    <span>
                      {getSubstituteInfo(selectedSlot).isSubstitute
                        ? getSubstituteInfo(selectedSlot).substituteName
                        : selectedSlot.facultyName}
                    </span>
                    {getSubstituteInfo(selectedSlot).isSubstitute && (
                      <Badge variant="secondary">Active Reassignment</Badge>
                    )}
                  </div>
                  {getSubstituteInfo(selectedSlot).isSubstitute && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Originally scheduled for {selectedSlot.facultyName} (On
                      Approved Leave).
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border p-2.5">
                    <span className="text-muted-foreground">Location:</span>
                    <div className="font-medium text-foreground">
                      {selectedSlot.room}
                    </div>
                  </div>
                  <div className="rounded border p-2.5">
                    <span className="text-muted-foreground">Cohort:</span>
                    <div className="font-medium text-foreground">
                      {selectedSlot.cohort}
                    </div>
                  </div>
                </div>

                <div className="rounded border p-2.5">
                  <span className="text-muted-foreground">
                    VTU Course Unit:
                  </span>
                  <div className="mt-0.5 font-medium text-foreground">
                    Module 3 — Transaction Processing, ACID Properties &
                    Concurrency Control Protocols
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={() => setSlotDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
