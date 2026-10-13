import {
  UserRoundPlus,
  CalendarCheck2,
  CheckCheck,
  CalendarRange,
  ChartNoAxesCombined,
  ChartColumn,
  Send,
  ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/shared/PageHeader';
import { useCan } from '@/features/auth/hooks/useCan';

// Each action opens its module; actions the user cannot use are hidden.
const actions = [
  {
    label: 'Add Employee',
    icon: UserRoundPlus,
    path: '/employees',
    state: { addEmployee: true },
    permission: 'employee.create',
  },
  {
    label: 'Mark Attendance',
    icon: CalendarCheck2,
    path: '/attendance',
    permission: 'attendance.read',
  },
  {
    label: 'Approve Leave',
    icon: CheckCheck,
    path: '/leave',
    permission: 'leave.approve',
  },
  {
    label: 'View Timetable',
    icon: CalendarRange,
    path: '/timetable',
    permission: 'timetable.read',
  },
  {
    label: 'Faculty Workload',
    icon: ChartNoAxesCombined,
    path: '/workload',
    permission: 'workload.read',
  },
  {
    label: 'Reports',
    icon: ChartColumn,
    path: '/reports',
    permission: 'report.read',
  },
  {
    label: 'Send Notification',
    icon: Send,
    path: '/notifications',
    permission: 'notification.read',
  },
];

export function QuickActions() {
  const navigate = useNavigate();
  const can = useCan();

  return (
    <Card className="quick-actions">
      <CardHeader>
        <SectionHeader
          title="Quick actions"
          description="Your everyday campus tasks"
        />
      </CardHeader>
      <CardContent>
        <div className="quick-action-grid">
          {actions
            .filter((action) => can(action.permission))
            .map(({ label, icon: Icon, path, state }) => (
              <Button
                key={label}
                variant="ghost"
                onClick={() => navigate(path, { state })}
              >
                <Icon data-icon="inline-start" />
                <span>{label}</span>
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
