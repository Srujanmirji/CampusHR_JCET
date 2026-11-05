import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type { Prisma } from '../src/generated/prisma/client.js';
import type {
  AcademicCalendarRepository,
  AcademicYearRecord,
  CalendarDayRecord,
  RestrictedHolidayRecord,
  SemesterRecord,
  WeeklyWorkingPatternRecord,
} from '../src/modules/academic-calendar/academic-calendar.repository.js';
import {
  CalendarDayType,
  SemesterType,
  AcademicYearStatus,
} from '../src/modules/academic-calendar/academic-calendar.schema.js';
import { createAcademicCalendarService } from '../src/modules/academic-calendar/academic-calendar.service.js';
import type { Access } from '../src/modules/auth/auth.service.js';
import { defaultGrants } from '../src/modules/auth/permissions.js';
import {
  resolveOnDutyLeaveType,
  DEFAULT_ON_DUTY_LEAVE_MAPPING,
} from '../src/modules/on-duty/on-duty.service.js';

function createMemoryCalendarRepository(): AcademicCalendarRepository {
  const academicYears: AcademicYearRecord[] = [];
  const semesters: SemesterRecord[] = [];
  const calendarDays: CalendarDayRecord[] = [];
  const restrictedHolidays: RestrictedHolidayRecord[] = [];
  const weeklyPatterns: WeeklyWorkingPatternRecord[] = [
    { id: randomUUID(), dayOfWeek: 0, dayName: 'Sunday', isWorkingDay: false, description: 'Weekly Off', updatedAt: new Date() },
    { id: randomUUID(), dayOfWeek: 1, dayName: 'Monday', isWorkingDay: true, description: 'Working Day', updatedAt: new Date() },
    { id: randomUUID(), dayOfWeek: 2, dayName: 'Tuesday', isWorkingDay: true, description: 'Working Day', updatedAt: new Date() },
    { id: randomUUID(), dayOfWeek: 3, dayName: 'Wednesday', isWorkingDay: true, description: 'Working Day', updatedAt: new Date() },
    { id: randomUUID(), dayOfWeek: 4, dayName: 'Thursday', isWorkingDay: true, description: 'Working Day', updatedAt: new Date() },
    { id: randomUUID(), dayOfWeek: 5, dayName: 'Friday', isWorkingDay: true, description: 'Working Day', updatedAt: new Date() },
    { id: randomUUID(), dayOfWeek: 6, dayName: 'Saturday', isWorkingDay: true, description: 'Working Day', updatedAt: new Date() },
  ];

  return {
    async findAcademicYears() {
      return [...academicYears];
    },
    async findAcademicYearById(id) {
      return academicYears.find((y) => y.id === id) ?? null;
    },
    async findAcademicYearByName(name) {
      return academicYears.find((y) => y.name === name) ?? null;
    },
    async findCurrentAcademicYear() {
      return academicYears.find((y) => y.isCurrent) ?? null;
    },
    async createAcademicYear(data: Prisma.AcademicYearCreateInput) {
      if (data.isCurrent) {
        academicYears.forEach((y) => { y.isCurrent = false; });
      }
      const record: AcademicYearRecord = {
        id: randomUUID(),
        name: data.name,
        startDate: data.startDate as Date,
        endDate: data.endDate as Date,
        isCurrent: Boolean(data.isCurrent),
        status: (data.status as AcademicYearStatus) ?? 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        semesters: [],
      };
      academicYears.push(record);
      return record;
    },
    async updateAcademicYear(id, data: Prisma.AcademicYearUpdateInput) {
      const idx = academicYears.findIndex((y) => y.id === id);
      if (idx === -1) throw new Error('Not found');
      if (data.isCurrent) {
        academicYears.forEach((y) => { y.isCurrent = false; });
      }
      const updated = {
        ...academicYears[idx]!,
        ...(data.name !== undefined ? { name: data.name as string } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate as Date } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate as Date } : {}),
        ...(data.isCurrent !== undefined ? { isCurrent: Boolean(data.isCurrent) } : {}),
        ...(data.status !== undefined ? { status: data.status as AcademicYearStatus } : {}),
        updatedAt: new Date(),
      };
      academicYears[idx] = updated;
      return updated;
    },
    async setCurrentAcademicYear(id) {
      academicYears.forEach((y) => { y.isCurrent = y.id === id; });
      return academicYears.find((y) => y.id === id)!;
    },

    async findSemesters(academicYearId) {
      return academicYearId
        ? semesters.filter((s) => s.academicYearId === academicYearId)
        : [...semesters];
    },
    async findSemesterById(id) {
      return semesters.find((s) => s.id === id) ?? null;
    },
    async findCurrentSemester() {
      return semesters.find((s) => s.isCurrent) ?? null;
    },
    async createSemester(data: Prisma.SemesterCreateInput) {
      if (data.isCurrent) {
        semesters.forEach((s) => { s.isCurrent = false; });
      }
      const record: SemesterRecord = {
        id: randomUUID(),
        academicYearId: data.academicYear.connect!.id!,
        name: data.name,
        type: (data.type as SemesterType) ?? 'ODD',
        startDate: data.startDate as Date,
        endDate: data.endDate as Date,
        teachingStartDate: (data.teachingStartDate as Date) ?? null,
        teachingEndDate: (data.teachingEndDate as Date) ?? null,
        examStartDate: (data.examStartDate as Date) ?? null,
        examEndDate: (data.examEndDate as Date) ?? null,
        isCurrent: Boolean(data.isCurrent),
        status: (data.status as string) ?? 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      semesters.push(record);
      return record;
    },
    async updateSemester(id, data: Prisma.SemesterUpdateInput) {
      const idx = semesters.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Not found');
      if (data.isCurrent) {
        semesters.forEach((s) => { s.isCurrent = false; });
      }
      const updated: SemesterRecord = {
        ...semesters[idx]!,
        ...(data.name !== undefined ? { name: data.name as string } : {}),
        ...(data.type !== undefined ? { type: data.type as SemesterType } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate as Date } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate as Date } : {}),
        ...(data.teachingStartDate !== undefined ? { teachingStartDate: data.teachingStartDate as Date | null } : {}),
        ...(data.teachingEndDate !== undefined ? { teachingEndDate: data.teachingEndDate as Date | null } : {}),
        ...(data.examStartDate !== undefined ? { examStartDate: data.examStartDate as Date | null } : {}),
        ...(data.examEndDate !== undefined ? { examEndDate: data.examEndDate as Date | null } : {}),
        ...(data.isCurrent !== undefined ? { isCurrent: Boolean(data.isCurrent) } : {}),
        ...(data.status !== undefined ? { status: data.status as string } : {}),
        updatedAt: new Date(),
      };
      semesters[idx] = updated;
      return updated;
    },
    async setCurrentSemester(id) {
      semesters.forEach((s) => { s.isCurrent = s.id === id; });
      return semesters.find((s) => s.id === id)!;
    },

    async findCalendarDays(filter) {
      let filtered = [...calendarDays];
      if (filter.academicYearId) {
        filtered = filtered.filter((d) => d.academicYearId === filter.academicYearId);
      }
      if (filter.startDate) {
        filtered = filtered.filter((d) => d.date >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter((d) => d.date <= filter.endDate!);
      }
      if (filter.dayType) {
        filtered = filtered.filter((d) => d.dayType === filter.dayType);
      }
      if (filter.isWorkingDay !== undefined) {
        filtered = filtered.filter((d) => d.isWorkingDay === filter.isWorkingDay);
      }
      if (filter.departmentId !== undefined) {
        if (filter.departmentId === null) {
          filtered = filtered.filter((d) => d.departmentId === null);
        } else {
          filtered = filtered.filter(
            (d) => d.departmentId === filter.departmentId || d.departmentId === null,
          );
        }
      }
      if (filter.appliesToEmployeeType) {
        filtered = filtered.filter(
          (d) =>
            !d.appliesToEmployeeType ||
            d.appliesToEmployeeType === 'ALL' ||
            d.appliesToEmployeeType.toUpperCase() === filter.appliesToEmployeeType!.toUpperCase(),
        );
      }
      return { total: filtered.length, days: filtered };
    },
    async findCalendarDayById(id) {
      return calendarDays.find((d) => d.id === id) ?? null;
    },
    async findCalendarDayByDate(date, options) {
      const dateStr = date.toISOString().split('T')[0]!;
      const matches = calendarDays.filter(
        (d) => d.date.toISOString().split('T')[0] === dateStr,
      );
      if (matches.length === 0) return null;

      const applicableMatches = options?.appliesToEmployeeType
        ? matches.filter(
            (d) =>
              !d.appliesToEmployeeType ||
              d.appliesToEmployeeType === 'ALL' ||
              d.appliesToEmployeeType.toUpperCase() === options.appliesToEmployeeType!.toUpperCase(),
          )
        : matches;

      if (applicableMatches.length === 0) return null;

      if (options?.departmentId) {
        const deptMatch = applicableMatches.find((d) => d.departmentId === options.departmentId);
        if (deptMatch) return deptMatch;
      }
      return applicableMatches.find((d) => d.departmentId === null) ?? applicableMatches[0]!;
    },
    async findCalendarDaysByDateRange(startDate, endDate, options) {
      let matches = calendarDays.filter((d) => d.date >= startDate && d.date <= endDate);
      if (options?.departmentId !== undefined && options?.departmentId !== null) {
        matches = matches.filter(
          (d) => d.departmentId === options.departmentId || d.departmentId === null,
        );
      }
      if (options?.appliesToEmployeeType) {
        matches = matches.filter(
          (d) =>
            !d.appliesToEmployeeType ||
            d.appliesToEmployeeType === 'ALL' ||
            d.appliesToEmployeeType.toUpperCase() === options.appliesToEmployeeType!.toUpperCase(),
        );
      }
      return matches;
    },
    async createCalendarDay(data: Prisma.CalendarDayCreateInput) {
      const record: CalendarDayRecord = {
        id: randomUUID(),
        date: data.date as Date,
        academicYearId: data.academicYear.connect!.id!,
        semesterId: data.semester?.connect?.id ?? null,
        dayType: data.dayType as CalendarDayType,
        title: data.title ?? null,
        description: data.description ?? null,
        isWorkingDay: data.isWorkingDay,
        departmentId: data.department?.connect?.id ?? null,
        appliesToEmployeeType: data.appliesToEmployeeType ?? 'ALL',
        source: data.source ?? 'MANUAL',
        createdById: data.createdBy?.connect?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      calendarDays.push(record);
      return record;
    },
    async createManyCalendarDays(daysData) {
      for (const d of daysData) {
        calendarDays.push({
          id: randomUUID(),
          date: d.date as Date,
          academicYearId: d.academicYearId,
          semesterId: d.semesterId ?? null,
          dayType: d.dayType as CalendarDayType,
          title: d.title ?? null,
          description: d.description ?? null,
          isWorkingDay: d.isWorkingDay,
          departmentId: d.departmentId ?? null,
          appliesToEmployeeType: d.appliesToEmployeeType ?? 'ALL',
          source: d.source ?? 'MANUAL',
          createdById: d.createdById ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return daysData.length;
    },
    async updateCalendarDay(id, data: Prisma.CalendarDayUpdateInput) {
      const idx = calendarDays.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error('Not found');
      const deptId =
        data.department?.connect?.id !== undefined
          ? data.department.connect.id
          : data.department?.disconnect
          ? null
          : calendarDays[idx]!.departmentId;
      const updated: CalendarDayRecord = {
        ...calendarDays[idx]!,
        ...(data.dayType !== undefined ? { dayType: data.dayType as CalendarDayType } : {}),
        ...(data.title !== undefined ? { title: data.title as string | null } : {}),
        ...(data.description !== undefined ? { description: data.description as string | null } : {}),
        ...(data.isWorkingDay !== undefined ? { isWorkingDay: Boolean(data.isWorkingDay) } : {}),
        departmentId: deptId,
        ...(data.appliesToEmployeeType !== undefined ? { appliesToEmployeeType: data.appliesToEmployeeType as string | null } : {}),
        updatedAt: new Date(),
      };
      calendarDays[idx] = updated;
      return updated;
    },
    async deleteCalendarDay(id) {
      const idx = calendarDays.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error('Not found');
      const [deleted] = calendarDays.splice(idx, 1);
      return deleted!;
    },

    async findRestrictedHolidays(annualYear) {
      return annualYear
        ? restrictedHolidays.filter((r) => r.annualYear === annualYear)
        : [...restrictedHolidays];
    },
    async findRestrictedHolidayById(id) {
      return restrictedHolidays.find((r) => r.id === id) ?? null;
    },
    async createRestrictedHoliday(data: Prisma.RestrictedHolidayCreateInput) {
      const record: RestrictedHolidayRecord = {
        id: randomUUID(),
        calendarDayId: data.calendarDay?.connect?.id ?? null,
        name: data.name,
        date: data.date as Date,
        active: data.active ?? true,
        annualYear: data.annualYear,
        eligibleEmployeeTypes: data.eligibleEmployeeTypes ?? 'ALL',
        description: data.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      restrictedHolidays.push(record);
      return record;
    },
    async updateRestrictedHoliday(id, data: Prisma.RestrictedHolidayUpdateInput) {
      const idx = restrictedHolidays.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Not found');
      const updated: RestrictedHolidayRecord = {
        ...restrictedHolidays[idx]!,
        ...(data.name !== undefined ? { name: data.name as string } : {}),
        ...(data.date !== undefined ? { date: data.date as Date } : {}),
        ...(data.annualYear !== undefined ? { annualYear: data.annualYear as string } : {}),
        ...(data.eligibleEmployeeTypes !== undefined ? { eligibleEmployeeTypes: data.eligibleEmployeeTypes as string | null } : {}),
        ...(data.description !== undefined ? { description: data.description as string | null } : {}),
        updatedAt: new Date(),
      };
      restrictedHolidays[idx] = updated;
      return updated;
      restrictedHolidays[idx] = updated;
      return updated;
    },
    async deleteRestrictedHoliday(id) {
      const idx = restrictedHolidays.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Not found');
      const [deleted] = restrictedHolidays.splice(idx, 1);
      return deleted!;
    },

    async getWeeklyWorkingPatterns() {
      return [...weeklyPatterns];
    },
    async upsertWeeklyWorkingPattern(dayOfWeek, data) {
      const idx = weeklyPatterns.findIndex((p) => p.dayOfWeek === dayOfWeek);
      if (idx !== -1) {
        weeklyPatterns[idx] = {
          ...weeklyPatterns[idx]!,
          dayName: data.dayName,
          isWorkingDay: data.isWorkingDay,
          description: data.description ?? null,
          updatedAt: new Date(),
        };
        return weeklyPatterns[idx]!;
      }
      const record: WeeklyWorkingPatternRecord = {
        id: randomUUID(),
        dayOfWeek,
        dayName: data.dayName,
        isWorkingDay: data.isWorkingDay,
        description: data.description ?? null,
        updatedAt: new Date(),
      };
      weeklyPatterns.push(record);
      return record;
    },
  };
}

const adminAccess: Access = {
  scope: 'all',
  userId: randomUUID(),
  employeeId: null,
  departmentId: null,
};

test('Academic Year: create, prevent duplicates, and manage current year', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  // 1. Create first academic year
  const year1 = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    isCurrent: true,
  });
  assert.equal(year1.name, '2026–27');
  assert.equal(year1.isCurrent, true);

  // 2. Prevent duplicate year name
  await assert.rejects(
    () =>
      service.createAcademicYear(adminAccess, {
        name: '2026–27',
        startDate: '2026-08-01',
        endDate: '2027-07-31',
      }),
    /already exists/,
  );

  // 3. Create second academic year and mark as current -> unsets previous
  const year2 = await service.createAcademicYear(adminAccess, {
    name: '2027–28',
    startDate: '2027-08-01',
    endDate: '2028-07-31',
    isCurrent: true,
  });
  assert.equal(year2.isCurrent, true);

  const current = await service.getCurrentAcademicYear();
  assert.equal(current?.name, '2027–28');

  // Verify year1 is no longer current
  const refreshedYear1 = await service.getAcademicYearById(adminAccess, year1.id);
  assert.equal(refreshedYear1.isCurrent, false);
});

test('Semester: create and validate date boundaries with academic year', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    isCurrent: true,
  });

  // Valid semester within year bounds
  const oddSemester = await service.createSemester(adminAccess, {
    academicYearId: year.id,
    name: 'Odd Semester 2026–27',
    type: 'ODD',
    startDate: '2026-08-16',
    endDate: '2026-12-31',
    teachingStartDate: '2026-08-20',
    teachingEndDate: '2026-12-10',
    examStartDate: '2026-12-12',
    examEndDate: '2026-12-30',
    isCurrent: true,
  });
  assert.equal(oddSemester.type, 'ODD');
  assert.equal(oddSemester.isCurrent, true);

  // Invalid semester outside year bounds (e.g. starts before academic year)
  await assert.rejects(
    () =>
      service.createSemester(adminAccess, {
        academicYearId: year.id,
        name: 'Invalid Semester',
        type: 'EVEN',
        startDate: '2026-06-01',
        endDate: '2026-10-31',
      }),
    /must fall within academic year range/,
  );
});

