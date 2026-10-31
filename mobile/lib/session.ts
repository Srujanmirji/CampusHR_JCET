import { Platform } from 'react-native';
import { z } from 'zod';
import { API_BASE_URL } from './api-config';
import { readSavedSession, writeSavedSession } from './session-storage';

const native = Platform.OS !== 'web';
const refreshSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: z.string().min(1),
  permissions: z.array(z.string()),
  employeeId: z.uuid().nullable(),
  departmentId: z.number().int().nullable(),
  employeeCode: z.string().optional(),
  name: z.string().optional(),
});
const responseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().positive(),
  user: userSchema,
  refreshToken: native ? refreshSchema : z.undefined().optional(),
});
const savedSchema = z
  .object({ apiUrl: z.literal(API_BASE_URL), refreshToken: refreshSchema })
  .strict();
export type AuthUser = z.infer<typeof userSchema>;
export interface SessionState {
  status: 'loading' | 'signedIn' | 'signedOut';
  accessToken: string | null;
  user: AuthUser | null;
  error: string | null;
}
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const listeners = new Set<() => void>();
let state: SessionState = {
  status: 'loading',
  accessToken: null,
  user: null,
  error: null,
};
let refreshToken: string | null = null;
let remember = false;
let expiresAt = 0;
let epoch = 0;
let restored = false;
let restoring: Promise<void> | undefined;
let refreshing: Promise<void> | undefined;
const publish = (next: SessionState) => {
  state = next;
  for (const listener of listeners) listener();
};
export const getSession = () => state;
export const subscribeSession = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function signedOut(error: string | null) {
  refreshToken = null;
  remember = false;
  expiresAt = 0;
  publish({ status: 'signedOut', accessToken: null, user: null, error });
}
async function invalidate(message: string) {
  const own = ++epoch;
  signedOut(message);
  try {
    await writeSavedSession(null);
  } catch {
    if (own === epoch)
      signedOut(
        `${message} Secure storage could not be cleared. Unlock this device and clear the saved session.`,
      );
  }
}
async function responseError(response: Response) {
  const data = await response.json().catch(() => null);
  const error = z
    .object({ error: z.object({ code: z.string(), message: z.string() }) })
    .safeParse(data);
  return new ApiError(
    response.status,
    error.success ? error.data.error.code : 'REQUEST_FAILED',
    error.success
      ? error.data.error.message
      : `Request failed (${response.status}). Try again.`,
  );
}
async function authPost(
  action: 'login' | 'refresh' | 'logout' | 'password',
  body?: unknown,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `${API_BASE_URL}/auth${native ? '/native' : ''}/${action}`,
      {
        method: 'POST',
        credentials: native ? 'omit' : 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(action === 'password' && state.accessToken
            ? { Authorization: `Bearer ${state.accessToken}` }
            : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    if (!response.ok) throw await responseError(response);
    if (action === 'password' && response.status !== 204)
      throw new Error(
        'Password change was not confirmed. Check sign-in before trying again.',
      );
    return response.status === 204 ? undefined : await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
const endNativeSession = async (token: string | undefined) => {
  if (native && token) await authPost('logout', { refreshToken: token });
};
async function accept(raw: unknown, own: number, persist: boolean) {
  const data = responseSchema.parse(raw);
  if (own !== epoch) {
    await endNativeSession(data.refreshToken).catch(() => undefined);
    throw new Error('Session changed. Sign in again.');
  }
  try {
    if (native && persist)
      await writeSavedSession(
        JSON.stringify({
          apiUrl: API_BASE_URL,
          refreshToken: data.refreshToken,
        }),
      );
  } catch (cause) {
    await endNativeSession(data.refreshToken).catch(() => undefined);
    throw new Error(
      'Unable to save your session securely. Unlock this device and sign in again.',
      { cause },
    );
  }
  if (own !== epoch) {
    await endNativeSession(data.refreshToken).catch(() => undefined);
    throw new Error('Session changed. Sign in again.');
  }
  refreshToken = data.refreshToken ?? null;
  remember = persist;
  expiresAt = Date.now() + data.expiresIn * 1000;
  publish({
    status: 'signedIn',
    accessToken: data.accessToken,
    user: {
      ...data.user,
      name: data.user.name || data.user.email.split('@')[0],
    },
    error: null,
  });
}
export async function signIn(
  identifier: string,
  password: string,
  persist = false,
) {
  if (state.status === 'signedIn') await signOut();
  const own = ++epoch;
  restored = true;
  refreshing = undefined;
  signedOut(null);
  try {
    await writeSavedSession(null);
    if (own !== epoch) throw new Error('Session changed. Sign in again.');
    await accept(
      await authPost('login', {
        identifier: identifier.trim(),
        password,
        remember: persist,
      }),
      own,
      persist,
    );
  } catch (error) {
    if (own === epoch)
      await invalidate(
        error instanceof ApiError
          ? error.message
          : 'Sign-in could not finish. Check your connection and device storage, then try again.',
      );
    throw error;
  }
}
export async function signInDemo(user: AuthUser) {
  if (typeof __DEV__ === 'undefined' || !__DEV__)
    throw new Error('Demo sessions are unavailable in release builds.');
  if (state.status === 'signedIn') await signOut();
  const own = ++epoch;
  await writeSavedSession(null);
  if (own !== epoch) throw new Error('Session changed. Sign in again.');
  restored = true;
  publish({
    status: 'signedIn',
    user,
    accessToken: 'demo-jwt-token-jcet',
    error: null,
  });
}
export function refreshSession(): Promise<void> {
  if (refreshing) return refreshing;
  const own = epoch;
  const token = refreshToken;
  const persist = remember;
  const task = (async () => {
    try {
      if (native && !token)
        throw new Error('Your session has ended. Sign in again.');
      await accept(
        await authPost('refresh', native ? { refreshToken: token } : undefined),
        own,
        persist,
      );
    } catch (error) {
      if (own === epoch)
        await invalidate(
          error instanceof ApiError && error.status === 401
            ? 'Your session has ended. Sign in again.'
            : 'Your session could not be restored safely. Sign in again.',
        );
      throw error;
    }
  })();
  const current = task.finally(() => {
    if (refreshing === current) refreshing = undefined;
  });
  refreshing = current;
  return current;
}
export function restoreSession(): Promise<void> {
  if (restoring) return restoring;
  if (restored) return Promise.resolve();
  restored = true;
  const own = epoch;
  restoring = (async () => {
    try {
      if (native) {
        const value = await readSavedSession();
        if (own !== epoch) return;
        if (!value) {
          signedOut(null);
          return;
        }
        const saved = savedSchema.safeParse(JSON.parse(value));
        if (!saved.success) {
          await invalidate(
            'Saved session is invalid for this server. Sign in again.',
          );
          return;
        }
        refreshToken = saved.data.refreshToken;
        remember = true;
      }
      await refreshSession();
    } catch (error) {
      if (own === epoch)
        await invalidate(
          error instanceof ApiError && error.status === 401
            ? 'Your session has ended. Sign in again.'
            : 'Unable to restore your session. Check your connection and unlock this device, then sign in again.',
        );
    }
  })();
  return restoring;
}
export async function signOut() {
  const token = refreshToken;
  const isDemo = state.accessToken?.startsWith('demo-');
  const own = ++epoch;
  restored = true;
  refreshing = undefined;
  signedOut(null);
  const results = await Promise.allSettled([
    writeSavedSession(null),
    isDemo || (native && !token)
      ? Promise.resolve()
      : authPost('logout', native ? { refreshToken: token } : undefined),
  ]);
  if (own !== epoch) return;
  if (results[0].status === 'rejected')
    signedOut(
      'Secure storage could not be cleared. Unlock this device and clear the saved session before closing the app.',
    );
  else if (results[1].status === 'rejected')
    signedOut(
      'Signed out on this device. Server sign-out was not confirmed; remote alerts may continue until the server session expires. Check your connection.',
    );
}
export async function refreshIfExpired() {
  if (
    state.status === 'signedIn' &&
    !state.accessToken?.startsWith('demo-') &&
    Date.now() >= expiresAt
  )
    await refreshSession();
}
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    (path.startsWith('/auth/') && path !== '/auth/me')
  )
    throw new Error('Use the session methods for authentication requests.');
  const own = epoch;
  const initialToken = state.accessToken;
  if (state.status !== 'signedIn' || !initialToken)
    throw new Error('Sign in to continue.');
  const request = () => {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${state.accessToken}`);
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: native ? 'omit' : 'include',
    });
  };
  let response = await request();
  if (own !== epoch) throw new Error('Session changed. Try again.');
  if (response.status === 401) {
    if (state.accessToken === initialToken) await refreshSession();
    if (own !== epoch) throw new Error('Session changed. Sign in again.');
    response = await request();
    if (own !== epoch) throw new Error('Session changed. Try again.');
    if (response.status === 401)
      await invalidate('Your session has ended. Sign in again.');
  }
  if (!response.ok) throw await responseError(response);
  return response;
}

/** Keep the refresh credential private while binding push to this login. */
export async function setPushDevice(
  device: {
    token: string;
    platform: 'ios' | 'android';
    projectId: string;
  } | null,
) {
  if (
    !native ||
    state.status !== 'signedIn' ||
    state.accessToken?.startsWith('demo-')
  )
    throw new Error('A real native session is required.');
  const own = epoch;
  await refreshIfExpired();
  if (own !== epoch) throw new Error('Session changed. Try again.');
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await apiFetch('/notifications/push/devices', {
      method: device ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      // A 401 replay must bind with the newly rotated refresh credential.
      get body() {
        return JSON.stringify({ ...device, refreshToken });
      },
      signal: controller.signal,
    });
    if (response.status !== 204)
      throw new Error(
        'Device registration was not confirmed. Retry when connected.',
      );
  } finally {
    clearTimeout(timer);
  }
}

export function validateNewPassword(value: string) {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  if (value.length < 12 || bytes > 72)
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Use at least 12 characters and at most 72 UTF-8 bytes.',
    );
}
let changingPassword = false;
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
) {
  if (changingPassword)
    throw new Error('A password change is already in progress.');
  if (state.status !== 'signedIn' || state.accessToken?.startsWith('demo-'))
    throw new Error('Sign in to a real account first.');
  if (!currentPassword || currentPassword.length > 256)
    throw new ApiError(400, 'VALIDATION_ERROR', 'Enter your current password.');
  validateNewPassword(newPassword);
  const own = epoch;
  changingPassword = true;
  try {
    await refreshIfExpired();
    const send = () =>
      authPost('password', {
        currentPassword,
        newPassword,
        ...(native ? { refreshToken } : {}),
      });
    if (own !== epoch) throw new Error('Session changed. Sign in again.');
    try {
      await send();
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || own !== epoch)
        throw error;
      await refreshSession();
      if (own !== epoch)
        throw new Error('Session changed. Sign in again.', { cause: error });
      await send();
    }
    if (own !== epoch) throw new Error('Session changed. Sign in again.');
  } finally {
    changingPassword = false;
  }
}
