// Central API client: base URL, credentials and error normalization
// (frontend/STATE_AND_API.md).
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

export async function apiRequest(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      // Sends the HttpOnly refresh cookie on /auth routes.
      credentials: 'include',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Can’t reach the CampusHR server. Check your connection and try again.',
    );
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
