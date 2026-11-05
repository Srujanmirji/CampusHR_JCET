import type {
  AcademicYear,
  CalendarDay,
  CalendarDayType,
  Prisma,
  PrismaClient,
  RestrictedHoliday,
  Semester,
  WeeklyWorkingPattern,
} from '../../generated/prisma/client.js';

export type AcademicYearRecord = AcademicYear & {
  semesters?: Semester[];
  _count?: {
    calendarDays: number;
    semesters: number;
  };
};

export type SemesterRecord = Semester & {
  academicYear?: AcademicYear;
  _count?: {
    calendarDays: number;
  };
};

export type CalendarDayRecord = CalendarDay & {
  academicYear?: AcademicYear;
  semester?: Semester | null;
  department?: { id: number; code: string; name: string } | null;
  createdBy?: { id: string; email: string } | null;
  restrictedHoliday?: RestrictedHoliday | null;
};

export type RestrictedHolidayRecord = RestrictedHoliday & {
  calendarDay?: CalendarDay | null;
};

export type WeeklyWorkingPatternRecord = WeeklyWorkingPattern;

export interface CalendarDayFilter {
  academicYearId?: string;
  semesterId?: string;
  startDate?: Date;
  endDate?: Date;
  dayType?: CalendarDayType;
  isWorkingDay?: boolean;
  departmentId?: number;
  appliesToEmployeeType?: string;
  page?: number;
  pageSize?: number;
}

export interface AcademicCalendarRepository {
  // Academic Years
  findAcademicYears(): Promise<AcademicYearRecord[]>;
  findAcademicYearById(id: string): Promise<AcademicYearRecord | null>;
  findAcademicYearByName(name: string): Promise<AcademicYearRecord | null>;
  findCurrentAcademicYear(): Promise<AcademicYearRecord | null>;
  createAcademicYear(data: Prisma.AcademicYearCreateInput): Promise<AcademicYearRecord>;
  updateAcademicYear(id: string, data: Prisma.AcademicYearUpdateInput): Promise<AcademicYearRecord>;
  setCurrentAcademicYear(id: string): Promise<AcademicYearRecord>;

  // Semesters
  findSemesters(academicYearId?: string): Promise<SemesterRecord[]>;
  findSemesterById(id: string): Promise<SemesterRecord | null>;
  findCurrentSemester(): Promise<SemesterRecord | null>;
  createSemester(data: Prisma.SemesterCreateInput): Promise<SemesterRecord>;
  updateSemester(id: string, data: Prisma.SemesterUpdateInput): Promise<SemesterRecord>;
  setCurrentSemester(id: string): Promise<SemesterRecord>;

  // Calendar Days
  findCalendarDays(filter: CalendarDayFilter): Promise<{
    days: CalendarDayRecord[];
    total: number;
  }>;
  findCalendarDayById(id: string): Promise<CalendarDayRecord | null>;
  findCalendarDayByDate(
    date: Date,
    options?: { departmentId?: number | null; appliesToEmployeeType?: string | null },
  ): Promise<CalendarDayRecord | null>;
  findCalendarDaysByDateRange(
    startDate: Date,
    endDate: Date,
    options?: { departmentId?: number | null; appliesToEmployeeType?: string | null },
  ): Promise<CalendarDayRecord[]>;
  createCalendarDay(data: Prisma.CalendarDayCreateInput): Promise<CalendarDayRecord>;
  createManyCalendarDays(data: Prisma.CalendarDayCreateManyInput[]): Promise<number>;
  updateCalendarDay(id: string, data: Prisma.CalendarDayUpdateInput): Promise<CalendarDayRecord>;
  deleteCalendarDay(id: string): Promise<CalendarDayRecord>;

  // Restricted Holidays
  findRestrictedHolidays(annualYear?: string): Promise<RestrictedHolidayRecord[]>;
  findRestrictedHolidayById(id: string): Promise<RestrictedHolidayRecord | null>;
  createRestrictedHoliday(data: Prisma.RestrictedHolidayCreateInput): Promise<RestrictedHolidayRecord>;
  updateRestrictedHoliday(id: string, data: Prisma.RestrictedHolidayUpdateInput): Promise<RestrictedHolidayRecord>;
  deleteRestrictedHoliday(id: string): Promise<RestrictedHolidayRecord>;

  // Weekly Working Patterns
  getWeeklyWorkingPatterns(): Promise<WeeklyWorkingPatternRecord[]>;
  upsertWeeklyWorkingPattern(
    dayOfWeek: number,
    data: { dayName: string; isWorkingDay: boolean; description?: string | null },
  ): Promise<WeeklyWorkingPatternRecord>;
}

