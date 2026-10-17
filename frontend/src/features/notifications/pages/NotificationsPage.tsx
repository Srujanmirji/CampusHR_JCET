import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CheckCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useScope } from '@/features/auth/hooks/useCan';
import { listNotifications, unreadCount } from '../api/notifications';
import { AnnouncementForm } from '../components/AnnouncementForm';
import { NotificationList } from '../components/NotificationList';
import { useNotificationActions } from '../hooks/useNotificationActions';

export default function NotificationsPage() {
  const scopeOf = useScope();
  const announceScope = scopeOf('announcement.send');
  const actions = useNotificationActions();
  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: unreadCount,
  });
  const pages = useInfiniteQuery({
    queryKey: ['notifications', 'all'],
    queryFn: ({ pageParam }) => listNotifications(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore ? last.data.at(-1)?.id : undefined,
  });
  const notifications = pages.data?.pages.flatMap((page) => page.data) ?? [];
  const unreadTotal = unread.data ?? 0;

  return (
    <PageTransition>
      <PageHeader
        title="Notifications"
        description="Leave decisions, substitute classes and announcements meant for you."
        action={
          <Button
            variant="outline"
            onClick={actions.readAll}
            disabled={unreadTotal === 0 || actions.readingAll}
          >
            <CheckCheck />
            Mark all as read
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="px-0">
            <p
              role="status"
              className="px-4 pb-2 text-sm text-muted-foreground"
            >
              {unreadTotal > 0
                ? `${unreadTotal} unread`
                : pages.isSuccess
                  ? 'All caught up.'
                  : ' '}
            </p>
            {pages.isPending ? (
              <div className="flex flex-col gap-2 px-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : pages.isError ? (
              <EmptyState
                title="Couldn’t load notifications"
                description={pages.error.message}
                actionLabel="Try again"
                onAction={() => void pages.refetch()}
              />
            ) : notifications.length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="Leave decisions, substitute classes and announcements show up here."
              />
            ) : (
              <>
                <NotificationList
                  notifications={notifications}
                  onOpen={actions.open}
                />
                {pages.hasNextPage && (
                  <div className="flex justify-center p-4">
                    <Button
                      variant="outline"
                      disabled={pages.isFetchingNextPage}
                      onClick={() => void pages.fetchNextPage()}
                    >
                      Show older
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {announceScope && (
          <AnnouncementForm wholeCollege={announceScope === 'all'} />
        )}
      </div>
    </PageTransition>
  );
}
