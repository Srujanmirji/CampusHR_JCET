import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { PlannedModuleBanner } from '@/components/shared/PlannedModuleBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { seededNotifications } from '@/data/mock/notifications';
import {
  Bell,
  CalendarDays,
  Repeat2,
  CalendarCheck2,
  WalletCards,
  Info,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

type NotificationCategory = 'All' | 'Leave' | 'Timetable' | 'Attendance' | 'Payroll' | 'System';

export default function NotificationsPage() {
  const workflow = useAcademicWorkflow();
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('All');

  // Merge workflow notifications with seeded notifications
  const mergedNotifications = useMemo(() => {
    // Dynamic notifications from leave/substitute workflow
    const dynamicItems = workflow.notifications.map((n) => {
      let cat: 'Leave' | 'Timetable' | 'Attendance' | 'Payroll' | 'System' = 'Leave';
      if (n.title.toLowerCase().includes('substitute') || n.title.toLowerCase().includes('timetable')) {
        cat = 'Timetable';
      } else if (n.title.toLowerCase().includes('attendance')) {
        cat = 'Attendance';
      } else if (n.title.toLowerCase().includes('workload')) {
        cat = 'System';
      }
      return {
        id: n.id,
        title: n.title,
        body: n.body,
        time: n.time,
        unread: n.unread ?? false,
        category: cat,
      };
    });

    // Merge with seeded items that aren't already represented by ID
    const extraSeeded = seededNotifications.filter(
      (s) => !dynamicItems.some((d) => d.id === s.id),
    );

    return [...dynamicItems, ...extraSeeded];
  }, [workflow.notifications]);

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'All') return mergedNotifications;
    return mergedNotifications.filter((n) => n.category === selectedCategory);
  }, [mergedNotifications, selectedCategory]);

  const unreadCount = mergedNotifications.filter((n) => n.unread).length;

  function getCategoryIcon(category: string) {
    switch (category) {
      case 'Leave':
        return <CalendarDays className="h-4 w-4 text-primary" />;
      case 'Timetable':
        return <Repeat2 className="h-4 w-4 text-amber-600" />;
      case 'Attendance':
        return <CalendarCheck2 className="h-4 w-4 text-emerald-600" />;
      case 'Payroll':
        return <WalletCards className="h-4 w-4 text-purple-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Notifications & Activity Log"
        description="Real-time institutional alerts, leave requests, timetable reassignments, and system circulars."
        action={
          <Button
            variant="outline"
            onClick={() => {
              workflow.markAllNotificationsRead();
              toast.success('All notifications marked as read.');
            }}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        }
      />

      <PlannedModuleBanner route="/notifications" />

      {/* Header Tabs & Unread Counter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={selectedCategory}
          onValueChange={(val) => setSelectedCategory(val as NotificationCategory)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-3 sm:flex sm:flex-wrap">
            <TabsTrigger value="All" className="text-xs">
              All ({mergedNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="Leave" className="text-xs">
              Leave
            </TabsTrigger>
            <TabsTrigger value="Timetable" className="text-xs">
              Timetable
            </TabsTrigger>
            <TabsTrigger value="Attendance" className="text-xs">
              Attendance
            </TabsTrigger>
            <TabsTrigger value="Payroll" className="text-xs">
              Payroll
            </TabsTrigger>
            <TabsTrigger value="System" className="text-xs">
              System
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {unreadCount > 0 && (
          <Badge variant="secondary" className="self-start text-xs font-semibold sm:self-auto">
            <Bell className="mr-1.5 h-3 w-3 text-primary animate-pulse" />
            {unreadCount} Unread Notifications
          </Badge>
        )}
      </div>

      {/* Notifications Stream */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-xs">
            <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <h4 className="font-semibold text-foreground">No notifications in this category</h4>
            <p className="mt-1 text-xs">New approvals, timetable swaps, and broadcasts will appear here.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3.5 rounded-xl border p-4 transition-all shadow-xs ${
                notif.unread
                  ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
                  : 'border-border bg-card hover:bg-muted/30'
              }`}
            >
              <div className="mt-0.5 rounded-lg border bg-card p-2 shadow-2xs">
                {getCategoryIcon(notif.category)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{notif.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {notif.category}
                    </Badge>
                    {notif.unread && (
                      <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread notification" />
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {notif.time}
                  </span>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed">{notif.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </PageTransition>
  );
}
