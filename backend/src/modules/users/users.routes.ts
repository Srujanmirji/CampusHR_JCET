import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import { loginCreateSchema, loginUpdateSchema } from './users.schema.js';
import type { UserService } from './users.service.js';

const access = (res: Response) => res.locals.access as Access;
const uuidParam = (req: Request, name: string, what: string) => {
  const id = z.uuid().safeParse(req.params[name]);
  if (!id.success) throw new HttpError(404, 'NOT_FOUND', `${what} not found.`);
  return id.data;
};

// CampusHR logins for employees (`user.manage`: Super Admin, HR Admin).
export function createUserRouter(auth: AuthService, users: UserService) {
  const canManage = requirePermission(auth, 'user.manage');
  return Router()
    .get('/roles', ...canManage, async (_req, res) => {
      res.json({ data: await users.roles(access(res)) });
    })
    .get('/employee/:employeeId', ...canManage, async (req, res) => {
      const employeeId = uuidParam(req, 'employeeId', 'Employee');
      res.json({ data: await users.forEmployee(employeeId) });
    })
    .post('/', ...canManage, async (req, res) => {
      const input = parse(loginCreateSchema, req.body);
      res
        .status(201)
        .json({ data: await users.create(access(res), input, req.ip) });
    })
    .patch('/:id', ...canManage, async (req, res) => {
      const id = uuidParam(req, 'id', 'Login');
      const input = parse(loginUpdateSchema, req.body);
      res.json({
        data: await users.update(access(res), id, input, req.ip),
      });
    });
}
