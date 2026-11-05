import { Router, type Response } from 'express';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  createLeaveBalanceAdjustmentSchema,
  createLeavePolicySchema,
  queryLeaveBalanceAdjustmentSchema,
  queryLeavePolicySchema,
  updateLeavePolicySchema,
  updateOnDutyDutyMappingSchema,
} from './leave-policy.schema.js';
import type { LeavePolicyService } from './leave-policy.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createLeavePolicyRouter(
  auth: AuthService,
  service: LeavePolicyService,
): Router {
  const canRead = requirePermission(auth, 'leave_policy.read');
  const canManage = requirePermission(auth, 'leave_policy.manage');

  return Router()
    // Duty mappings for OOD / ODE
    .get('/duty-mappings', ...canRead, async (_req, res) => {
      res.json({ data: await service.getDutyMappings(access(res)) });
    })
    .patch('/duty-mappings', ...canManage, async (req, res) => {
      const input = parse(updateOnDutyDutyMappingSchema, req.body);
      res.json({ data: await service.updateDutyMapping(access(res), input) });
    })

    // Employee Policy Groups
    .get('/groups', ...canRead, async (req, res) => {
      const category = typeof req.query.category === 'string' && (req.query.category === 'TEACHING' || req.query.category === 'NON_TEACHING')
        ? req.query.category
        : undefined;
      res.json({ data: await service.getPolicyGroups(access(res), category) });
    })

    // Applicable policies for an employee / current user
    .get('/applicable', ...canRead, async (req, res) => {
      const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
      const policyYear = typeof req.query.policyYear === 'string' ? req.query.policyYear : undefined;
      res.json({
        data: await service.getApplicablePolicies(access(res), employeeId, policyYear),
      });
    })

    // List all policies (Super Admin, HR, HOD scoped)
    .get('/', ...canRead, async (req, res) => {
      const parsedQuery = parse(queryLeavePolicySchema, req.query);
      res.json({ data: await service.listPolicies(access(res), parsedQuery) });
    })

    // Get policy by ID
    .get('/:id', ...canRead, async (req, res) => {
      const id = String(req.params.id);
      if (!id) throw new HttpError(400, 'VALIDATION_ERROR', 'Policy ID is required');
      res.json({ data: await service.getPolicyById(access(res), id) });
    })

    // Create policy (HR Admin, Super Admin)
    .post('/', ...canManage, async (req, res) => {
      const input = parse(createLeavePolicySchema, req.body);
      res.status(201).json({ data: await service.createPolicy(access(res), input) });
    })

    // Update policy
    .patch('/:id', ...canManage, async (req, res) => {
      const id = String(req.params.id);
      if (!id) throw new HttpError(400, 'VALIDATION_ERROR', 'Policy ID is required');
      const input = parse(updateLeavePolicySchema, req.body);
      res.json({ data: await service.updatePolicy(access(res), id, input) });
    })

    // Delete policy
    .delete('/:id', ...canManage, async (req, res) => {
      const id = String(req.params.id);
      if (!id) throw new HttpError(400, 'VALIDATION_ERROR', 'Policy ID is required');
      res.json({ data: await service.deletePolicy(access(res), id) });
    });
}

export function createLeaveBalancesRouter(
  auth: AuthService,
  service: LeavePolicyService,
): Router {
  const canReadLeave = requirePermission(auth, 'leave.read');

  return Router()
    // Dynamic balances for current user
    .get('/me', ...canReadLeave, async (req, res) => {
      const acc = access(res);
      if (!acc.employeeId) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Your account is not linked to an employee');
      }
      const policyYear = typeof req.query.year === 'string' ? req.query.year : undefined;
      res.json({
        data: await service.calculateAllBalances(acc, acc.employeeId, policyYear),
      });
    })

    // Dynamic balances for an employee
    .get('/:employeeId', ...canReadLeave, async (req, res) => {
      const employeeId = String(req.params.employeeId);
      if (!employeeId) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Employee ID is required');
      }
      const policyYear = typeof req.query.year === 'string' ? req.query.year : undefined;
      res.json({
        data: await service.calculateAllBalances(access(res), employeeId, policyYear),
      });
    });
}

export function createLeaveAdjustmentsRouter(
  auth: AuthService,
  service: LeavePolicyService,
): Router {
  const canReadPolicy = requirePermission(auth, 'leave_policy.read');
  const canManagePolicy = requirePermission(auth, 'leave_policy.manage');

  return Router()
    .get('/', ...canReadPolicy, async (req, res) => {
      const parsed = parse(queryLeaveBalanceAdjustmentSchema, req.query);
      res.json({ data: await service.listAdjustments(access(res), parsed) });
    })
    .post('/', ...canManagePolicy, async (req, res) => {
      const input = parse(createLeaveBalanceAdjustmentSchema, req.body);
      res.status(201).json({ data: await service.createAdjustment(access(res), input) });
    });
}
