import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Wrench,
  Server,
  FlaskConical,
  ShieldCheck,
  Plus,
  Send,
  MonitorCheck,
  ArrowUpRight,
  ClipboardCheck,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PunchCard } from '@/features/attendance/components/PunchCard';
import { useSession } from '@/features/auth/hooks/useSession';
import { NotificationsPreview } from './NotificationsPreview';

interface LabDuty {
  id: string;
  timeSlot: string;
  labName: string;
  dutyType: string;
  facultyInCharge: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

interface MaintenanceTicket {
  id: string;
  lab: string;
  item: string;
  issue: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  loggedAt: string;
}

const INITIAL_LAB_DUTIES: LabDuty[] = [
  {
    id: 'duty-1',
    timeSlot: '09:00 – 11:00',
    labName: 'Systems Lab 1 (Room 304)',
    dutyType: 'Compiler & Systems Lab (21CSL66) · Workstation Setup & Network Check',
    facultyInCharge: 'Prof. Rajeshwari M',
    status: 'COMPLETED',
  },
  {
    id: 'duty-2',
    timeSlot: '11:15 – 13:15',
    labName: 'Cloud & AI Lab (Room 306)',
    dutyType: 'Cloud Computing Lab · OS Environment & Docker Container Assistance',
    facultyInCharge: 'Dr. Rajesh Kulkarni (HOD)',
    status: 'ACTIVE',
  },
  {
    id: 'duty-3',
    timeSlot: '14:00 – 15:30',
    labName: 'IoT & Embedded Systems Lab (Room 202)',
    dutyType: 'Arduino & Raspberry Pi Kits Hardware Testing & Inventory Return Log',
    facultyInCharge: 'Prof. Ravi Hegde',
    status: 'UPCOMING',
  },
  {
    id: 'duty-4',
    timeSlot: '15:30 – 17:00',
    labName: 'Central Computing Facility (CSE Wing)',
    dutyType: 'Preventive Workstation Maintenance, Antivirus Update & Safe Shutdown',
    facultyInCharge: 'Technical Supervisor',
    status: 'UPCOMING',
  },
];

const INITIAL_TICKETS: MaintenanceTicket[] = [
  {
    id: 'TKT-1042',
    lab: 'Systems Lab 1',
    item: 'Workstation Node-14',
    issue: 'Display flickering intermittently during graphics rendering.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    loggedAt: 'Today, 09:30 AM',
  },
  {
    id: 'TKT-1039',
    lab: 'Cloud & AI Lab',
    item: 'Ceiling Projector & HDMI',
    issue: 'HDMI audio feed desynced with seminar speaker output.',
    priority: 'MEDIUM',
    status: 'PENDING',
    loggedAt: 'Yesterday',
  },
  {
    id: 'TKT-1031',
    lab: 'IoT Systems Lab',
    item: 'Power Strip / Spike Guard',
    issue: 'Replaced faulty power distribution strip on Bench 3.',
    priority: 'LOW',
    status: 'RESOLVED',
    loggedAt: '19 Oct 2026',
  },
];

export function NonTeachingDashboard() {
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const userEmail = user?.email ?? 'staff@jcethbl.edu.in';
  const staffDisplayName =
    user?.email === 'lab.cse@jcethbl.edu.in'
      ? 'Ramesh Kumar'
      : user?.email
        ? user.email
            .split('@')[0]
            .split('.')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ')
        : 'Technical Staff';

  // State for interactive lab readiness checklist
  const [checklist, setChecklist] = useState({
    upsMains: true,
    lanSwitch: true,
    workstationsBoot: true,
    projectorMic: true,
    softwareLicenses: true,
    fireExtinguisher: true,
    doorLocks: false,
  });

  // State for maintenance tickets
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(INITIAL_TICKETS);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [newLab, setNewLab] = useState('Systems Lab 1');
  const [newItem, setNewItem] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  function toggleCheck(key: keyof typeof checklist) {
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      toast.success(
        next[key]
          ? 'Protocol task verified and marked complete.'
          : 'Protocol task marked pending.',
      );
      return next;
    });
  }

  function handleLogTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim() || !newIssue.trim()) {
      toast.error('Please enter the equipment/asset name and description.');
      return;
    }

    const created: MaintenanceTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      lab: newLab,
      item: newItem.trim(),
      issue: newIssue.trim(),
      priority: newPriority,
      status: 'PENDING',
      loggedAt: 'Just now',
    };

    setTickets((prev) => [created, ...prev]);
    toast.success(`Maintenance ticket ${created.id} submitted to Systems Administration.`);
    setNewItem('');
    setNewIssue('');
    setNewPriority('MEDIUM');
    setTicketModalOpen(false);
  }

  const verifiedTasksCount = Object.values(checklist).filter(Boolean).length;
  const totalTasks = Object.keys(checklist).length;

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner */}
      <section className="welcome-banner" aria-labelledby="welcome-title">
        <div>
          <Badge className="mb-2 bg-accent/20 text-accent font-semibold tracking-wide uppercase text-[10px]">
            Technical Operations & Laboratory Services
          </Badge>
          <h2 id="welcome-title" className="text-2xl font-bold tracking-tight">
            Welcome, {staffDisplayName}
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Lab Instructor & Technical Staff · Dept. of Computer Science & Engineering
          </p>
          <span className="text-xs text-muted-foreground/90 mt-1 block">
            Employee Code: <b>JCET-CSE-004</b> ({userEmail}) <b>•</b> Shift: <b>08:30 AM – 05:00 PM</b>{' '}
            <b>•</b> Systems Lab 1 & Cloud Lab
          </span>
        </div>
        <img
          src="/assets/jcet-campus.png"
          alt="JCET Hubballi Campus Building"
          width="656"
          height="305"
          className="rounded-lg object-cover"
        />
      </section>

      {/* 2. Web Attendance Punch Card */}
      <PunchCard />

      {/* 3. Operational & Service KPI Metrics */}
      <section aria-label="Staff Key Performance Indicators" className="metrics-grid">
        <MetricCard
          label="Today's Shift Hours"
          value="8.5 hrs"
          detail="Official shift: 08:30 AM – 05:00 PM"
          icon={Clock}
          index={0}
          href="/attendance"
        />
        <MetricCard
          label="Leave Balance Available"
          value="18 Days"
          detail="8 Casual · 5 Sick · 5 Earned"
          icon={CalendarDays}
          index={1}
          href="/leave"
        />
        <MetricCard
          label="Assigned Laboratories"
          value="3 Facilities"
          detail="Systems Lab 1, Cloud Lab & CCF"
          icon={Server}
          index={2}
        />
        <MetricCard
          label="Equipment Maintenance"
          value={`${tickets.filter((t) => t.status !== 'RESOLVED').length} Active`}
          detail={`${tickets.filter((t) => t.status === 'RESOLVED').length} resolved this month`}
          icon={Wrench}
          index={3}
        />
      </section>

      {/* 4. Core Middle Section: Lab Duties vs Lab Readiness Protocol */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Today's Lab Duty Schedule */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="flex flex-col h-full shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-base">
                      Today's Lab Duty Schedule
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Laboratory practical sessions, machine setup & faculty support allocations
                  </p>
                </div>
                <Badge variant="outline" className="font-medium text-xs">
                  {INITIAL_LAB_DUTIES.length} Sessions Today
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px] text-xs">Time Slot</TableHead>
                    <TableHead className="text-xs">Laboratory & Duty Activity</TableHead>
                    <TableHead className="w-[110px] text-right text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INITIAL_LAB_DUTIES.map((duty) => (
                    <TableRow key={duty.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="align-top py-3 text-xs font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{duty.timeSlot}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-foreground">
                            {duty.labName}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {duty.dutyType}
                          </p>
                          <span className="text-[11px] text-primary/80 block pt-0.5">
                            Coordinator: {duty.facultyInCharge}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right py-3">
                        {duty.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            In Session
                          </span>
                        ) : duty.status === 'COMPLETED' ? (
                          <StatusBadge status="Approved" label="Done" />
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">
                            Upcoming
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>

            <CardFooter className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Assigned under Head of Department, CSE
              </span>
              <Button asChild variant="link" className="px-0 text-xs">
                <Link to="/attendance">
                  Verify Attendance Logs
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Lab Readiness & Maintenance Tracker */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Daily Attender Protocol Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-foreground text-sm">
                      Daily Lab Readiness Protocol
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mandatory equipment & safety checklist
                  </p>
                </div>
                <Badge
                  variant={verifiedTasksCount === totalTasks ? 'default' : 'secondary'}
                  className="text-xs font-semibold"
                >
                  {verifiedTasksCount} / {totalTasks} Verified
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-3 space-y-2.5">
              {[
                {
                  key: 'upsMains',
                  title: 'UPS Inverter & Electrical Mains',
                  desc: 'Main distribution breaker verified with stable input voltage',
                },
                {
                  key: 'lanSwitch',
                  title: 'LAN Rack Switch & Fiber Gateway',
                  desc: 'Cisco 48-port switch online, DHCP link operational',
                },
                {
                  key: 'workstationsBoot',
                  title: '36 Workstation Terminals Boot Check',
                  desc: 'Dual-boot GRUB / Ubuntu 22.04 LTS verified on student nodes',
                },
                {
                  key: 'projectorMic',
                  title: 'Ceiling Projector & Wireless Audio Mic',
                  desc: 'HDMI projection tested, audio system battery charged',
                },
                {
                  key: 'softwareLicenses',
                  title: 'Software & Compiler Tools Readiness',
                  desc: 'GCC, Python 3.12, VS Code & Oracle VM installed',
                },
                {
                  key: 'fireExtinguisher',
                  title: 'CO2 Fire Extinguisher & First-Aid',
                  desc: 'Safety inspection seal intact at entrance corridor',
                },
                {
                  key: 'doorLocks',
                  title: 'Evening Terminal Lock & Room Security',
                  desc: 'Confirm all student pods logged out and windows secured',
                },
              ].map((item) => {
                const checked = checklist[item.key as keyof typeof checklist];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleCheck(item.key as keyof typeof checklist)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-3 ${
                      checked
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
                        : 'bg-muted/30 border-border hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-emerald-600 text-white'
                          : 'border border-muted-foreground/40'
                      }`}
                    >
                      {checked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold ${
                          checked ? 'text-foreground' : 'text-foreground/80'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Maintenance & Repair Log Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">
                      Lab Equipment Maintenance
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Report hardware breakdowns and track technician repairs
                  </p>
                </div>
                <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      Log Issue
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleLogTicket}>
                      <DialogHeader>
                        <DialogTitle>Log Equipment / Lab Maintenance Ticket</DialogTitle>
                        <DialogDescription>
                          Report damaged components, wiring faults, or software issues to the
                          campus technical team.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="ticket-lab">Laboratory Venue</Label>
                          <Select value={newLab} onValueChange={setNewLab}>
                            <SelectTrigger id="ticket-lab">
                              <SelectValue placeholder="Select Lab" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Systems Lab 1">Systems Lab 1 (Room 304)</SelectItem>
                              <SelectItem value="Cloud & AI Lab">Cloud & AI Lab (Room 306)</SelectItem>
                              <SelectItem value="IoT Systems Lab">IoT & Embedded Systems Lab</SelectItem>
                              <SelectItem value="Hardware Maintenance Lab">Hardware Lab</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ticket-item">Equipment / Asset Tag</Label>
                          <Input
                            id="ticket-item"
                            placeholder="e.g. Node-22 PC, Projector HDMI, Switch Port 18"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ticket-priority">Urgency / Impact</Label>
                          <Select
                            value={newPriority}
                            onValueChange={(val) =>
                              setNewPriority(val as 'HIGH' | 'MEDIUM' | 'LOW')
                            }
                          >
                            <SelectTrigger id="ticket-priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HIGH">High (Blocks Student Practical)</SelectItem>
                              <SelectItem value="MEDIUM">Medium (Degraded Function)</SelectItem>
                              <SelectItem value="LOW">Low (Minor / Preventive)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ticket-issue">Issue Description</Label>
                          <Input
                            id="ticket-issue"
                            placeholder="Describe symptoms, error beep, or damaged part..."
                            value={newIssue}
                            onChange={(e) => setNewIssue(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setTicketModalOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="accent">
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Submit Ticket
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent className="pt-3 space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3 rounded-lg border bg-card/60 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <MonitorCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      {ticket.item} · {ticket.lab}
                    </span>
                    <Badge
                      variant={
                        ticket.status === 'RESOLVED'
                          ? 'secondary'
                          : ticket.priority === 'HIGH'
                            ? 'destructive'
                            : 'outline'
                      }
                      className="text-[10px] font-semibold"
                    >
                      {ticket.status === 'RESOLVED'
                        ? 'Resolved'
                        : ticket.status === 'IN_PROGRESS'
                          ? 'In Repair'
                          : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{ticket.issue}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1">
                    <span>Ticket: {ticket.id}</span>
                    <span>{ticket.loggedAt}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Lower Section: Quick Services & Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Card className="h-full shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <h3 className="font-semibold text-foreground text-sm">
                Staff Quick Actions & Self-Service
              </h3>
              <p className="text-xs text-muted-foreground">
                Direct shortcuts for leave requests, document submissions, and campus services
              </p>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-auto p-3 flex-col items-start gap-1">
                <Link to="/leave">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Apply for Leave
                  </div>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Submit casual or medical leave for HOD sign-off
                  </span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-3 flex-col items-start gap-1">
                <Link to="/attendance">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Attendance Correction
                  </div>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Request punch correction or regularize miss
                  </span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-3 flex-col items-start gap-1">
                <Link to="/documents">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Service Records & KYC
                  </div>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Upload Aadhar, PAN, or training certificates
                  </span>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-3 flex-col items-start gap-1"
                onClick={() => setTicketModalOpen(true)}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  Report Equipment Fault
                </div>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Log hardware or facility maintenance ticket
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-6">
          <NotificationsPreview />
        </div>
      </div>
    </div>
  );
}
