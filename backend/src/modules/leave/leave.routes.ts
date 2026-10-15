import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  approveSchema,
  balanceQuerySchema,
  leaveApplySchema,
  leaveListSchema,
  leaveTypeInputSchema,
  leaveTypeUpdateSchema,
  rejectSchema,
} from './leave.schema.js';
import type { LeaveService } from './leave.service.js';

const access = (res: Response) => res.locals.access as Access;
const requestId = (req: Request) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) {
    throw new HttpError(404, 'NOT_FOUND', 'Leave request not found.');
  }
  return id.data;
};
const typeId = (req: Request) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!id.success)
    throw new HttpError(404, 'NOT_FOUND', 'Leave type not found.');
  return id.data;
};

// Thin handlers: validation here, rules in the service.
export function createLeaveRouter(auth: AuthService, leave: LeaveService) {
  const canRead = requirePermission(auth, 'leave.read');
  const canApply = requirePermission(auth, 'leave.apply');
  const canCancel = requirePermission(auth, 'leave.cancel');
  const canApprove = requirePermission(auth, 'leave.approve');
  const canManageTypes = requirePermission(auth, 'leave_type.manage');
  return Router()
    .get('/types', ...canRead, async (_req, res) => {
      res.json({ data: await leave.types() });
    })
    .post('/types', ...canManageTypes, async (req, res) => {
      const input = parse(leaveTypeInputSchema, req.body);
      res
        .status(201)
        .json({ data: await leave.createType(access(res), input, req.ip) });
    })
    .patch('/types/:id', ...canManageTypes, async (req, res) => {
      const input = parse(leaveTypeUpdateSchema, req.body);
      res.json({
        data: await leave.updateType(access(res), typeId(req), input, req.ip),
      });
    })
    .get('/balances', ...canRead, async (req, res) => {
      const query = parse(balanceQuerySchema, req.query);
      res.json({ data: await leave.balances(access(res), query) });
    })
    .get('/requests', ...canRead, async (req, res) => {
      const query = parse(leaveListSchema, req.query);
      res.json({ data: await leave.list(access(res), query) });
    })
    .post('/requests', ...canApply, async (req, res) => {
      const input = parse(leaveApplySchema, req.body);
      res
        .status(201)
        .json({ data: await leave.apply(access(res), input, req.ip) });
    })
    .get('/requests/:id', ...canRead, async (req, res) => {
      res.json({ data: await leave.get(access(res), requestId(req)) });
    })
    .patch('/requests/:id/approve', ...canApprove, async (req, res) => {
      const { note } = parse(approveSchema, req.body ?? {});
      res.json({
        data: await leave.decide(
          access(res),
          requestId(req),
          true,
          note,
          req.ip,
        ),
      });
    })
    .patch('/requests/:id/reject', ...canApprove, async (req, res) => {
      const { note } = parse(rejectSchema, req.body ?? {});
      res.json({
        data: await leave.decide(
          access(res),
          requestId(req),
          false,
          note,
          req.ip,
        ),
      });
    })
    .patch('/requests/:id/cancel', ...canCancel, async (req, res) => {
      res.json({
        data: await leave.cancel(access(res), requestId(req), req.ip),
      });
    });
}
