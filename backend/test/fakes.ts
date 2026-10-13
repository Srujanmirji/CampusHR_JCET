import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import type {
  AuthRepository,
  AuthSession,
  AuthUser,
} from '../src/modules/auth/auth.repository.js';

type StoredUser = Omit<AuthUser, 'employeeId' | 'departmentId'> &
  Partial<Pick<AuthUser, 'employeeId' | 'departmentId'>> & {
    passwordHash: string;
    employeeCode?: string;
  };
type StoredSession = AuthSession & { tokenHash: string };

// In-memory AuthRepository with the same semantics as the Prisma one.
export function createMemoryAuthRepository(users: StoredUser[] = []) {
  const sessions: StoredSession[] = [];
  const repo: AuthRepository = {
    async findUserByIdentifier(identifier) {
      const id = identifier.toLowerCase();
      const user = users.find(
        (candidate) =>
          candidate.email === id ||
          candidate.employeeCode?.toLowerCase() === id,
      );
      return user ? { employeeId: null, departmentId: null, ...user } : null;
    },
    async findUserById(id) {
      const user = users.find((candidate) => candidate.id === id);
      return user
        ? {
            id: user.id,
            email: user.email,
            status: user.status,
            role: user.role,
            permissions: user.permissions,
            employeeId: user.employeeId ?? null,
            departmentId: user.departmentId ?? null,
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

// For tests that only exercise auth: domain routes are mounted but never called.
export const unusedPrisma = new Proxy({} as PrismaClient, {
  get() {
    throw new Error('This test should not reach the database.');
  },
});
