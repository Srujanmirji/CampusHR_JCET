import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/services/api';
import { markAllRead, markRead, type Notification } from '../api/notifications';

const failed = (error: unknown) =>
  toast.error(
    error instanceof ApiError
      ? error.message
      : 'Couldn’t update notifications.',
  );

/** Open a notification (marking it read) or mark everything read. */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const read = useMutation({
    mutationFn: markRead,
    onSuccess: refresh,
    onError: failed,
  });
  const readAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: refresh,
    onError: failed,
  });

  return {
    open(notification: Notification) {
      if (!notification.readAt) read.mutate(notification.id);
      if (notification.link) navigate(notification.link);
    },
    readAll: () => readAll.mutate(),
    readingAll: readAll.isPending,
  };
}