test('Domain Rules: Special Working Day overrides normal weekly off', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    isCurrent: true,
  });

  // 2026-11-08 is a Sunday
  const sundayClassification = await service.getDayClassification('2026-11-08');
  assert.equal(sundayClassification.dayType, 'WEEKLY_OFF');
  assert.equal(sundayClassification.isWorkingDay, false);

  // Administration declares 2026-11-08 as a SPECIAL_WORKING_DAY (e.g. compensatory working day)
  await service.createCalendarDay(adminAccess, {
    date: '2026-11-08',
    academicYearId: year.id,
    dayType: 'SPECIAL_WORKING_DAY',
    title: 'Compensatory Working Day for Tech Fest',
    isWorkingDay: true,
  });

  const overrideClassification = await service.getDayClassification('2026-11-08');
  assert.equal(overrideClassification.dayType, 'SPECIAL_WORKING_DAY');
  assert.equal(overrideClassification.isWorkingDay, true);

  const isWorking = await service.isWorkingDay('2026-11-08');
  assert.equal(isWorking, true);
});

test('Domain Rules: Public Holiday forces isWorkingDay = false', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // 2026-11-11 is Wednesday (normally working)
  const regularWednesday = await service.getDayClassification('2026-11-11');
  assert.equal(regularWednesday.isWorkingDay, true);

  // Administration declares Public Holiday (Deepavali)
  await service.createCalendarDay(adminAccess, {
    date: '2026-11-11',
    academicYearId: year.id,
    dayType: 'PUBLIC_HOLIDAY',
    title: 'Deepavali',
    isWorkingDay: false,
  });

  const holidayClassification = await service.getDayClassification('2026-11-11');
  assert.equal(holidayClassification.dayType, 'PUBLIC_HOLIDAY');
  assert.equal(holidayClassification.isWorkingDay, false);

  const isWorking = await service.isWorkingDay('2026-11-11');
  assert.equal(isWorking, false);
});

