import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Construction,
  RotateCcw,
  CheckCircle2,
  Bell,
  CalendarDays,
  Repeat2,
  CalendarRange,
  ChartNoAxesCombined,
  Layers,
  Sparkles,
} from 'lucide-react';
import { navigation } from '@/data/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';

interface PlannedModuleDetails {
  title: string;
  badge: string;
  description: string;
  implementationNote: string;
  capabilities: { title: string; detail: string }[];
}

const moduleSpecs: Record<string, PlannedModuleDetails> = {
  '/employees': {
    title: 'Employees',
    badge: 'Planned Module',
    description:
      'Manage faculty profiles, employee IDs, academic ranks, department allocations, qualifications, and service records across JCET.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Faculty & Staff Registry',
        detail:
          'Comprehensive records for 132 teaching and 54 non-teaching staff with designations and VTU faculty IDs.',
      },
      {
        title: 'Department Mapping',
        detail:
          'Organized by CSE, ECE, ME, CE, AI & ML, and MBA with designated HOD and lab in-charge roles.',
      },
      {
        title: 'Service History & Credentials',
        detail:
          'Digital records of AICTE registrations, promotions, scale revisions, and college tenure.',
      },
    ],
  },
  '/attendance': {
    title: 'Attendance',
    badge: 'Planned Module',
    description:
      'Daily biometric tracking, punch logs, on-duty approvals, lecture hour logging, and monthly VTU normalization.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Biometric Gateway Sync',
        detail:
          'Direct integration with academic block entrance biometric terminals for real-time check-in/out.',
      },
      {
        title: 'On-Duty (OD) Workflows',
        detail:
          'Formal tracking for university exam duties, symposiums, VTU central valuation, and conference attendance.',
      },
      {
        title: 'Monthly Normalization',
        detail:
          'Automated loss-of-pay (LOP) calculations and monthly attendance consolidation for payroll.',
      },
    ],
  },
  '/timetable': {
    title: 'Timetable',
    badge: 'Planned Module',
    description:
      'Institutional class schedules, laboratory session allocations, tutorial batches, and automatic room conflict detection.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Semester Matrices',
        detail:
          'Interactive weekly schedules for all odd and even semesters across JCET engineering departments.',
      },
      {
        title: 'Lab & Room Allocations',
        detail:
          'Dedicated slot tracking for computer centers, thermal engineering lab, and lecture halls (LH-101 to LH-305).',
      },
      {
        title: 'Real-Time Substitute Sync',
        detail:
          'Dynamic timetable updates connected directly with the Smart Substitution module.',
      },
    ],
  },
  '/workload': {
    title: 'Faculty Workload',
    badge: 'Planned Module',
    description:
      'Monitor faculty teaching hours, labs, mentoring, project guidance and overload conditions across departments.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Teaching Hour Limits',
        detail:
          'VTU guidelines: 16–18 hrs for Assistant Professors and 14–16 hrs for Associate Professors.',
      },
      {
        title: 'Lab & Project Weightage',
        detail:
          'Standardized credit allocations for laboratory batches, final year major projects, and mini-projects.',
      },
      {
        title: 'Overload Warning Engine',
        detail:
          'Proactive alerts to the HOD when faculty members approach or reach their maximum weekly capacity.',
      },
    ],
  },
  '/payroll': {
    title: 'Payroll',
    badge: 'Planned Module',
    description:
      'Salary structures, pay scales, DA/HRA computations, leave deductions, EPF, professional tax, and automated payslips.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Compensation Rules',
        detail:
          'Basic pay, Dearness Allowance (DA), House Rent Allowance (HRA), and institutional increments.',
      },
      {
        title: 'Leave & Attendance Deductions',
        detail:
          'Automatic feed from Leave Management and attendance records for accurate monthly payroll.',
      },
      {
        title: 'Statutory Reports',
        detail:
          'Provident Fund (EPF), Professional Tax (PT), and Form 16 statements ready for college compliance.',
      },
    ],
  },
  '/reports': {
    title: 'Reports',
    badge: 'Planned Module',
    description:
      'Accreditation-ready reporting for AICTE, VTU, and NAAC audits, staff turnover metrics, and departmental leave analytics.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Accreditation Dashboards',
        detail:
          'Faculty-Student Ratio (FSR), cadre ratio compliance, and faculty retention data for NAAC / NBA.',
      },
      {
        title: 'Academic Continuity Audit',
        detail:
          'Leave trends, substitute assignment rate, and percentage of scheduled lectures fully covered.',
      },
      {
        title: 'Department Analytics',
        detail:
          'Comparative operational reports across CSE, ECE, ME, CE, AI & ML, and MBA.',
      },
    ],
  },
  '/notifications': {
    title: 'Notifications',
    badge: 'Planned Module',
    description:
      'Multi-channel institutional messaging, automated SMS circulars, and real-time leave/substitution alerts.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Instant SMS & Email Alerts',
        detail:
          'Automated notices to substitute faculty when a class reassignment is confirmed by the HOD.',
      },
      {
        title: 'College Broadcasts',
        detail:
          'Institutional announcements, academic calendar changes, and emergency circulars.',
      },
      {
        title: 'Audit Trail',
        detail:
          'Timestamped record of all approvals, substitute assignments, and administrative decisions.',
      },
    ],
  },
  '/settings': {
    title: 'Settings',
    badge: 'Planned Module',
    description:
      'Institutional configuration, academic year parameters, leave policy rules, and prototype demo controls.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Academic Term Configuration',
        detail:
          'Define term start/end dates, assessment cycle schedules, and institutional holiday calendars.',
      },
      {
        title: 'Leave Policy Rules',
        detail:
          'Annual quotas: Casual Leave (15 days), Medical Leave (10 days), and Earned Leave (30 days).',
      },
      {
        title: 'Demo State Controls',
        detail:
          'Developer utility to reset sample data and restart the HOD demonstration flow from scratch.',
      },
    ],
  },
};

