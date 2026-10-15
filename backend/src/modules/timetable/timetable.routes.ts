import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  entryInputSchema,
  entryListSchema,
  roomInputSchema,
  subjectInputSchema,
  subjectListSchema,
} from './timetable.schema.js';
import type { TimetableService } from './timetable.service.js';

const entryId = (req: Request) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) {
    throw new HttpError(404, 'NOT_FOUND', 'Timetable entry not found.');
  }
  return id.data;
};
const access = (res: Response) => res.locals.access as Access;

// Thin handlers: validation here, rules in the service.
export function createTimetableRouter(
  auth: AuthService,
  timetable: TimetableService,
) {
  const canRead = requirePermission(auth, 'timetable.read');
  const canManage = requirePermission(auth, 'timetable.manage');
  return Router()
    .get('/periods', ...canRead, async (_req, res) => {
      res.json({ data: await timetable.periods() });
    })
    .get('/subjects', ...canRead, async (req, res) => {
      res.json({
        data: await timetable.subjects(parse(subjectListSchema, req.query)),
      });
    })
    .post('/subjects', ...canManage, async (req, res) => {
      const input = parse(subjectInputSchema, req.body);
      res
        .status(201)
        .json({ data: await timetable.createSubject(access(res), input) });
    })
    .get('/rooms', ...canRead, async (_req, res) => {
      res.json({ data: await timetable.rooms() });
    })
    .post('/rooms', ...canManage, async (req, res) => {
      const input = parse(roomInputSchema, req.body);
      res.status(201).json({ data: await timetable.createRoom(input) });
    })
    .get('/entries', ...canRead, async (req, res) => {
      const query = parse(entryListSchema, req.query);
      res.json({ data: await timetable.entries(access(res), query) });
    })
    .post('/entries', ...canManage, async (req, res) => {
      const input = parse(entryInputSchema, req.body);
      res
        .status(201)
        .json({ data: await timetable.create(access(res), input, req.ip) });
    })
    .patch('/entries/:id', ...canManage, async (req, res) => {
      const input = parse(entryInputSchema, req.body);
      res.json({
        data: await timetable.update(access(res), entryId(req), input, req.ip),
      });
    })
    .delete('/entries/:id', ...canManage, async (req, res) => {
      await timetable.remove(access(res), entryId(req), req.ip);
      res.status(204).end();
    });
}