test('Domain Rules: Contradictory classifications on same date and scope are rejected', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  await service.createCalendarDay(adminAccess, {
    date: '2026-11-14',
    academicYearId: year.id,
    dayType: 'INSTITUTIONAL_EVENT',
    title: 'Annual Sports Day',
    isWorkingDay: true,
  });

  // Trying to create another classification on 2026-11-14
  await assert.rejects(
    () =>
      service.createCalendarDay(adminAccess, {
        date: '2026-11-14',
        academicYearId: year.id,
        dayType: 'PUBLIC_HOLIDAY',
        title: 'Conflicting Holiday',
        isWorkingDay: false,
      }),
    /already exists for 2026-11-14/,
  );
});

test('Domain Rules: Restricted Holiday creates master entry and separates from Public Holiday', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // 2026-11-18 is Wednesday
  await service.createCalendarDay(adminAccess, {
    date: '2026-11-18',
    academicYearId: year.id,
    dayType: 'RESTRICTED_HOLIDAY',
    title: 'Guru Nanak Jayanti',
    isWorkingDay: true, // institutional calendar day is regular working day unless taken
  });

  const rhList = await service.listRestrictedHolidays(adminAccess, '2026–27');
  assert.equal(rhList.length, 1);
  assert.equal(rhList[0]!.name, 'Guru Nanak Jayanti');

  // RH is identifiable separately from public holiday
  const classification = await service.getDayClassification('2026-11-18');
  assert.equal(classification.dayType, 'RESTRICTED_HOLIDAY');
});

