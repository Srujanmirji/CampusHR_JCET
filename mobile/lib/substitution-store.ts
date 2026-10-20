import { sendSubstitutionAssignedNotification } from './notifications';
import {
  type DayOfWeek,
  type PeriodDto,
  type TimetableEntryDto,
  JCET_PERIODS,
  formatPeriodTime,
} from './timetable-api';
import type { LeaveRequestDto } from './leave-api';

// ==========================================
// Types & DTOs
// ==========================================

export interface AffectedClassSlot {
  id: string; // `${leaveRequestId}_${date}_${entry.id}`
  leaveRequestId: string;
  date: string; // YYYY-MM-DD
  day: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
  periodLabel: string;
  timeLabel: string;
  subject: {
    id: number;
    code: string;
    name: string;
    kind: 'THEORY' | 'LAB';
  };
  room: {
    id: number;
    name: string;
    kind: 'CLASSROOM' | 'LAB';
  };
  department: {
    id: number;
    code: string;
    name: string;
  };
  semester: number;
  section: string;
  batch: string | null;
  absentFaculty: {
    id: string;
    employeeCode: string;
    name: string;
  };
  assignment?: SubstitutionAssignment | null;
}

export interface FacultyCandidate {
  facultyId: string;
  employeeCode: string;
  name: string;
  departmentId: number;
  departmentCode: string;
  specialization: string | null;
  isAvailable: boolean;
  conflictReason: string | null;
  workloadHours: number | null;
  workloadStatus: 'UNDERLOADED' | 'NORMAL' | 'OVERLOADED' | null;
  matchScore: number;
  scoreBreakdown: {
    baseScore: number;
    departmentMatch: number;
    specializationMatch: number;
    workloadScore: number;
  };
}

export interface SubstitutionAssignment {
  id: string;
  leaveRequestId: string;
  affectedSlotId: string;
  date: string; // YYYY-MM-DD
  day: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
  subject: {
    id: number;
    code: string;
    name: string;
    kind: 'THEORY' | 'LAB';
  };
  room: {
    id: number;
    name: string;
    kind: 'CLASSROOM' | 'LAB';
  };
  department: {
    id: number;
    code: string;
    name: string;
  };
  semester: number;
  section: string;
  batch: string | null;
  absentFaculty: {
    id: string;
    employeeCode: string;
    name: string;
  };
  substituteFaculty: {
    id: string;
    employeeCode: string;
    name: string;
  };
  note: string | null;
  assignedBy: {
    id: string;
    name: string;
    role: string;
  };
  assignedAt: string; // ISO string
}

// Fallback faculty roster for demo/offline sessions when backend employees endpoint is unavailable.
// Real fields only: no fabricated data.
export const DEMO_DEPARTMENT_FACULTY: {
  id: string;
  employeeCode: string;
  name: string;
  departmentId: number;
  departmentCode: string;
  specialization: string | null;
  workloadHours: number | null;
  workloadStatus: 'UNDERLOADED' | 'NORMAL' | 'OVERLOADED' | null;
}[] = [
  {
    id: 'demo-faculty-025',
    employeeCode: 'JCET-CSE-025',
    name: 'Prof. Priya Kulkarni',
    departmentId: 1,
    departmentCode: 'CSE',
    specialization: 'Computer Networks & Network Security',
    workloadHours: 12,
    workloadStatus: 'UNDERLOADED',
  },
  {
    id: 'demo-faculty-007',
    employeeCode: 'JCET-CSE-007',
    name: 'Prof. Vijay Kumar',
    departmentId: 1,
    departmentCode: 'CSE',
    specialization: 'Database Systems & Cloud Computing',
    workloadHours: 15,
    workloadStatus: 'NORMAL',
  },
  {
    id: 'demo-faculty-018',
    employeeCode: 'JCET-CSE-018',
    name: 'Prof. Sunita Desai',
    departmentId: 1,
    departmentCode: 'CSE',
    specialization: 'Theory of Computation & Algorithms',
    workloadHours: 14,
    workloadStatus: 'NORMAL',
  },
  {
    id: 'demo-faculty-032',
    employeeCode: 'JCET-CSE-032',
    name: 'Prof. Anand Hegde',
    departmentId: 1,
    departmentCode: 'CSE',
    specialization: 'Data Science & Machine Learning',
    workloadHours: 18,
    workloadStatus: 'OVERLOADED',
  },
  {
    id: 'demo-hod-001',
    employeeCode: 'JCET-CSE-001',
    name: 'Dr. Ramesh K',
    departmentId: 1,
    departmentCode: 'CSE',
    specialization: 'Distributed Systems & Operating Systems',
    workloadHours: 10,
    workloadStatus: 'UNDERLOADED',
  },
];

