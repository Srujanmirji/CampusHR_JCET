import { z } from 'zod';
import { apiRequest } from '@/services/api';

const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  employeeId: z.string().nullable(),
  departmentId: z.number().nullable(),
});
const sessionSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: sessionUserSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type SessionResponse = z.infer<typeof sessionSchema>;

export async function login(input: {
  identifier: string;
  password: string;
  remember: boolean;
}) {
  return sessionSchema.parse(
    await apiRequest('/auth/login', { method: 'POST', body: input }),
  );
}

// Several callers (React StrictMode, two components) may restore at once; one
// request serves them all, because the server rotates the token on each use.
let pendingRefresh: Promise<SessionResponse> | undefined;
export function refresh() {
  pendingRefresh ??= apiRequest('/auth/refresh', { method: 'POST' })
    .then((data) => sessionSchema.parse(data))
    .finally(() => {
      pendingRefresh = undefined;
    });
  return pendingRefresh;
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' });
}

/** Changes the signed-in user's password; other devices are signed out. */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  await apiRequest('/auth/password', { method: 'POST', body: input });
}
