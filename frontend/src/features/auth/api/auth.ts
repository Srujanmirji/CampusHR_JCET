import { z } from 'zod';
import { apiRequest, ApiError } from '@/services/api';

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

const resetOptionsSchema = z.object({ enabled: z.boolean() });
const resetRequestSchema = z.object({
  challengeId: z.uuid(),
  expiresIn: z.number().int().positive(),
  resendAfter: z.number().int().nonnegative(),
  message: z.string(),
});
const resetCompleteSchema = z.object({
  passwordUpdated: z.literal(true),
  message: z.string(),
});
async function publicResetRequest(
  path: string,
  body?: unknown,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/password-reset/${path}`,
      {
        method: body ? 'POST' : 'GET',
        credentials: 'omit',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      },
    );
    const result: unknown = await response.json();
    if (!response.ok) {
      const failure = z
        .object({ error: z.object({ code: z.string(), message: z.string() }) })
        .safeParse(result);
      throw new ApiError(
        response.status,
        failure.success ? failure.data.error.code : 'RESET_FAILED',
        failure.success
          ? failure.data.error.message
          : 'Could not complete recovery. Please retry.',
      );
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(
      path === 'confirm'
        ? 'Could not confirm the update. Try signing in with your new password before requesting another code.'
        : 'Cannot reach CampusHR. Check your connection and try again.',
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
  }
}
function resetResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new Error('CampusHR returned an unexpected response. Please retry.');
  return parsed.data;
}
export async function passwordResetOptions() {
  return resetResponse(resetOptionsSchema, await publicResetRequest('options'));
}
export async function requestPasswordReset(email: string) {
  return resetResponse(
    resetRequestSchema,
    await publicResetRequest('request', { email }),
  );
}
export async function confirmPasswordReset(input: {
  challengeId: string;
  code: string;
  newPassword: string;
}) {
  return resetResponse(
    resetCompleteSchema,
    await publicResetRequest('confirm', input),
  );
}
