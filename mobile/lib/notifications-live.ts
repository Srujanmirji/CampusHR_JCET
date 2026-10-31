import { io } from 'socket.io-client';
import { API_BASE_URL } from './api-config';
import {
  getSession,
  subscribeSession,
  refreshIfExpired,
  refreshSession,
} from './session';
import { homeUnavailable } from './home-api';
export type NotificationConnection =
  'off' | 'connecting' | 'connected' | 'unavailable';
// Socket payloads are invalidation hints only. Fetch all content through the scoped API.
export function startNotificationSync(
  changed: (userId: string) => void,
  status: (value: NotificationConnection) => void,
  initialActive = true,
) {
  let socket: ReturnType<typeof io> | undefined;
  let token: string | null = null,
    userId: string | null = null,
    active = initialActive,
    stopped = false,
    lastRenewed = 0;
  function close() {
    const previous = socket;
    socket = undefined;
    previous?.close();
  }
  function sync() {
    if (stopped) return;
    const state = getSession();
    if (
      !active ||
      state.status !== 'signedIn' ||
      homeUnavailable(state.user, state.accessToken, 'notification.read')
    ) {
      close();
      token = null;
      userId = null;
      status('off');
      return;
    }
    if (socket && token === state.accessToken && userId === state.user!.id)
      return;
    close();
    token = state.accessToken;
    userId = state.user!.id;
    status('connecting');
    try {
      const current = io(new URL(API_BASE_URL).origin, {
        path: '/api/v1/socket.io',
        auth: { token },
        withCredentials: true,
      });
      socket = current;
      const currentUser = userId;
      const valid = () =>
        !stopped &&
        active &&
        socket === current &&
        getSession().status === 'signedIn' &&
        getSession().user?.id === currentUser &&
        getSession().accessToken === token;
      current.on('connect', () => {
        if (valid()) {
          status('connected');
          changed(currentUser);
        }
      });
      current.on('notifications:changed', () => {
        if (valid()) changed(currentUser);
      });
      current.on('disconnect', () => {
        if (valid()) status('unavailable');
      });
      current.on('connect_error', (error: Error) => {
        if (!valid()) return;
        status('unavailable');
        // Bound renewal on namespace rejection; transport errors use Socket.IO's reconnect backoff.
        if (
          error.message === 'UNAUTHENTICATED' &&
          Date.now() - lastRenewed > 60000
        ) {
          lastRenewed = Date.now();
          void refreshSession().catch(() => undefined);
        }
      });
    } catch {
      status('unavailable');
    }
  }
  const unsubscribe = subscribeSession(sync);
  sync();
  // Check local expiry during long foreground sessions; renewal emits a session change and replaces the socket.
  const renewal = setInterval(() => {
    if (active && !stopped) void refreshIfExpired().catch(() => undefined);
  }, 60000);
  return {
    async setActive(value: boolean) {
      if (stopped) return;
      active = value;
      if (!active) {
        sync();
        return;
      }
      await refreshIfExpired().catch(() => undefined);
      if (stopped || !active) return;
      sync();
      if (userId) changed(userId);
    },
    close() {
      stopped = true;
      clearInterval(renewal);
      unsubscribe();
      close();
    },
  };
}