test('Domain Rules: Examination period does not automatically mean non-working', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  await service.createCalendarDay(adminAccess, {
    date: '2026-12-15',
    academicYearId: year.id,
    dayType: 'EXAMINATION',
    title: 'VTU Theory Examination',
    isWorkingDay: true, // Working for faculty
  });

  const classification = await service.getDayClassification('2026-12-15');
  assert.equal(classification.dayType, 'EXAMINATION');
  assert.equal(classification.isWorkingDay, true);
});

test('Integration: getWorkingDaysBetween and getNonWorkingDaysBetween calculation', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // Week: 2026-11-09 (Monday) to 2026-11-15 (Sunday) = 7 days
  // Standard: Mon-Sat working (6 days), Sun off (1 day)
  const standardWorkingDays = await service.getWorkingDaysBetween('2026-11-09', '2026-11-15');
  assert.equal(standardWorkingDays, 6);

  const standardNonWorkingDays = await service.getNonWorkingDaysBetween('2026-11-09', '2026-11-15');
  assert.equal(standardNonWorkingDays, 1);

  // Now declare Wednesday (2026-11-11) as PUBLIC_HOLIDAY
  await service.createCalendarDay(adminAccess, {
    date: '2026-11-11',
    academicYearId: year.id,
    dayType: 'PUBLIC_HOLIDAY',
    title: 'Public Holiday',
    isWorkingDay: false,
  });

  // Now working days should be 5 (Mon, Tue, Thu, Fri, Sat)
  const withHolidayWorkingDays = await service.getWorkingDaysBetween('2026-11-09', '2026-11-15');
  assert.equal(withHolidayWorkingDays, 5);

  // Now declare Sunday (2026-11-15) as SPECIAL_WORKING_DAY
  await service.createCalendarDay(adminAccess, {
    date: '2026-11-15',
    academicYearId: year.id,
    dayType: 'SPECIAL_WORKING_DAY',
    title: 'Special Working Sunday',
    isWorkingDay: true,
  });

  // Working days should be 6 (Mon, Tue, Thu, Fri, Sat, Sun)
  const withSpecialSunday = await service.getWorkingDaysBetween('2026-11-09', '2026-11-15');
  assert.equal(withSpecialSunday, 6);
});

