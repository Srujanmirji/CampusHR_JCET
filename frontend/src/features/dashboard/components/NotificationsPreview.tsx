import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Repeat2,
  CalendarRange,
  ChartNoAxesCombined,
} from 'lucide-react';
import { SectionHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';

export function NotificationsPreview() {
  const workflow = useAcademicWorkflow();
  const displayList = workflow.notifications.slice(0, 4);

  function getIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes('substitute')) return Repeat2;
    if (t.includes('covered')) return CheckCircle2;
    if (t.includes('approved') || t.includes('leave')) return CalendarDays;
    if (t.includes('timetable')) return CalendarRange;
    if (t.includes('workload')) return ChartNoAxesCombined;
    return Bell;
  }

  return (
    <Card className="notifications-preview">
      <CardHeader>
        <SectionHeader
          title="Campus updates"
          description="Real-time academic workflow and campus alerts"
          action={
            <Button asChild variant="link">
              <Link to="/notifications">
                View all
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        <ul>
          {displayList.map((notification) => {
            const Icon = getIcon(notification.title);
            return (
              <li key={notification.id}>
                <span className="update-icon">
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <p>{notification.body}</p>
                  <span>
                    {notification.time} · {notification.title}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
