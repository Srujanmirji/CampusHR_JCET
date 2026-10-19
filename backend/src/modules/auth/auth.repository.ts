import { z } from 'zod';
import { writeAudit } from '../../common/audit.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export interface AuthUser {
  id: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: string;
  /** Granted permission keys, e.g. `leave.approve.department`. */
  permissions: string[];
  /** Linked employee record and its department; null for system accounts. */
  employeeId: string | null;
  departmentId: number | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  persistent: boolean;
  revokedAt: Date | null;
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  persistent: boolean;
  userAgent?: string;
  ip?: string;
}

// The service depends on this shape; tests supply an in-memory version.
export interface AuthRepository {
  /** Finds by email (contains "@") or by employee ID. */
  findUserByIdentifier(
    identifier: string,
  ): Promise<(AuthUser & { passwordHash: string }) | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  recordLogin(userId: string, at: Date): Promise<void>;
  createSession(session: NewSession): Promise<void>;
  findSessionByHash(tokenHash: string): Promise<AuthSession | null>;
  /** Revokes one session on rotation; false if it was already revoked. */
  revokeSession(id: string, at: Date): Promise<boolean>;
  /** Ends a session for good (logout): revoked and expired. */
  endSession(id: string, at: Date): Promise<void>;
  /** Ends every session of a user (suspected token theft). */
  revokeAllSessions(userId: string, at: Date): Promise<void>;
  /** The stored hash, to check the current password. */
  findPasswordHash(userId: string): Promise<string | null>;
  /**
   * Saves a new password hash and ends every other session of the user;
   * `keepSessionId` (the one making the change) stays signed in.
   */
  changePassword(
    userId: string,
    passwordHash: string,
    keepSessionId: string | null,
    at: Date,
  ): Promise<void>;
}

const userSelect = {
  id: true,
  email: true,
  status: true,
  role: {
    select: {
      name: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  },
  employee: { select: { id: true, departmentId: true } },
} as const;

type SelectedUser = {
  id: string;
  email: string;
  status: AuthUser['status'];
  role: { name: string; permissions: { permission: { key: string } }[] };
  employee: { id: string; departmentId: number } | null;
};
const toAuthUser = <T extends SelectedUser>({
  role,
  employee,
  ...rest
}: T) => ({
  ...rest,
  role: role.name,
  permissions: role.permissions.map(({ permission }) => permission.key),
  employeeId: employee?.id ?? null,
  departmentId: employee?.departmentId ?? null,
});

export function createPrismaAuthRepository(
  prisma: PrismaClient,
): AuthRepository {
  return {
    async findUserByIdentifier(identifier) {
      const user = await prisma.user.findFirst({
        where: identifier.includes('@')
          ? { email: identifier.toLowerCase() }
          : { employee: { employeeCode: identifier.toUpperCase() } },
        select: { ...userSelect, passwordHash: true },
      });
      return user && toAuthUser(user);
    },
    async findUserById(id) {
      // A token for a non-UUID subject is unknown, not a database error.
      if (!z.uuid().safeParse(id).success) return null;
      const user = await prisma.user.findUnique({
        where: { id },
        select: userSelect,
      });
      return user && toAuthUser(user);
    },
    async recordLogin(userId, at) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: at },
      });
    },
    async createSession(session) {
      await prisma.refreshSession.create({ data: session });
    },
    findSessionByHash(tokenHash) {
      return prisma.refreshSession.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          persistent: true,
          revokedAt: true,
        },
      });
    },
    async revokeSession(id, at) {
      // Conditional update: two concurrent refreshes cannot both succeed.
      const { count } = await prisma.refreshSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: at, lastUsedAt: at },
      });
      return count === 1;
    },
    async endSession(id, at) {
      await prisma.refreshSession.update({
        where: { id },
        data: { revokedAt: at, expiresAt: at },
      });
    },
    async revokeAllSessions(userId, at) {
      await prisma.refreshSession.updateMany({
        where: { userId, expiresAt: { gt: at } },
        data: { revokedAt: at, expiresAt: at },
      });
    },
    async findPasswordHash(userId) {
      if (!z.uuid().safeParse(userId).success) return null;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });
      return user?.passwordHash ?? null;
    },
    async changePassword(userId, passwordHash, keepSessionId, at) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { passwordHash } });
        await tx.refreshSession.updateMany({
          where: {
            userId,
            expiresAt: { gt: at },
            ...(keepSessionId ? { NOT: { id: keepSessionId } } : {}),
          },
          data: { revokedAt: at, expiresAt: at },
        });
        await writeAudit(tx, {
          actorUserId: userId,
          action: 'user.password_change',
          resource: 'user',
          resourceId: userId,
          after: { passwordChanged: true },
        });
      });
    },
  };
}