test('Date-Range Entry: Vacation creates days across date range', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // Winter Vacation: 2026-12-25 to 2026-12-31 = 7 days
  const result = await service.createCalendarRange(adminAccess, {
    startDate: '2026-12-25',
    endDate: '2026-12-31',
    academicYearId: year.id,
    dayType: 'VACATION',
    title: 'Winter Vacation',
    isWorkingDay: false,
  });
  assert.equal(result.count, 7);

  const daysResult = await service.listCalendarDays(adminAccess, {
    startDate: '2026-12-25',
    endDate: '2026-12-31',
  });
  assert.equal(daysResult.data.length, 7);
  for (const day of daysResult.data) {
    assert.equal(day.dayType, 'VACATION');
    assert.equal(day.isWorkingDay, false);
  }
});

test('Academic Year: prevent overlapping date ranges across academic years', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  // 1. Create first academic year: 2026-08-01 to 2027-07-31
  await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    isCurrent: true,
  });

  // 2. Attempt to create overlapping academic year: 2027-01-01 to 2027-12-31
  await assert.rejects(
    () =>
      service.createAcademicYear(adminAccess, {
        name: '2027 Overlap',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
      }),
    /overlaps with existing academic year/,
  );

  // 3. Non-overlapping next year succeeds: 2027-08-01 to 2028-07-31
  const year2 = await service.createAcademicYear(adminAccess, {
    name: '2027–28',
    startDate: '2027-08-01',
    endDate: '2028-07-31',
  });
  assert.equal(year2.name, '2027–28');

  // 4. Updating year2 with a date overlapping year1 is rejected
  await assert.rejects(
    () =>
      service.updateAcademicYear(adminAccess, year2.id, {
        startDate: '2027-06-01',
      }),
    /overlaps with existing academic year/,
  );
});

test('Semester: validate teaching and exam date boundaries and prevent overlapping semesters in same year', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // 1. Teaching start date after teaching end date -> rejected
  await assert.rejects(
    () =>
      service.createSemester(adminAccess, {
        academicYearId: year.id,
        name: 'Invalid Teaching Dates',
        type: 'ODD',
        startDate: '2026-08-16',
        endDate: '2026-12-31',
        teachingStartDate: '2026-12-15',
        teachingEndDate: '2026-09-01',
      }),
    /Teaching start date cannot be after teaching end date/,
  );

  // 2. Teaching dates outside semester dates -> rejected
  await assert.rejects(
    () =>
      service.createSemester(adminAccess, {
        academicYearId: year.id,
        name: 'Teaching Outside Bounds',
        type: 'ODD',
        startDate: '2026-08-16',
        endDate: '2026-12-31',
        teachingStartDate: '2026-08-01', // Before semester start
        teachingEndDate: '2026-12-10',
      }),
    /Teaching start date must fall within semester dates/,
  );

  // 3. Exam start date after exam end date -> rejected
  await assert.rejects(
    () =>
      service.createSemester(adminAccess, {
        academicYearId: year.id,
        name: 'Invalid Exam Dates',
        type: 'ODD',
        startDate: '2026-08-16',
        endDate: '2026-12-31',
        examStartDate: '2026-12-30',
        examEndDate: '2026-12-10',
      }),
    /Exam start date cannot be after exam end date/,
  );

  // 4. Valid Odd Semester created: 2026-08-16 to 2026-12-31
  const oddSem = await service.createSemester(adminAccess, {
    academicYearId: year.id,
    name: 'Odd Semester 2026–27',
    type: 'ODD',
    startDate: '2026-08-16',
    endDate: '2026-12-31',
    teachingStartDate: '2026-08-20',
    teachingEndDate: '2026-12-10',
    examStartDate: '2026-12-12',
    examEndDate: '2026-12-30',
  });
  assert.equal(oddSem.type, 'ODD');

  // 5. Overlapping semester in same academic year is rejected (e.g. 2026-12-01 to 2027-04-30)
  await assert.rejects(
    () =>
      service.createSemester(adminAccess, {
        academicYearId: year.id,
        name: 'Overlapping Even Semester',
        type: 'EVEN',
        startDate: '2026-12-01',
        endDate: '2027-04-30',
      }),
    /overlaps with existing semester/,
  );

  // 6. Non-overlapping Even Semester succeeds: 2027-01-15 to 2027-05-31
  const evenSem = await service.createSemester(adminAccess, {
    academicYearId: year.id,
    name: 'Even Semester 2026–27',
    type: 'EVEN',
    startDate: '2027-01-15',
    endDate: '2027-05-31',
  });
  assert.equal(evenSem.type, 'EVEN');
});

