import { z } from 'zod';
import { apiRequest } from '@/services/api';

const roleSchema = z.object({ id: z.number(), name: z.string() });
export type Role = z.infer<typeof roleSchema>;

const loginSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  role: roleSchema,
});
export type Login = z.infer<typeof loginSchema>;

export interface LoginChanges {
  roleId?: number;
  status?: Login['status'];
  password?: string;
}

/** Roles the signed-in user may give. */
export async function listRoles() {
  return z
    .object({ data: z.array(roleSchema) })
    .parse(await apiRequest('/users/roles')).data;
}

export async function getLogin(employeeId: string) {
  return z
    .object({ data: loginSchema.nullable() })
    .parse(await apiRequest(`/users/employee/${employeeId}`)).data;
}

export async function createLogin(input: {
  employeeId: string;
  roleId: number;
  password: string;
}) {
  return z
    .object({ data: loginSchema })
    .parse(await apiRequest('/users', { method: 'POST', body: input })).data;
}

export async function updateLogin(id: string, changes: LoginChanges) {
  return z
    .object({ data: loginSchema })
    .parse(await apiRequest(`/users/${id}`, { method: 'PATCH', body: changes }))
    .data;
}
