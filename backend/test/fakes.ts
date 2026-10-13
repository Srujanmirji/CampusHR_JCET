import { randomUUID } from 'node:crypto';
import type {
  AuthRepository,
  AuthSession,
  AuthUser,
} from '../src/modules/auth/auth.repository.js';

type StoredUser = AuthUser & { passwordHash: string };
type StoredSession = AuthSession & { tokenHash: string };

// In-memory AuthRepository with the same semantics as the Prisma one.
export function createMemoryAuthRepository(users: StoredUser[] = []) {
  const sessions: StoredSession[] = [];
  const repo: AuthRepository = {
    async findUserByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async findUserById(id) {
      const user = users.find((candidate) => candidate.id === id);
      return user
        ? {
            id: user.id,
            email: user.email,
            status: user.status,
            role: user.role,
          }
        : null;
    },
    async recordLogin() {},
    async createSession({ userId, tokenHash, expiresAt, persistent }) {
      sessions.push({
        id: randomUUID(),
        userId,
        tokenHash,
        expiresAt,
        persistent,
        revokedAt: null,
      });
    },
    async findSessionByHash(tokenHash) {
      return (
        sessions.find((session) => session.tokenHash === tokenHash) ?? null
      );
    },
    async revokeSession(id, at) {
      const session = sessions.find((candidate) => candidate.id === id);
      if (!session || session.revokedAt) return false;
      session.revokedAt = at;
      return true;
    },
    async endSession(id, at) {
      const session = sessions.find((candidate) => candidate.id === id);
      if (session) Object.assign(session, { revokedAt: at, expiresAt: at });
    },
    async revokeAllSessions(userId, at) {
      for (const session of sessions) {
        if (session.userId === userId && session.expiresAt > at) {
          Object.assign(session, { revokedAt: at, expiresAt: at });
        }
      }
    },
  };
  return { repo, sessions };
}
