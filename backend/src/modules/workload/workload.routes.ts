import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import { thresholdInputSchema, workloadListSchema } from './workload.schema.js';
import type { WorkloadService } from './workload.service.js';

const access = (res: Response) => res.locals.access as Access;
const param = <T extends z.ZodType>(
  schema: T,
  value: unknown,
  what: string,
) => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(404, 'NOT_FOUND', `${what} not found.`);
  return result.data as z.infer<T>;
};

// Thin handlers: validation here, rules in the service.
export function createWorkloadRouter(
  auth: AuthService,
  workload: WorkloadService,
) {
  const canRead = requirePermission(auth, 'workload.read');
  const canConfigure = requirePermission(auth, 'workload.configure');
  return Router()
    .get('/', ...canRead, async (req, res) => {
      const query = parse(workloadListSchema, req.query);
      res.json({ data: await workload.list(access(res), query) });
    })
    .get('/faculty/:id', ...canRead, async (req: Request, res) => {
      const id = param(z.uuid(), req.params.id, 'Faculty member');
      res.json({ data: await workload.faculty(access(res), id) });
    })
    .get('/thresholds', ...canRead, async (_req, res) => {
      res.json({ data: await workload.thresholds() });
    })
    .put('/thresholds/:designationId', ...canConfigure, async (req, res) => {
      const designationId = param(
        z.coerce.number().int().positive(),
        req.params.designationId,
        'Teaching designation',
      );
      const input = parse(thresholdInputSchema, req.body);
      res.json({
        data: await workload.setThreshold(
          access(res),
          designationId,
          input,
          req.ip,
        ),
      });
    });
}