test('Working Pattern: weekly pattern is fully configurable and affects working day calculation', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  // Default: Monday (1) to Saturday (6) is working, Sunday (0) is weekly off
  const defaultMonday = await service.getDayClassification('2026-11-09');
  assert.equal(defaultMonday.isWorkingDay, true);
  const defaultSunday = await service.getDayClassification('2026-11-08');
  assert.equal(defaultSunday.isWorkingDay, false);

  // Administrator updates working pattern: make Saturday (6) non-working and Sunday (0) working
  await service.updateWeeklyWorkingPatterns(adminAccess, {
    patterns: [
      { dayOfWeek: 0, dayName: 'Sunday', isWorkingDay: true, description: 'Shifted Working Day' },
      { dayOfWeek: 1, dayName: 'Monday', isWorkingDay: true, description: 'Working Day' },
      { dayOfWeek: 2, dayName: 'Tuesday', isWorkingDay: true, description: 'Working Day' },
      { dayOfWeek: 3, dayName: 'Wednesday', isWorkingDay: true, description: 'Working Day' },
      { dayOfWeek: 4, dayName: 'Thursday', isWorkingDay: true, description: 'Working Day' },
      { dayOfWeek: 5, dayName: 'Friday', isWorkingDay: true, description: 'Working Day' },
      { dayOfWeek: 6, dayName: 'Saturday', isWorkingDay: false, description: 'New Weekly Off' },
    ],
  });

  // Verify updated working pattern took effect
  const updatedSunday = await service.getDayClassification('2026-11-08');
  assert.equal(updatedSunday.isWorkingDay, true);

  const updatedSaturday = await service.getDayClassification('2026-11-07');
  assert.equal(updatedSaturday.isWorkingDay, false);
});

test('Vacation & Scope: Vacation scoped to TEACHING does not make date non-working for NON_TEACHING', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // Declare mid-term vacation for TEACHING staff only on 2026-10-15 (Thursday)
  await service.createCalendarDay(adminAccess, {
    date: '2026-10-15',
    academicYearId: year.id,
    dayType: 'VACATION',
    title: 'Faculty Mid-Term Recess',
    isWorkingDay: false,
    appliesToEmployeeType: 'TEACHING',
  });

  // Check for Teaching staff: non-working
  const teachingDay = await service.getDayClassification('2026-10-15', {
    employeeType: 'TEACHING',
  });
  assert.equal(teachingDay.dayType, 'VACATION');
  assert.equal(teachingDay.isWorkingDay, false);

  // Check for Non-Teaching staff: regular working day (vacation does not blindly apply)
  const nonTeachingDay = await service.getDayClassification('2026-10-15', {
    employeeType: 'NON_TEACHING',
  });
  assert.equal(nonTeachingDay.dayType, 'WORKING_DAY');
  assert.equal(nonTeachingDay.isWorkingDay, true);

  // Working day count across 2026-10-12 (Mon) to 2026-10-17 (Sat) (6 days total)
  // For teaching: 5 working days (Thursday is vacation)
  const teachingWorkingDays = await service.getWorkingDaysBetween('2026-10-12', '2026-10-17', {
    employeeType: 'TEACHING',
  });
  assert.equal(teachingWorkingDays, 5);

  // For non-teaching: 6 working days (Thursday is normal working day)
  const nonTeachingWorkingDays = await service.getWorkingDaysBetween('2026-10-12', '2026-10-17', {
    employeeType: 'NON_TEACHING',
  });
  assert.equal(nonTeachingWorkingDays, 6);
});

test('RBAC: Super Admin and HR Admin can manage; HOD, Faculty, and Non-Teaching have department-scoped read', () => {
  const superAdminGrants: string[] = defaultGrants('Super Admin');
  const hrAdminGrants: string[] = defaultGrants('HR Admin');
  const principalGrants: string[] = defaultGrants('Principal');
  const hodGrants: string[] = defaultGrants('HOD');
  const facultyGrants: string[] = defaultGrants('Faculty');
  const nonTeachingGrants: string[] = defaultGrants('Non-Teaching Staff');

  // Super Admin & HR Admin have manage
  assert.ok(superAdminGrants.includes('academic_calendar.manage.all'));
  assert.ok(superAdminGrants.includes('academic_calendar.read.all'));
  assert.ok(hrAdminGrants.includes('academic_calendar.manage.all'));
  assert.ok(hrAdminGrants.includes('academic_calendar.read.all'));

  // Principal has institutional read
  assert.ok(principalGrants.includes('academic_calendar.read.all'));

  // HOD, Faculty, and Non-Teaching have department-scoped read
  assert.ok(hodGrants.includes('academic_calendar.read.department'));
  assert.ok(facultyGrants.includes('academic_calendar.read.department'));
  assert.ok(nonTeachingGrants.includes('academic_calendar.read.department'));

  // Principal, HOD, Faculty, Non-Teaching do NOT have manage permission
  assert.equal(principalGrants.some((g) => g.startsWith('academic_calendar.manage')), false);
  assert.equal(hodGrants.some((g) => g.startsWith('academic_calendar.manage')), false);
  assert.equal(facultyGrants.some((g) => g.startsWith('academic_calendar.manage')), false);
  assert.equal(nonTeachingGrants.some((g) => g.startsWith('academic_calendar.manage')), false);
});

