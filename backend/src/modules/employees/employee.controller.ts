import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import type { Access } from '../auth/auth.service.js';
import {
  employeeCreateSchema,
  employeeListSchema,
  employeeUpdateSchema,
} from './employee.schema.js';
import type { EmployeeService } from './employee.service.js';

const idParam = (req: Request) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'NOT_FOUND', 'Employee not found.');
  return id.data;
};

const access = (res: { locals: Record<string, unknown> }) =>
  res.locals.access as Access;

export function createEmployeeController(employees: EmployeeService) {
  const list: RequestHandler = async (req, res) => {
    res.json(
      await employees.list(access(res), parse(employeeListSchema, req.query)),
    );
  };

  const get: RequestHandler = async (req, res) => {
    res.json({ data: await employees.get(access(res), idParam(req)) });
  };

  const nextCode: RequestHandler = async (req, res) => {
    const departmentId = parse(
      z.coerce.number().int().positive(),
      req.query.departmentId,
    );
    res.json({
      data: { employeeCode: await employees.nextCode(departmentId) },
    });
  };

  const create: RequestHandler = async (req, res) => {
    const input = parse(employeeCreateSchema, req.body);
    res
      .status(201)
      .json({ data: await employees.create(access(res), input, req.ip) });
  };

  const update: RequestHandler = async (req, res) => {
    const input = parse(employeeUpdateSchema, req.body);
    res.json({
      data: await employees.update(access(res), idParam(req), input, req.ip),
    });
  };

  const archive: RequestHandler = async (req, res) => {
    res.json({
      data: await employees.archive(access(res), idParam(req), req.ip),
    });
  };

  return { list, get, nextCode, create, update, archive };
}
