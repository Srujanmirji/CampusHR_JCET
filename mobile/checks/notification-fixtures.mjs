import { randomUUID } from 'node:crypto';
import { homeUser } from './home-fixtures.mjs';
import { recipientUser } from './coverage-fixtures.mjs';
export const notificationUsers = {
  hod: homeUser.id,
  recipient: recipientUser.id,
  admin: '22222222-2222-4222-8222-222222222222',
};
export function createNotificationPreviewRepository() {
  const rows = Array.from({ length: 23 }, (_, index) => ({
    id: randomUUID(),
    userId: homeUser.id,
    kind:
      index === 1
        ? 'leave.waiting'
        : index === 3
          ? 'substitution.assigned'
          : 'announcement',
    title:
      index === 2
        ? 'Untrusted link'
        : index === 3
          ? 'Cover an assigned class'
          : `Campus notice ${String(index + 1).padStart(2, '0')}`,
    body:
      index === 0
        ? 'An announcement for the signed-in account.'
        : 'A disposable server notification for verification.',
    link:
      index === 1
        ? '/leave?tab=requests&request=invalid'
        : index === 2
          ? 'https://evil.test/leave'
          : index === 3
            ? '/substitution'
            : null,
    readAt: null,
    createdAt: new Date(Date.now() - index * 60000).toISOString(),
  }));
  rows.push(
    {
      id: randomUUID(),
      userId: recipientUser.id,
      kind: 'announcement',
      title: 'Recipient only notice',
      body: 'Visible only to the recipient account.',
      link: null,
      readAt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      userId: notificationUsers.admin,
      kind: 'announcement',
      title: 'Administrator notice',
      body: 'No employee link is required for an own inbox.',
      link: null,
      readAt: null,
      createdAt: new Date().toISOString(),
    },
  );
  const own = (userId) =>
    rows
      .filter((row) => row.userId === userId)
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      );
  const publicRow = ({ userId, ...row }) => {
    void userId;
    return row;
  };
  return {
    list: async (userId, after, take) => {
      const list = own(userId),
        start = after ? list.findIndex((row) => row.id === after) + 1 : 0;
      if (after && start === 0) return [];
      return list.slice(start, start + take).map(publicRow);
    },
    find: async (userId, id) =>
      rows.find((row) => row.userId === userId && row.id === id) ?? null,
    unread: async (userId) => own(userId).filter((row) => !row.readAt).length,
    exists: async (userId, id) =>
      own(userId).find((row) => row.id === id) ?? null,
    markRead: async (userId, id) => {
      const row = own(userId).find((row) => row.id === id && !row.readAt);
      if (!row) return 0;
      row.readAt = new Date().toISOString();
      return 1;
    },
    markAllRead: async (userId) => {
      for (const row of own(userId)) row.readAt ??= new Date().toISOString();
    },
    create: async (userIds, notification) => {
      for (const userId of userIds)
        rows.push({
          id: randomUUID(),
          userId,
          ...notification,
          link: notification.link ?? null,
          readAt: null,
          createdAt: new Date().toISOString(),
        });
    },
  };
}
