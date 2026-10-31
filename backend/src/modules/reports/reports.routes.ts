import { Router, type Response } from 'express';
import { parse } from '../../common/validate.js';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import { reportQuerySchema } from './reports.schema.js';
import type { ReportsService } from './reports.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createReportsRouter(
  auth: AuthService,
  reports: ReportsService,
) {
  const canRead = requirePermission(auth, 'report.read');

  return (
    Router()
      // 1. Executive Summary & KPIs
      .get('/summary', ...canRead, async (_req, res) => {
        const summary = await reports.getExecutiveSummary(access(res));
        res.json({ data: summary });
      })

      // 2. Attendance Analytics Report (JSON or CSV)
      .get('/attendance', ...canRead, async (req, res) => {
        const query = parse(reportQuerySchema, req.query);
        const result = await reports.getAttendanceReport(access(res), query);

        if (result.csv) {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="attendance-report.csv"',
          );
          return res.send(result.csv);
        }

        res.json({ data: result.data });
      })

      // 3. Leave Utilization Report (JSON or CSV)
      .get('/leave', ...canRead, async (req, res) => {
        const query = parse(reportQuerySchema, req.query);
        const result = await reports.getLeaveReport(access(res), query);

        if (result.csv) {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="leave-report.csv"',
          );
          return res.send(result.csv);
        }

        res.json({ data: result.data });
      })

      // 4. Faculty Workload Distribution Report (JSON or CSV)
      .get('/workload', ...canRead, async (req, res) => {
        const query = parse(reportQuerySchema, req.query);
        const result = await reports.getWorkloadReport(access(res), query);

        if (result.csv) {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="workload-report.csv"',
          );
          return res.send(result.csv);
        }

        res.json({ data: result.data });
      })

      // 5. Academic Continuity Report (JSON or CSV)
      .get('/continuity', ...canRead, async (req, res) => {
        const query = parse(reportQuerySchema, req.query);
        const result = await reports.getContinuityReport(access(res), query);

        if (result.csv) {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="continuity-report.csv"',
          );
          return res.send(result.csv);
        }

        res.json({ data: result.data });
      })
  );
}