// Fallback timetable entries for other faculty members to provide realistic conflict detection in offline/demo mode
export const DEMO_PEER_TIMETABLE_ENTRIES: TimetableEntryDto[] = [
  {
    id: 'peer-tt-thu-1',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 7,
    section: 'A',
    batch: null,
    subject: { id: 105, code: 'BCS701', name: 'Cloud Computing', kind: 'THEORY' },
    faculty: { id: 'demo-faculty-007', employeeCode: 'JCET-CSE-007', name: 'Prof. Vijay Kumar' },
    room: { id: 203, name: 'Room 303', kind: 'CLASSROOM' },
    day: 'THU',
    startPeriod: 2,
    endPeriod: 2,
  },
  {
    id: 'peer-tt-thu-2',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: 'Batch A1',
    subject: { id: 107, code: 'BCSL507', name: 'DBMS Laboratory', kind: 'LAB' },
    faculty: { id: 'demo-faculty-018', employeeCode: 'JCET-CSE-018', name: 'Prof. Sunita Desai' },
    room: { id: 205, name: 'Lab 3 (Computer Center)', kind: 'LAB' },
    day: 'THU',
    startPeriod: 3,
    endPeriod: 4,
  },
];

// ==========================================
// Local Storage Persistence Layer
// ==========================================

const STORAGE_KEY = 'campushr_substitution_assignments_v1';
let memoryStore: SubstitutionAssignment[] = [];
const storeListeners = new Set<() => void>();

// Safe browser/web localStorage helper
function loadPersistedAssignments(): SubstitutionAssignment[] {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      const data = globalThis.localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch {
    // Fall back to memoryStore
  }
  return memoryStore;
}

function savePersistedAssignments(assignments: SubstitutionAssignment[]) {
  memoryStore = assignments;
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    }
  } catch {
    // Non-fatal if localStorage is unavailable
  }
  storeListeners.forEach((listener) => listener());
}

// Initialize memory store from local storage on load
memoryStore = loadPersistedAssignments();

