import { randomUUID } from 'node:crypto';
import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type {
  NewNotification,
  NotificationRepository,
} from './notifications.repository.js';
import type { Realtime } from './notifications.realtime.js';
import type { AnnouncementInput, ListQuery } from './notifications.schema.js';

/** What other modules use to tell people something happened. */
export interface Notifier {
  /** Everyone with `role` (an HOD only in `departmentId`), except one employee. */
  notifyRole(
    role: string,
    departmentId: number | null,
    notification: NewNotification,
    exceptEmployeeId?: string,
  ): Promise<void>;
  /** The login of one employee, if they have an active one. */
  notifyEmployee(
    employeeId: string,
    notification: NewNotification,
  ): Promise<void>;
}

export function createNotificationService(
  repo: NotificationRepository,
  realtime?: Pick<Realtime, 'publish'>,
) {
  async function send(userIds: string[], notification: NewNotification) {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;
    await repo.create(unique, notification);
    for (const userId of unique) realtime?.publish(userId);
  }

  // A failed notification must never undo the leave decision or
  // assignment that caused it; it is logged instead.
  const safely =
    <A extends unknown[]>(run: (...args: A) => Promise<void>) =>
    async (...args: A) => {
      try {
        await run(...args);
      } catch (error) {
        console.error('Notification failed', error);
      }
    };

  const notifier: Notifier = {
    notifyRole: safely(
      async (role, departmentId, notification, exceptEmployeeId) => {
        const users = await repo.usersWithRole(
          role,
          role === 'HOD' ? departmentId : null,
        );
        await send(
          users
            .filter((user) => user.employeeId !== exceptEmployeeId)
            .map((user) => user.id),
          notification,
        );
      },
    ),
    notifyEmployee: safely(async (employeeId, notification) => {
      const userId = await repo.userOfEmployee(employeeId);
      if (userId) await send([userId], notification);
    }),
  };

  return {
    notifier,

    async list(access: Access, query: ListQuery) {
      const rows = await repo.list(access.userId, query.after, query.limit + 1);
      return {
        data: rows.slice(0, query.limit),
        hasMore: rows.length > query.limit,
      };
    },

    unread(access: Access) {
      return repo.unread(access.userId);
    },

    async markRead(access: Access, id: string) {
      if (!(await repo.exists(access.userId, id))) {
        throw new HttpError(404, 'NOT_FOUND', 'Notification not found.');
      }
      if (await repo.markRead(access.userId, id)) {
        realtime?.publish(access.userId);
      }
    },

    async markAllRead(access: Access) {
      await repo.markAllRead(access.userId);
      realtime?.publish(access.userId);
    },

    /** HR, Principal or Super Admin to everyone or a department; HOD to theirs. */
    async announce(access: Access, input: AnnouncementInput, ip?: string) {
      const departmentId =
        access.scope === 'all' ? input.departmentId : access.departmentId;
      if (access.scope !== 'all') {
        if (departmentId === null || departmentId === undefined) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'Your login is not linked to a department.',
          );
        }
        if (input.departmentId && input.departmentId !== departmentId) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'You can only send announcements to your own department.',
          );
        }
      }
      const department = departmentId
        ? await repo.findDepartment(departmentId)
        : null;
      if (departmentId && !department) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          'Choose a valid department.',
        );
      }
      const recipients = (
        await repo.activeUsers(departmentId ?? undefined)
      ).filter((userId) => userId !== access.userId);
      await send(recipients, {
        kind: 'announcement',
        title: input.title,
        body: input.body,
      });
      await repo.audit({
        actorUserId: access.userId,
        action: 'announcement.send',
        resourceId: randomUUID(),
        after: {
          title: input.title,
          body: input.body,
          department: department?.name ?? 'Everyone',
          recipients: recipients.length,
        },
        ip,
      });
      return { recipients: recipients.length };
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
