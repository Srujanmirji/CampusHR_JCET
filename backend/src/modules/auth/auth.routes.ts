import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createAuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

export function createAuthRouter(
  auth: AuthService,
  options: { secureCookies: boolean; allowedOrigin: string },
) {
  const controller = createAuthController(auth, options);
  return Router()
    .post('/login', controller.login)
    .post('/refresh', controller.refresh)
    .post('/logout', controller.logout)
    .post('/password', requireAuth(auth), controller.changePassword)
    .get('/me', requireAuth(auth), controller.me);
}
