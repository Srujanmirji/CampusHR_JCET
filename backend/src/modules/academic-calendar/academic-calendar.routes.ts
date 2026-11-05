import { Router, type Response } from 'express';
import { requirePermission } from '../../middleware/auth.js';
import type { Access, AuthService } from '../auth/auth.service.js';
import type { AcademicCalendarService } from './academic-calendar.service.js';

const access = (res: Response) => res.locals.access as Access;

export function createAcademicCalendarRouter(
  auth: AuthService,
  service: AcademicCalendarService,
) {
  const canRead = requirePermission(auth, 'academic_calendar.read');
  const canManage = requirePermission(auth, 'academic_calendar.manage');
  const router = Router();

  // Overview
  router.get('/overview', ...canRead, async (_req, res, next) => {
    try {
      const overview = await service.getOverview(access(res));
      res.json(overview);
    } catch (err) {
      next(err);
    }
  });

  // Working Pattern
  router.get('/working-pattern', ...canRead, async (_req, res, next) => {
    try {
      const patterns = await service.getWeeklyWorkingPatterns(access(res));
      res.json(patterns);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/working-pattern', ...canManage, async (req, res, next) => {
    try {
      const patterns = await service.updateWeeklyWorkingPatterns(access(res), req.body);
      res.json(patterns);
    } catch (err) {
      next(err);
    }
  });

  // Integration Helpers (check day & count working days)
  router.get('/integration/check-day', ...canRead, async (req, res, next) => {
    try {
      const date = String(req.query.date ?? '');
      const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
      const employeeType = req.query.employeeType ? String(req.query.employeeType) : undefined;

      const result = await service.getDayClassification(date, { departmentId, employeeType });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/integration/working-days', ...canRead, async (req, res, next) => {
    try {
      const startDate = String(req.query.startDate ?? '');
      const endDate = String(req.query.endDate ?? '');
      const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
      const employeeType = req.query.employeeType ? String(req.query.employeeType) : undefined;

      const workingDays = await service.getWorkingDaysBetween(startDate, endDate, {
        departmentId,
        employeeType,
      });
      const nonWorkingDays = await service.getNonWorkingDaysBetween(startDate, endDate, {
        departmentId,
        employeeType,
      });

      res.json({ startDate, endDate, workingDays, nonWorkingDays });
    } catch (err) {
      next(err);
    }
  });

  // Calendar Days CRUD
  router.get('/', ...canRead, async (req, res, next) => {
    try {
      const result = await service.listCalendarDays(access(res), req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', ...canManage, async (req, res, next) => {
    try {
      const created = await service.createCalendarDay(access(res), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.post('/range', ...canManage, async (req, res, next) => {
    try {
      const result = await service.createCalendarRange(access(res), req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', ...canRead, async (req, res, next) => {
    try {
      const day = await service.getCalendarDayById(access(res), String(req.params.id));
      res.json(day);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', ...canManage, async (req, res, next) => {
    try {
      const updated = await service.updateCalendarDay(access(res), String(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', ...canManage, async (req, res, next) => {
    try {
      const deleted = await service.deleteCalendarDay(access(res), String(req.params.id));
      res.json(deleted);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createAcademicYearsRouter(
  auth: AuthService,
  service: AcademicCalendarService,
) {
  const canRead = requirePermission(auth, 'academic_calendar.read');
  const canManage = requirePermission(auth, 'academic_calendar.manage');
  const router = Router();

  router.get('/current', ...canRead, async (_req, res, next) => {
    try {
      const current = await service.getCurrentAcademicYear();
      res.json(current);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', ...canRead, async (_req, res, next) => {
    try {
      const years = await service.listAcademicYears(access(res));
      res.json(years);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', ...canRead, async (req, res, next) => {
    try {
      const year = await service.getAcademicYearById(access(res), String(req.params.id));
      res.json(year);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', ...canManage, async (req, res, next) => {
    try {
      const created = await service.createAcademicYear(access(res), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', ...canManage, async (req, res, next) => {
    try {
      const updated = await service.updateAcademicYear(access(res), String(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/set-current', ...canManage, async (req, res, next) => {
    try {
      const updated = await service.setCurrentAcademicYear(access(res), String(req.params.id));
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createSemestersRouter(
  auth: AuthService,
  service: AcademicCalendarService,
) {
  const canRead = requirePermission(auth, 'academic_calendar.read');
  const canManage = requirePermission(auth, 'academic_calendar.manage');
  const router = Router();

  router.get('/current', ...canRead, async (_req, res, next) => {
    try {
      const current = await service.getCurrentSemester();
      res.json(current);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', ...canRead, async (req, res, next) => {
    try {
      const academicYearId = req.query.academicYearId ? String(req.query.academicYearId) : undefined;
      const semesters = await service.listSemesters(access(res), academicYearId);
      res.json(semesters);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', ...canRead, async (req, res, next) => {
    try {
      const semester = await service.getSemesterById(access(res), String(req.params.id));
      res.json(semester);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', ...canManage, async (req, res, next) => {
    try {
      const created = await service.createSemester(access(res), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', ...canManage, async (req, res, next) => {
    try {
      const updated = await service.updateSemester(access(res), String(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/set-current', ...canManage, async (req, res, next) => {
    try {
      const updated = await service.setCurrentSemester(access(res), String(req.params.id));
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createHolidaysRouter(
  auth: AuthService,
  service: AcademicCalendarService,
) {
  const canRead = requirePermission(auth, 'academic_calendar.read');
  const router = Router();

  router.get('/', ...canRead, async (req, res, next) => {
    try {
      const academicYearId = req.query.academicYearId ? String(req.query.academicYearId) : undefined;
      const holidays = await service.listHolidays(access(res), academicYearId);
      res.json(holidays);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createRestrictedHolidaysRouter(
  auth: AuthService,
  service: AcademicCalendarService,
) {
  const canRead = requirePermission(auth, 'academic_calendar.read');
  const canManage = requirePermission(auth, 'academic_calendar.manage');
  const router = Router();

  router.get('/', ...canRead, async (req, res, next) => {
    try {
      const annualYear = req.query.annualYear ? String(req.query.annualYear) : undefined;
      const rhList = await service.listRestrictedHolidays(access(res), annualYear);
      res.json(rhList);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', ...canManage, async (req, res, next) => {
    try {
      const created = await service.createRestrictedHoliday(access(res), req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', ...canManage, async (req, res, next) => {
    try {
      const updated = await service.updateRestrictedHoliday(access(res), String(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