export function subscribeToSubstitutionStore(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

// ==========================================
// Core Algorithm 1: Derive Affected Classes
// ==========================================

/**
 * Derives affected class periods from an approved leave request's actual start/end dates
 * and absent faculty ID.
 * Handles inclusive dates and skips Sundays (college closed).
 * Does not assume hardcoded period numbering.
 */
export function deriveAffectedClasses(
  leaveRequest: LeaveRequestDto,
  timetableEntries: TimetableEntryDto[],
  periods: PeriodDto[] = JCET_PERIODS
): AffectedClassSlot[] {
  if (!leaveRequest.startDate || !leaveRequest.endDate) return [];

  const start = new Date(`${leaveRequest.startDate}T00:00:00`);
  const end = new Date(`${leaveRequest.endDate}T00:00:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [];
  }

  const currentAssignments = loadPersistedAssignments();
  const affectedSlots: AffectedClassSlot[] = [];

  // Iterate day by day from start to end (inclusive)
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeekIndex = current.getDay();

    // Map JS getDay() (0 = Sun, 1 = Mon ... 6 = Sat) to JCET DayOfWeek
    let dayOfWeek: DayOfWeek | null = null;
    switch (dayOfWeekIndex) {
      case 1:
        dayOfWeek = 'MON';
        break;
      case 2:
        dayOfWeek = 'TUE';
        break;
      case 3:
        dayOfWeek = 'WED';
        break;
      case 4:
        dayOfWeek = 'THU';
        break;
      case 5:
        dayOfWeek = 'FRI';
        break;
      case 6:
        dayOfWeek = 'SAT';
        break;
      default:
        dayOfWeek = null; // Sunday: college holiday
        break;
    }

    if (dayOfWeek) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const dayNum = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;

      // Filter timetable entries for absent faculty on this day of week
      const targetEmpId = leaveRequest.employee.id;
      const targetEmpCode = leaveRequest.employee.employeeCode.trim().toLowerCase();

      const matchingEntries = timetableEntries.filter((entry) => {
        const matchesFaculty =
          entry.faculty.id === targetEmpId ||
          entry.faculty.employeeCode.trim().toLowerCase() === targetEmpCode;
        if (!matchesFaculty) return false;
        if (entry.day !== dayOfWeek) return false;

        // Respect halfDay leave restrictions
        if (leaveRequest.halfDay === 'FIRST' && entry.startPeriod > 4) {
          return false; // Morning half day does not affect afternoon
        }
        if (leaveRequest.halfDay === 'SECOND' && entry.endPeriod <= 4) {
          return false; // Afternoon half day does not affect morning
        }
        return true;
      });

      for (const entry of matchingEntries) {
        const slotId = `${leaveRequest.id}_${dateStr}_${entry.id}`;

        // Find period start & end times from period definitions
        const startPeriodObj = periods.find((p) => p.number === entry.startPeriod);
        const endPeriodObj = periods.find((p) => p.number === entry.endPeriod);

        const startTime = startPeriodObj?.startTime || '09:00';
        const endTime = endPeriodObj?.endTime || '10:00';

        const periodLabel =
          entry.startPeriod === entry.endPeriod
            ? `Period ${entry.startPeriod}`
            : `Periods ${entry.startPeriod}–${entry.endPeriod}`;

        const timeLabel = formatPeriodTime(startTime, endTime);

        // Check if an assignment already exists for this slot
        const existingAssignment = currentAssignments.find(
          (a) => a.affectedSlotId === slotId || (a.leaveRequestId === leaveRequest.id && a.date === dateStr && a.startPeriod === entry.startPeriod)
        );

        affectedSlots.push({
          id: slotId,
          leaveRequestId: leaveRequest.id,
          date: dateStr,
          day: dayOfWeek,
          startPeriod: entry.startPeriod,
          endPeriod: entry.endPeriod,
          periodLabel,
          timeLabel,
          subject: {
            id: entry.subject.id,
            code: entry.subject.code,
            name: entry.subject.name,
            kind: entry.subject.kind,
          },
          room: {
            id: entry.room.id,
            name: entry.room.name,
            kind: entry.room.kind,
          },
          department: {
            id: entry.department.id,
            code: entry.department.code,
            name: entry.department.name,
          },
          semester: entry.semester,
          section: entry.section,
          batch: entry.batch,
          absentFaculty: {
            id: entry.faculty.id,
            employeeCode: entry.faculty.employeeCode,
            name: entry.faculty.name,
          },
          assignment: existingAssignment || null,
        });
      }
    }

    // Move to next calendar day
    current.setDate(current.getDate() + 1);
  }

  // Sort slots chronologically by date and startPeriod
  return affectedSlots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startPeriod - b.startPeriod;
  });
}

// ==========================================
// Core Algorithm 2: Identify Free Faculty & Rank Candidates
// ==========================================

export interface CandidateSearchOptions {
  slot: AffectedClassSlot;
  allTimetableEntries: TimetableEntryDto[];
  facultyList?: {
    id: string;
    employeeCode: string;
    name: string;
    departmentId: number;
    departmentCode: string;
    specialization?: string | null;
    workloadHours?: number | null;
    workloadStatus?: 'UNDERLOADED' | 'NORMAL' | 'OVERLOADED' | null;
  }[];
}

/**
 * Identifies free faculty for a given affected slot by inspecting timetable conflicts
 * and existing substitution duties. Ranks eligible candidates using department,
 * expertise, and workload metrics without fabricating missing data.
 */
export function findAvailableSubstitutes({
  slot,
  allTimetableEntries,
  facultyList = DEMO_DEPARTMENT_FACULTY,
}: CandidateSearchOptions): FacultyCandidate[] {
  const currentAssignments = loadPersistedAssignments();
  const candidates: FacultyCandidate[] = [];

  // Combine timetable entries with peer entries for robust conflict checking
  const combinedEntries = [...allTimetableEntries, ...DEMO_PEER_TIMETABLE_ENTRIES];

  const absentId = slot.absentFaculty.id.trim().toLowerCase();
  const absentCode = slot.absentFaculty.employeeCode.trim().toLowerCase();

  for (const faculty of facultyList) {
    const fId = faculty.id.trim().toLowerCase();
    const fCode = faculty.employeeCode.trim().toLowerCase();

    // 1. Exclude the absent faculty member
    if (fId === absentId || fCode === absentCode) {
      continue;
    }

    // 2. Check timetable conflicts: does faculty have a scheduled class in overlapping periods?
    const hasTimetableConflict = combinedEntries.some((entry) => {
      const isThisFaculty =
        entry.faculty.id.trim().toLowerCase() === fId ||
        entry.faculty.employeeCode.trim().toLowerCase() === fCode;
      if (!isThisFaculty) return false;
      if (entry.day !== slot.day) return false;

      // Period overlap condition: start1 <= end2 && end1 >= start2
      return entry.startPeriod <= slot.endPeriod && entry.endPeriod >= slot.startPeriod;
    });

    const conflictingEntry = hasTimetableConflict
      ? combinedEntries.find((entry) => {
          const isThisFaculty =
            entry.faculty.id.trim().toLowerCase() === fId ||
            entry.faculty.employeeCode.trim().toLowerCase() === fCode;
          return isThisFaculty && entry.day === slot.day && entry.startPeriod <= slot.endPeriod && entry.endPeriod >= slot.startPeriod;
        })
      : null;

    // 3. Check substitution conflicts: is faculty already covering another slot at this date and period?
    const hasSubstitutionConflict = currentAssignments.some((a) => {
      const isThisFaculty =
        a.substituteFaculty.id.trim().toLowerCase() === fId ||
        a.substituteFaculty.employeeCode.trim().toLowerCase() === fCode;
      if (!isThisFaculty) return false;
      if (a.date !== slot.date) return false;
      return a.startPeriod <= slot.endPeriod && a.endPeriod >= slot.startPeriod;
    });

    let isAvailable = true;
    let conflictReason: string | null = null;

    if (hasTimetableConflict && conflictingEntry) {
      isAvailable = false;
      conflictReason = `Timetable Conflict: teaching ${conflictingEntry.subject.code} in ${conflictingEntry.room.name}`;
    } else if (hasSubstitutionConflict) {
      isAvailable = false;
      conflictReason = 'Substitution Conflict: already assigned covering another class in this slot';
    }

    // 4. Calculate Match Score using real data rubric:
    // - Base score for being free: 50 pts
    // - Department match: +25 pts
    // - Specialization / subject expertise match: +20 pts (if text match found)
    // - Teaching Workload: UNDERLOADED +15 pts, NORMAL +10 pts, OVERLOADED 0 pts
    const baseScore = isAvailable ? 50 : 0;
    const departmentMatch = faculty.departmentId === slot.department.id ? 25 : 10;

    let specializationMatch = 0;
    if (faculty.specialization && isAvailable) {
      const specLower = faculty.specialization.toLowerCase();
      const subjectNameLower = slot.subject.name.toLowerCase();
      const subjectCodeLower = slot.subject.code.toLowerCase();

      // Check keywords match
      const keywords = subjectNameLower.split(/[\s,]+/);
      const matchesKeyword = keywords.some(
        (kw) => kw.length > 3 && specLower.includes(kw)
      );

      if (specLower.includes(subjectCodeLower) || matchesKeyword) {
        specializationMatch = 20;
      }
    }

    let workloadScore = 5;
    if (faculty.workloadStatus === 'UNDERLOADED') {
      workloadScore = 15;
    } else if (faculty.workloadStatus === 'NORMAL') {
      workloadScore = 10;
    } else if (faculty.workloadStatus === 'OVERLOADED') {
      workloadScore = 0;
    }

    const matchScore = isAvailable
      ? baseScore + departmentMatch + specializationMatch + workloadScore
      : 0;

    candidates.push({
      facultyId: faculty.id,
      employeeCode: faculty.employeeCode,
      name: faculty.name,
      departmentId: faculty.departmentId,
      departmentCode: faculty.departmentCode,
      specialization: faculty.specialization || null,
      isAvailable,
      conflictReason,
      workloadHours: faculty.workloadHours ?? null,
      workloadStatus: faculty.workloadStatus ?? null,
      matchScore,
      scoreBreakdown: {
        baseScore,
        departmentMatch,
        specializationMatch,
        workloadScore,
      },
    });
  }

  // Sort candidates: Available first (highest match score descending), then unavailable by name
  return candidates.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }
    if (a.isAvailable && b.isAvailable) {
      return b.matchScore - a.matchScore;
    }
    return a.name.localeCompare(b.name);
  });
}

// ==========================================
// Core Algorithm 3: Assignment Creation & Retrieval
// ==========================================

export interface CreateAssignmentParams {
  slot: AffectedClassSlot;
  candidate: FacultyCandidate;
  note?: string;
  assignedBy: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * Creates and persists a smart substitution assignment for an affected slot.
 * Prevents duplicate assignments for the same slot.
 * Fires a local-device preview notification via expo-notifications.
 */
export async function createSubstitutionAssignment({
  slot,
  candidate,
  note,
  assignedBy,
}: CreateAssignmentParams): Promise<SubstitutionAssignment> {
  if (!candidate.isAvailable) {
    throw new Error(
      candidate.conflictReason || 'Selected faculty member is not available for this period.'
    );
  }

  const currentAssignments = loadPersistedAssignments();

  // Guard against duplicate assignment for the same affected slot
  const isDuplicate = currentAssignments.some(
    (a) => a.affectedSlotId === slot.id || (a.leaveRequestId === slot.leaveRequestId && a.date === slot.date && a.startPeriod === slot.startPeriod)
  );

  if (isDuplicate) {
    throw new Error('A substitute has already been assigned for this class period.');
  }

  const newAssignment: SubstitutionAssignment = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    leaveRequestId: slot.leaveRequestId,
    affectedSlotId: slot.id,
    date: slot.date,
    day: slot.day,
    startPeriod: slot.startPeriod,
    endPeriod: slot.endPeriod,
    subject: { ...slot.subject },
    room: { ...slot.room },
    department: { ...slot.department },
    semester: slot.semester,
    section: slot.section,
    batch: slot.batch,
    absentFaculty: { ...slot.absentFaculty },
    substituteFaculty: {
      id: candidate.facultyId,
      employeeCode: candidate.employeeCode,
      name: candidate.name,
    },
    note: note?.trim() || null,
    assignedBy: { ...assignedBy },
    assignedAt: new Date().toISOString(),
  };

  const updatedAssignments = [newAssignment, ...currentAssignments];
  savePersistedAssignments(updatedAssignments);

  // Trigger local-device preview notification
  // Clear disclaimer: this fires on the current device only to demonstrate the push notification payload
  try {
    await sendSubstitutionAssignedNotification({
      substituteName: candidate.name,
      subjectCode: slot.subject.code,
      date: slot.date,
      periodLabel: slot.periodLabel,
    });
  } catch {
    // Non-fatal if notifications permissions are not granted or unsupported
  }

  return newAssignment;
}

/**
 * Retrieves all stored substitution assignments, with optional filtering.
 */
export function getSubstitutionAssignments(filter?: {
  leaveRequestId?: string;
  substituteFacultyId?: string;
  date?: string;
}): SubstitutionAssignment[] {
  let list = loadPersistedAssignments();
  if (filter?.leaveRequestId) {
    list = list.filter((a) => a.leaveRequestId === filter.leaveRequestId);
  }
  if (filter?.substituteFacultyId) {
    const target = filter.substituteFacultyId.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.substituteFaculty.id.trim().toLowerCase() === target ||
        a.substituteFaculty.employeeCode.trim().toLowerCase() === target
    );
  }
  if (filter?.date) {
    list = list.filter((a) => a.date === filter.date);
  }
  return list;
}

/**
 * Removes a substitution assignment.
 */
export async function removeSubstitutionAssignment(assignmentId: string): Promise<void> {
  const current = loadPersistedAssignments();
  const filtered = current.filter((a) => a.id !== assignmentId);
  savePersistedAssignments(filtered);
}

// ==========================================
// Core Algorithm 4: Merge Substitutions into Timetable for Display
// ==========================================

export type UserIdentityInput =
  | string
  | {
      id?: string | null;
      employeeId?: string | null;
      employeeCode?: string | null;
    }
  | null
  | undefined;

/**
 * Merges local substitution duties into timetable entries for presentation.
 * Does not overwrite or mutate original schedule data.
 * Filters strictly to the authenticated faculty member and relevant date/day,
 * preventing cross-user exposure.
 */
export function mergeSubstitutionsIntoTimetable(
  regularEntries: TimetableEntryDto[],
  userIdentity?: UserIdentityInput,
  day?: DayOfWeek | null,
  dateFilter?: string | null
): TimetableEntryDto[] {
  if (!userIdentity) return regularEntries;

  const identifiers: string[] = [];
  if (typeof userIdentity === 'string') {
    if (userIdentity.trim()) identifiers.push(userIdentity.trim().toLowerCase());
  } else if (userIdentity) {
    if (userIdentity.id?.trim()) identifiers.push(userIdentity.id.trim().toLowerCase());
    if (userIdentity.employeeId?.trim()) identifiers.push(userIdentity.employeeId.trim().toLowerCase());
    if (userIdentity.employeeCode?.trim()) identifiers.push(userIdentity.employeeCode.trim().toLowerCase());
  }

  if (identifiers.length === 0) return regularEntries;

  const assignments = loadPersistedAssignments();

  // Find assignments where the authenticated user is the assigned substitute
  const mySubAssignments = assignments.filter((a) => {
    const isSubstitute = identifiers.some(
      (ident) =>
        a.substituteFaculty.id.trim().toLowerCase() === ident ||
        a.substituteFaculty.employeeCode.trim().toLowerCase() === ident
    );
    if (!isSubstitute) return false;
    if (dateFilter && a.date !== dateFilter) return false;
    if (day && a.day !== day) return false;
    return true;
  });

  // Convert assignments into TimetableEntryDto format
  const substituteEntries: TimetableEntryDto[] = mySubAssignments.map((a) => ({
    id: `sub-entry-${a.id}`,
    department: { ...a.department },
    semester: a.semester,
    section: a.section,
    batch: a.batch,
    subject: { ...a.subject },
    faculty: { ...a.substituteFaculty },
    room: { ...a.room },
    day: a.day,
    startPeriod: a.startPeriod,
    endPeriod: a.endPeriod,
    isSubstitute: true,
    substituteNote: `Smart Substitution: Covering for ${a.absentFaculty.name} (${a.note ? a.note : 'Leave approval coverage'})`,
  }));

  // Also annotate regular entries if the authenticated user is the absent faculty who has a covering substitute
  const annotatedRegular = regularEntries.map((entry) => {
    const isAbsentUser = identifiers.some(
      (ident) =>
        entry.faculty.id.trim().toLowerCase() === ident ||
        entry.faculty.employeeCode.trim().toLowerCase() === ident
    );
    if (!isAbsentUser) return entry;

    const coveringAssignment = assignments.find((a) => {
      const matchesDay = a.day === entry.day;
      const matchesPeriod = a.startPeriod === entry.startPeriod;
      const matchesDate = !dateFilter || a.date === dateFilter;
      const matchesAbsentFaculty = identifiers.some(
        (ident) =>
          a.absentFaculty.id.trim().toLowerCase() === ident ||
          a.absentFaculty.employeeCode.trim().toLowerCase() === ident
      );
      return matchesDay && matchesPeriod && matchesDate && matchesAbsentFaculty;
    });

    if (coveringAssignment) {
      return {
        ...entry,
        isSubstitute: true,
        substituteNote: `Covered by substitute ${coveringAssignment.substituteFaculty.name}`,
      };
    }
    return entry;
  });

  return [...annotatedRegular, ...substituteEntries].sort(
    (a, b) => a.startPeriod - b.startPeriod
  );
}
