import { Router, type Response } from 'express';
import { z } from 'zod';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import {
  createCircularSchema,
  queryCircularsSchema,
  updateCircularSchema,
} from './circulars.schema.js';
import type { CircularService } from './circulars.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createCircularRouter(
  auth: AuthService,
  service: CircularService,
) {
  const canRead = requirePermission(auth, 'circular.read');
  const canManage = requirePermission(auth, 'circular.manage');

  return Router()
    .get('/', ...canRead, async (req, res) => {
      const query = parse(queryCircularsSchema, req.query);
      const result = await service.listCirculars(access(res), query);
      res.json({ data: result.items, total: result.total });
    })
    .post('/', ...canManage, async (req, res) => {
      const input = parse(createCircularSchema, req.body);
      const circular = await service.createCircular(access(res), input);
      res.status(201).json({ data: circular });
    })
    .get('/:id', ...canRead, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const circular = await service.findCircular(access(res), id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({ data: circular });
    })
    .patch('/:id', ...canManage, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const input = parse(updateCircularSchema, req.body);
      const updated = await service.updateCircular(access(res), id, input);
      res.json({ data: updated });
    })
    .post('/:id/acknowledge', ...canRead, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const result = await service.acknowledgeRead(access(res), id, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({ data: result });
    })
    .get('/:id/compliance', ...canManage, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const compliance = await service.getCompliance(access(res), id);
      res.json({ data: compliance });
    })
    .get('/:id/compliance/export', ...canManage, async (req, res) => {
      const id = parse(z.string().uuid(), req.params.id);
      const csv = await service.exportReceiptsCsv(access(res), id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="circular-${id}-read-compliance.csv"`,
      );
      res.send(csv);
    });
}
