import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Layers, CheckCircle2 } from 'lucide-react';

interface Capability {
  title: string;
  detail: string;
}

const moduleCapabilities: Record<string, Capability[]> = {
  '/employees': [
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
  '/attendance': [
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
  '/timetable': [
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
  '/workload': [
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
  '/payroll': [
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
  '/reports': [
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
  '/notifications': [
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
  '/settings': [
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
};

export function PlannedModuleBanner({ route }: { route: string }) {
  const [expanded, setExpanded] = useState(true);
  const capabilities = moduleCapabilities[route] ?? [];

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-all">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/40 font-semibold text-primary">
            Planned Module
          </Badge>
          <span className="text-xs text-muted-foreground">
            This module will be implemented after prototype approval.
          </span>
          <span className="text-xs text-muted-foreground">
            Module coming in the next development phase.
          </span>
          <span className="text-xs font-medium text-foreground/80">
            • Interactive demo with realistic sample records
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-8 gap-1.5 self-start text-xs sm:self-auto"
        >
          <Layers className="h-3.5 w-3.5" />
          Planned Capabilities & Specifications
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-primary/10 pt-4">
          <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Planned Capabilities & Specifications
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {capabilities.map((item, index) => (
              <div key={index} className="rounded-md border bg-card p-3 shadow-xs">
                <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
