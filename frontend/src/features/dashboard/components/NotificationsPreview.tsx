import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { listNotifications } from '@/features/notifications/api/notifications';
import { iconFor, timeAgo } from '@/features/notifications/utils/notifications';

export function NotificationsPreview() {
  const latest = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => listNotifications(undefined, 5),
  });
  const shown = latest.data?.data.slice(0, 4) ?? [];

  return (
    <Card className="notifications-preview">
      <CardHeader>
        <SectionHeader
          title="Campus updates"
          description="Your latest notifications"
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
        {latest.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {latest.isError ? 'Couldn’t load updates.' : 'No updates yet.'}
          </p>
        ) : (
          <ul>
            {shown.map((notification) => {
              const Icon = iconFor(notification.kind);
              return (
                <li key={notification.id}>
                  <span className="update-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <p>{notification.body}</p>
                    <span>
                      {timeAgo(notification.createdAt)} · {notification.title}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
