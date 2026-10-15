import { writeAudit, type AuditEntry } from '../../common/audit.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

// Never selects the password hash, so it cannot reach a response or the audit log.
export const loginSelect = {
  id: true,
  email: true,
  status: true,
  employeeId: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export type LoginRecord = Prisma.UserGetPayload<{ select: typeof loginSelect }>;

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createUserRepository(prisma: PrismaClient) {
  return {
    roles() {
      return prisma.role.findMany({
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      });
    },
    findRole(id: number) {
      return prisma.role.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
    },
    async roleOf(userId: string) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: { select: { name: true } } },
      });
      return user?.role.name;
    },
    findEmployee(id: string) {
      return prisma.employee.findUnique({
        where: { id },
        select: { status: true, email: true },
      });
    },
    findById(id: string) {
      return prisma.user.findUnique({ where: { id }, select: loginSelect });
    },
    findByEmployee(employeeId: string) {
      return prisma.user.findUnique({
        where: { employeeId },
        select: loginSelect,
      });
    },
    findByEmail(email: string) {
      return prisma.user.findUnique({ where: { email }, select: { id: true } });
    },

    create(data: Prisma.UserUncheckedCreateInput, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data, select: loginSelect });
        await writeAudit(tx, {
          ...audit,
          resource: 'user',
          resourceId: created.id,
          after: created,
        });
        return created;
      });
    },

    /** Updates a login; ends its sessions when it is disabled or re-keyed. */
    update(
      before: LoginRecord,
      data: Prisma.UserUncheckedUpdateInput,
      { endSessions, ...audit }: Audit & { endSessions: boolean },
    ) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: before.id },
          data,
          select: loginSelect,
        });
        if (endSessions) {
          const at = new Date();
          await tx.refreshSession.updateMany({
            where: { userId: before.id, expiresAt: { gt: at } },
            data: { revokedAt: at, expiresAt: at },
          });
        }
        await writeAudit(tx, {
          ...audit,
          resource: 'user',
          resourceId: before.id,
          before,
          after: { ...updated, passwordChanged: 'passwordHash' in data },
        });
        return updated;
      });
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
