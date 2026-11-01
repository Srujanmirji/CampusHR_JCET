import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { Env } from '../../config/env.js';
import { HttpError } from '../../common/http-error.js';
import { writeAudit } from '../../common/audit.js';
import { BCRYPT_COST } from './auth.service.js';
import {
  openResetMail,
  sealResetMail,
  otpDigest,
  passwordStamp,
  resetKey,
  type ResetMail,
} from './password-reset.crypto.js';
import { sendResetMail } from './password-reset.mail.js';

const TTL = 600000;
const HOUR = 3600000;
const invalid = () =>
  new HttpError(
    400,
    'INVALID_RESET_CODE',
    'This code is invalid, expired or already used. Request a new code.',
  );
export interface ResetSettings {
  PASSWORD_RESET_ENABLED: boolean;
  PASSWORD_RESET_SCRIPT_URL?: string;
  PASSWORD_RESET_SCRIPT_SECRET?: string;
  PASSWORD_RESET_DAILY_LIMIT: number;
}
async function reserve(
  tx: Prisma.TransactionClient,
  buckets: { key: string; max: number; window: number; cooldown: number }[],
  now: Date,
) {
  for (const bucket of buckets.sort((a, b) => a.key.localeCompare(b.key))) {
    await tx.passwordResetThrottle.upsert({
      where: { key: bucket.key },
      create: { key: bucket.key, startedAt: now, lastAttempt: new Date(0) },
      update: {},
    });
    await tx.passwordResetThrottle.updateMany({
      where: {
        key: bucket.key,
        startedAt: { lte: new Date(+now - bucket.window) },
      },
      data: { startedAt: now, lastAttempt: new Date(0), count: 0 },
    });
    const { count } = await tx.passwordResetThrottle.updateMany({
      where: {
        key: bucket.key,
        count: { lt: bucket.max },
        lastAttempt: { lte: new Date(+now - bucket.cooldown) },
      },
      data: { count: { increment: 1 }, lastAttempt: now },
    });
    if (!count)
      throw new HttpError(
        429,
        'RESET_RATE_LIMIT',
        'Please wait before trying again. Email codes can be requested once a minute and five times an hour.',
      );
  }
}
export function createPasswordResetService(
  prisma: PrismaClient,
  env: ResetSettings,
  disconnect?: (id: string) => void,
) {
  const enabled = !!(
    env.PASSWORD_RESET_ENABLED &&
    env.PASSWORD_RESET_SCRIPT_URL &&
    env.PASSWORD_RESET_SCRIPT_SECRET
  );
  const secret = env.PASSWORD_RESET_SCRIPT_SECRET || '';
  const requireEnabled = () => {
    if (!enabled)
      throw new HttpError(
        503,
        'RESET_UNAVAILABLE',
        'Email password reset is temporarily unavailable. Contact the college office.',
      );
  };
  return {
    enabled,
    async request(email: string, ip: string) {
      requireEnabled();
      const now = new Date(),
        id = randomUUID(),
        otp = randomInt(1000000).toString().padStart(6, '0');
      const accountKey = resetKey('account', email, secret);
      await prisma.$transaction(async (tx) => {
        await reserve(
          tx,
          [
            {
              key: 'account:' + accountKey,
              max: 5,
              window: HOUR,
              cooldown: 60000,
            },
            {
              key: 'request-ip:' + resetKey('ip', ip, secret),
              max: 30,
              window: HOUR,
              cooldown: 0,
            },
            {
              key: 'global-request',
              max: env.PASSWORD_RESET_DAILY_LIMIT,
              window: 24 * HOUR,
              cooldown: 0,
            },
          ],
          now,
        );
        const user = await tx.user.findUnique({
          where: { email },
          select: { id: true, email: true, status: true, passwordHash: true },
        });
        const active = user?.status === 'ACTIVE' ? user : null;
        const mail: ResetMail = {
          action: 'password-reset',
          requestId: id,
          to: email,
          otp,
          issuedAt: +now,
          expiresAt: +now + TTL,
        };
        const encrypted = sealResetMail(mail, secret);
        await tx.passwordResetChallenge.updateMany({
          where: { accountKey, consumedAt: null },
          data: { consumedAt: now, encryptedMail: null },
        });
        await tx.passwordResetChallenge.create({
          data: {
            id,
            accountKey,
            userId: active?.id,
            otpHash: otpDigest(id, otp, secret),
            passwordStamp: active ? passwordStamp(active.passwordHash) : null,
            expiresAt: new Date(+now + TTL),
            encryptedMail: active ? encrypted : null,
          },
        });
      });
      return {
        challengeId: id,
        expiresIn: 600,
        resendAfter: 60,
        message:
          'If an active account uses this email, a six-digit code will arrive shortly. Check your inbox and spam folder.',
      };
    },
    async confirm(id: string, code: string, newPassword: string, ip: string) {
      requireEnabled();
      const now = new Date();
      await prisma.$transaction((tx) =>
        reserve(
          tx,
          [
            {
              key: 'verify-ip:' + resetKey('ip', ip, secret),
              max: 50,
              window: HOUR,
              cooldown: 0,
            },
          ],
          now,
        ),
      );
      const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
      const changed = await prisma.$transaction(async (tx) => {
        // Conditional update locks this challenge; wrong attempts commit, while
        // concurrent valid submissions cannot both consume the same code.
        const attempt = await tx.passwordResetChallenge.updateMany({
          where: {
            id,
            consumedAt: null,
            expiresAt: { gt: now },
            attempts: { lt: 5 },
          },
          data: { attempts: { increment: 1 } },
        });
        if (!attempt.count) return null;
        const row = await tx.passwordResetChallenge.findUniqueOrThrow({
          where: { id },
          include: { user: true },
        });
        if (
          row.otpHash !== otpDigest(id, code, secret) ||
          !row.user ||
          row.user.status !== 'ACTIVE' ||
          row.passwordStamp !== passwordStamp(row.user.passwordHash)
        )
          return null;
        const updated = await tx.user.updateMany({
          where: {
            id: row.user.id,
            passwordHash: row.user.passwordHash,
            status: 'ACTIVE',
          },
          data: { passwordHash: hash, authVersion: { increment: 1 } },
        });
        if (!updated.count) return null;
        await tx.passwordResetChallenge.update({
          where: { id },
          data: { consumedAt: now, encryptedMail: null },
        });
        await tx.refreshSession.updateMany({
          where: { userId: row.user.id },
          data: { expiresAt: now, revokedAt: now },
        });
        await tx.pushDevice.deleteMany({ where: { userId: row.user.id } });
        await writeAudit(tx, {
          actorUserId: row.user.id,
          action: 'user.password_reset',
          resource: 'user',
          resourceId: row.user.id,
          after: { passwordReset: true },
        });
        return row.user.id;
      });
      if (!changed) throw invalid();
      disconnect?.(changed);
      return {
        passwordUpdated: true,
        message: 'Password updated. Sign in with your new password.',
      };
    },
  };
}

