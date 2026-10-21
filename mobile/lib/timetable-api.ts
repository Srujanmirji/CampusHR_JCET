import { z } from 'zod';
import { API_BASE_URL } from './api-config';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export interface PeriodDto {
  number: number;
  startTime: string; // "HH:MM" 24h
  endTime: string; // "HH:MM" 24h
}

export interface TimetableEntryDto {
  id: string;
  department: {
    id: number;
    code: string;
    name: string;
  };
  semester: number;
  section: string;
  batch: string | null;
  subject: {
    id: number;
    code: string;
    name: string;
    kind: 'THEORY' | 'LAB';
  };
  faculty: {
    id: string;
    employeeCode: string;
    name: string;
  };
  room: {
    id: number;
    name: string;
    kind: 'CLASSROOM' | 'LAB';
  };
  day: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
  isSubstitute?: boolean;
  substituteNote?: string;
}

export const JCET_PERIODS: PeriodDto[] = [
  { number: 1, startTime: '09:00', endTime: '10:00' },
  { number: 2, startTime: '10:00', endTime: '11:00' },
  { number: 3, startTime: '11:15', endTime: '12:15' },
  { number: 4, startTime: '12:15', endTime: '13:15' },
  { number: 5, startTime: '14:00', endTime: '15:00' },
  { number: 6, startTime: '15:00', endTime: '16:00' },
  { number: 7, startTime: '16:00', endTime: '17:00' },
];

export function getSystemDayOfWeek(date: Date = new Date()): {
  day: DayOfWeek | null;
  isSunday: boolean;
} {
  const dayIndex = date.getDay();
  switch (dayIndex) {
    case 1:
      return { day: 'MON', isSunday: false };
    case 2:
      return { day: 'TUE', isSunday: false };
    case 3:
      return { day: 'WED', isSunday: false };
    case 4:
      return { day: 'THU', isSunday: false };
    case 5:
      return { day: 'FRI', isSunday: false };
    case 6:
      return { day: 'SAT', isSunday: false };
    default:
      return { day: null, isSunday: true };
  }
}

export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatPeriodTime(startStr?: string, endStr?: string): string {
  if (!startStr) return '';
  const format12 = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };
  if (!endStr) return format12(startStr);
  return `${format12(startStr)} – ${format12(endStr)}`;
}

