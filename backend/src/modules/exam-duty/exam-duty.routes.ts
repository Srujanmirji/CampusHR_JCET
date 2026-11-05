import { Router, type Response } from 'express';
import { z } from 'zod';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  autoAllotSchema,
  createDutySchema,
  createSessionSchema,
  queryDutiesSchema,
  swapDecideSchema,
  swapRequestSchema,
} from './exam-duty.schema.js';
import type { ExamDutyService } from './exam-duty.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createExamDutyRouter(
  auth: AuthService,
  service: ExamDutyService,
) {
  const canRead = requirePermission(auth, 'exam_duty.read');
  const canManage = requirePermission(auth, 'exam_duty.manage');

  return Router()
    .get('/sessions', ...canRead, async (req, res) => {
      const sessions = await service.listSessions(access(res));
      res.json({ data: sessions });
    })
    .post('/sessions', ...canManage, async (req, res) => {
      const input = parse(createSessionSchema, req.body);
      const session = await service.createSession(access(res), input);
      res.status(201).json({ data: session });
    })
    .get('/duties', ...canRead, async (req, res) => {
      const query = parse(queryDutiesSchema, req.query);
      if (query.format === 'csv') {
        const csv = await service.exportCsv(access(res), query);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="exam-duty-roster.csv"',
        );
        res.send(csv);
        return;
      }
      const duties = await service.listDuties(access(res), query);
      res.json({ data: duties });
    })
    .post('/duties', ...canManage, async (req, res) => {
      const input = parse(createDutySchema, req.body);
      const duty = await service.createDuty(access(res), input);
      res.status(201).json({ data: duty });
    })
    .post('/auto-allot', ...canManage, async (req, res) => {
      const input = parse(autoAllotSchema, req.body);
      const result = await service.autoAllot(access(res), input);
      res.status(200).json({ data: result });
    })
    .post('/duties/:id/swap-request', ...canRead, async (req, res) => {
      const dutyId = parse(z.string().uuid(), req.params.id);
      const input = parse(swapRequestSchema, req.body);
      const updated = await service.requestSwap(access(res), dutyId, input);
      res.json({ data: updated });
    })
    .post('/duties/:id/swap-decide', ...canManage, async (req, res) => {
      const dutyId = parse(z.string().uuid(), req.params.id);
      const input = parse(swapDecideSchema, req.body);
      const updated = await service.decideSwap(access(res), dutyId, input);
      res.json({ data: updated });
    });
}
