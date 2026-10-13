import type { RequestHandler } from 'express';
import { HttpError } from '../common/http-error.js';
import type { AuthService } from '../modules/auth/auth.service.js';

// Verifies the Bearer access token and exposes its claims as res.locals.auth.
export function requireAuth(auth: AuthService): RequestHandler {
  return (req, res, next) => {
    const [scheme, token] = req.get('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    }
    res.locals.auth = auth.verifyAccessToken(token);
    next();
  };
}

// Requires `permission` (`resource.action`, e.g. 'leave.approve') and exposes
// the widest granted scope as res.locals.scope ('all' | 'department' | 'own').
// Handlers must still limit records to that scope.
export function requirePermission(
  auth: AuthService,
  permission: string,
): RequestHandler[] {
  return [
    requireAuth(auth),
    async (_req, res, next) => {
      res.locals.scope = await auth.authorize(
        res.locals.auth.userId,
        permission,
      );
      next();
    },
  ];
}
