import { Router } from 'express';
import { HttpError } from '../../common/http-error.js';
import { requireAuth } from '../../middleware/auth.js';
import { createAuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

export function createAuthRouter(
  auth: AuthService,
  options: { secureCookies: boolean; allowedOrigin: string },
) {
  const controller = createAuthController(auth, options);
  return Router()
    .use('/native', (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      // Reject ambient browser credentials; absence of Origin is not device attestation.
      if (
        req.headers.origin !== undefined ||
        req.headers.cookie !== undefined
      ) {
        throw new HttpError(
          403,
          'NATIVE_CLIENT_REQUIRED',
          'Native authentication does not accept browser origins or cookies.',
        );
      }
      next();
    })
    .post('/native/login', controller.native.login)
    .post('/native/refresh', controller.native.refresh)
    .post('/native/logout', controller.native.logout)
    .post(
      '/native/password',
      requireAuth(auth),
      controller.native.changePassword,
    )
    .post('/login', controller.login)
    .post('/refresh', controller.refresh)
    .post('/logout', controller.logout)
    .post('/password', requireAuth(auth), controller.changePassword)
    .get('/me', requireAuth(auth), controller.me);
}
