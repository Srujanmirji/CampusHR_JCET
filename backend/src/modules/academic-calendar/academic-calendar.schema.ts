import { z } from 'zod';

export const CalendarDayTypeEnum = z.enum([
  'WORKING_DAY',
  'WEEKLY_OFF',
  'PUBLIC_HOLIDAY',
  'RESTRICTED_HOLIDAY',
  'VACATION',
  'EXAMINATION',
  'INSTITUTIONAL_EVENT',
  'ACADEMIC_EVENT',
  'SPECIAL_WORKING_DAY',
]);
export type CalendarDayType = z.infer<typeof CalendarDayTypeEnum>;

export const SemesterTypeEnum = z.enum(['ODD', 'EVEN']);
export type SemesterType = z.infer<typeof SemesterTypeEnum>;

export const AcademicYearStatusEnum = z.enum(['ACTIVE', 'UPCOMING', 'COMPLETED', 'ARCHIVED']);
export type AcademicYearStatus = z.infer<typeof AcademicYearStatusEnum>;

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD');

export const createAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required (e.g. 2026–27)'),
    startDate: isoDateString,
    endDate: isoDateString,
    isCurrent: z.boolean().optional().default(false),
    status: AcademicYearStatusEnum.optional().default('ACTIVE'),
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'Start date cannot be after end date',
      path: ['endDate'],
    },
  );
export type CreateAcademicYearInput = z.input<typeof createAcademicYearSchema>;

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
    isCurrent: z.boolean().optional(),
    status: AcademicYearStatusEnum.optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date cannot be after end date',
      path: ['endDate'],
    },
  );
export type UpdateAcademicYearInput = z.input<typeof updateAcademicYearSchema>;

export const createSemesterSchema = z
  .object({
    academicYearId: z.string().uuid('Invalid academic year ID'),
    name: z.string().trim().min(1, 'Name is required (e.g. Odd Semester 2026–27)'),
    type: SemesterTypeEnum.default('ODD'),
    startDate: isoDateString,
    endDate: isoDateString,
    teachingStartDate: isoDateString.optional().nullable(),
    teachingEndDate: isoDateString.optional().nullable(),
    examStartDate: isoDateString.optional().nullable(),
    examEndDate: isoDateString.optional().nullable(),
    isCurrent: z.boolean().optional().default(false),
    status: z.string().optional().default('ACTIVE'),
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'Start date cannot be after end date',
      path: ['endDate'],
    },
  );
export type CreateSemesterInput = z.input<typeof createSemesterSchema>;

export const updateSemesterSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: SemesterTypeEnum.optional(),
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
    teachingStartDate: isoDateString.optional().nullable(),
    teachingEndDate: isoDateString.optional().nullable(),
    examStartDate: isoDateString.optional().nullable(),
    examEndDate: isoDateString.optional().nullable(),
    isCurrent: z.boolean().optional(),
    status: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date cannot be after end date',
      path: ['endDate'],
    },
  );
export type UpdateSemesterInput = z.input<typeof updateSemesterSchema>;

export const createCalendarDaySchema = z.object({
  date: isoDateString,
  academicYearId: z.string().uuid('Invalid academic year ID'),
  semesterId: z.string().uuid().optional().nullable(),
  dayType: CalendarDayTypeEnum,
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  isWorkingDay: z.boolean(),
  departmentId: z.number().int().positive().optional().nullable(),
  appliesToEmployeeType: z.enum(['ALL', 'TEACHING', 'NON_TEACHING']).optional().nullable().default('ALL'),
  source: z.string().optional().default('MANUAL'),
});
export type CreateCalendarDayInput = z.input<typeof createCalendarDaySchema>;

export const createCalendarRangeSchema = z
  .object({
    startDate: isoDateString,
    endDate: isoDateString,
    academicYearId: z.string().uuid('Invalid academic year ID'),
    semesterId: z.string().uuid().optional().nullable(),
    dayType: CalendarDayTypeEnum,
    title: z.string().trim().min(1, 'Title is required for date-range entry'),
    description: z.string().trim().optional().nullable(),
    isWorkingDay: z.boolean(),
    departmentId: z.number().int().positive().optional().nullable(),
    appliesToEmployeeType: z.enum(['ALL', 'TEACHING', 'NON_TEACHING']).optional().nullable().default('ALL'),
    source: z.string().optional().default('MANUAL'),
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'Start date cannot be after end date',
      path: ['endDate'],
    },
  );
export type CreateCalendarRangeInput = z.input<typeof createCalendarRangeSchema>;

export const updateCalendarDaySchema = z.object({
  dayType: CalendarDayTypeEnum.optional(),
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  isWorkingDay: z.boolean().optional(),
  semesterId: z.string().uuid().optional().nullable(),
  departmentId: z.number().int().positive().optional().nullable(),
  appliesToEmployeeType: z.enum(['ALL', 'TEACHING', 'NON_TEACHING']).optional().nullable(),
});
export type UpdateCalendarDayInput = z.input<typeof updateCalendarDaySchema>;

export const queryCalendarSchema = z.object({
  academicYearId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be formatted as YYYY-MM')
    .optional(),
  dayType: CalendarDayTypeEnum.optional(),
  isWorkingDay: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  departmentId: z.coerce.number().int().positive().optional(),
  appliesToEmployeeType: z.enum(['ALL', 'TEACHING', 'NON_TEACHING']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(200).optional().default(50),
});
export type QueryCalendarInput = z.input<typeof queryCalendarSchema>;

export const createRestrictedHolidaySchema = z.object({
  name: z.string().trim().min(1, 'Holiday name is required'),
  date: isoDateString,
  calendarDayId: z.string().uuid().optional().nullable(),
  annualYear: z.string().trim().min(1, 'Annual year is required (e.g. 2026–27)'),
  eligibleEmployeeTypes: z.string().optional().default('ALL'),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional().default(true),
});
export type CreateRestrictedHolidayInput = z.input<typeof createRestrictedHolidaySchema>;

export const updateRestrictedHolidaySchema = z.object({
  name: z.string().trim().min(1).optional(),
  date: isoDateString.optional(),
  annualYear: z.string().trim().min(1).optional(),
  eligibleEmployeeTypes: z.string().optional(),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
});
export type UpdateRestrictedHolidayInput = z.input<typeof updateRestrictedHolidaySchema>;

export const weeklyPatternDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  dayName: z.string(),
  isWorkingDay: z.boolean(),
  description: z.string().optional().nullable(),
});

export const updateWeeklyPatternSchema = z.object({
  patterns: z.array(weeklyPatternDaySchema).min(7).max(7),
});
export type UpdateWeeklyPatternInput = z.input<typeof updateWeeklyPatternSchema>;
