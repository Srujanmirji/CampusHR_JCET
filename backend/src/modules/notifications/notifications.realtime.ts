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
  return {
    attach(
      server: HttpServer,
      { origin, verify }: { origin: string; verify: (token: string) => string },
    ) {
      io = new Server(server, {
        path: '/api/v1/socket.io',
        cors: { origin, credentials: true },
      });
      io.use((socket, next) => {
        try {
          const token = (socket.handshake.auth as { token?: unknown }).token;
          if (typeof token !== 'string') throw new Error('No token');
          socket.data.userId = verify(token);
          next();
        } catch {
          next(new Error('UNAUTHENTICATED'));
        }
      });
      io.on('connection', (socket) => {
        void socket.join(room(socket.data.userId as string));
      });
      return io;
    },
    publish(userId: string) {
      io?.to(room(userId)).emit(CHANGED);
    },
  };
}

export type Realtime = ReturnType<typeof createRealtime>;
