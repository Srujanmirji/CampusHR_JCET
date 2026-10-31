import { z } from 'zod';
import { apiFetch, type AuthUser } from './session';
import { homeUnavailable, notificationSchema } from './home-api';
export type AppNotification = z.infer<typeof notificationSchema>;
function requireReader(user: AuthUser | null, token: string | null) {
  const reason = homeUnavailable(user, token, 'notification.read');
  if (reason) throw new Error(reason);
}
export async function listNotifications(
  user: AuthUser | null,
  token: string | null,
  after?: string,
  limit = 20,
) {
  requireReader(user, token);
  if (after) z.uuid().parse(after);
  z.number().int().min(1).max(50).parse(limit);
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set('after', after);
  const response = await apiFetch(`/notifications?${params}`);
  const result = z
    .object({
      data: z.array(notificationSchema).max(limit),
      hasMore: z.boolean(),
    })
    .parse(await response.json());
  if (
    (result.hasMore && result.data.length === 0) ||
    result.data.some((row) => row.id === after) ||
    new Set(result.data.map((row) => row.id)).size !== result.data.length
  )
    throw new Error(
      'The server returned an invalid notification page. Refresh the inbox.',
    );
  return result;
}
export async function markNotificationRead(
  user: AuthUser | null,
  token: string | null,
  id?: string,
) {
  requireReader(user, token);
  if (id !== undefined) z.uuid().parse(id);
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await apiFetch(
      id ? `/notifications/${id}/read` : '/notifications/read-all',
      { method: 'PATCH', signal: controller.signal },
    );
    if (response.status !== 204)
      throw new Error(
        'Read status was not confirmed. Refresh before trying again.',
      );
  } finally {
    clearTimeout(timeout);
  }
}
