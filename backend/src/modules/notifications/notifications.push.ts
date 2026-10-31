import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { parse } from '../../common/validate.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import type { AuthService } from '../auth/auth.service.js';

export const pushTokenSchema = z
  .string()
  .max(256)
  .regex(/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$/);
const deviceSchema = z
  .object({
    token: pushTokenSchema,
    platform: z.enum(['ios', 'android']),
    projectId: z.uuid(),
    refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export function createPushRepository(prisma: PrismaClient, projectId?: string) {
  return {
    async register(userId: string, input: z.infer<typeof deviceSchema>) {
      await prisma.$transaction(
        async (tx) => {
          const session = await tx.refreshSession.findFirst({
            where: {
              tokenHash: createHash('sha256')
                .update(input.refreshToken)
                .digest('hex'),
              userId,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
          });
          if (!session)
            throw new HttpError(
              401,
              'SESSION_EXPIRED',
              'Sign in again to enable device notifications.',
            );
          const existing = await tx.pushDevice.findUnique({
            where: { token: input.token },
          });
          if (
            !existing &&
            (await tx.pushDevice.count({ where: { userId } })) >= 10
          )
            throw new HttpError(
              409,
              'DEVICE_LIMIT',
              'Too many registered devices. Sign out an unused device first.',
            );
          // A rotated token replaces the previous token for this login.
          await tx.pushDevice.deleteMany({
            where: { sessionId: session.id, token: { not: input.token } },
          });
          if (
            existing &&
            (existing.userId !== userId ||
              existing.sessionId !== session.id ||
              existing.projectId !== input.projectId)
          )
            await tx.pushDelivery.deleteMany({
              where: { deviceId: existing.id },
            });
          await tx.pushDevice.upsert({
            where: { token: input.token },
            create: {
              token: input.token,
              platform: input.platform,
              projectId: input.projectId,
              userId,
              sessionId: session.id,
            },
            update: {
              platform: input.platform,
              projectId: input.projectId,
              userId,
              sessionId: session.id,
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
    },
    async remove(userId: string, refreshToken: string) {
      await prisma.pushDevice.deleteMany({
        where: {
          userId,
          session: {
            userId,
            tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
          },
        },
      });
    },
    async claim(now: Date) {
      return prisma.$transaction(async (tx) => {
        const ids = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM push_deliveries WHERE next_attempt_at <= ${now} ORDER BY next_attempt_at LIMIT 10 FOR UPDATE SKIP LOCKED`;
        if (!ids.length) return [];
        const where = { id: { in: ids.map((row) => row.id) } };
        await tx.pushDelivery.updateMany({
          where,
          data: { nextAttemptAt: new Date(now.getTime() + 120_000) },
        });
        return tx.pushDelivery.findMany({
          where,
          include: { device: true, notification: true },
        });
      });
    },
    activeDevice(id: string, userId: string, updatedAt: Date, now: Date) {
      return prisma.pushDevice.findFirst({
        where: {
          id,
          userId,
          updatedAt,
          ...(projectId ? { projectId } : {}),
          session: { revokedAt: null, expiresAt: { gt: now } },
          user: {
            status: 'ACTIVE',
            role: {
              permissions: {
                some: {
                  permission: {
                    key: {
                      in: [
                        'notification.read.own',
                        'notification.read.department',
                        'notification.read.all',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      });
    },
    async prune(now: Date) {
      await prisma.pushDevice.deleteMany({
        where: {
          OR: [
            { session: { expiresAt: { lte: now } } },
            {
              session: { revokedAt: { lt: new Date(now.getTime() - 30_000) } },
            },
            { user: { status: 'INACTIVE' } },
          ],
        },
      });
    },
    async removeInvalid(deviceId: string, token: string, updatedAt: Date) {
      await prisma.pushDevice.deleteMany({
        where: { id: deviceId, token, updatedAt },
      });
    },
    async complete(id: string) {
      await prisma.pushDelivery.deleteMany({ where: { id } });
    },
    async retry(
      id: string,
      nextAttemptAt: Date,
      attempts: number,
      ticketId: string | null,
    ) {
      await prisma.pushDelivery.updateMany({
        where: { id },
        data: { nextAttemptAt, attempts, ticketId },
      });
    },
  };
}
export type PushRepository = ReturnType<typeof createPushRepository>;

export function createPushRouter(
  auth: AuthService,
  repo: PushRepository,
  config: { enabled: boolean; projectId?: string },
) {
  const reader = requirePermission(auth, 'notification.read');
  async function write(run: () => Promise<void>) {
    try {
      await run();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      // ORM failures can include the token in their invocation; never log them.
      throw new HttpError(
        503,
        'PUSH_UNAVAILABLE',
        'Device settings could not be confirmed. Retry when connected.',
      );
    }
  }
  return Router()
    .get('/', ...reader, (_req, res) =>
      res.json({
        data: { enabled: config.enabled, projectId: config.projectId ?? null },
      }),
    )
    .post('/devices', ...reader, async (req, res) => {
      if (!config.enabled)
        throw new HttpError(
          503,
          'PUSH_UNAVAILABLE',
          'Remote notifications are not configured on this server.',
        );
      const input = parse(deviceSchema, req.body);
      if (input.projectId !== config.projectId)
        throw new HttpError(
          400,
          'PROJECT_MISMATCH',
          'This app and server use different push projects.',
        );
      await write(() => repo.register(res.locals.access.userId, input));
      res.status(204).end();
    })
    .delete('/devices', requireAuth(auth), async (req, res) => {
      const input = parse(
        z
          .object({ refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
          .strict(),
        req.body,
      );
      await write(() =>
        repo.remove(res.locals.auth.userId, input.refreshToken),
      );
      res.status(204).end();
    });
}
