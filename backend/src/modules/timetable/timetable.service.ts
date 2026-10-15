import { HttpError } from '../../common/http-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import { findClashes, type ClashKind } from './timetable.clash.js';
import type {
  EntryRecord,
  TimetableRepository,
} from './timetable.repository.js';
import type {
  EntryInput,
  EntryListQuery,
  RoomInput,
  SubjectInput,
} from './timetable.schema.js';

const DAY_NAMES: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

const invalid = (message: string) =>
  new HttpError(400, 'VALIDATION_ERROR', message);
const notFound = () =>
  new HttpError(404, 'NOT_FOUND', 'Timetable entry not found.');
const outsideDepartment = () =>
  new HttpError(
    403,
    'FORBIDDEN',
    'You can only change the timetable of your own department.',
  );

const facultyName = (entry: EntryRecord) =>
  `${entry.faculty.firstName} ${entry.faculty.lastName}`;
const classLabel = (entry: EntryRecord) =>
  `${entry.department.code} ${entry.semester}${entry.section}${entry.batch ? ` (${entry.batch})` : ''}`;
const periodsLabel = (entry: EntryRecord) =>
  entry.startPeriod === entry.endPeriod
    ? `period ${entry.startPeriod}`
    : `periods ${entry.startPeriod}–${entry.endPeriod}`;

/** One sentence per clash, e.g. "Asha Patil already teaches BCS501 …". */
export function describeClash(kind: ClashKind, entry: EntryRecord) {
  const when = `on ${DAY_NAMES[entry.day]}, ${periodsLabel(entry)}`;
  switch (kind) {
    case 'faculty':
      return `${facultyName(entry)} already teaches ${entry.subject.code} to ${classLabel(entry)} ${when}.`;
    case 'room':
      return `${entry.room.name} is already booked for ${classLabel(entry)} ${when}.`;
    case 'class':
      return `${classLabel(entry)} already has ${entry.subject.code} ${when}.`;
  }
}

export function toEntryDto(entry: EntryRecord) {
  return {
    id: entry.id,
    department: entry.department,
    semester: entry.semester,
    section: entry.section,
    batch: entry.batch,
    subject: entry.subject,
    faculty: {
      id: entry.faculty.id,
      employeeCode: entry.faculty.employeeCode,
      name: facultyName(entry),
    },
    room: entry.room,
    day: entry.day,
    startPeriod: entry.startPeriod,
    endPeriod: entry.endPeriod,
  };
}

/** Entries the user may read: all, their department's or their own classes. */
function readScope(access: Access): Prisma.TimetableEntryWhereInput | null {
  const own = access.employeeId ? [{ facultyId: access.employeeId }] : [];
  switch (access.scope) {
    case 'all':
      return {};
    case 'department':
      return access.departmentId === null && own.length === 0
        ? null
        : {
            OR: [
              ...(access.departmentId === null
                ? []
                : [{ departmentId: access.departmentId }]),
              ...own,
            ],
          };
    case 'own':
      return own.length ? own[0]! : null;
  }
}

// Serializable transactions abort when two writes race; ask to retry.
const isWriteConflict = (error: unknown) =>
  error instanceof Error &&
  ((error as { code?: string }).code === 'P2034' ||
    /could not serialize|40001/.test(String(error)));

