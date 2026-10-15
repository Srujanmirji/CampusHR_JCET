import { z } from 'zod';
import { apiRequest } from '@/services/api';

export const DAYS = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
} as const;
export type Day = keyof typeof DAYS;

const periodSchema = z.object({
  number: z.number(),
  startTime: z.string(),
  endTime: z.string(),
});
export type Period = z.infer<typeof periodSchema>;

const subjectSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  departmentId: z.number(),
  semester: z.number(),
  kind: z.enum(['THEORY', 'LAB']),
});
export type Subject = z.infer<typeof subjectSchema>;

const roomSchema = z.object({
  id: z.number(),
  name: z.string(),
  kind: z.enum(['CLASSROOM', 'LAB']),
});
export type Room = z.infer<typeof roomSchema>;

export const entrySchema = z.object({
  id: z.string(),
  department: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  semester: z.number(),
  section: z.string(),
  batch: z.string().nullable(),
  subject: subjectSchema.pick({ id: true, code: true, name: true, kind: true }),
  faculty: z.object({
    id: z.string(),
    employeeCode: z.string(),
    name: z.string(),
  }),
  room: roomSchema,
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
  startPeriod: z.number(),
  endPeriod: z.number(),
});
export type Entry = z.infer<typeof entrySchema>;

export interface EntryInput {
  departmentId: number;
  semester: number;
  section: string;
  batch: string | null;
  subjectId: number;
  facultyId: string;
  roomId: number;
  day: Day;
  startPeriod: number;
  endPeriod: number;
}

const list = <T extends z.ZodType>(schema: T) =>
  z.object({ data: z.array(schema) });
const one = <T extends z.ZodType>(schema: T) => z.object({ data: schema });

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
};

export async function listPeriods() {
  return list(periodSchema).parse(await apiRequest('/timetable/periods')).data;
}

export async function listSubjects(departmentId: number, semester: number) {
  return list(subjectSchema).parse(
    await apiRequest(
      `/timetable/subjects?${query({ departmentId, semester })}`,
    ),
  ).data;
}

export async function createSubject(input: Omit<Subject, 'id'>) {
  return one(subjectSchema).parse(
    await apiRequest('/timetable/subjects', { method: 'POST', body: input }),
  ).data;
}

export async function listRooms() {
  return list(roomSchema).parse(await apiRequest('/timetable/rooms')).data;
}

export async function createRoom(input: Omit<Room, 'id'>) {
  return one(roomSchema).parse(
    await apiRequest('/timetable/rooms', { method: 'POST', body: input }),
  ).data;
}

export async function listEntries(filters: {
  departmentId?: number;
  semester?: number;
  section?: string;
  facultyId?: string;
}) {
  return list(entrySchema).parse(
    await apiRequest(`/timetable/entries?${query(filters)}`),
  ).data;
}

export async function saveEntry(id: string | undefined, input: EntryInput) {
  return one(entrySchema).parse(
    await apiRequest(id ? `/timetable/entries/${id}` : '/timetable/entries', {
      method: id ? 'PATCH' : 'POST',
      body: input,
    }),
  ).data;
}

export async function deleteEntry(id: string) {
  await apiRequest(`/timetable/entries/${id}`, { method: 'DELETE' });
}