/** One bounded durable-outbox tick, also used with a fake sender in DB tests. */
export async function deliverResetMail(
  prisma: PrismaClient,
  env: ResetSettings,
  sender: (mail: ResetMail) => Promise<void> = (mail) =>
    sendResetMail(
      env.PASSWORD_RESET_SCRIPT_URL!,
      env.PASSWORD_RESET_SCRIPT_SECRET!,
      mail,
    ),
) {
  if (
    !env.PASSWORD_RESET_ENABLED ||
    !env.PASSWORD_RESET_SCRIPT_SECRET ||
    !env.PASSWORD_RESET_SCRIPT_URL
  )
    return false;
  const now = new Date();
  const due = {
    consumedAt: null,
    encryptedMail: { not: null },
    userId: { not: null },
    user: { status: 'ACTIVE' as const },
    expiresAt: { gt: now },
    deliveryAttempts: { lt: 3 },
    nextDeliveryAt: { lte: now },
    OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
  };
  const row = await prisma.passwordResetChallenge.findFirst({
    where: due,
    orderBy: { createdAt: 'asc' },
  });
  if (!row) return false;
  const lease = new Date(+now + 70000);
  const claimed = await prisma.passwordResetChallenge.updateMany({
    where: { ...due, id: row.id },
    data: { leaseUntil: lease, deliveryAttempts: { increment: 1 } },
  });
  if (!claimed.count) return false;
  try {
    const mail = openResetMail(
      row.encryptedMail!,
      env.PASSWORD_RESET_SCRIPT_SECRET,
    );
    if (Date.now() - mail.issuedAt > 120000) throw new Error('Stale mail');
    await sender(mail);
    await prisma.passwordResetChallenge.updateMany({
      where: { id: row.id, leaseUntil: lease },
      data: { encryptedMail: null, deliveredAt: new Date(), leaseUntil: null },
    });
  } catch {
    const exhausted =
      row.deliveryAttempts >= 2 || +now - +row.createdAt > 90000;
    await prisma.passwordResetChallenge.updateMany({
      where: { id: row.id, leaseUntil: lease },
      data: {
        leaseUntil: null,
        nextDeliveryAt: new Date(
          Date.now() + 15000 * (row.deliveryAttempts + 1),
        ),
        ...(exhausted ? { encryptedMail: null } : {}),
      },
    });
    console.warn(
      'Password-reset mail delivery was not confirmed. Check relay configuration and quota.',
    );
  }
  return true;
}
export function startResetDelivery(prisma: PrismaClient, env: Env) {
  if (!env.PASSWORD_RESET_ENABLED) return async () => {};
  let busy = false,
    stopping = false;
  let pending: Promise<void> = Promise.resolve();
  const run = () => {
    if (busy || stopping) return;
    busy = true;
    pending = (async () => {
      try {
        for (let i = 0; i < 3; i++) {
          if (!(await deliverResetMail(prisma, env))) break;
        }
        const cutoff = new Date(Date.now() - 2 * 24 * HOUR);
        await prisma.passwordResetChallenge.deleteMany({
          where: { expiresAt: { lt: cutoff } },
        });
        await prisma.passwordResetThrottle.deleteMany({
          where: { lastAttempt: { lt: cutoff } },
        });
      } catch {
        console.warn('Password-reset delivery worker unavailable.');
      } finally {
        busy = false;
      }
    })();
  };
  const timer = setInterval(run, 5000).unref();
  run();
  return async () => {
    stopping = true;
    clearInterval(timer);
    await pending;
  };
}
