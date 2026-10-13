import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import type { DepartmentService } from './department.service.js';

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, 'Use 2–10 letters or digits, e.g. CSE.'),
  name: z.string().trim().min(2).max(120),
});
const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    hodEmployeeId: z.uuid().nullable().optional(),
  })
  .strict();

const idParam = (req: Request) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!id.success)
    throw new HttpError(404, 'NOT_FOUND', 'Department not found.');
  return id.data;
};
const access = (res: Response) => res.locals.access as Access;

// Thin handlers: validation here, rules in the service.
export function createDepartmentRouter(
  auth: AuthService,
  departments: DepartmentService,
) {
  const canRead = requirePermission(auth, 'department.read');
  const canManage = requirePermission(auth, 'department.manage');
  return Router()
    .get('/', ...canRead, async (_req, res) => {
      res.json({ data: await departments.list() });
    })
    .post('/', ...canManage, async (req, res) => {
      const input = parse(createSchema, req.body);
      res
        .status(201)
        .json({ data: await departments.create(access(res), input, req.ip) });
    })
    .get('/:id', ...canRead, async (req, res) => {
      res.json({ data: await departments.get(idParam(req)) });
    })
    .patch('/:id', ...canManage, async (req, res) => {
      const input = parse(updateSchema, req.body);
      res.json({
        data: await departments.update(
          access(res),
          idParam(req),
          input,
          req.ip,
        ),
      });
    });
}

export function createDesignationRouter(
  auth: AuthService,
  departments: DepartmentService,
) {
  return Router().get(
    '/',
    ...requirePermission(auth, 'department.read'),
    async (_req, res) => {
      res.json({ data: await departments.designations() });
    },
  );
}