test('Backend Scoping: Faculty cannot access unrelated department-only calendar records', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);
  const adminAccess: Access = { scope: 'all', userId: 'admin', employeeId: null, departmentId: null };
  const facultyDept1Access: Access = {
    scope: 'department',
    userId: 'fac-cse',
    role: 'Faculty',
    employeeId: 'emp-cse-1',
    departmentId: 1, // CSE
  };

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // Create an institution-wide public holiday
  await service.createCalendarDay(adminAccess, {
    date: '2026-08-15',
    academicYearId: year.id,
    dayType: 'PUBLIC_HOLIDAY',
    title: 'Independence Day',
    isWorkingDay: false,
    departmentId: null,
  });

  // Create a CSE department-specific event (dept 1)
  const cseEvent = await service.createCalendarDay(adminAccess, {
    date: '2026-09-05',
    academicYearId: year.id,
    dayType: 'ACADEMIC_EVENT',
    title: 'CSE Hackathon',
    isWorkingDay: true,
    departmentId: 1,
  });

  // Create an ECE department-specific event (dept 2)
  const eceEvent = await service.createCalendarDay(adminAccess, {
    date: '2026-09-10',
    academicYearId: year.id,
    dayType: 'ACADEMIC_EVENT',
    title: 'ECE Robotics Workshop',
    isWorkingDay: true,
    departmentId: 2,
  });

  // 1. Faculty queries calendar without department parameter -> automatically scoped to Dept 1 + institution-wide
  const facultyList = await service.listCalendarDays(facultyDept1Access, {});
  const returnedIds = facultyList.data.map((d) => d.id);
  assert.ok(returnedIds.includes(cseEvent.id), 'Faculty should receive own department records');
  assert.equal(returnedIds.includes(eceEvent.id), false, 'Faculty must NOT receive unrelated department records');

  // 2. Faculty explicitly queries another department (dept 2) -> 403 Forbidden
  await assert.rejects(
    async () => {
      await service.listCalendarDays(facultyDept1Access, { departmentId: 2 });
    },
    (err: { status?: number; message?: string }) => err.status === 403 && /another department/i.test(err.message ?? ''),
  );

  // 3. Faculty queries single calendar day for Dept 2 -> 403 Forbidden
  await assert.rejects(
    async () => {
      await service.getCalendarDayById(facultyDept1Access, eceEvent.id);
    },
    (err: { status?: number; message?: string }) => err.status === 403 && /department calendar record/i.test(err.message ?? ''),
  );

  // 4. Faculty queries single calendar day for Dept 1 -> Succeeds
  const day = await service.getCalendarDayById(facultyDept1Access, cseEvent.id);
  assert.equal(day.id, cseEvent.id);
});

test('Backend Scoping: HOD receives appropriate department-scoped records + institution-wide records', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);
  const adminAccess: Access = { scope: 'all', userId: 'admin', employeeId: null, departmentId: null };
  const hodEceAccess: Access = {
    scope: 'department',
    userId: 'hod-ece',
    role: 'HOD',
    employeeId: 'emp-ece-hod',
    departmentId: 2, // ECE
  };

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  const instHoliday = await service.createCalendarDay(adminAccess, {
    date: '2026-10-02',
    academicYearId: year.id,
    dayType: 'PUBLIC_HOLIDAY',
    title: 'Gandhi Jayanti',
    isWorkingDay: false,
    departmentId: null,
  });

  const cseDay = await service.createCalendarDay(adminAccess, {
    date: '2026-10-10',
    academicYearId: year.id,
    dayType: 'ACADEMIC_EVENT',
    title: 'CSE Symposium',
    isWorkingDay: true,
    departmentId: 1,
  });

  const eceDay = await service.createCalendarDay(adminAccess, {
    date: '2026-10-12',
    academicYearId: year.id,
    dayType: 'ACADEMIC_EVENT',
    title: 'ECE Circuit Design Expo',
    isWorkingDay: true,
    departmentId: 2,
  });

  // HOD lists calendar days -> receives institution-wide + ECE days, excludes CSE days
  const hodList = await service.listCalendarDays(hodEceAccess, {});
  const hodDayIds = hodList.data.map((d) => d.id);
  assert.ok(hodDayIds.includes(instHoliday.id));
  assert.ok(hodDayIds.includes(eceDay.id));
  assert.equal(hodDayIds.includes(cseDay.id), false);

  // HOD accesses ECE day -> OK
  const fetchedEce = await service.getCalendarDayById(hodEceAccess, eceDay.id);
  assert.equal(fetchedEce.id, eceDay.id);

  // HOD accesses CSE day -> 403 Forbidden
  await assert.rejects(
    async () => {
      await service.getCalendarDayById(hodEceAccess, cseDay.id);
    },
    (err: { status?: number; message?: string }) => err.status === 403 && /department calendar record/i.test(err.message ?? ''),
  );
});

test('Backend Scoping: Non-Teaching staff does not incorrectly receive Teaching-only vacation records', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);
  const adminAccess: Access = { scope: 'all', userId: 'admin', employeeId: null, departmentId: null };
  const nonTeachingAccess: Access = {
    scope: 'department',
    userId: 'staff-nt',
    role: 'Non-Teaching Staff',
    employeeId: 'emp-nt-1',
    departmentId: null,
  };

  const year = await service.createAcademicYear(adminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  // Teaching-only vacation
  const teachingVacation = await service.createCalendarDay(adminAccess, {
    date: '2026-12-24',
    academicYearId: year.id,
    dayType: 'VACATION',
    title: 'Faculty Winter Vacation',
    isWorkingDay: false,
    appliesToEmployeeType: 'TEACHING',
  });

  // All-staff holiday
  const allStaffVacation = await service.createCalendarDay(adminAccess, {
    date: '2026-12-25',
    academicYearId: year.id,
    dayType: 'PUBLIC_HOLIDAY',
    title: 'Christmas',
    isWorkingDay: false,
    appliesToEmployeeType: 'ALL',
  });

  // Non-teaching special training day
  const nonTeachingTraining = await service.createCalendarDay(adminAccess, {
    date: '2026-12-26',
    academicYearId: year.id,
    dayType: 'SPECIAL_WORKING_DAY',
    title: 'Lab Staff Safety Audit',
    isWorkingDay: true,
    appliesToEmployeeType: 'NON_TEACHING',
  });

  // Restricted holiday for Teaching staff only
  await service.createRestrictedHoliday(adminAccess, {
    name: 'Special Teaching Commemoration',
    date: '2026-09-08',
    annualYear: '2026–27',
    eligibleEmployeeTypes: 'TEACHING',
  });

  // Restricted holiday for All staff
  const generalRh = await service.createRestrictedHoliday(adminAccess, {
    name: 'Varamahalakshmi Vrata',
    date: '2026-08-28',
    annualYear: '2026–27',
    eligibleEmployeeTypes: 'ALL',
  });

  // 1. Non-Teaching lists calendar days -> does not see Teaching-only vacation
  const list = await service.listCalendarDays(nonTeachingAccess, {});
  const returnedIds = list.data.map((d) => d.id);
  assert.equal(returnedIds.includes(teachingVacation.id), false, 'Non-Teaching staff must not receive Teaching-only vacation');
  assert.ok(returnedIds.includes(allStaffVacation.id));
  assert.ok(returnedIds.includes(nonTeachingTraining.id));

  // 2. Non-Teaching explicitly requests teaching-only records -> 403 Forbidden
  await assert.rejects(
    async () => {
      await service.listCalendarDays(nonTeachingAccess, { appliesToEmployeeType: 'TEACHING' });
    },
    (err: { status?: number; message?: string }) => err.status === 403 && /teaching-only/i.test(err.message ?? ''),
  );

  // 3. Non-Teaching queries single teaching-only calendar day by id -> 403 Forbidden
  await assert.rejects(
    async () => {
      await service.getCalendarDayById(nonTeachingAccess, teachingVacation.id);
    },
    (err: { status?: number; message?: string }) => err.status === 403 && /teaching-only/i.test(err.message ?? ''),
  );

  // 4. Non-Teaching lists restricted holidays -> Teaching-only RH is filtered out
  const rhList = await service.listRestrictedHolidays(nonTeachingAccess, '2026–27');
  assert.equal(rhList.some((r) => r.name === 'Special Teaching Commemoration'), false);
  assert.ok(rhList.some((r) => r.id === generalRh.id));
});