export function createAcademicCalendarRepository(prisma: PrismaClient): AcademicCalendarRepository {
  return {
    async findAcademicYears() {
      return prisma.academicYear.findMany({
        orderBy: { startDate: 'desc' },
        include: {
          semesters: {
            orderBy: { startDate: 'asc' },
          },
          _count: {
            select: {
              calendarDays: true,
              semesters: true,
            },
          },
        },
      });
    },

    async findAcademicYearById(id: string) {
      return prisma.academicYear.findUnique({
        where: { id },
        include: {
          semesters: {
            orderBy: { startDate: 'asc' },
          },
          _count: {
            select: {
              calendarDays: true,
              semesters: true,
            },
          },
        },
      });
    },

    async findAcademicYearByName(name: string) {
      return prisma.academicYear.findUnique({
        where: { name },
        include: {
          semesters: {
            orderBy: { startDate: 'asc' },
          },
        },
      });
    },

    async findCurrentAcademicYear() {
      return prisma.academicYear.findFirst({
        where: { isCurrent: true },
        include: {
          semesters: {
            orderBy: { startDate: 'asc' },
          },
        },
      });
    },

    async createAcademicYear(data) {
      if (data.isCurrent) {
        await prisma.academicYear.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }
      return prisma.academicYear.create({
        data,
        include: {
          semesters: true,
        },
      });
    },

    async updateAcademicYear(id, data) {
      if (data.isCurrent) {
        await prisma.academicYear.updateMany({
          where: { isCurrent: true, NOT: { id } },
          data: { isCurrent: false },
        });
      }
      return prisma.academicYear.update({
        where: { id },
        data,
        include: {
          semesters: true,
        },
      });
    },

    async setCurrentAcademicYear(id: string) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      return prisma.academicYear.update({
        where: { id },
        data: { isCurrent: true },
        include: { semesters: true },
      });
    },

    async findSemesters(academicYearId?: string) {
      return prisma.semester.findMany({
        where: academicYearId ? { academicYearId } : undefined,
        orderBy: { startDate: 'asc' },
        include: {
          academicYear: true,
          _count: {
            select: { calendarDays: true },
          },
        },
      });
    },

    async findSemesterById(id: string) {
      return prisma.semester.findUnique({
        where: { id },
        include: {
          academicYear: true,
          _count: {
            select: { calendarDays: true },
          },
        },
      });
    },

    async findCurrentSemester() {
      return prisma.semester.findFirst({
        where: { isCurrent: true },
        include: {
          academicYear: true,
        },
      });
    },

    async createSemester(data) {
      if (data.isCurrent) {
        await prisma.semester.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }
      return prisma.semester.create({
        data,
        include: {
          academicYear: true,
        },
      });
    },

    async updateSemester(id, data) {
      if (data.isCurrent) {
        await prisma.semester.updateMany({
          where: { isCurrent: true, NOT: { id } },
          data: { isCurrent: false },
        });
      }
      return prisma.semester.update({
        where: { id },
        data,
        include: {
          academicYear: true,
        },
      });
    },

    async setCurrentSemester(id: string) {
      await prisma.semester.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      return prisma.semester.update({
        where: { id },
        data: { isCurrent: true },
        include: { academicYear: true },
      });
    },

    async findCalendarDays(filter: CalendarDayFilter) {
      const where: Prisma.CalendarDayWhereInput = {};

      if (filter.academicYearId) {
        where.academicYearId = filter.academicYearId;
      }
      if (filter.semesterId) {
        where.semesterId = filter.semesterId;
      }
      if (filter.dayType) {
        where.dayType = filter.dayType;
      }
      if (filter.isWorkingDay !== undefined) {
        where.isWorkingDay = filter.isWorkingDay;
      }
      if (filter.departmentId !== undefined) {
        where.OR = [
          { departmentId: filter.departmentId },
          { departmentId: null },
        ];
      }
      if (filter.appliesToEmployeeType) {
        where.OR = [
          { appliesToEmployeeType: filter.appliesToEmployeeType },
          { appliesToEmployeeType: 'ALL' },
          { appliesToEmployeeType: null },
        ];
      }
      if (filter.startDate || filter.endDate) {
        where.date = {};
        if (filter.startDate) {
          where.date.gte = filter.startDate;
        }
        if (filter.endDate) {
          where.date.lte = filter.endDate;
        }
      }

      const page = filter.page ?? 1;
      const pageSize = filter.pageSize ?? 50;

      const [total, days] = await Promise.all([
        prisma.calendarDay.count({ where }),
        prisma.calendarDay.findMany({
          where,
          orderBy: { date: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            academicYear: true,
            semester: true,
            department: {
              select: { id: true, code: true, name: true },
            },
            createdBy: {
              select: { id: true, email: true },
            },
            restrictedHoliday: true,
          },
        }),
      ]);

      return { total, days };
    },

    async findCalendarDayById(id: string) {
      return prisma.calendarDay.findUnique({
        where: { id },
        include: {
          academicYear: true,
          semester: true,
          department: {
            select: { id: true, code: true, name: true },
          },
          createdBy: {
            select: { id: true, email: true },
          },
          restrictedHoliday: true,
        },
      });
    },

    async findCalendarDayByDate(
      date: Date,
      options?: { departmentId?: number | null; appliesToEmployeeType?: string | null },
    ) {
      // Find candidate matches for that date
      const days = await prisma.calendarDay.findMany({
        where: {
          date,
        },
        include: {
          academicYear: true,
          semester: true,
          department: {
            select: { id: true, code: true, name: true },
          },
          restrictedHoliday: true,
        },
      });

      if (days.length === 0) return null;

      // Filter by employeeType if specified
      const applicableDays = options?.appliesToEmployeeType
        ? days.filter(
            (d) =>
              !d.appliesToEmployeeType ||
              d.appliesToEmployeeType === 'ALL' ||
              d.appliesToEmployeeType.toUpperCase() === options.appliesToEmployeeType!.toUpperCase(),
          )
        : days;

      if (applicableDays.length === 0) return null;

      if (options?.departmentId) {
        const deptSpecific = applicableDays.find((d) => d.departmentId === options.departmentId);
        if (deptSpecific) return deptSpecific;
      }

      return applicableDays.find((d) => d.departmentId === null) ?? applicableDays[0]!;
    },

    async findCalendarDaysByDateRange(
      startDate: Date,
      endDate: Date,
      _options?: { departmentId?: number | null; appliesToEmployeeType?: string | null },
    ) {
      return prisma.calendarDay.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
        include: {
          academicYear: true,
          semester: true,
          department: {
            select: { id: true, code: true, name: true },
          },
          restrictedHoliday: true,
        },
      });
    },

    async createCalendarDay(data) {
      return prisma.calendarDay.create({
        data,
        include: {
          academicYear: true,
          semester: true,
          department: {
            select: { id: true, code: true, name: true },
          },
          restrictedHoliday: true,
        },
      });
    },

    async createManyCalendarDays(data) {
      const result = await prisma.calendarDay.createMany({
        data,
      });
      return result.count;
    },

    async updateCalendarDay(id, data) {
      return prisma.calendarDay.update({
        where: { id },
        data,
        include: {
          academicYear: true,
          semester: true,
          department: {
            select: { id: true, code: true, name: true },
          },
          restrictedHoliday: true,
        },
      });
    },

    async deleteCalendarDay(id: string) {
      return prisma.calendarDay.delete({
        where: { id },
      });
    },

    async findRestrictedHolidays(annualYear?: string) {
      return prisma.restrictedHoliday.findMany({
        where: annualYear ? { annualYear } : undefined,
        orderBy: { date: 'asc' },
        include: {
          calendarDay: true,
        },
      });
    },

    async findRestrictedHolidayById(id: string) {
      return prisma.restrictedHoliday.findUnique({
        where: { id },
        include: {
          calendarDay: true,
        },
      });
    },

    async createRestrictedHoliday(data) {
      return prisma.restrictedHoliday.create({
        data,
        include: {
          calendarDay: true,
        },
      });
    },

    async updateRestrictedHoliday(id, data) {
      return prisma.restrictedHoliday.update({
        where: { id },
        data,
        include: {
          calendarDay: true,
        },
      });
    },

    async deleteRestrictedHoliday(id: string) {
      return prisma.restrictedHoliday.delete({
        where: { id },
      });
    },

    async getWeeklyWorkingPatterns() {
      return prisma.weeklyWorkingPattern.findMany({
        orderBy: { dayOfWeek: 'asc' },
      });
    },

    async upsertWeeklyWorkingPattern(dayOfWeek, data) {
      return prisma.weeklyWorkingPattern.upsert({
        where: { dayOfWeek },
        create: {
          dayOfWeek,
          dayName: data.dayName,
          isWorkingDay: data.isWorkingDay,
          description: data.description,
        },
        update: {
          dayName: data.dayName,
          isWorkingDay: data.isWorkingDay,
          description: data.description,
        },
      });
    },
  };
}
