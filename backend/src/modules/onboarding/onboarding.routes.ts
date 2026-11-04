import { Router, type Response } from 'express';
import { z } from 'zod';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  createCandidateSchema,
  updateCandidateSchema,
  updateCandidateStatusSchema,
  completeOnboardingSchema,
  queryCandidatesSchema,
} from './onboarding.schema.js';
import type { OnboardingService } from './onboarding.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createOnboardingRouter(
  auth: AuthService,
  service: OnboardingService,
) {
  const canRead = requirePermission(auth, 'recruitment.read');
  const canManage = requirePermission(auth, 'recruitment.manage');

  return Router()
    .get('/', ...canRead, async (req, res) => {
      const query = parse(queryCandidatesSchema, req.query);
      const result = await service.list(access(res), query);
      res.json(result);
    })
    .post('/', ...canManage, async (req, res) => {
      const input = parse(createCandidateSchema, req.body);
      const candidate = await service.create(access(res), input);
      res.status(201).json({ data: candidate });
    })
    .get('/:id', ...canRead, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const candidate = await service.getById(access(res), id);
      res.json({ data: candidate });
    })
    .patch('/:id', ...canManage, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(updateCandidateSchema, req.body);
      const candidate = await service.update(access(res), id, input);
      res.json({ data: candidate });
    })
    .post('/:id/issue-letter', ...canManage, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const result = await service.issueLetter(access(res), id);
      res.json({ data: result });
    })
    .post('/:id/status', ...canManage, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(updateCandidateStatusSchema, req.body);
      const candidate = await service.updateStatus(access(res), id, input);
      res.json({ data: candidate });
    })
    .post('/:id/complete', ...canManage, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(completeOnboardingSchema, req.body);
      const result = await service.complete(access(res), id, input);
      res.json({ data: result });
    });
}