export default function ModulePlaceholder() {
  const { pathname } = useLocation();
  const workflow = useAcademicWorkflow();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const navItem = navigation.find((item) => item.path === pathname);
  const Icon = navItem?.icon ?? Construction;

  const spec = moduleSpecs[pathname] ?? {
    title: navItem?.label ?? 'Module preview',
    badge: 'Planned Module',
    description:
      'This module will be implemented in subsequent phases following institutional review.',
    implementationNote:
      'This module will be implemented after prototype approval.',
    capabilities: [
      {
        title: 'Core Administration',
        detail: 'Tailored specifically for JCET academic procedures.',
      },
      {
        title: 'Integration Ready',
        detail: 'Connected to the campus directory and timetable database.',
      },
      {
        title: 'Accreditation Compliant',
        detail: 'Complies with VTU Belagavi and AICTE statutory requirements.',
      },
    ],
  };

  function getNotificationIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes('substitute')) return Repeat2;
    if (t.includes('covered')) return CheckCircle2;
    if (t.includes('approved') || t.includes('leave')) return CalendarDays;
    if (t.includes('timetable')) return CalendarRange;
    if (t.includes('workload')) return ChartNoAxesCombined;
    return Bell;
  }

  return (
    <PageTransition>
      <PageHeader
        title={spec.title}
        description="Jain College of Engineering and Technology, Hubballi"
        action={
          <Badge
            variant="outline"
            className="px-3 py-1 font-semibold text-xs border-primary/30 text-primary"
          >
            Prototype • Demo Data
          </Badge>
        }
      />

      <div className="space-y-6">
        {/* Intentional Placeholder Hero Banner */}
        <Card className="border-border shadow-xs overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold text-foreground">
                      {spec.title}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="font-semibold text-xs bg-secondary text-primary"
                    >
                      {spec.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed font-normal">
                    {spec.description}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium pt-1">
                    {spec.implementationNote}
                  </p>
                  <p className="sr-only">
                    Module coming in the next development phase.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch md:self-auto">
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Dashboard
                  </Link>
                </Button>
                <Button asChild variant="accent" size="sm">
                  <Link to="/leave">
                    Leave Flow
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planned Capabilities Grid */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Planned Capabilities &amp; Specifications
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {spec.capabilities.map((cap, i) => (
              <Card key={i} className="border-border/80 bg-card/60 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent shrink-0" />
                    <h4 className="text-sm font-semibold text-foreground">
                      {cap.title}
                    </h4>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cap.detail}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* If Settings: Provide Demo Controls right here! */}
        {pathname === '/settings' && (
          <Card className="border-primary/40 bg-card shadow-xs mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Presentation Demo Controls
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reset prototype data to original seeded state for repeated
                    demonstrations to the HOD.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/40 text-primary"
                >
                  Demo Utility
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-foreground/80 leading-relaxed">
                Clicking reset will restore mock leave requests to pending,
                remove substitute assignments, clear workflow changes, and
                restore dashboard counts.
              </p>
              <Button
                variant="destructive"
                onClick={() => setResetConfirmOpen(true)}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Demo Data
              </Button>
            </CardContent>
          </Card>
        )}

        {/* If Notifications: Show live feed */}
        {pathname === '/notifications' && (
          <Card className="border-border shadow-xs mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Active Notification Stream ({workflow.notifications.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live updates generated by leave decisions and substitute
                    assignments in this demo session.
                  </p>
                </div>
                {workflow.unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={workflow.markAllNotificationsRead}
                    className="text-xs"
                  >
                    Mark All Read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60">
                {workflow.notifications.map((notif) => {
                  const NIcon = getNotificationIcon(notif.title);
                  return (
                    <li
                      key={notif.id}
                      className="py-3.5 flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                        <NIcon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <strong className="text-sm font-semibold text-foreground">
                            {notif.title}
                          </strong>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {notif.time}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {notif.body}
                        </p>
                      </div>
                      {notif.unread && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset CampusHR demo data?</DialogTitle>
            <DialogDescription>
              This will restore all sample leave requests to pending, remove
              substitute assignments, and reset notifications and counts to
              their original demo state.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                workflow.resetDemoData();
                setResetConfirmOpen(false);
              }}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reset Demo Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
