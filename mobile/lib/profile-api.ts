import { z } from 'zod';
import { apiFetch, getSession, type AuthUser } from './session';
import { homeUnavailable, canReadHome } from './home-api';
export const employeeSchema = z.object({
  id: z.uuid(),
  employeeCode: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  department: z.object({
    id: z.number().int(),
    code: z.string(),
    name: z.string(),
  }),
  designation: z.object({
    id: z.number().int(),
    name: z.string(),
    category: z.enum(['TEACHING', 'NON_TEACHING']),
  }),
  employmentType: z.enum(['PERMANENT', 'CONTRACT', 'PROBATIONARY', 'VISITING']),
  joiningDate: z.iso.date(),
  qualification: z.string().nullable(),
  specialization: z.string().nullable(),
  experienceYears: z.number().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
});
export type OwnEmployee = z.infer<typeof employeeSchema>;
export function ownAccess(
  user: AuthUser | null,
  token: string | null,
  permission: string,
) {
  const reason = homeUnavailable(user, token, permission);
  if (reason) throw new Error(reason);
  if (getSession().user?.id !== user?.id)
    throw new Error('Session changed. Reopen Profile.');
  return z.uuid().parse(user?.employeeId);
}
function ownedEmployee(raw: unknown, id: string) {
  const row = z.object({ data: employeeSchema }).parse(raw).data;
  if (row.id !== id)
    throw new Error('The server returned a different employee profile.');
  return row;
}
export async function getOwnProfile(
  user: AuthUser | null,
  token: string | null,
) {
  const id = ownAccess(user, token, 'employee.read');
  return ownedEmployee(await (await apiFetch(`/employees/${id}`)).json(), id);
}
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.')
  .or(z.literal(''))
  .transform((value) => value || null);
export async function saveOwnPhone(
  user: AuthUser | null,
  token: string | null,
  phone: string,
) {
  const id = ownAccess(user, token, 'employee.update'),
    value = phoneSchema.parse(phone);
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await apiFetch(`/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: value }),
      signal: controller.signal,
    });
    const row = ownedEmployee(await response.json(), id);
    if (row.phone !== value)
      throw new Error(
        'The phone update was not confirmed. Refresh your profile.',
      );
    return row;
  } finally {
    clearTimeout(timeout);
  }
}
export const canEditPhone = (user: AuthUser | null) =>
  canReadHome(user, 'employee.update');
