import { Router, type Response } from 'express';
import { z } from 'zod';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  createOnDutySchema,
  queryOnDutySchema,
  reviewOnDutySchema,
  uploadCertificateSchema,
} from './on-duty.schema.js';
import type { OnDutyService } from './on-duty.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createOnDutyRouter(
  auth: AuthService,
  service: OnDutyService,
) {
  const canRead = requirePermission(auth, 'on_duty.read');
  const canApply = requirePermission(auth, 'on_duty.apply');
  const canApprove = requirePermission(auth, 'on_duty.approve');

  return Router()
    .get('/', ...canRead, async (req, res) => {
      const query = parse(queryOnDutySchema, req.query);
      const result = await service.list(access(res), query);
      res.json(result);
    })
    .post('/', ...canApply, async (req, res) => {
      const input = parse(createOnDutySchema, req.body);
      const created = await service.apply(access(res), input);
      res.status(201).json({ data: created });
    })
    .get('/:id', ...canRead, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const request = await service.getById(access(res), id);
      res.json({ data: request });
    })
    .post('/:id/review', ...canApprove, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(reviewOnDutySchema, req.body);
      const reviewed = await service.review(access(res), id, input);
      res.json({ data: reviewed });
    })
    .post('/:id/certificate', ...canApply, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(uploadCertificateSchema, req.body);
      const updated = await service.uploadCertificate(access(res), id, input);
      res.json({ data: updated });
    })
    .post('/:id/cancel', ...canApply, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const cancelled = await service.cancel(access(res), id);
      res.json({ data: cancelled });
    });
}
