import { z } from 'zod';
import { ApiError, apiFetch, type AuthUser } from './session';
import { canReadHome, campusClock } from './home-api';
import { entrySchema } from './timetable-api';
import { dayForDate } from './schedule-api';

const person = z.object({
  id: z.uuid(),
  employeeCode: z.string(),
  name: z.string(),
});
const named = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
});
const leaveSchema = z.object({
  id: z.uuid(),
  employee: person,
  department: named,
  leaveType: named,
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  halfDay: z.enum(['FIRST', 'SECOND']).nullable(),
  days: z.number().positive(),
});
export const coverageSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(['SUBSTITUTE', 'NOT_NEEDED']),
    substitute: person.nullable(),
    note: z.string().nullable(),
    assignedAt: z.iso.datetime({ offset: true }),
  })
  .refine(
    (row) =>
      row.kind === 'SUBSTITUTE'
        ? row.substitute !== null
        : row.substitute === null && (row.note?.trim().length ?? 0) >= 3,
    'Invalid coverage details.',
  );
const classSchema = z.object({
  date: z.iso.date(),
  hours: z.number().positive(),
  entry: entrySchema.extend({ id: z.uuid(), faculty: person }),
  coverage: coverageSchema.nullable(),
});
const pointShape = {
  subject: z.number().nonnegative(),
  availability: z.number().nonnegative(),
  department: z.number().nonnegative(),
  workload: z.number().nonnegative(),
  experience: z.number().nonnegative(),
};
const candidateSchema = z.object({
  faculty: person.extend({
    department: z.object({ id: z.number().int(), code: z.string() }),
    designation: z.string(),
  }),
  score: z.number().nonnegative(),
  points: z.object(pointShape),
  hoursAfter: z.number().nonnegative(),
  maxHours: z.number().nonnegative().nullable(),
  eligible: z.boolean(),
  reason: z.string().nullable(),
});
export type ApprovedLeave = z.infer<typeof leaveSchema>;
export type AffectedClass = z.infer<typeof classSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type Coverage = z.infer<typeof coverageSchema>;
export function coverageUnavailable(
  user: AuthUser | null,
  token: string | null,
) {
  if (!user || !token || token.startsWith('demo-'))
    return 'Sign in with a real account to manage class coverage.';
  if (
    !canReadHome(user, 'substitution.read') ||
    !(
      user.permissions.includes('substitution.assign.all') ||
      (user.permissions.includes('substitution.assign.department') &&
        user.departmentId !== null)
    )
  )
    return 'Class coverage management is not available for your account.';
  return null;
}
function requireManager(user: AuthUser | null, token: string | null) {
  const reason = coverageUnavailable(user, token);
  if (reason) throw new Error(reason);
}
async function read<T extends z.ZodType>(path: string, schema: T) {
  const response = await apiFetch(path);
  const envelope = z.object({ data: z.unknown() }).parse(await response.json());
  return schema.parse(envelope.data) as z.output<T>;
}
export async function listCoverageLeave(
  user: AuthUser | null,
  token: string | null,
  from = campusClock().date,
) {
  requireManager(user, token);
  z.iso.date().parse(from);
  const rows = await read(
    `/substitution/leave?${new URLSearchParams({ from })}`,
    z.array(
      z.object({
        leave: leaveSchema,
        classes: z.number().int().positive(),
        covered: z.number().int().nonnegative(),
      }),
    ),
  );
  if (rows.some((row) => row.covered > row.classes || row.leave.endDate < from))
    throw new Error('Coverage list contains invalid counts or expired leave.');
  return rows;
}
export async function getCoverageClasses(
  user: AuthUser | null,
  token: string | null,
  leaveId: string,
) {
  requireManager(user, token);
  z.uuid().parse(leaveId);
  const data = await read(
    `/substitution/leave/${leaveId}`,
    z.object({ leave: leaveSchema, classes: z.array(classSchema) }),
  );
  if (
    data.leave.id !== leaveId ||
    data.classes.some(
      (slot) =>
        slot.entry.endPeriod < slot.entry.startPeriod ||
        slot.hours !== slot.entry.endPeriod - slot.entry.startPeriod + 1 ||
        slot.date < data.leave.startDate ||
        slot.date > data.leave.endDate ||
        slot.entry.faculty.id !== data.leave.employee.id ||
        dayForDate(slot.date) !== slot.entry.day ||
        (!user!.permissions.includes('substitution.read.all') &&
          slot.entry.department.id !== user!.departmentId),
    )
  )
    throw new Error(
      'Classes are outside the selected leave, date or department.',
    );
  return data;
}
export async function getCoverageCandidates(
  user: AuthUser | null,
  token: string | null,
  leaveId: string,
  entryId: string,
  date: string,
) {
  requireManager(user, token);
  z.uuid().parse(leaveId);
  z.uuid().parse(entryId);
  z.iso.date().parse(date);
  return read(
    `/substitution/leave/${leaveId}/candidates?${new URLSearchParams({ entryId, date })}`,
    z.array(candidateSchema),
  );
}
export async function getCoverageRubric(
  user: AuthUser | null,
  token: string | null,
) {
  requireManager(user, token);
  return read('/substitution/rubric', z.object(pointShape));
}
export const assignmentSchema = z
  .object({
    leaveRequestId: z.uuid(),
    timetableEntryId: z.uuid(),
    date: z.iso.date(),
    substituteId: z.uuid().nullable(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (value) => value.substituteId !== null || (value.note?.length ?? 0) >= 3,
    'Describe how the class will be handled without a substitute (at least 3 characters).',
  );
export type AssignmentInput = z.infer<typeof assignmentSchema>;
let writing = false;
// shortcut: add server idempotency keys before allowing automatic retries of ambiguous assignments.
async function write(
  path: string,
  method: 'POST' | 'DELETE',
  body?: AssignmentInput,
) {
  if (writing)
    throw new ApiError(
      409,
      'WRITE_PENDING',
      'Another coverage action is still pending.',
    );
  writing = true;
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await apiFetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (method === 'DELETE') {
      if (response.status !== 204)
        throw new Error('The server did not confirm undo. Refresh coverage.');
      return null;
    }
    return z.object({ data: coverageSchema }).parse(await response.json()).data;
  } finally {
    clearTimeout(timeout);
    writing = false;
  }
}
export async function assignCoverage(
  user: AuthUser | null,
  token: string | null,
  input: AssignmentInput,
) {
  requireManager(user, token);
  const value = assignmentSchema.parse(input);
  const data = await write('/substitution/assignments', 'POST', value);
  if (
    !data ||
    data.substitute?.id !== (value.substituteId ?? undefined) ||
    data.kind !== (value.substituteId ? 'SUBSTITUTE' : 'NOT_NEEDED') ||
    data.note !== (value.note || null)
  )
    throw new Error(
      'The server did not confirm the requested coverage. Refresh before trying again.',
    );
  return data;
}
export async function undoCoverage(
  user: AuthUser | null,
  token: string | null,
  id: string,
) {
  requireManager(user, token);
  z.uuid().parse(id);
  await write(`/substitution/assignments/${id}`, 'DELETE');
}
