import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { HttpError } from '../../common/http-error.js';
import type { AuthRepository, AuthUser } from './auth.repository.js';
import { widestScope, type Scope } from './permissions.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Two tabs or a network retry can refresh with the same token at once.
const REUSE_GRACE_MS = 10_000;
const JWT_OPTIONS = { issuer: 'campushr-api', audience: 'campushr' } as const;

export const BCRYPT_COST = 12;
// Compared against when the email is unknown, so response time does not reveal
// which emails have accounts.
let timingGuardHash: Promise<string> | undefined;

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  employeeId: string | null;
  departmentId: number | null;
}

/** Who is acting and how far their permission reaches. */
export interface Access {
  scope: Scope;
  userId: string;
  employeeId: string | null;
  departmentId: number | null;
}

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  /** Whether the refresh cookie should outlive the browser session. */
  persistent: boolean;
  user: PublicUser;
}

export interface AccessClaims {
  userId: string;
  role: string;
}

const invalidCredentials = () =>
  new HttpError(
    401,
    'INVALID_CREDENTIALS',
    'Incorrect employee ID, email or password.',
  );
const invalidSession = () =>
  new HttpError(
    401,
    'SESSION_EXPIRED',
    'Your session has ended. Sign in again.',
  );

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const toPublic = ({
  id,
  email,
  role,
  permissions,
  employeeId,
  departmentId,
}: AuthUser): PublicUser => ({
  id,
  email,
  role,
  permissions,
  employeeId,
  departmentId,
});

export function createAuthService(
  repo: AuthRepository,
  accessSecret: string,
  now: () => Date = () => new Date(),
) {
  async function issue(
    user: AuthUser,
    meta: ClientMeta,
    persistent: boolean,
  ): Promise<AuthResult> {
    const refreshToken = randomBytes(32).toString('base64url');
    await repo.createSession({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(now().getTime() + REFRESH_TOKEN_TTL_MS),
      persistent,
      userAgent: meta.userAgent?.slice(0, 512),
      ip: meta.ip,
    });
    const accessToken = jwt.sign({ role: user.role }, accessSecret, {
      ...JWT_OPTIONS,
      subject: user.id,
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
      persistent,
      user: toPublic(user),
    };
  }

  return {
    async login(
      identifier: string,
      password: string,
      meta: ClientMeta,
      remember = false,
    ) {
      const user = await repo.findUserByIdentifier(identifier);
      timingGuardHash ??= bcrypt.hash('campushr-timing-guard', BCRYPT_COST);
      const matches = await bcrypt.compare(
        password,
        user?.passwordHash ?? (await timingGuardHash),
      );
      // Deactivated accounts get the same answer as wrong passwords.
      if (!user || !matches || user.status !== 'ACTIVE') {
        throw invalidCredentials();
      }
      await repo.recordLogin(user.id, now());
      return issue(user, meta, remember);
    },

    async refresh(refreshToken: string | undefined, meta: ClientMeta) {
      if (!refreshToken) throw invalidSession();
      const session = await repo.findSessionByHash(hashToken(refreshToken));
      // Logged-out and theft-revoked sessions are expired, so they stop here.
      if (!session || session.expiresAt <= now()) throw invalidSession();
      if (!(await repo.revokeSession(session.id, now()))) {
        // Already rotated. Within a few seconds this is a duplicate request
        // (two tabs, a retry); later it means the old token was stolen.
        const revokedAt = session.revokedAt?.getTime() ?? now().getTime();
        if (now().getTime() - revokedAt < REUSE_GRACE_MS) {
          throw new HttpError(
            409,
            'REFRESH_IN_PROGRESS',
            'Session is being refreshed. Retry the request.',
          );
        }
        await repo.revokeAllSessions(session.userId, now());
        throw invalidSession();
      }
      const user = await repo.findUserById(session.userId);
      if (!user || user.status !== 'ACTIVE') throw invalidSession();
      return issue(user, meta, session.persistent);
    },

    async logout(refreshToken: string | undefined) {
      if (!refreshToken) return;
      const session = await repo.findSessionByHash(hashToken(refreshToken));
      if (session) await repo.endSession(session.id, now());
    },

    /**
     * Checks `permission` (`resource.action`) against the database, so a
     * deactivated user or a changed role takes effect immediately.
     * Returns the widest granted scope and the user's employee context.
     */
    async authorize(userId: string, permission: string): Promise<Access> {
      const user = await repo.findUserById(userId);
      if (!user || user.status !== 'ACTIVE') throw invalidSession();
      const scope = widestScope(user.permissions, permission);
      if (!scope) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'You don’t have permission to do this.',
        );
      }
      return {
        scope,
        userId,
        employeeId: user.employeeId,
        departmentId: user.departmentId,
      };
    },

    /**
     * Changes the user's own password after checking the current one, and
     * signs out every other session; `refreshToken` (this browser) stays.
     */
    async changePassword(
      userId: string,
      currentPassword: string,
      newPassword: string,
      refreshToken: string | undefined,
    ) {
      const user = await repo.findUserById(userId);
      const hash = await repo.findPasswordHash(userId);
      if (!user || user.status !== 'ACTIVE' || !hash) throw invalidSession();
      if (!(await bcrypt.compare(currentPassword, hash))) {
        throw new HttpError(
          400,
          'WRONG_PASSWORD',
          'Your current password is not right.',
        );
      }
      if (currentPassword === newPassword) {
        throw new HttpError(
          400,
          'SAME_PASSWORD',
          'Choose a password different from your current one.',
        );
      }
      const session = refreshToken
        ? await repo.findSessionByHash(hashToken(refreshToken))
        : null;
      await repo.changePassword(
        userId,
        await bcrypt.hash(newPassword, BCRYPT_COST),
        session?.userId === userId ? session.id : null,
        now(),
      );
    },

    async me(userId: string) {
      const user = await repo.findUserById(userId);
      if (!user || user.status !== 'ACTIVE') throw invalidSession();
      return toPublic(user);
    },

    verifyAccessToken(token: string): AccessClaims {
      try {
        const claims = jwt.verify(token, accessSecret, {
          ...JWT_OPTIONS,
          algorithms: ['HS256'],
        });
        if (
          typeof claims === 'string' ||
          typeof claims.sub !== 'string' ||
          typeof claims.role !== 'string'
        ) {
          throw new Error('Malformed claims');
        }
        return { userId: claims.sub, role: claims.role };
      } catch {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
