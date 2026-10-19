import { z } from 'zod';
import { apiRequest } from '@/services/api';

const notificationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

const pageSchema = z.object({
  data: z.array(notificationSchema),
  hasMore: z.boolean(),
});
export type NotificationPage = z.infer<typeof pageSchema>;

export async function listNotifications(after?: string, limit = 20) {
  const search = new URLSearchParams({ limit: String(limit) });
  if (after) search.set('after', after);
  return pageSchema.parse(await apiRequest(`/notifications?${search}`));
}

export async function unreadCount() {
  return z
    .object({ data: z.object({ count: z.number() }) })
    .parse(await apiRequest('/notifications/unread-count')).data.count;
}

export async function markRead(id: string) {
  await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllRead() {
  await apiRequest('/notifications/read-all', { method: 'PATCH' });
}

export async function sendAnnouncement(input: {
  title: string;
  body: string;
  departmentId?: number;
}) {
  return z.object({ data: z.object({ recipients: z.number() }) }).parse(
    await apiRequest('/notifications/announcements', {
      method: 'POST',
      body: input,
    }),
  ).data;
}
