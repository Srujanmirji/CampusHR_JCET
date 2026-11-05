import { HttpError } from '../../common/http-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import {
  type CalendarDayType,
  type CreateAcademicYearInput,
  type CreateCalendarDayInput,
  type CreateCalendarRangeInput,
  type CreateRestrictedHolidayInput,
  type CreateSemesterInput,
  type QueryCalendarInput,
  type UpdateAcademicYearInput,
  type UpdateCalendarDayInput,
  type UpdateRestrictedHolidayInput,
  type UpdateSemesterInput,
  type UpdateWeeklyPatternInput,
  createAcademicYearSchema,
  createCalendarDaySchema,
  createCalendarRangeSchema,
  createRestrictedHolidaySchema,
  createSemesterSchema,
  queryCalendarSchema,
  updateAcademicYearSchema,
  updateCalendarDaySchema,
  updateRestrictedHolidaySchema,
  updateSemesterSchema,
  updateWeeklyPatternSchema,
} from './academic-calendar.schema.js';
import type {
  AcademicCalendarRepository,
  AcademicYearRecord,
  CalendarDayRecord,
  RestrictedHolidayRecord,
  SemesterRecord,
  WeeklyWorkingPatternRecord,
} from './academic-calendar.repository.js';

export interface CalendarOverview {
  currentAcademicYear: AcademicYearRecord | null;
  currentSemester: SemesterRecord | null;
  semesterWorkingDays: number;
  upcomingHolidays: CalendarDayRecord[];
  upcomingAcademicEvents: CalendarDayRecord[];
  restrictedHolidaysCount: number;
}

export interface DayClassification {
  date: string;
  dayOfWeek: number;
  dayName: string;
  dayType: CalendarDayType;
  isWorkingDay: boolean;
  title: string | null;
  description: string | null;
  calendarDayId: string | null;
  source: string;
}

export interface CalendarContext {
  employeeId?: string | null;
  departmentId?: number | null;
  employeeType?: string | null;
}

export interface AcademicCalendarService {
  // Academic Years
  listAcademicYears(access: Access): Promise<AcademicYearRecord[]>;
  getAcademicYearById(access: Access, id: string): Promise<AcademicYearRecord>;
  getCurrentAcademicYear(): Promise<AcademicYearRecord | null>;
  createAcademicYear(access: Access, rawInput: CreateAcademicYearInput): Promise<AcademicYearRecord>;
  updateAcademicYear(access: Access, id: string, rawInput: UpdateAcademicYearInput): Promise<AcademicYearRecord>;
  setCurrentAcademicYear(access: Access, id: string): Promise<AcademicYearRecord>;

  // Semesters
  listSemesters(access: Access, academicYearId?: string): Promise<SemesterRecord[]>;
  getSemesterById(access: Access, id: string): Promise<SemesterRecord>;
  getCurrentSemester(): Promise<SemesterRecord | null>;
  createSemester(access: Access, rawInput: CreateSemesterInput): Promise<SemesterRecord>;
  updateSemester(access: Access, id: string, rawInput: UpdateSemesterInput): Promise<SemesterRecord>;
  setCurrentSemester(access: Access, id: string): Promise<SemesterRecord>;

  // Calendar Days
  listCalendarDays(access: Access, rawQuery: QueryCalendarInput): Promise<{
    data: CalendarDayRecord[];
    meta: { page: number; pageSize: number; total: number };
  }>;
  getCalendarDayById(access: Access, id: string): Promise<CalendarDayRecord>;
  createCalendarDay(access: Access, rawInput: CreateCalendarDayInput): Promise<CalendarDayRecord>;
  createCalendarRange(access: Access, rawInput: CreateCalendarRangeInput): Promise<{ count: number }>;
  updateCalendarDay(access: Access, id: string, rawInput: UpdateCalendarDayInput): Promise<CalendarDayRecord>;
  deleteCalendarDay(access: Access, id: string): Promise<CalendarDayRecord>;

  // Holidays
  listHolidays(access: Access, academicYearId?: string): Promise<CalendarDayRecord[]>;
  listRestrictedHolidays(access: Access, annualYear?: string): Promise<RestrictedHolidayRecord[]>;
  createRestrictedHoliday(access: Access, rawInput: CreateRestrictedHolidayInput): Promise<RestrictedHolidayRecord>;
  updateRestrictedHoliday(access: Access, id: string, rawInput: UpdateRestrictedHolidayInput): Promise<RestrictedHolidayRecord>;

