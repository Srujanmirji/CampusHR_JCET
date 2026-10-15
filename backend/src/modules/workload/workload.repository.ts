import { writeAudit, type AuditEntry } from '../../common/audit.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { entrySelect } from '../timetable/timetable.repository.js';
import type { ThresholdInput } from './workload.schema.js';

const band = { select: { minHours: true, maxHours: true } } as const;

export const facultySelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  department: { select: { id: true, code: true, name: true } },
  designation: { select: { id: true, name: true, workload: band } },
  timetable: {
    select: {
      startPeriod: true,
      endPeriod: true,
      subject: { select: { kind: true } },
    },
  },
} satisfies Prisma.EmployeeSelect;

export type FacultyRecord = Prisma.EmployeeGetPayload<{
  select: typeof facultySelect;
}>;

const thresholdSelect = {
  id: true,
  name: true,
  workload: { select: { minHours: true, maxHours: true, updatedAt: true } },
} satisfies Prisma.DesignationSelect;

export type ThresholdRecord = Prisma.DesignationGetPayload<{
  select: typeof thresholdSelect;
}>;

// Workload is tracked for active teaching staff only.
const teaching = (where: Prisma.EmployeeWhereInput) => ({
  AND: [
    where,
    { status: 'ACTIVE' as const },
    { designation: { category: 'TEACHING' as const } },
  ],
});

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createWorkloadRepository(prisma: PrismaClient) {
  return {
    faculty(where: Prisma.EmployeeWhereInput) {
      return prisma.employee.findMany({
        where: teaching(where),
        select: facultySelect,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });
    },
    findFaculty(where: Prisma.EmployeeWhereInput) {
      return prisma.employee.findFirst({
        where: teaching(where),
        select: facultySelect,
      });
    },
    classes(facultyId: string) {
      return prisma.timetableEntry.findMany({
        where: { facultyId },
        select: entrySelect,
        orderBy: [{ day: 'asc' }, { startPeriod: 'asc' }],
      });
    },

    thresholds() {
      return prisma.designation.findMany({
        where: { category: 'TEACHING' },
        select: thresholdSelect,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      });
    },
    findDesignation(id: number) {
      return prisma.designation.findUnique({
        where: { id },
        select: { category: true },
      });
    },
    setThreshold(designationId: number, input: ThresholdInput, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        const before = await tx.workloadThreshold.findUnique({
          where: { designationId },
        });
        const after = await tx.workloadThreshold.upsert({
          where: { designationId },
          update: input,
          create: { designationId, ...input },
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'workload_threshold',
          resourceId: String(designationId),
          before: before ?? undefined,
          after,
        });
        return tx.designation.findUniqueOrThrow({
          where: { id: designationId },
          select: thresholdSelect,
        });
      });
    },
  };
}

export type WorkloadRepository = ReturnType<typeof createWorkloadRepository>;
