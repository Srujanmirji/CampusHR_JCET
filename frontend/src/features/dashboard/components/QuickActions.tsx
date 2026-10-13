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
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/shared/PageHeader';

const actions = [
  { label: 'Add Employee', icon: UserRoundPlus },
  { label: 'Mark Attendance', icon: CalendarCheck2 },
  { label: 'Approve Leave', icon: CheckCheck },
  { label: 'View Timetable', icon: CalendarRange },
  { label: 'Faculty Workload', icon: ChartNoAxesCombined },
  { label: 'Reports', icon: ChartColumn },
  { label: 'Send Notification', icon: Send },
];

export function QuickActions() {
  const navigate = useNavigate();

  function handleAction(label: string) {
    switch (label) {
      case 'Approve Leave':
        navigate('/leave');
        break;
      case 'Mark Attendance':
        navigate('/attendance');
        break;
      case 'View Timetable':
        navigate('/timetable');
        break;
      case 'Faculty Workload':
        navigate('/workload');
        break;
      case 'Reports':
        navigate('/reports');
        break;
      case 'Add Employee':
        toast.info('This module is planned for the next phase.', {
          description: 'This feature will be implemented in the next phase.',
        });
        break;
      case 'Send Notification':
        navigate('/notifications');
        break;
      default:
        toast.info('This module is planned for the next phase.', {
          description: label,
        });
    }
  }

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
          {actions.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              onClick={() => handleAction(label)}
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