  // Weekly Working Pattern
  getWeeklyWorkingPatterns(access?: Access): Promise<WeeklyWorkingPatternRecord[]>;
  updateWeeklyWorkingPatterns(access: Access, rawInput: UpdateWeeklyPatternInput): Promise<WeeklyWorkingPatternRecord[]>;

  // Overview
  getOverview(access: Access): Promise<CalendarOverview>;

  // Reusable Integration Service methods
  isWorkingDay(
    date: Date | string,
    context?: CalendarContext,
  ): Promise<boolean>;
  getDayClassification(
    date: Date | string,
    context?: CalendarContext,
  ): Promise<DayClassification>;
  getWorkingDaysBetween(
    startDate: Date | string,
    endDate: Date | string,
    context?: CalendarContext,
  ): Promise<number>;
  getNonWorkingDaysBetween(
    startDate: Date | string,
    endDate: Date | string,
    context?: CalendarContext,
  ): Promise<number>;
  getRestrictedHolidays(
    year?: string | number,
    context?: { employeeType?: string | null },
  ): Promise<RestrictedHolidayRecord[]>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function normalizeDate(d: Date | string): { dateObj: Date; dateStr: string } {
  if (typeof d === 'string') {
    const clean = d.split('T')[0]!;
    return { dateObj: new Date(`${clean}T00:00:00.000Z`), dateStr: clean };
  }
  const clean = d.toISOString().split('T')[0]!;
  return { dateObj: new Date(`${clean}T00:00:00.000Z`), dateStr: clean };
}

export function createAcademicCalendarService(
  repository: AcademicCalendarRepository,
): AcademicCalendarService {
  // Ensure default weekly working patterns if none exist
  async function ensureDefaultWorkingPatterns(): Promise<WeeklyWorkingPatternRecord[]> {
    const existing = await repository.getWeeklyWorkingPatterns();
    if (existing.length === 7) return existing;

    const defaults = [
      { dayOfWeek: 0, dayName: 'Sunday', isWorkingDay: false, description: 'Institutional Weekly Off' },
      { dayOfWeek: 1, dayName: 'Monday', isWorkingDay: true, description: 'Standard Working Day' },
      { dayOfWeek: 2, dayName: 'Tuesday', isWorkingDay: true, description: 'Standard Working Day' },
      { dayOfWeek: 3, dayName: 'Wednesday', isWorkingDay: true, description: 'Standard Working Day' },
      { dayOfWeek: 4, dayName: 'Thursday', isWorkingDay: true, description: 'Standard Working Day' },
      { dayOfWeek: 5, dayName: 'Friday', isWorkingDay: true, description: 'Standard Working Day' },
      { dayOfWeek: 6, dayName: 'Saturday', isWorkingDay: true, description: 'Standard Working Day' },
    ];

    const results: WeeklyWorkingPatternRecord[] = [];
    for (const d of defaults) {
      const row = await repository.upsertWeeklyWorkingPattern(d.dayOfWeek, d);
      results.push(row);
    }
    return results;
  }

  return {
    async listAcademicYears(_access) {
      
      return repository.findAcademicYears();
    },

    async getAcademicYearById(_access, id) {
      
      const year = await repository.findAcademicYearById(id);
      if (!year) throw new HttpError(404, 'NOT_FOUND', 'Academic year not found.');
      return year;
    },

    async getCurrentAcademicYear() {
      return repository.findCurrentAcademicYear();
    },

    async createAcademicYear(access, rawInput) {
      
      const input = createAcademicYearSchema.parse(rawInput);

      const existing = await repository.findAcademicYearByName(input.name);
      if (existing) {
        throw new HttpError(409, 'CONFLICT', `Academic year "${input.name}" already exists.`);
      }

      const start = new Date(`${input.startDate}T00:00:00.000Z`);
      const end = new Date(`${input.endDate}T00:00:00.000Z`);

      // Verify no invalid overlapping ranges with existing academic years
      const allYears = await repository.findAcademicYears();
      const overlap = allYears.find((y) => start <= y.endDate && end >= y.startDate);
      if (overlap) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          `Academic year date range (${input.startDate} to ${input.endDate}) overlaps with existing academic year "${overlap.name}" (${overlap.startDate.toISOString().split('T')[0]} to ${overlap.endDate.toISOString().split('T')[0]}).`,
        );
      }

      return repository.createAcademicYear({
        name: input.name,
        startDate: start,
        endDate: end,
        isCurrent: input.isCurrent,
        status: input.status,
      });
    },

