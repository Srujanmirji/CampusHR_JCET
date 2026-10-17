// Central API client: base URL, credentials, access token, refresh handling
// and error normalization (frontend/STATE_AND_API.md).
const baseUrl: string | undefined = import.meta.env.VITE_API_URL;
if (!baseUrl) {
  throw new Error(
    'VITE_API_URL is not set. Copy frontend/.env.example to .env.',
  );
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// The access token lives in memory only, never in browser storage.
let accessToken: string | undefined;
// Renews the token from the refresh cookie; resolves false if signed out.
let renewSession: (() => Promise<boolean>) | undefined;

/** The current access token, e.g. to authenticate the notification socket. */
export const getAccessToken = () => accessToken;

export function setAccessToken(token: string | undefined) {
  accessToken = token;
}
export function onSessionExpired(renew: () => Promise<boolean>) {
  renewSession = renew;
}

async function send(
  path: string,
  method: string,
  body: unknown,
): Promise<Response> {
  try {
    return await fetch(`${baseUrl}${path}`, {
      method,
      // Sends the HttpOnly refresh cookie on /auth routes.
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Can’t reach the CampusHR server. Check your connection and try again.',
    );
  }
}

// These manage the session itself, so they never trigger a renewal.
const SESSION_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export async function apiRequest(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  let response = await send(path, method, body);
  // An expired access token: renew once from the refresh cookie and retry.
  if (
    response.status === 401 &&
    accessToken &&
    !SESSION_PATHS.includes(path) &&
    (await renewSession?.())
  ) {
    response = await send(path, method, body);
  }
  if (response.status === 204) return undefined;
  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (data as { error?: { code?: unknown; message?: unknown } })
      ?.error;
    throw new ApiError(
      response.status,
      typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR',
      typeof error?.message === 'string'
        ? error.message
        : 'Something went wrong. Try again.',
    );
  }
  return data;
}
