import { writeAudit, type AuditEntry } from '../../common/audit.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export const notificationSelect = {
  id: true,
  kind: true,
  title: true,
  body: true,
  link: true,
  readAt: true,
  createdAt: true,
} as const;

export interface NewNotification {
  kind: string;
  title: string;
  body: string;
  link?: string;
}

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createNotificationRepository(prisma: PrismaClient) {
  return {
    list(userId: string, after: string | undefined, take: number) {
      return prisma.notification.findMany({
        where: { userId },
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      });
    },
    unread(userId: string) {
      return prisma.notification.count({ where: { userId, readAt: null } });
    },
    async markRead(userId: string, id: string) {
      const { count } = await prisma.notification.updateMany({
        where: { id, userId, readAt: null },
        data: { readAt: new Date() },
      });
      return count;
    },
    exists(userId: string, id: string) {
      return prisma.notification.findFirst({
        where: { id, userId },
        select: { id: true },
      });
    },
    async markAllRead(userId: string) {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    },
    async create(userIds: string[], notification: NewNotification) {
      await prisma.notification.createMany({
        data: userIds.map((userId) => ({ userId, ...notification })),
      });
    },

    /** Active logins with this role; for HOD, only that department's. */
    async usersWithRole(role: string, departmentId: number | null) {
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          role: { name: role },
          ...(departmentId === null ? {} : { employee: { departmentId } }),
        },
        select: { id: true, employeeId: true },
      });
      return users;
    },
    async userOfEmployee(employeeId: string) {
      const user = await prisma.user.findFirst({
        where: { employeeId, status: 'ACTIVE' },
        select: { id: true },
      });
      return user?.id ?? null;
    },
    /** Active logins, optionally only those in one department. */
    async activeUsers(departmentId: number | undefined) {
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          ...(departmentId ? { employee: { departmentId } } : {}),
        },
        select: { id: true },
      });
      return users.map((user) => user.id);
    },
    findDepartment(id: number) {
      return prisma.department.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
    },
    async audit(entry: Audit & { resourceId: string; after: unknown }) {
      await prisma.$transaction((tx) =>
        writeAudit(tx, { ...entry, resource: 'announcement' }),
      );
    },
  };
}

export type NotificationRepository = ReturnType<
  typeof createNotificationRepository
>;
