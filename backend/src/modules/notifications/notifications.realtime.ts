import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

// Clients refetch when told something changed, so the payload stays empty.
export const CHANGED = 'notifications:changed';
const room = (userId: string) => `user:${userId}`;

/**
 * Socket.IO for the live unread count. Each signed-in browser joins its
 * user's room; `publish` tells that user's tabs to refresh notifications.
 * ponytail: in-memory rooms; add the Redis adapter if the API ever runs as
 * more than one instance.
 */
export function createRealtime() {
  let io: Server | undefined;
  let epoch = 0;
  const revoked = new Map<string, number>();
  return {
    attach(
      server: HttpServer,
      {
        origin,
        verify,
      }: {
        origin: string;
        verify: (token: string) => string | Promise<string>;
      },
    ) {
      io = new Server(server, {
        path: '/api/v1/socket.io',
        cors: { origin, credentials: true },
      });
      io.use(async (socket, next) => {
        try {
          const token = (socket.handshake.auth as { token?: unknown }).token;
          if (typeof token !== 'string') throw new Error('No token');
          const beganAt = epoch;
          const userId = await verify(token);
          if ((revoked.get(userId) ?? 0) > beganAt)
            throw new Error('Revoked during handshake');
          socket.data.userId = userId;
          socket.data.authEpoch = beganAt;
          next();
        } catch {
          next(new Error('UNAUTHENTICATED'));
        }
      });
      io.on('connection', (socket) => {
        const userId = socket.data.userId as string;
        if ((revoked.get(userId) ?? 0) > socket.data.authEpoch) {
          socket.disconnect(true);
          return;
        }
        void Promise.resolve(socket.join(room(userId))).then(() => {
          if ((revoked.get(userId) ?? 0) > socket.data.authEpoch)
            socket.disconnect(true);
        });
      });
      return io;
    },
    disconnect(userId: string) {
      revoked.set(userId, ++epoch);
      io?.in(room(userId)).disconnectSockets(true);
    },
    publish(userId: string) {
      io?.to(room(userId)).emit(CHANGED);
    },
  };
}

export type Realtime = ReturnType<typeof createRealtime>;
