import { writeAudit, type AuditEntry } from '../../common/audit.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { entrySelect } from '../timetable/timetable.repository.js';

export const leaveSelect = {
  id: true,
  employeeId: true,
  startDate: true,
  endDate: true,
  halfDay: true,
  days: true,
  employee: {
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  },
  department: { select: { id: true, code: true, name: true } },
  leaveType: { select: { id: true, code: true, name: true } },
} satisfies Prisma.LeaveRequestSelect;
export type LeaveRecord = Prisma.LeaveRequestGetPayload<{
  select: typeof leaveSelect;
}>;

const person = {
  select: { id: true, employeeCode: true, firstName: true, lastName: true },
} as const;

export const coverageSelect = {
  id: true,
  leaveRequestId: true,
  timetableEntryId: true,
  date: true,
  kind: true,
  note: true,
  createdAt: true,
  substitute: person,
} satisfies Prisma.SubstitutionSelect;
export type CoverageRecord = Prisma.SubstitutionGetPayload<{
  select: typeof coverageSelect;
}>;

/** Teaching staff with what ranking needs: classes, band, experience. */
const staffSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  experienceYears: true,
  department: { select: { id: true, code: true } },
  designation: {
    select: {
      name: true,
      workload: { select: { minHours: true, maxHours: true } },
    },
  },
  timetable: {
    select: {
      subjectId: true,
      departmentId: true,
      day: true,
      startPeriod: true,
      endPeriod: true,
      subject: { select: { kind: true } },
    },
  },
} satisfies Prisma.EmployeeSelect;
export type StaffRecord = Prisma.EmployeeGetPayload<{
  select: typeof staffSelect;
}>;

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createSubstitutionRepository(prisma: PrismaClient) {
  return {
    async periodStarts() {
      const periods = await prisma.period.findMany();
      return new Map(
        periods.map((period) => [period.number, period.startTime]),
      );
    },
    approvedLeave(where: Prisma.LeaveRequestWhereInput) {
      return prisma.leaveRequest.findMany({
        where: { AND: [where, { status: 'APPROVED' }] },
        select: leaveSelect,
        orderBy: { startDate: 'asc' },
        // ponytail: newest 300; page when a college has more current leave.
        take: 300,
      });
    },
    findApprovedLeave(id: string) {
      return prisma.leaveRequest.findFirst({
        where: { id, status: 'APPROVED' },
        select: leaveSelect,
      });
    },
    /** Classes taught by these faculty members. */
    classesOf(facultyIds: string[]) {
      return prisma.timetableEntry.findMany({
        where: { facultyId: { in: facultyIds } },
        select: entrySelect,
        orderBy: [{ startPeriod: 'asc' }],
      });
    },
    coverage(leaveRequestIds: string[]) {
      return prisma.substitution.findMany({
        where: { leaveRequestId: { in: leaveRequestIds } },
        select: coverageSelect,
      });
    },
    teachingStaff() {
      return prisma.employee.findMany({
        where: { status: 'ACTIVE', designation: { category: 'TEACHING' } },
        select: staffSelect,
      });
    },
    /** Who is on approved leave on `date`. */
    async onLeave(date: Date) {
      const rows = await prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: date },
          endDate: { gte: date },
        },
        select: { employeeId: true },
      });
      return new Set(rows.map((row) => row.employeeId));
    },
    /** Substitute assignments between two dates, with the class periods. */
    assignmentsBetween(from: Date, to: Date) {
      return prisma.substitution.findMany({
        where: { kind: 'SUBSTITUTE', date: { gte: from, lte: to } },
        select: {
          substituteId: true,
          date: true,
          timetableEntry: { select: { startPeriod: true, endPeriod: true } },
        },
      });
    },
    find(id: string) {
      return prisma.substitution.findUnique({
        where: { id },
        select: {
          ...coverageSelect,
          timetableEntry: { select: { departmentId: true } },
        },
      });
    },
    mine(substituteId: string, from: Date) {
      return prisma.substitution.findMany({
        where: { substituteId, date: { gte: from } },
        select: {
          ...coverageSelect,
          timetableEntry: { select: entrySelect },
          leaveRequest: { select: { employee: person } },
        },
        orderBy: { date: 'asc' },
      });
    },

    create(data: Prisma.SubstitutionUncheckedCreateInput, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.substitution.create({
          data,
          select: coverageSelect,
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'substitution',
          resourceId: created.id,
          after: created,
        });
        return created;
      });
    },
    remove(before: CoverageRecord, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        await tx.substitution.delete({ where: { id: before.id } });
        await writeAudit(tx, {
          ...audit,
          resource: 'substitution',
          resourceId: before.id,
          before,
        });
      });
    },
  };
}

export type SubstitutionRepository = ReturnType<
  typeof createSubstitutionRepository
>;