    async updateAcademicYear(access, id, rawInput) {
      
      const input = updateAcademicYearSchema.parse(rawInput);

      const existing = await repository.findAcademicYearById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Academic year not found.');

      if (input.name && input.name !== existing.name) {
        const nameConflict = await repository.findAcademicYearByName(input.name);
        if (nameConflict) {
          throw new HttpError(409, 'CONFLICT', `Academic year "${input.name}" already exists.`);
        }
      }

      const start = input.startDate !== undefined ? new Date(`${input.startDate}T00:00:00.000Z`) : existing.startDate;
      const end = input.endDate !== undefined ? new Date(`${input.endDate}T00:00:00.000Z`) : existing.endDate;

      if (start > end) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Start date cannot be after end date.');
      }

      if (input.startDate !== undefined || input.endDate !== undefined) {
        const allYears = await repository.findAcademicYears();
        const overlap = allYears.find((y) => y.id !== id && start <= y.endDate && end >= y.startDate);
        if (overlap) {
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            `Academic year date range overlaps with existing academic year "${overlap.name}".`,
          );
        }
      }

      const updateData: Prisma.AcademicYearUpdateInput = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.startDate !== undefined) {
        updateData.startDate = start;
      }
      if (input.endDate !== undefined) {
        updateData.endDate = end;
      }
      if (input.isCurrent !== undefined) updateData.isCurrent = input.isCurrent;
      if (input.status !== undefined) updateData.status = input.status;

      return repository.updateAcademicYear(id, updateData);
    },

    async setCurrentAcademicYear(access, id) {
      
      const existing = await repository.findAcademicYearById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Academic year not found.');
      return repository.setCurrentAcademicYear(id);
    },

    async listSemesters(access, academicYearId) {
      
      return repository.findSemesters(academicYearId);
    },

    async getSemesterById(access, id) {
      
      const sem = await repository.findSemesterById(id);
      if (!sem) throw new HttpError(404, 'NOT_FOUND', 'Semester not found.');
      return sem;
    },

    async getCurrentSemester() {
      return repository.findCurrentSemester();
    },

    async createSemester(access, rawInput) {
      
      const input = createSemesterSchema.parse(rawInput);

      const year = await repository.findAcademicYearById(input.academicYearId);
      if (!year) throw new HttpError(404, 'NOT_FOUND', 'Associated Academic Year not found.');

      const semStart = new Date(`${input.startDate}T00:00:00.000Z`);
      const semEnd = new Date(`${input.endDate}T00:00:00.000Z`);

      // Verify semester dates fall generally within academic year bounds
      if (semStart < year.startDate || semEnd > year.endDate) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          `Semester dates (${input.startDate} to ${input.endDate}) must fall within academic year range (${year.startDate.toISOString().split('T')[0]} to ${year.endDate.toISOString().split('T')[0]}).`,
        );
      }

      // Teaching dates validation
      if (input.teachingStartDate && input.teachingEndDate) {
        if (new Date(input.teachingStartDate) > new Date(input.teachingEndDate)) {
          throw new HttpError(400, 'VALIDATION_ERROR', 'Teaching start date cannot be after teaching end date.');
        }
      }
      if (input.teachingStartDate && (new Date(input.teachingStartDate) < semStart || new Date(input.teachingStartDate) > semEnd)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Teaching start date must fall within semester dates.');
      }
      if (input.teachingEndDate && (new Date(input.teachingEndDate) < semStart || new Date(input.teachingEndDate) > semEnd)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Teaching end date must fall within semester dates.');
      }

      // Exam dates validation
      if (input.examStartDate && input.examEndDate) {
        if (new Date(input.examStartDate) > new Date(input.examEndDate)) {
          throw new HttpError(400, 'VALIDATION_ERROR', 'Exam start date cannot be after exam end date.');
        }
      }
      if (input.examStartDate && (new Date(input.examStartDate) < semStart || new Date(input.examStartDate) > semEnd)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Exam start date must fall within semester dates.');
      }
      if (input.examEndDate && (new Date(input.examEndDate) < semStart || new Date(input.examEndDate) > semEnd)) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Exam end date must fall within semester dates.');
      }

      // Prevent overlapping semester ranges within the same academic year
      const existingSemesters = await repository.findSemesters(input.academicYearId);
      const semOverlap = existingSemesters.find((s) => semStart <= s.endDate && semEnd >= s.startDate);
      if (semOverlap) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          `Semester date range (${input.startDate} to ${input.endDate}) overlaps with existing semester "${semOverlap.name}".`,
        );
      }

      return repository.createSemester({
        academicYear: { connect: { id: input.academicYearId } },
        name: input.name,
        type: input.type,
        startDate: semStart,
        endDate: semEnd,
        teachingStartDate: input.teachingStartDate
          ? new Date(`${input.teachingStartDate}T00:00:00.000Z`)
          : null,
        teachingEndDate: input.teachingEndDate
          ? new Date(`${input.teachingEndDate}T00:00:00.000Z`)
          : null,
        examStartDate: input.examStartDate
          ? new Date(`${input.examStartDate}T00:00:00.000Z`)
          : null,
        examEndDate: input.examEndDate
          ? new Date(`${input.examEndDate}T00:00:00.000Z`)
          : null,
        isCurrent: input.isCurrent,
        status: input.status,
      });
    },

    async updateSemester(access, id, rawInput) {
      
      const input = updateSemesterSchema.parse(rawInput);

      const existing = await repository.findSemesterById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Semester not found.');

      const semStart = input.startDate !== undefined ? new Date(`${input.startDate}T00:00:00.000Z`) : existing.startDate;
      const semEnd = input.endDate !== undefined ? new Date(`${input.endDate}T00:00:00.000Z`) : existing.endDate;

      if (semStart > semEnd) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Start date cannot be after end date.');
      }

      if (input.startDate !== undefined || input.endDate !== undefined) {
        const existingSemesters = await repository.findSemesters(existing.academicYearId);
        const semOverlap = existingSemesters.find((s) => s.id !== id && semStart <= s.endDate && semEnd >= s.startDate);
        if (semOverlap) {
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            `Semester date range overlaps with existing semester "${semOverlap.name}".`,
          );
        }
      }

      const updateData: Prisma.SemesterUpdateInput = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.startDate !== undefined) {
        updateData.startDate = semStart;
      }
      if (input.endDate !== undefined) {
        updateData.endDate = semEnd;
      }
      if (input.teachingStartDate !== undefined) {
        updateData.teachingStartDate = input.teachingStartDate
          ? new Date(`${input.teachingStartDate}T00:00:00.000Z`)
          : null;
      }
      if (input.teachingEndDate !== undefined) {
        updateData.teachingEndDate = input.teachingEndDate
          ? new Date(`${input.teachingEndDate}T00:00:00.000Z`)
          : null;
      }
      if (input.examStartDate !== undefined) {
        updateData.examStartDate = input.examStartDate
          ? new Date(`${input.examStartDate}T00:00:00.000Z`)
          : null;
      }
      if (input.examEndDate !== undefined) {
        updateData.examEndDate = input.examEndDate
          ? new Date(`${input.examEndDate}T00:00:00.000Z`)
          : null;
      }
      if (input.isCurrent !== undefined) updateData.isCurrent = input.isCurrent;
      if (input.status !== undefined) updateData.status = input.status;

      return repository.updateSemester(id, updateData);
    },

    async setCurrentSemester(access, id) {
      
      const existing = await repository.findSemesterById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Semester not found.');
      return repository.setCurrentSemester(id);
    },

    async listCalendarDays(access, rawQuery) {
      
      const query = queryCalendarSchema.parse(rawQuery);

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (query.month) {
        const [yearStr, monthStr] = query.month.split('-');
        const y = parseInt(yearStr!, 10);
        const m = parseInt(monthStr!, 10);
        startDate = new Date(Date.UTC(y, m - 1, 1));
        endDate = new Date(Date.UTC(y, m, 0));
      } else {
        if (query.startDate) startDate = new Date(`${query.startDate}T00:00:00.000Z`);
        if (query.endDate) endDate = new Date(`${query.endDate}T00:00:00.000Z`);
      }

      const { days, total } = await repository.findCalendarDays({
        academicYearId: query.academicYearId,
        semesterId: query.semesterId,
        startDate,
        endDate,
        dayType: query.dayType,
        isWorkingDay: query.isWorkingDay,
        departmentId: query.departmentId,
        appliesToEmployeeType: query.appliesToEmployeeType,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: days,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
        },
      };
    },

    async getCalendarDayById(access, id) {
      
      const day = await repository.findCalendarDayById(id);
      if (!day) throw new HttpError(404, 'NOT_FOUND', 'Calendar day entry not found.');
      return day;
    },

    async createCalendarDay(access, rawInput) {
      
      const input = createCalendarDaySchema.parse(rawInput);

      const targetDate = new Date(`${input.date}T00:00:00.000Z`);

      // Domain Rule 1: One date must not contain contradictory day classifications
      const existingDay = await repository.findCalendarDayByDate(targetDate, {
        departmentId: input.departmentId ?? null,
        appliesToEmployeeType: input.appliesToEmployeeType ?? null,
      });

      if (existingDay && (existingDay.departmentId ?? null) === (input.departmentId ?? null)) {
        throw new HttpError(
          409,
          'CONFLICT',
          `An entry (${existingDay.dayType}: "${existingDay.title ?? 'No title'}") already exists for ${input.date}. Edit or remove the existing entry to avoid contradictory day classifications.`,
        );
      }

      // Domain Rule 2: Special Working Day overrides normal weekly off
      let isWorkingDay = input.isWorkingDay;
      if (input.dayType === 'SPECIAL_WORKING_DAY') {
        isWorkingDay = true;
      }
      // Domain Rule 3: Public Holidays are non-working
      else if (input.dayType === 'PUBLIC_HOLIDAY') {
        isWorkingDay = false;
      }
      // Domain Rule 4: Weekly Off is non-working
      else if (input.dayType === 'WEEKLY_OFF') {
        isWorkingDay = false;
      }

      const academicYear = await repository.findAcademicYearById(input.academicYearId);
      if (!academicYear) throw new HttpError(404, 'NOT_FOUND', 'Academic year not found.');

      const dayRecord = await repository.createCalendarDay({
        date: targetDate,
        academicYear: { connect: { id: input.academicYearId } },
        semester: input.semesterId ? { connect: { id: input.semesterId } } : undefined,
        dayType: input.dayType,
        title: input.title ?? null,
        description: input.description ?? null,
        isWorkingDay,
        department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
        appliesToEmployeeType: input.appliesToEmployeeType ?? 'ALL',
        source: input.source ?? 'MANUAL',
        createdBy: access.userId ? { connect: { id: access.userId } } : undefined,
      });

      // Domain Rule 4: Restricted Holiday Master link
      if (input.dayType === 'RESTRICTED_HOLIDAY') {
        await repository.createRestrictedHoliday({
          calendarDay: { connect: { id: dayRecord.id } },
          name: input.title || 'Restricted Holiday',
          date: targetDate,
          annualYear: academicYear.name,
          eligibleEmployeeTypes: input.appliesToEmployeeType ?? 'ALL',
          description: input.description ?? null,
          active: true,
        });
      }

      return repository.findCalendarDayById(dayRecord.id) as Promise<CalendarDayRecord>;
    },

    async createCalendarRange(access, rawInput) {
      
      const input = createCalendarRangeSchema.parse(rawInput);

      const academicYear = await repository.findAcademicYearById(input.academicYearId);
      if (!academicYear) throw new HttpError(404, 'NOT_FOUND', 'Academic year not found.');

      const start = new Date(`${input.startDate}T00:00:00.000Z`);
      const end = new Date(`${input.endDate}T00:00:00.000Z`);

      let isWorkingDay = input.isWorkingDay;
      if (input.dayType === 'SPECIAL_WORKING_DAY') {
        isWorkingDay = true;
      } else if (input.dayType === 'PUBLIC_HOLIDAY' || input.dayType === 'WEEKLY_OFF') {
        isWorkingDay = false;
      }

      const daysToCreate: Prisma.CalendarDayCreateManyInput[] = [];
      const current = new Date(start);

      while (current <= end) {
        const currentDate = new Date(current);
        daysToCreate.push({
          date: currentDate,
          academicYearId: input.academicYearId,
          semesterId: input.semesterId ?? null,
          dayType: input.dayType,
          title: input.title,
          description: input.description ?? null,
          isWorkingDay,
          departmentId: input.departmentId ?? null,
          appliesToEmployeeType: input.appliesToEmployeeType ?? 'ALL',
          source: input.source ?? 'MANUAL',
          createdById: access.userId ?? null,
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }

      const count = await repository.createManyCalendarDays(daysToCreate);
      return { count };
    },

    async updateCalendarDay(access, id, rawInput) {
      
      const input = updateCalendarDaySchema.parse(rawInput);

      const existing = await repository.findCalendarDayById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Calendar day entry not found.');

      const dayType = input.dayType ?? existing.dayType;
      let isWorkingDay = input.isWorkingDay !== undefined ? input.isWorkingDay : existing.isWorkingDay;

      if (dayType === 'SPECIAL_WORKING_DAY') {
        isWorkingDay = true;
      } else if (dayType === 'PUBLIC_HOLIDAY' || dayType === 'WEEKLY_OFF') {
        isWorkingDay = false;
      }

      const updateData: Prisma.CalendarDayUpdateInput = {
        dayType,
        isWorkingDay,
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.semesterId !== undefined) {
        updateData.semester = input.semesterId ? { connect: { id: input.semesterId } } : { disconnect: true };
      }
      if (input.departmentId !== undefined) {
        updateData.department = input.departmentId ? { connect: { id: input.departmentId } } : { disconnect: true };
      }
      if (input.appliesToEmployeeType !== undefined) {
        updateData.appliesToEmployeeType = input.appliesToEmployeeType;
      }

      return repository.updateCalendarDay(id, updateData);
    },

    async deleteCalendarDay(access, id) {
      
      const existing = await repository.findCalendarDayById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Calendar day entry not found.');

      // If linked to restricted holiday, delete the RH record as well
      if (existing.restrictedHoliday) {
        await repository.deleteRestrictedHoliday(existing.restrictedHoliday.id);
      }

      return repository.deleteCalendarDay(id);
    },

    async listHolidays(access, academicYearId) {
      
      const { days } = await repository.findCalendarDays({
        academicYearId,
        pageSize: 366,
      });

      return days.filter(
        (d) =>
          d.dayType === 'PUBLIC_HOLIDAY' ||
          d.dayType === 'RESTRICTED_HOLIDAY' ||
          d.dayType === 'WEEKLY_OFF' ||
          d.dayType === 'SPECIAL_WORKING_DAY' ||
          !d.isWorkingDay,
      );
    },

    async listRestrictedHolidays(access, annualYear) {
      
      return repository.findRestrictedHolidays(annualYear);
    },

    async createRestrictedHoliday(access, rawInput) {
      
      const input = createRestrictedHolidaySchema.parse(rawInput);
      const targetDate = new Date(`${input.date}T00:00:00.000Z`);

      return repository.createRestrictedHoliday({
        name: input.name,
        date: targetDate,
        annualYear: input.annualYear,
        eligibleEmployeeTypes: input.eligibleEmployeeTypes ?? 'ALL',
        description: input.description ?? null,
        active: input.active,
        calendarDay: input.calendarDayId ? { connect: { id: input.calendarDayId } } : undefined,
      });
    },

    async updateRestrictedHoliday(access, id, rawInput) {
      
      const input = updateRestrictedHolidaySchema.parse(rawInput);

      const existing = await repository.findRestrictedHolidayById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Restricted holiday not found.');

      const updateData: Prisma.RestrictedHolidayUpdateInput = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.date !== undefined) updateData.date = new Date(`${input.date}T00:00:00.000Z`);
      if (input.annualYear !== undefined) updateData.annualYear = input.annualYear;
      if (input.eligibleEmployeeTypes !== undefined) updateData.eligibleEmployeeTypes = input.eligibleEmployeeTypes;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.active !== undefined) updateData.active = input.active;

      return repository.updateRestrictedHoliday(id, updateData);
    },

    async getWeeklyWorkingPatterns() {
      return ensureDefaultWorkingPatterns();
    },

    async updateWeeklyWorkingPatterns(access, rawInput) {
      
      const input = updateWeeklyPatternSchema.parse(rawInput);

      const updated: WeeklyWorkingPatternRecord[] = [];
      for (const pattern of input.patterns) {
        const row = await repository.upsertWeeklyWorkingPattern(pattern.dayOfWeek, {
          dayName: pattern.dayName,
          isWorkingDay: pattern.isWorkingDay,
          description: pattern.description,
        });
        updated.push(row);
      }
      return updated;
    },

    async getOverview(_access) {
      

      const currentAcademicYear = await repository.findCurrentAcademicYear();
      const currentSemester = await repository.findCurrentSemester();

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      let semesterWorkingDays = 0;
      if (currentSemester) {
        semesterWorkingDays = await this.getWorkingDaysBetween(
          currentSemester.startDate,
          currentSemester.endDate,
        );
      }

      // Fetch upcoming calendar entries
      const { days } = await repository.findCalendarDays({
        startDate: today,
        pageSize: 100,
      });

      const upcomingHolidays = days
        .filter((d) => d.dayType === 'PUBLIC_HOLIDAY' || d.dayType === 'RESTRICTED_HOLIDAY')
        .slice(0, 5);

      const upcomingAcademicEvents = days
        .filter(
          (d) =>
            d.dayType === 'ACADEMIC_EVENT' ||
            d.dayType === 'INSTITUTIONAL_EVENT' ||
            d.dayType === 'EXAMINATION' ||
            d.dayType === 'VACATION',
        )
        .slice(0, 5);

      const rhList = await repository.findRestrictedHolidays(currentAcademicYear?.name);

      return {
        currentAcademicYear,
        currentSemester,
        semesterWorkingDays,
        upcomingHolidays,
        upcomingAcademicEvents,
        restrictedHolidaysCount: rhList.length,
      };
    },

    // ==========================================
    // REUSABLE INTEGRATION SERVICE IMPLEMENTATION
    // ==========================================

    async isWorkingDay(dateInput, context) {
      const classification = await this.getDayClassification(dateInput, context);
      return classification.isWorkingDay;
    },

    async getDayClassification(dateInput, context) {
      const { dateObj, dateStr } = normalizeDate(dateInput);
      const dayOfWeek = dateObj.getUTCDay();
      const dayName = DAY_NAMES[dayOfWeek] ?? 'Day';

      // 1. Check for explicit CalendarDay declaration
      const calendarDay = await repository.findCalendarDayByDate(dateObj, {
        departmentId: context?.departmentId,
        appliesToEmployeeType: context?.employeeType,
      });

      if (calendarDay) {
        // Special Working Day explicitly overrides weekly off
        if (calendarDay.dayType === 'SPECIAL_WORKING_DAY') {
          return {
            date: dateStr,
            dayOfWeek,
            dayName,
            dayType: 'SPECIAL_WORKING_DAY',
            isWorkingDay: true,
            title: calendarDay.title,
            description: calendarDay.description,
            calendarDayId: calendarDay.id,
            source: calendarDay.source || 'CALENDAR_OVERRIDE',
          };
        }

        // Public Holiday explicitly makes it non-working
        if (calendarDay.dayType === 'PUBLIC_HOLIDAY') {
          return {
            date: dateStr,
            dayOfWeek,
            dayName,
            dayType: 'PUBLIC_HOLIDAY',
            isWorkingDay: false,
            title: calendarDay.title,
            description: calendarDay.description,
            calendarDayId: calendarDay.id,
            source: calendarDay.source || 'PUBLIC_HOLIDAY',
          };
        }

        // Weekly off explicitly makes it non-working
        if (calendarDay.dayType === 'WEEKLY_OFF') {
          return {
            date: dateStr,
            dayOfWeek,
            dayName,
            dayType: 'WEEKLY_OFF',
            isWorkingDay: false,
            title: calendarDay.title,
            description: calendarDay.description,
            calendarDayId: calendarDay.id,
            source: calendarDay.source || 'WEEKLY_OFF',
          };
        }

        // Restricted Holiday: Does NOT automatically make it a non-working day for all employees
        if (calendarDay.dayType === 'RESTRICTED_HOLIDAY') {
          return {
            date: dateStr,
            dayOfWeek,
            dayName,
            dayType: 'RESTRICTED_HOLIDAY',
            isWorkingDay: calendarDay.isWorkingDay, // Usually true unless admin flagged otherwise
            title: calendarDay.title,
            description: calendarDay.description,
            calendarDayId: calendarDay.id,
            source: 'RESTRICTED_HOLIDAY',
          };
        }

        // Other types (VACATION, EXAMINATION, INSTITUTIONAL_EVENT, ACADEMIC_EVENT, WORKING_DAY)
        return {
          date: dateStr,
          dayOfWeek,
          dayName,
          dayType: calendarDay.dayType,
          isWorkingDay: calendarDay.isWorkingDay,
          title: calendarDay.title,
          description: calendarDay.description,
          calendarDayId: calendarDay.id,
          source: calendarDay.source || 'CALENDAR_ENTRY',
        };
      }

      // 2. No explicit calendar record exists: fall back to Institutional Weekly Working Pattern
      const weeklyPatterns = await ensureDefaultWorkingPatterns();
      const pattern = weeklyPatterns.find((p) => p.dayOfWeek === dayOfWeek);

      const isWorkingDay = pattern ? pattern.isWorkingDay : dayOfWeek !== 0;

      return {
        date: dateStr,
        dayOfWeek,
        dayName,
        dayType: isWorkingDay ? 'WORKING_DAY' : 'WEEKLY_OFF',
        isWorkingDay,
        title: isWorkingDay ? 'Regular Working Day' : 'Weekly Off',
        description: pattern?.description ?? null,
        calendarDayId: null,
        source: 'WEEKLY_WORKING_PATTERN',
      };
    },

    async getWorkingDaysBetween(startDateInput, endDateInput, context) {
      const { dateObj: start } = normalizeDate(startDateInput);
      const { dateObj: end } = normalizeDate(endDateInput);

      if (start > end) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Start date cannot be after end date.');
      }

      let count = 0;
      const current = new Date(start);

      // Pre-fetch all calendar days in range for high performance
      const explicitDays = await repository.findCalendarDaysByDateRange(start, end, {
        departmentId: context?.departmentId,
        appliesToEmployeeType: context?.employeeType,
      });

      const dayMap = new Map<string, CalendarDayRecord>();
      for (const d of explicitDays) {
        if (
          context?.employeeType &&
          d.appliesToEmployeeType &&
          d.appliesToEmployeeType !== 'ALL' &&
          d.appliesToEmployeeType.toUpperCase() !== context.employeeType.toUpperCase()
        ) {
          continue;
        }
        const key = d.date.toISOString().split('T')[0]!;
        if (!dayMap.has(key) || (context?.departmentId && d.departmentId === context.departmentId)) {
          dayMap.set(key, d);
        }
      }

      const weeklyPatterns = await ensureDefaultWorkingPatterns();
      const patternMap = new Map<number, boolean>();
      for (const p of weeklyPatterns) {
        patternMap.set(p.dayOfWeek, p.isWorkingDay);
      }

      while (current <= end) {
        const key = current.toISOString().split('T')[0]!;
        const dayOfWeek = current.getUTCDay();
        const explicit = dayMap.get(key);

        if (explicit) {
          if (explicit.dayType === 'SPECIAL_WORKING_DAY') {
            count++;
          } else if (explicit.dayType === 'PUBLIC_HOLIDAY' || explicit.dayType === 'WEEKLY_OFF') {
            // non-working
          } else if (explicit.isWorkingDay) {
            count++;
          }
        } else {
          const isWorking = patternMap.get(dayOfWeek) ?? (dayOfWeek !== 0);
          if (isWorking) {
            count++;
          }
        }

        current.setUTCDate(current.getUTCDate() + 1);
      }

      return count;
    },

    async getNonWorkingDaysBetween(startDateInput, endDateInput, context) {
      const { dateObj: start } = normalizeDate(startDateInput);
      const { dateObj: end } = normalizeDate(endDateInput);

      if (start > end) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Start date cannot be after end date.');
      }

      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const workingDays = await this.getWorkingDaysBetween(startDateInput, endDateInput, context);
      return totalDays - workingDays;
    },

    async getRestrictedHolidays(year, context) {
      const annualYearStr = year !== undefined ? String(year) : undefined;
      const allRh = await repository.findRestrictedHolidays(annualYearStr);

      if (!context?.employeeType) return allRh;

      return allRh.filter((rh) => {
        if (!rh.eligibleEmployeeTypes || rh.eligibleEmployeeTypes === 'ALL') return true;
        const eligible = rh.eligibleEmployeeTypes.split(',').map((s) => s.trim().toUpperCase());
        return eligible.includes(context.employeeType!.toUpperCase());
      });
    },
  };
}
