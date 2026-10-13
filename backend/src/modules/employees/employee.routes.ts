import { Router } from 'express';
import { requirePermission } from '../../middleware/auth.js';
import type { AuthService } from '../auth/auth.service.js';
import { createEmployeeController } from './employee.controller.js';
import type { EmployeeService } from './employee.service.js';

export function createEmployeeRouter(
  auth: AuthService,
  employees: EmployeeService,
) {
  const controller = createEmployeeController(employees);
  return Router()
    .get('/', ...requirePermission(auth, 'employee.read'), controller.list)
    .get(
      '/next-code',
      ...requirePermission(auth, 'employee.create'),
      controller.nextCode,
    )
    .post('/', ...requirePermission(auth, 'employee.create'), controller.create)
    .get('/:id', ...requirePermission(auth, 'employee.read'), controller.get)
    .patch(
      '/:id',
      ...requirePermission(auth, 'employee.update'),
      controller.update,
    )
    .delete(
      '/:id',
      ...requirePermission(auth, 'employee.archive'),
      controller.archive,
    );
}
