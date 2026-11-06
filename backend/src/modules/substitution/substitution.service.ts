import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import type { AcademicCalendarService } from '../academic-calendar/academic-calendar.service.js';
import type { EntryRecord } from '../timetable/timetable.repository.js';
import { toEntryDto } from '../timetable/timetable.service.js';
import { weeklyHours } from '../workload/workload.calc.js';
import type {
  CoverageRecord,
  LeaveRecord,
  StaffRecord,
  SubstitutionRepository,
} from './substitution.repository.js';
import {
  inHalf,
  isoDate,
  leaveDates,
  overlaps,
  RUBRIC,
  scoreCandidate,
  toDate,
  weekOf,
  weekdayOf,
} from './substitution.rules.js';
import type { AssignInput } from './substitution.schema.js';

const notFound = (what = 'Approved leave') =>
  new HttpError(404, 'NOT_FOUND', `${what} not found.`);
const hoursOf = (entry: { startPeriod: number; endPeriod: number }) =>
  entry.endPeriod - entry.startPeriod + 1;
const nameOf = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`;
const personDto = (person: {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}) => ({
  id: person.id,
  employeeCode: person.employeeCode,
  name: nameOf(person),
});
// ponytail: top 25 candidates; enough to choose from in one department.
const CANDIDATE_LIMIT = 25;

export function toLeaveDto(leave: LeaveRecord) {
  return {
    id: leave.id,
    employee: personDto(leave.employee),
    department: leave.department,
    leaveType: leave.leaveType,
    startDate: isoDate(leave.startDate),
    endDate: isoDate(leave.endDate),
    halfDay: leave.halfDay,
    days: leave.days,
  };
}

const toCoverageDto = (coverage: CoverageRecord) => ({
  id: coverage.id,
  kind: coverage.kind,
  substitute: coverage.substitute && personDto(coverage.substitute),
  note: coverage.note,
  assignedAt: coverage.createdAt,
});

/** Classes on the leave's dates that the caller may see at `scope`. */
function inScope(access: Access, entry: EntryRecord) {
  return (
    access.scope === 'all' ||
    (access.scope === 'department' &&
      entry.departmentId === access.departmentId)
  );
}

export function createSubstitutionService(
  repo: SubstitutionRepository,
  notifier: Notifier,
  calendarService?: AcademicCalendarService,
) {
  /** Each class the leave takes the faculty member away from, by date. */
  async function affected(
    leave: LeaveRecord,
    classes: EntryRecord[],
    periodStarts: Map<number, string>,
  ) {
    const dates = leaveDates(leave.startDate, leave.endDate);
    const workingDates = calendarService
      ? (
          await Promise.all(
            dates.map(async (d) => {
              const working = await calendarService.isWorkingDay(d);
              return working ? d : null;
            }),
          )
        ).filter((d): d is string => d !== null)
      : dates;

    return workingDates.flatMap((date) =>
      classes
        .filter(
          (entry) =>
            entry.facultyId === leave.employeeId &&
            entry.day === weekdayOf(toDate(date)) &&
            inHalf(leave.halfDay, entry, periodStarts),
        )
        .map((entry) => ({ date, entry })),
    );
  }

  /** The leave and its classes in the caller's scope; 404 when none. */
  async function leaveClasses(access: Access, leaveId: string) {
    const leave = await repo.findApprovedLeave(leaveId);
    if (!leave) throw notFound();
    const [classes, periodStarts] = await Promise.all([
      repo.classesOf([leave.employeeId]),
      repo.periodStarts(),
    ]);
    const aff = await affected(leave, classes, periodStarts);
    const visible = aff.filter(({ entry }) =>
      inScope(access, entry),
    );
    if (visible.length === 0) throw notFound();
    return { leave, visible };
  }

  async function assertAffected(
    access: Access,
    leaveId: string,
    entryId: string,
    date: string,
  ) {
    const { leave, visible } = await leaveClasses(access, leaveId);
    const found = visible.find(
      (item) => item.entry.id === entryId && item.date === date,
    );
    if (!found) throw notFound('Class on this leave');
    return { leave, entry: found.entry };
  }

  /** Free faculty for one class, ranked by the rubric. */
  async function rank(leave: LeaveRecord, entry: EntryRecord, date: string) {
    const day = toDate(date);
    const { monday, sunday } = weekOf(day);
    const [staff, onLeave, assigned, examDutyFaculty, onDutyFaculty] =
      await Promise.all([
        repo.teachingStaff(),
        repo.onLeave(day),
        repo.assignmentsBetween(monday, sunday),
        repo.onExamDuty
          ? repo.onExamDuty(day)
          : Promise.resolve(new Set<string>()),
        repo.onApprovedOnDuty
          ? repo.onApprovedOnDuty(day)
          : Promise.resolve(new Set<string>()),
      ]);
    const weekday = weekdayOf(day);
    const hours = hoursOf(entry);

    const candidates = staff.flatMap((person: StaffRecord) => {
      if (person.id === leave.employeeId) return [];

      const onLeaveToday = onLeave.has(person.id);
      const onExamDutyToday = examDutyFaculty.has(person.id);
      const onDutyToday = onDutyFaculty.has(person.id);

      const today = person.timetable.filter((own) => own.day === weekday);
      const mine = assigned.filter((item) => item.substituteId === person.id);
      const busy =
        today.some((own) => overlaps(own, entry)) ||
        mine.some(
          (item) =>
            isoDate(item.date) === date && overlaps(item.timetableEntry, entry),
        );

      const hoursAfter =
        weeklyHours(
          person.timetable.map((own) => ({
            kind: own.subject.kind,
            startPeriod: own.startPeriod,
            endPeriod: own.endPeriod,
          })),
        ).totalHours +
        mine.reduce((sum, item) => sum + hoursOf(item.timetableEntry), 0) +
        hours;
      const maxHours = person.designation.workload?.maxHours ?? null;
      const overloaded = maxHours !== null && hoursAfter > maxHours;

      let eligible = true;
      let reason: string | null = null;

      if (onLeaveToday) {
        eligible = false;
        reason = 'On approved leave on this date.';
      } else if (onExamDutyToday) {
        eligible = false;
        reason = 'Assigned to Exam Duty on this date.';
      } else if (onDutyToday) {
        eligible = false;
        reason = 'On approved Official On-Duty on this date.';
      } else if (busy) {
        eligible = false;
        reason = 'Already has a class or substitution scheduled during this period.';
      } else if (overloaded) {
        eligible = false;
        reason = `Would teach ${hoursAfter} hours that week, over the ${maxHours}-hour maximum.`;
      }

      const { points, total } = scoreCandidate({
        teachesSubject: person.timetable.some(
          (own) => own.subjectId === entry.subject.id,
        ),
        teachesSameKindInDepartment: person.timetable.some(
          (own) =>
            own.departmentId === entry.departmentId &&
            own.subject.kind === entry.subject.kind,
        ),
        freeAround: !today.some(
          (own) =>
            own.endPeriod === entry.startPeriod - 1 ||
            own.startPeriod === entry.endPeriod + 1,
        ),
        sameDepartment: person.department.id === entry.departmentId,
        hoursAfter,
        maxHours,
        experienceYears: person.experienceYears,
      });

      return [
        {
          faculty: {
            ...personDto(person),
            department: person.department,
            designation: person.designation.name,
          },
          score: total,
          points,
          hoursAfter,
          maxHours,
          eligible,
          reason,
        },
      ];
    });
    return candidates
      .sort(
        (a, b) =>
          Number(b.eligible) - Number(a.eligible) ||
          b.score - a.score ||
          a.faculty.name.localeCompare(b.faculty.name),
      )
      .slice(0, CANDIDATE_LIMIT);
  }

  return {
    rubric: RUBRIC,

    /** Approved leave with classes in the caller's scope, and coverage. */
    async leaves(access: Access, from?: string) {
      if (access.scope === 'own') return [];
      const since = toDate(from ?? isoDate(new Date()));
      const leaves = await repo.approvedLeave({ endDate: { gte: since } });
      if (leaves.length === 0) return [];
      const [classes, periodStarts, coverage] = await Promise.all([
        repo.classesOf([...new Set(leaves.map((leave) => leave.employeeId))]),
        repo.periodStarts(),
        repo.coverage(leaves.map((leave) => leave.id)),
      ]);
      const results = await Promise.all(
        leaves.map(async (leave) => {
          const aff = await affected(leave, classes, periodStarts);
          const visible = aff.filter(({ entry }) => inScope(access, entry));
          if (visible.length === 0) return null;
          const covered = visible.filter(({ entry, date }) =>
            coverage.some(
              (item) =>
                item.timetableEntryId === entry.id && isoDate(item.date) === date,
            ),
          ).length;
          return { leave: toLeaveDto(leave), classes: visible.length, covered };
        }),
      );
      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    },

    /** One leave's classes in scope, each with how it is covered. */
    async classes(access: Access, leaveId: string) {
      const { leave, visible } = await leaveClasses(access, leaveId);
      const coverage = await repo.coverage([leave.id]);
      return {
        leave: toLeaveDto(leave),
        classes: visible.map(({ date, entry }) => {
          const covered = coverage.find(
            (item) =>
              item.timetableEntryId === entry.id && isoDate(item.date) === date,
          );
          return {
            date,
            hours: hoursOf(entry),
            entry: toEntryDto(entry),
            coverage: covered ? toCoverageDto(covered) : null,
          };
        }),
      };
    },

    async candidates(
      access: Access,
      leaveId: string,
      entryId: string,
      date: string,
    ) {
      const { leave, entry } = await assertAffected(
        access,
        leaveId,
        entryId,
        date,
      );
      return rank(leave, entry, date);
    },

    async assign(access: Access, input: AssignInput, ip?: string) {
      const { leave, entry } = await assertAffected(
        access,
        input.leaveRequestId,
        input.timetableEntryId,
        input.date,
      );
      if (input.substituteId) {
        const pick = (await rank(leave, entry, input.date)).find(
          (candidate) => candidate.faculty.id === input.substituteId,
        );
        if (!pick?.eligible) {
          throw new HttpError(
            400,
            'NOT_AVAILABLE',
            pick?.reason ??
              'Choose someone free in this slot and not on leave or conflicting duty that day.',
          );
        }
      }
      try {
        const created = await repo.create(
          {
            leaveRequestId: leave.id,
            timetableEntryId: entry.id,
            date: toDate(input.date),
            kind: input.substituteId ? 'SUBSTITUTE' : 'NOT_NEEDED',
            substituteId: input.substituteId,
            note: input.note || null,
            assignedByUserId: access.userId,
          },
          { actorUserId: access.userId, action: 'substitution.assign', ip },
        );
        if (input.substituteId) {
          await notifier.notifyEmployee(input.substituteId, {
            kind: 'substitution.assigned',
            title: `You are covering ${entry.subject.name}`,
            body: `${entry.department.code} ${entry.semester}${entry.section}${entry.batch ? ` (${entry.batch})` : ''} · ${input.date} · ${entry.startPeriod === entry.endPeriod ? `period ${entry.startPeriod}` : `periods ${entry.startPeriod}–${entry.endPeriod}`} · ${entry.room.name} · for ${nameOf(leave.employee)}`,
            link: '/substitution',
          });
        }
        return toCoverageDto(created);
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          throw new HttpError(
            409,
            'ALREADY_COVERED',
            'This class is already covered. Refresh to see how.',
          );
        }
        throw error;
      }
    },

    async unassign(access: Access, id: string, ip?: string) {
      const coverage = await repo.find(id);
      if (
        !coverage ||
        !(
          access.scope === 'all' ||
          coverage.timetableEntry.departmentId === access.departmentId
        )
      ) {
        throw notFound('Assignment');
      }
      await repo.remove(coverage, {
        actorUserId: access.userId,
        action: 'substitution.remove',
        ip,
      });
    },

    /** Classes the caller covers for others, from today. */
    async mine(access: Access) {
      if (!access.employeeId) return [];
      const rows = await repo.mine(
        access.employeeId,
        toDate(isoDate(new Date())),
      );
      return rows.map((row) => ({
        ...toCoverageDto(row),
        date: isoDate(row.date),
        entry: toEntryDto(row.timetableEntry),
        coveringFor: personDto(row.leaveRequest.employee),
      }));
    },
  };
}

export type SubstitutionService = ReturnType<typeof createSubstitutionService>;
