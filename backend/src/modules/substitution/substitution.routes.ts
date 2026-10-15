import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  assignSchema,
  candidatesSchema,
  leaveListSchema,
} from './substitution.schema.js';
import type { SubstitutionService } from './substitution.service.js';

const access = (res: Response) => res.locals.access as Access;
const uuid = (req: Request, name: string, what: string) => {
  const id = z.uuid().safeParse(req.params[name]);
  if (!id.success) throw new HttpError(404, 'NOT_FOUND', `${what} not found.`);
  return id.data;
};

// Thin handlers: validation here, rules in the service.
export function createSubstitutionRouter(
  auth: AuthService,
  substitution: SubstitutionService,
) {
  const canRead = requirePermission(auth, 'substitution.read');
  const canAssign = requirePermission(auth, 'substitution.assign');
  return Router()
    .get('/rubric', ...canRead, (_req, res) => {
      res.json({ data: substitution.rubric });
    })
    .get('/leave', ...canRead, async (req, res) => {
      const { from } = parse(leaveListSchema, req.query);
      res.json({ data: await substitution.leaves(access(res), from) });
    })
    .get('/leave/:leaveId', ...canRead, async (req, res) => {
      const leaveId = uuid(req, 'leaveId', 'Approved leave');
      res.json({ data: await substitution.classes(access(res), leaveId) });
    })
    .get('/leave/:leaveId/candidates', ...canAssign, async (req, res) => {
      const leaveId = uuid(req, 'leaveId', 'Approved leave');
      const { entryId, date } = parse(candidatesSchema, req.query);
      res.json({
        data: await substitution.candidates(
          access(res),
          leaveId,
          entryId,
          date,
        ),
      });
    })
    .post('/assignments', ...canAssign, async (req, res) => {
      const input = parse(assignSchema, req.body);
      res
        .status(201)
        .json({ data: await substitution.assign(access(res), input, req.ip) });
    })
    .delete('/assignments/:id', ...canAssign, async (req, res) => {
      await substitution.unassign(
        access(res),
        uuid(req, 'id', 'Assignment'),
        req.ip,
      );
      res.status(204).end();
    })
    .get('/mine', ...canRead, async (_req, res) => {
      res.json({ data: await substitution.mine(access(res)) });
    });
}
