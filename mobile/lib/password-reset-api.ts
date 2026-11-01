import { z } from 'zod';
import { API_BASE_URL } from './api-config';

const requestedSchema = z.object({
  challengeId: z.uuid(),
  expiresIn: z.number().int().positive(),
  resendAfter: z.number().int().nonnegative(),
  message: z.string(),
});
async function send(path: string, body?: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/password-reset/${path}`,
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
        .object({ error: z.object({ message: z.string() }) })
        .safeParse(result);
      throw new RecoveryError(
        failure.success
          ? failure.data.error.message
          : 'Could not complete password recovery. Please try again.',
      );
    }
    return result;
  } catch (error) {
    if (error instanceof RecoveryError) throw error;
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
class RecoveryError extends Error {}
function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new Error('CampusHR returned an unexpected response. Please retry.');
  return parsed.data;
}
export async function passwordResetOptions() {
  return validated(z.object({ enabled: z.boolean() }), await send('options'));
}
export async function requestPasswordReset(email: string) {
  return validated(requestedSchema, await send('request', { email }));
}
export async function confirmPasswordReset(input: {
  challengeId: string;
  code: string;
  newPassword: string;
}) {
  return validated(
    z.object({ passwordUpdated: z.literal(true), message: z.string() }),
    await send('confirm', input),
  );
}
