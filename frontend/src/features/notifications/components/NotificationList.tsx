import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification } from '../api/notifications';
import { iconFor, timeAgo } from '../utils/notifications';

/** Notifications as rows; each opens its link and is marked read. */
export function NotificationList({
  notifications,
  onOpen,
}: {
  notifications: Notification[];
  onOpen: (notification: Notification) => void;
}) {
  return (
    <ul className="flex flex-col divide-y">
      {notifications.map((notification) => {
        const Icon = iconFor(notification.kind);
        const unread = !notification.readAt;
        return (
          <li key={notification.id}>
            <Button
              variant="ghost"
              className={cn(
                'h-auto w-full justify-start gap-3 whitespace-normal rounded-none px-4 py-3 text-left',
                unread && 'bg-primary/5',
              )}
              onClick={() => onOpen(notification)}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  'mt-0.5 size-4 shrink-0 self-start',
                  unread ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    'text-sm',
                    unread ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {unread && <span className="sr-only">Unread: </span>}
                  {notification.title}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {notification.body}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {timeAgo(notification.createdAt)}
                </span>
              </span>
              {unread && (
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2 shrink-0 self-start rounded-full bg-primary"
                />
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
