import { writeAudit, type AuditEntry } from '../../common/audit.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { Slot } from './timetable.clash.js';
import type {
  EntryInput,
  RoomInput,
  SubjectInput,
} from './timetable.schema.js';

export const entrySelect = {
  id: true,
  departmentId: true,
  semester: true,
  section: true,
  batch: true,
  facultyId: true,
  roomId: true,
  day: true,
  startPeriod: true,
  endPeriod: true,
  department: { select: { id: true, code: true, name: true } },
  subject: { select: { id: true, code: true, name: true, kind: true } },
  faculty: {
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  },
  room: { select: { id: true, name: true, kind: true } },
} satisfies Prisma.TimetableEntrySelect;

export type EntryRecord = Prisma.TimetableEntryGetPayload<{
  select: typeof entrySelect;
}>;

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createTimetableRepository(prisma: PrismaClient) {
  /** Entries on the same day that share the faculty, room or class. */
  const neighbours = (tx: Prisma.TransactionClient, slot: Slot) =>
    tx.timetableEntry.findMany({
      where: {
        day: slot.day as EntryInput['day'],
        startPeriod: { lte: slot.endPeriod },
        endPeriod: { gte: slot.startPeriod },
        OR: [
          { facultyId: slot.facultyId },
          { roomId: slot.roomId },
          {
            departmentId: slot.departmentId,
            semester: slot.semester,
            section: slot.section,
          },
        ],
      },
      select: entrySelect,
    });

  return {
    periods() {
      return prisma.period.findMany({ orderBy: { number: 'asc' } });
    },

    subjects(where: Prisma.SubjectWhereInput) {
      return prisma.subject.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          departmentId: true,
          semester: true,
          kind: true,
        },
        orderBy: [{ semester: 'asc' }, { code: 'asc' }],
      });
    },
    findSubject(id: number) {
      return prisma.subject.findUnique({ where: { id } });
    },
    findSubjectByCode(code: string) {
      return prisma.subject.findUnique({ where: { code } });
    },
    createSubject(data: SubjectInput) {
      return prisma.subject.create({ data });
    },

    rooms() {
      return prisma.room.findMany({
        orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      });
    },
    findRoom(id: number) {
      return prisma.room.findUnique({ where: { id } });
    },
    findRoomByName(name: string) {
      return prisma.room.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
    },
    createRoom(data: RoomInput) {
      return prisma.room.create({ data });
    },

    findDepartment(id: number) {
      return prisma.department.findUnique({
        where: { id },
        select: { id: true },
      });
    },
    findFaculty(id: string) {
      return prisma.employee.findUnique({
        where: { id },
        select: {
          status: true,
          firstName: true,
          lastName: true,
          designation: { select: { category: true } },
        },
      });
    },

    entries(where: Prisma.TimetableEntryWhereInput) {
      return prisma.timetableEntry.findMany({
        where,
        select: entrySelect,
        orderBy: [{ day: 'asc' }, { startPeriod: 'asc' }, { section: 'asc' }],
      });
    },
    findEntry(id: string) {
      return prisma.timetableEntry.findUnique({
        where: { id },
        select: entrySelect,
      });
    },

    /**
     * Creates or replaces an entry. `assertFree` sees the clashing
     * candidates inside a serializable transaction, so two people cannot
     * book the same slot at once.
     */
    save(
      before: EntryRecord | null,
      data: EntryInput,
      assertFree: (neighbours: EntryRecord[]) => void,
      audit: Audit,
    ) {
      return prisma.$transaction(
        async (tx) => {
          assertFree(await neighbours(tx, { ...data, id: before?.id }));
          const saved = before
            ? await tx.timetableEntry.update({
                where: { id: before.id },
                data,
                select: entrySelect,
              })
            : await tx.timetableEntry.create({ data, select: entrySelect });
          await writeAudit(tx, {
            ...audit,
            resource: 'timetable_entry',
            resourceId: saved.id,
            before: before ?? undefined,
            after: saved,
          });
          return saved;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    },

    remove(before: EntryRecord, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        await tx.timetableEntry.delete({ where: { id: before.id } });
        await writeAudit(tx, {
          ...audit,
          resource: 'timetable_entry',
          resourceId: before.id,
          before,
        });
      });
    },
  };
}

export type TimetableRepository = ReturnType<typeof createTimetableRepository>;