export const SAMPLE_TIMETABLE_ENTRIES: TimetableEntryDto[] = [
  // =================== MONDAY ===================
  {
    id: 'tt-mon-1',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 101,
      code: 'BCS501',
      name: 'Database Management Systems',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 201, name: 'Room 302', kind: 'CLASSROOM' },
    day: 'MON',
    startPeriod: 1,
    endPeriod: 1,
  },
  {
    id: 'tt-mon-2',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'B',
    batch: null,
    subject: {
      id: 104,
      code: 'BCS504',
      name: 'Computer Networks',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 202, name: 'Room 204', kind: 'CLASSROOM' },
    day: 'MON',
    startPeriod: 3,
    endPeriod: 3,
  },
  {
    id: 'tt-mon-3',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: 'Batch A1',
    subject: { id: 107, code: 'BCSL507', name: 'DBMS Laboratory', kind: 'LAB' },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 205, name: 'Lab 3 (Computer Center)', kind: 'LAB' },
    day: 'MON',
    startPeriod: 5,
    endPeriod: 6,
  },

  // =================== TUESDAY ===================
  {
    id: 'tt-tue-1',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 101,
      code: 'BCS501',
      name: 'Database Management Systems',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 201, name: 'Room 302', kind: 'CLASSROOM' },
    day: 'TUE',
    startPeriod: 2,
    endPeriod: 2,
  },
  {
    id: 'tt-tue-2',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'B',
    batch: null,
    subject: {
      id: 102,
      code: 'BCS502',
      name: 'Theory of Computation',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 202, name: 'Room 204', kind: 'CLASSROOM' },
    day: 'TUE',
    startPeriod: 4,
    endPeriod: 4,
    isSubstitute: true,
    substituteNote:
      'Substitution assigned: Covering for Dr. Suresh V (On Medical Leave)',
  },
  {
    id: 'tt-tue-3',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: 'Batch A2',
    subject: { id: 107, code: 'BCSL507', name: 'DBMS Laboratory', kind: 'LAB' },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 205, name: 'Lab 3 (Computer Center)', kind: 'LAB' },
    day: 'TUE',
    startPeriod: 5,
    endPeriod: 6,
  },

  // =================== WEDNESDAY ===================
  {
    id: 'tt-wed-1',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'B',
    batch: null,
    subject: {
      id: 104,
      code: 'BCS504',
      name: 'Computer Networks',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 202, name: 'Room 204', kind: 'CLASSROOM' },
    day: 'WED',
    startPeriod: 1,
    endPeriod: 1,
  },
  {
    id: 'tt-wed-2',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 101,
      code: 'BCS501',
      name: 'Database Management Systems',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 201, name: 'Room 302', kind: 'CLASSROOM' },
    day: 'WED',
    startPeriod: 3,
    endPeriod: 3,
  },
  {
    id: 'tt-wed-3',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 108,
      code: 'BCS508',
      name: 'Mini-Project & Mentorship',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 201, name: 'Room 302', kind: 'CLASSROOM' },
    day: 'WED',
    startPeriod: 7,
    endPeriod: 7,
  },

  // =================== THURSDAY ===================
  {
    id: 'tt-thu-1',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'B',
    batch: null,
    subject: {
      id: 104,
      code: 'BCS504',
      name: 'Computer Networks',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 202, name: 'Room 204', kind: 'CLASSROOM' },
    day: 'THU',
    startPeriod: 2,
    endPeriod: 2,
  },
  {
    id: 'tt-thu-2',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 101,
      code: 'BCS501',
      name: 'Database Management Systems',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 201, name: 'Room 302', kind: 'CLASSROOM' },
    day: 'THU',
    startPeriod: 4,
    endPeriod: 4,
  },

  // =================== FRIDAY ===================
  {
    id: 'tt-fri-1',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 101,
      code: 'BCS501',
      name: 'Database Management Systems',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 201, name: 'Room 302', kind: 'CLASSROOM' },
    day: 'FRI',
    startPeriod: 1,
    endPeriod: 1,
  },
  {
    id: 'tt-fri-2',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'B',
    batch: null,
    subject: {
      id: 104,
      code: 'BCS504',
      name: 'Computer Networks',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 202, name: 'Room 204', kind: 'CLASSROOM' },
    day: 'FRI',
    startPeriod: 3,
    endPeriod: 3,
  },
  {
    id: 'tt-fri-3',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 109,
      code: 'BCS509',
      name: 'Department Tutorial & Doubt Clearance',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 201, name: 'Room 302', kind: 'CLASSROOM' },
    day: 'FRI',
    startPeriod: 5,
    endPeriod: 5,
  },

  // =================== SATURDAY ===================
  {
    id: 'tt-sat-1',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'A',
    batch: null,
    subject: {
      id: 110,
      code: 'BCS510',
      name: 'Technical Seminar & Student Forum',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 208, name: 'Auditorium 2', kind: 'CLASSROOM' },
    day: 'SAT',
    startPeriod: 1,
    endPeriod: 1,
  },
  {
    id: 'tt-sat-2',
    department: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    semester: 5,
    section: 'ALL',
    batch: null,
    subject: {
      id: 111,
      code: 'CSE-MTG',
      name: 'Department Faculty Review Meeting',
      kind: 'THEORY',
    },
    faculty: {
      id: 'demo-faculty-021',
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    room: { id: 209, name: 'CSE Conference Hall', kind: 'CLASSROOM' },
    day: 'SAT',
    startPeriod: 2,
    endPeriod: 2,
  },
];

const periodSchema = z.object({
  number: z.number().int().positive(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
const namedSchema = z.object({ id: z.number(), name: z.string() });
const entrySchema = z.object({
  id: z.string(),
  department: namedSchema.extend({ code: z.string() }),
  semester: z.number(),
  section: z.string(),
  batch: z.string().nullable(),
  subject: namedSchema.extend({
    code: z.string(),
    kind: z.enum(['THEORY', 'LAB']),
  }),
  faculty: z.object({
    id: z.string(),
    employeeCode: z.string(),
    name: z.string(),
  }),
  room: namedSchema.extend({ kind: z.enum(['CLASSROOM', 'LAB']) }),
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
  startPeriod: z.number().int().positive(),
  endPeriod: z.number().int().positive(),
});

export async function getPeriods(token: string | null): Promise<PeriodDto[]> {
  if (token?.startsWith('demo-')) return JCET_PERIODS;
  if (!token) throw new Error('Sign in to load your timetable.');
  const response = await fetch(`${API_BASE_URL}/timetable/periods`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error('Unable to load period timings. Refresh or sign in again.');
  return z.object({ data: z.array(periodSchema) }).parse(await response.json())
    .data;
}

export async function getTimetableEntries(
  token: string | null,
  options?: { day?: DayOfWeek; facultyId?: string },
): Promise<TimetableEntryDto[]> {
  if (!token) throw new Error('Sign in to load your timetable.');
  let entries: TimetableEntryDto[];
  if (token.startsWith('demo-')) {
    entries = SAMPLE_TIMETABLE_ENTRIES;
  } else {
    const params = new URLSearchParams();
    if (options?.facultyId) params.set('facultyId', options.facultyId);
    const response = await fetch(
      `${API_BASE_URL}/timetable/entries?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok)
      throw new Error(
        'Unable to load your timetable. Refresh or sign in again.',
      );
    entries = z
      .object({ data: z.array(entrySchema) })
      .parse(await response.json()).data;
  }
  return entries
    .filter((entry) => !options?.day || entry.day === options.day)
    .sort((a, b) => a.startPeriod - b.startPeriod);
}
