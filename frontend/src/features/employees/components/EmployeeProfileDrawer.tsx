import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import type { Employee } from '@/types/academic';
import { departmentNames } from '@/data/mock/employees';
import { facultyWorkloads } from '@/data/mock/workload';
import { mockDailyAttendance } from '@/data/mock/attendance';
import {
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Briefcase,
  BookOpen,
  Clock,
  FileText,
  Download,
  Building,
} from 'lucide-react';

interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEffectiveOnLeave?: boolean;
}

export function EmployeeProfileDrawer({
  employee,
  open,
  onOpenChange,
  isEffectiveOnLeave,
}: EmployeeProfileDrawerProps) {
  if (!employee) return null;

  const workload = facultyWorkloads.find((w) => w.facultyId === employee.id);
  const attendance = mockDailyAttendance.find((a) => a.employeeId === employee.id);

  const displayStatus = isEffectiveOnLeave ? 'On Leave' : employee.status;

  const dummyDocs = [
    { name: 'Appointment_Order_JCET.pdf', size: '1.2 MB', date: employee.joiningDate },
    { name: 'VTU_Faculty_Endorsement.pdf', size: '850 KB', date: '2021-11-10' },
    { name: 'Educational_Credentials_Consolidated.pdf', size: '3.4 MB', date: employee.joiningDate },
    { name: 'AICTE_Faculty_Registration_Proof.pdf', size: '520 KB', date: '2023-04-12' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-xl overflow-y-auto sm:max-w-2xl"
        showCloseButton={true}
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              {employee.photo && <AvatarImage src={employee.photo} alt={employee.name} />}
              <AvatarFallback className="bg-primary/10 font-bold text-lg text-primary">
                {employee.initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-xl font-bold">{employee.name}</SheetTitle>
                <StatusBadge
                  status={
                    displayStatus === 'On Leave'
                      ? 'Approved'
                      : displayStatus === 'Active'
                        ? 'Approved'
                        : 'Pending'
                  }
                  label={displayStatus}
                />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {employee.designation} · {departmentNames[employee.department]}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">{employee.id}</span>
                <span>•</span>
                <span>{employee.employmentType} Staff</span>
                <span>•</span>
                <span>Joined {employee.joiningDate}</span>
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Faculty profile details, workload, attendance, and credentials for {employee.name}.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              <TabsTrigger value="workload">Workload</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-4 space-y-5">
              {employee.bio && (
                <div className="rounded-lg border bg-muted/30 p-3.5 text-sm text-foreground/90">
                  <p className="leading-relaxed">{employee.bio}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3.5">
                  <h4 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Academic Profile
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Qualification:</span>
                      <p className="font-medium text-foreground">{employee.qualification}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Specialization:</span>
                      <p className="font-medium text-foreground">{employee.specialization}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Experience:</span>
                      <p className="font-medium text-foreground">{employee.experience}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3.5">
                  <h4 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Contact & Service
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-foreground">{employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-foreground">{employee.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{departmentNames[employee.department]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Joined: {employee.joiningDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Subjects Handled & Labs
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {employee.subjectsHandled.map((subj, idx) => (
                    <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs">
                      {subj}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ATTENDANCE TAB */}
            <TabsContent value="attendance" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <span className="text-xs text-muted-foreground">Monthly Rate</span>
                  <div className="text-xl font-bold text-emerald-600">96.4%</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <span className="text-xs text-muted-foreground">Days Present</span>
                  <div className="text-xl font-bold">21 / 22</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <span className="text-xs text-muted-foreground">Avg Hours</span>
                  <div className="text-xl font-bold">8h 05m</div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Biometric Log (2026-10-12)
                </h4>
                {attendance ? (
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Check-in:</span>
                      <span className="font-mono font-medium">{attendance.checkIn}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Check-out:</span>
                      <span className="font-mono font-medium">{attendance.checkOut}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Working Hours:</span>
                      <span className="font-mono font-medium">{attendance.workingHours}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Daily Status:</span>
                      <Badge variant="outline">{displayStatus === 'On Leave' ? 'On Leave' : attendance.status}</Badge>
                    </div>
                    <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                      <span>Gate Terminal:</span>
                      <span>{displayStatus === 'On Leave' ? 'Leave Sanctioned' : attendance.biometricTerminal}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No biometric punch logged today.</p>
                )}
              </div>
            </TabsContent>

            {/* LEAVE TAB */}
            <TabsContent value="leave" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <span className="text-xs text-muted-foreground">Casual Leave</span>
                  <div className="text-lg font-bold">8 / 12</div>
                  <span className="text-[10px] text-muted-foreground">Remaining</span>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <span className="text-xs text-muted-foreground">Medical Leave</span>
                  <div className="text-lg font-bold">10 / 10</div>
                  <span className="text-[10px] text-muted-foreground">Remaining</span>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <span className="text-xs text-muted-foreground">Earned Leave</span>
                  <div className="text-lg font-bold">18 / 20</div>
                  <span className="text-[10px] text-muted-foreground">Remaining</span>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Leave Applications
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded border bg-muted/20 p-2.5">
                    <div>
                      <div className="font-medium text-foreground">Casual Leave (1 day)</div>
                      <span className="text-muted-foreground">2026-10-12 · Personal family obligation</span>
                    </div>
                    <Badge variant={displayStatus === 'On Leave' ? 'default' : 'secondary'}>
                      {displayStatus === 'On Leave' ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded border bg-muted/20 p-2.5">
                    <div>
                      <div className="font-medium text-foreground">Casual Leave (1 day)</div>
                      <span className="text-muted-foreground">2026-08-21 · Personal work</span>
                    </div>
                    <Badge variant="outline">Sanctioned</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* WORKLOAD TAB */}
            <TabsContent value="workload" className="mt-4 space-y-4">
              {workload ? (
                <>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">Weekly Workload Allocation</span>
                        <div className="text-2xl font-bold">
                          {workload.total} / {workload.capacity} <span className="text-sm font-normal text-muted-foreground">hours/week</span>
                        </div>
                      </div>
                      <Badge variant={workload.status === 'At Capacity' ? 'destructive' : 'default'}>
                        {workload.status}
                      </Badge>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (workload.total / workload.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Teaching Hours Breakdown
                    </h4>
                    <div className="space-y-2 text-xs">
                      {workload.breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-mono font-semibold">{item.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Free Timetable Slots (Available for Substitution)
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {workload.freeSlots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded bg-muted/40 p-2">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-foreground">{slot.day}:</span>
                          <span className="text-muted-foreground">{slot.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  Workload tracking applies to teaching faculty.
                </div>
              )}
            </TabsContent>

            {/* DOCUMENTS TAB */}
            <TabsContent value="documents" className="mt-4 space-y-3">
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Institutional Records & Certificates
                </h4>
                <div className="space-y-2">
                  {dummyDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded border p-2.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">{doc.name}</div>
                          <span className="text-[10px] text-muted-foreground">
                            {doc.size} · Uploaded {doc.date}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          toast.info(`Viewing ${doc.name} requires document store integration.`, {
                            id: `doc-${idx}`,
                          })
                        }
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