export function createTimetableService(repo: TimetableRepository) {
  function assertManages(access: Access, departmentId: number) {
    if (access.scope !== 'all' && access.departmentId !== departmentId) {
      throw outsideDepartment();
    }
  }

  async function assertValid(input: EntryInput) {
    if (!(await repo.findDepartment(input.departmentId))) {
      throw invalid('Choose a valid department.');
    }
    const subject = await repo.findSubject(input.subjectId);
    if (
      !subject ||
      subject.departmentId !== input.departmentId ||
      subject.semester !== input.semester
    ) {
      throw invalid('Choose a subject of this department and semester.');
    }
    const faculty = await repo.findFaculty(input.facultyId);
    if (
      !faculty ||
      faculty.status !== 'ACTIVE' ||
      faculty.designation.category !== 'TEACHING'
    ) {
      throw invalid('Choose an active teaching faculty member.');
    }
    const room = await repo.findRoom(input.roomId);
    if (!room) throw invalid('Choose a valid room.');
    if (subject.kind === 'LAB' && room.kind !== 'LAB') {
      throw invalid(`${subject.code} is a lab; choose a lab room.`);
    }
    const periods = await repo.periods();
    const last = periods.at(-1)?.number ?? 0;
    if (input.endPeriod > last) {
      throw invalid(`The day has ${last} periods.`);
    }
  }

  async function save(
    access: Access,
    before: EntryRecord | null,
    input: EntryInput,
    ip?: string,
  ) {
    assertManages(access, input.departmentId);
    await assertValid(input);
    try {
      const saved = await repo.save(
        before,
        input,
        (neighbours) => {
          const clashes = findClashes({ ...input, id: before?.id }, neighbours);
          if (clashes.length) {
            throw new HttpError(
              409,
              'CLASH',
              clashes
                .map(({ kind, entry }) => describeClash(kind, entry))
                .join(' '),
            );
          }
        },
        {
          actorUserId: access.userId,
          action: before ? 'timetable.update' : 'timetable.create',
          ip,
        },
      );
      return toEntryDto(saved);
    } catch (error) {
      if (isWriteConflict(error)) {
        throw new HttpError(
          409,
          'TIMETABLE_CHANGED',
          'Someone changed this timetable at the same time. Try again.',
        );
      }
      throw error;
    }
  }

  async function findVisible(access: Access, id: string) {
    const scope = readScope(access);
    const entry = scope && (await repo.findEntry(id));
    if (!entry || !scope) throw notFound();
    const visible =
      access.scope === 'all' ||
      entry.facultyId === access.employeeId ||
      (access.scope === 'department' &&
        entry.departmentId === access.departmentId);
    if (!visible) throw notFound();
    return entry;
  }

  return {
    periods() {
      return repo.periods();
    },

    async entries(access: Access, query: EntryListQuery) {
      const scope = readScope(access);
      if (!scope) return [];
      const rows = await repo.entries({
        AND: [
          scope,
          query.departmentId ? { departmentId: query.departmentId } : {},
          query.semester ? { semester: query.semester } : {},
          query.section ? { section: query.section } : {},
          query.facultyId ? { facultyId: query.facultyId } : {},
        ],
      });
      return rows.map(toEntryDto);
    },

    create(access: Access, input: EntryInput, ip?: string) {
      return save(access, null, input, ip);
    },

    async update(access: Access, id: string, input: EntryInput, ip?: string) {
      const before = await findVisible(access, id);
      assertManages(access, before.departmentId);
      return save(access, before, input, ip);
    },

    async remove(access: Access, id: string, ip?: string) {
      const before = await findVisible(access, id);
      assertManages(access, before.departmentId);
      await repo.remove(before, {
        actorUserId: access.userId,
        action: 'timetable.delete',
        ip,
      });
    },

    subjects(query: { departmentId?: number; semester?: number }) {
      return repo.subjects({
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.semester ? { semester: query.semester } : {}),
      });
    },

    async createSubject(access: Access, input: SubjectInput) {
      assertManages(access, input.departmentId);
      if (!(await repo.findDepartment(input.departmentId))) {
        throw invalid('Choose a valid department.');
      }
      if (await repo.findSubjectByCode(input.code)) {
        throw new HttpError(
          409,
          'ALREADY_EXISTS',
          `Subject ${input.code} already exists.`,
        );
      }
      return repo.createSubject(input);
    },

    rooms() {
      return repo.rooms();
    },

    async createRoom(input: RoomInput) {
      const existing = await repo.findRoomByName(input.name);
      if (existing) {
        throw new HttpError(
          409,
          'ALREADY_EXISTS',
          `Room ${existing.name} already exists.`,
        );
      }
      return repo.createRoom(input);
    },
  };
}

export type TimetableService = ReturnType<typeof createTimetableService>;
