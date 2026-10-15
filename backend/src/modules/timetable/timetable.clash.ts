// Clash rules for timetable entries (features/TIMETABLE.md: conflict detection).

export interface Slot {
  id?: string;
  departmentId: number;
  semester: number;
  section: string;
  batch: string | null;
  facultyId: string;
  roomId: number;
  day: string;
  startPeriod: number;
  endPeriod: number;
}

export type ClashKind = 'faculty' | 'room' | 'class';

export const overlaps = (a: Slot, b: Slot) =>
  a.day === b.day &&
  a.startPeriod <= b.endPeriod &&
  b.startPeriod <= a.endPeriod;

/**
 * Entries that cannot run alongside `candidate`: same faculty member, same
 * room, or same class section at an overlapping time. Two different lab
 * batches of one section may run at the same time.
 */
export function findClashes<T extends Slot>(
  candidate: Slot,
  others: T[],
): { kind: ClashKind; entry: T }[] {
  const clashes: { kind: ClashKind; entry: T }[] = [];
  for (const entry of others) {
    if (entry.id === candidate.id || !overlaps(candidate, entry)) continue;
    if (entry.facultyId === candidate.facultyId) {
      clashes.push({ kind: 'faculty', entry });
    } else if (entry.roomId === candidate.roomId) {
      clashes.push({ kind: 'room', entry });
    } else if (
      entry.departmentId === candidate.departmentId &&
      entry.semester === candidate.semester &&
      entry.section === candidate.section &&
      !(entry.batch && candidate.batch && entry.batch !== candidate.batch)
    ) {
      clashes.push({ kind: 'class', entry });
    }
  }
  return clashes;
}
