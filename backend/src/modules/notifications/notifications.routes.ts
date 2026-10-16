import { Router, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import { announcementSchema, listSchema } from './notifications.schema.js';
import type { NotificationService } from './notifications.service.js';

const access = (res: Response) => res.locals.access as Access;

// Thin handlers: validation here, rules in the service.
export function createNotificationRouter(
  auth: AuthService,
  notifications: NotificationService,
) {
  const canRead = requirePermission(auth, 'notification.read');
  const canAnnounce = requirePermission(auth, 'announcement.send');
  return Router()
    .get('/', ...canRead, async (req, res) => {
      const query = parse(listSchema, req.query);
      res.json(await notifications.list(access(res), query));
    })
    .get('/unread-count', ...canRead, async (_req, res) => {
      res.json({ data: { count: await notifications.unread(access(res)) } });
    })
    .patch('/read-all', ...canRead, async (_req, res) => {
      await notifications.markAllRead(access(res));
      res.status(204).end();
    })
    .patch('/:id/read', ...canRead, async (req, res) => {
      const id = z.uuid().safeParse(req.params.id);
      if (!id.success) {
        throw new HttpError(404, 'NOT_FOUND', 'Notification not found.');
      }
      await notifications.markRead(access(res), id.data);
      res.status(204).end();
    })
    .post('/announcements', ...canAnnounce, async (req, res) => {
      const input = parse(announcementSchema, req.body);
      res
        .status(201)
        .json({
          data: await notifications.announce(access(res), input, req.ip),
        });
    });
}