test('Backend Scoping: Principal, HR Admin, and Super Admin can query across all departments and categories', async () => {
  const repo = createMemoryCalendarRepository();
  const service = createAcademicCalendarService(repo);
  const superAdminAccess: Access = { scope: 'all', userId: 'sa', employeeId: null, departmentId: null };
  const principalAccess: Access = { scope: 'all', userId: 'princ', employeeId: 'emp-p', departmentId: null };
  const hrAdminAccess: Access = { scope: 'all', userId: 'hr', employeeId: 'emp-hr', departmentId: null };

  const year = await service.createAcademicYear(superAdminAccess, {
    name: '2026–27',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
  });

  const cseDay = await service.createCalendarDay(superAdminAccess, {
    date: '2026-09-01',
    academicYearId: year.id,
    dayType: 'ACADEMIC_EVENT',
    title: 'CSE Orientation',
    isWorkingDay: true,
    departmentId: 1,
  });

  const eceDay = await service.createCalendarDay(superAdminAccess, {
    date: '2026-09-02',
    academicYearId: year.id,
    dayType: 'ACADEMIC_EVENT',
    title: 'ECE Orientation',
    isWorkingDay: true,
    departmentId: 2,
  });

  const teachingDay = await service.createCalendarDay(superAdminAccess, {
    date: '2026-09-03',
    academicYearId: year.id,
    dayType: 'VACATION',
    title: 'Faculty Research Break',
    isWorkingDay: false,
    appliesToEmployeeType: 'TEACHING',
  });

  for (const access of [superAdminAccess, principalAccess, hrAdminAccess]) {
    // 1. Lists all days across departments
    const allDays = await service.listCalendarDays(access, {});
    const ids = allDays.data.map((d) => d.id);
    assert.ok(ids.includes(cseDay.id));
    assert.ok(ids.includes(eceDay.id));
    assert.ok(ids.includes(teachingDay.id));

    // 2. Can filter by department 2 without 403
    const dept2Days = await service.listCalendarDays(access, { departmentId: 2 });
    assert.ok(dept2Days.data.some((d) => d.id === eceDay.id));

    // 3. Can fetch single calendar day by id for any department
    const day = await service.getCalendarDayById(access, eceDay.id);
    assert.equal(day.id, eceDay.id);
  }
});

test('Leave OOD/ODE Integration Mapping: correctly maps On-Duty categories to OOD and ODE', () => {
  // Official / Examination Duty (ODE)
  assert.equal(resolveOnDutyLeaveType('UNIVERSITY_VALUATION'), 'ODE');
  assert.equal(resolveOnDutyLeaveType('EXTERNAL_EXAMINER'), 'ODE');

  // On Official Duty (OOD)
  assert.equal(resolveOnDutyLeaveType('CONFERENCE_SEMINAR'), 'OOD');
  assert.equal(resolveOnDutyLeaveType('FDP_WORKSHOP'), 'OOD');
  assert.equal(resolveOnDutyLeaveType('BOS_BOE_MEETING'), 'OOD');
  assert.equal(resolveOnDutyLeaveType('OFFICIAL_COLLEGE_DUTY'), 'OOD');
  assert.equal(resolveOnDutyLeaveType('OTHER'), 'OOD');

  // Verify configurable override capability
  const overridden = resolveOnDutyLeaveType('UNIVERSITY_VALUATION', {
    UNIVERSITY_VALUATION: 'OOD',
  });
  assert.equal(overridden, 'OOD');

  assert.equal(DEFAULT_ON_DUTY_LEAVE_MAPPING.UNIVERSITY_VALUATION, 'ODE');
  assert.equal(DEFAULT_ON_DUTY_LEAVE_MAPPING.EXTERNAL_EXAMINER, 'ODE');
  assert.equal(DEFAULT_ON_DUTY_LEAVE_MAPPING.CONFERENCE_SEMINAR, 'OOD');
  assert.equal(DEFAULT_ON_DUTY_LEAVE_MAPPING.FDP_WORKSHOP, 'OOD');
  assert.equal(DEFAULT_ON_DUTY_LEAVE_MAPPING.BOS_BOE_MEETING, 'OOD');
  assert.equal(DEFAULT_ON_DUTY_LEAVE_MAPPING.OFFICIAL_COLLEGE_DUTY, 'OOD');
});
