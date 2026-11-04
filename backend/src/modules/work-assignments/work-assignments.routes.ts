import { Router, type Response } from 'express';
import { z } from 'zod';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  createWorkAssignmentSchema,
  queryWorkSchema,
  reviewWorkSchema,
  updateWorkStatusSchema,
} from './work-assignments.schema.js';
import type { WorkAssignmentService } from './work-assignments.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createWorkAssignmentRouter(
  auth: AuthService,
  service: WorkAssignmentService,
) {
  const canRead = requirePermission(auth, 'work_assignment.read');
  const canAssign = requirePermission(auth, 'work_assignment.assign');

  return Router()
    .get('/', ...canRead, async (req, res) => {
      const query = parse(queryWorkSchema, req.query);
      const result = await service.listAssignments(access(res), query);
      res.json({
        data: result.items,
        total: result.total,
        metrics: result.metrics,
      });
    })
    .post('/', ...canAssign, async (req, res) => {
      const input = parse(createWorkAssignmentSchema, req.body);
      const assignments = await service.createAssignments(access(res), input);
      res.status(201).json({ data: assignments });
    })
    .get('/:id', ...canRead, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const assignment = await service.findAssignment(access(res), id);
      res.json({ data: assignment });
    })
    .patch('/:id/status', ...canRead, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(updateWorkStatusSchema, req.body);
      const updated = await service.updateStatus(access(res), id, input);
      res.json({ data: updated });
    })
    .post('/:id/review', ...canAssign, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(reviewWorkSchema, req.body);
      const reviewed = await service.reviewAssignment(access(res), id, input);
      res.json({ data: reviewed });
    });
}
