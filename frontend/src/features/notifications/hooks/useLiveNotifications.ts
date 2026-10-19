import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useSession } from '@/features/auth/hooks/useSession';
import { getAccessToken } from '@/services/api';

// The API's origin: the web app's own in production (VITE_API_URL=/api/v1).
const socketUrl = new URL(
  import.meta.env.VITE_API_URL ?? '/',
  window.location.origin,
).origin;

/** Refreshes notification data whenever the server says it changed. */
export function useLiveNotifications() {
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session.status === 'signedIn' ? session.user.id : null;

  useEffect(() => {
    if (!userId) return;
    const socket = io(socketUrl, {
      path: '/api/v1/socket.io',
      // Read on every (re)connect, so a renewed token is used.
      auth: (send) => send({ token: getAccessToken() }),
      withCredentials: true,
    });
    socket.on('notifications:changed', () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => {
      socket.close();
    };
  }, [userId, queryClient]);
}
