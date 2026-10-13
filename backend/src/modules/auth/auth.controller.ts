import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../../common/http-error.js';
import { createFailureLimiter } from '../../middleware/rate-limit.js';
import { loginSchema } from './auth.schema.js';
import {
  REFRESH_TOKEN_TTL_MS,
  type AuthResult,
  type AuthService,
} from './auth.service.js';

export const REFRESH_COOKIE = 'campushr_refresh';
const LIMIT_WINDOW_MS = 15 * 60 * 1000;

function readCookie(req: Request, name: string) {
  const pair = req
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!pair) return undefined;
  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return undefined; // Malformed encoding: treat as no cookie.
  }
}

const clientMeta = (req: Request) => ({
  userAgent: req.get('user-agent'),
  ip: req.ip,
});

export function createAuthController(
  auth: AuthService,
  {
    secureCookies,
    allowedOrigin,
  }: { secureCookies: boolean; allowedOrigin: string },
) {
  const webOrigin = new URL(allowedOrigin).origin;
  // Web and API are expected on the same site (e.g. subdomains of
  // jcethbl.edu.in), so the refresh cookie can be SameSite=Strict.
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'strict',
    path: '/api/v1/auth',
  };
  const perAccount = createFailureLimiter(5, LIMIT_WINDOW_MS);
  // Campus networks share one public IP, so this cap is generous.
  const perIp = createFailureLimiter(100, LIMIT_WINDOW_MS);

  // Cookie-authenticated routes: SameSite=Strict still lets sibling subdomains
  // send the cookie, so browsers must come from the web app's origin.
  function assertWebOrigin(req: Request) {
    const origin = req.get('origin');
    if (origin && origin !== webOrigin) {
      throw new HttpError(
        403,
        'FORBIDDEN_ORIGIN',
        'Request origin not allowed.',
      );
    }
  }

  function send(
    res: Response,
    { refreshToken, persistent, ...body }: AuthResult,
  ) {
    res
      .cookie(REFRESH_COOKIE, refreshToken, {
        ...cookieOptions,
        // Without maxAge the browser drops the cookie when it closes.
        ...(persistent ? { maxAge: REFRESH_TOKEN_TTL_MS } : {}),
      })
      .set('Cache-Control', 'no-store')
      .json(body);
  }

  const login: RequestHandler = async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Enter your employee ID or email, and your password.',
      );
    }
    const { identifier, password, remember } = parsed.data;
    const ip = req.ip ?? 'unknown';
    const accountKey = `${ip}|${identifier}`;
    if (perAccount.isBlocked(accountKey) || perIp.isBlocked(ip)) {
      res.set('Retry-After', String(LIMIT_WINDOW_MS / 1000));
      throw new HttpError(
        429,
        'TOO_MANY_ATTEMPTS',
        'Too many sign-in attempts. Try again in 15 minutes.',
      );
    }
    // Count before the slow password check so parallel guesses are limited too.
    perAccount.hit(accountKey);
    perIp.hit(ip);
    try {
      const result = await auth.login(
        identifier,
        password,
        clientMeta(req),
        remember,
      );
      perAccount.reset(accountKey);
      perIp.forgive(ip);
      send(res, result);
    } catch (error) {
      if (!(
        error instanceof HttpError && error.code === 'INVALID_CREDENTIALS'
      )) {
        perAccount.forgive(accountKey);
        perIp.forgive(ip);
      }
      throw error;
    }
  };

  const refresh: RequestHandler = async (req, res) => {
    assertWebOrigin(req);
    try {
      send(
        res,
        await auth.refresh(readCookie(req, REFRESH_COOKIE), clientMeta(req)),
      );
    } catch (error) {
      // A concurrent refresh already set a newer cookie; keep it.
      if (!(
        error instanceof HttpError && error.code === 'REFRESH_IN_PROGRESS'
      )) {
        res.clearCookie(REFRESH_COOKIE, cookieOptions);
      }
      throw error;
    }
  };

  const logout: RequestHandler = async (req, res) => {
    assertWebOrigin(req);
    await auth.logout(readCookie(req, REFRESH_COOKIE));
    res.clearCookie(REFRESH_COOKIE, cookieOptions).status(204).end();
  };

  const me: RequestHandler = async (_req, res) => {
    res.json({ user: await auth.me(res.locals.auth.userId) });
  };

  return { login, refresh, logout, me };
}
