import { z } from 'zod';
import type { PushRepository } from './notifications.push.js';
const resultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    id: z.string().min(1).max(256).optional(),
  }),
  z.object({
    status: z.literal('error'),
    details: z.object({ error: z.string() }).optional(),
  }),
]);
const endpoint = 'https://exp.host/--/api/v2/push/';
export function createPushWorker(
  repo: PushRepository,
  accessToken?: string,
  transport: typeof fetch = fetch,
  clock = () => new Date(),
) {
  let running: Promise<void> | undefined;
  async function request(path: string, body: unknown) {
    const response = await transport(endpoint + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Push provider unavailable.');
    return response.json() as Promise<unknown>;
  }
  async function run() {
    const now = clock();
    await repo.prune(now);
    for (const job of await repo.claim(now)) {
      if (now.getTime() - job.createdAt.getTime() >= 24 * 3600_000) {
        await repo.complete(job.id);
        continue;
      }
      const retry = async () => {
        if (
          job.attempts >= 7 ||
          now.getTime() - job.createdAt.getTime() >= 24 * 3600_000
        ) {
          await repo.complete(job.id);
          console.error(
            'Push delivery expired; the in-app notification remains available.',
          );
        } else
          await repo.retry(
            job.id,
            new Date(
              now.getTime() + Math.min(3600_000, 30_000 * 2 ** job.attempts),
            ),
            job.attempts + 1,
            job.ticketId,
          );
      };
      try {
        const device = await repo.activeDevice(
          job.deviceId,
          job.notification.userId,
          job.device.updatedAt,
          clock(),
        );
        if (!device) {
          await retry();
          continue;
        }
        if (job.notification.readAt && !job.ticketId) {
          await repo.complete(job.id);
          continue;
        }
        const response = job.ticketId
          ? z
              .object({ data: z.record(z.string(), resultSchema) })
              .parse(await request('getReceipts', { ids: [job.ticketId] }))
              .data[job.ticketId]
          : z.object({ data: z.array(resultSchema).length(1) }).parse(
              await request('send', [
                {
                  to: device.token,
                  title: 'CampusHR',
                  body: 'You have a new update. Open CampusHR to view it.',
                  sound: 'default',
                  channelId: 'campushr',
                  ttl: 3600,
                  data: {
                    notificationId: job.notificationId,
                    recipientId: job.notification.userId,
                  },
                },
              ]),
            ).data[0];
        if (!response) {
          await retry();
          continue;
        }
        if (response.status === 'error') {
          if (response.details?.error === 'DeviceNotRegistered')
            await repo.removeInvalid(device.id, device.token, device.updatedAt);
          else if (response.details?.error === 'MessageRateExceeded') {
            await retry();
            continue;
          } else
            console.error(
              'Push provider rejected a delivery; check project credentials/configuration.',
            );
          await repo.complete(job.id);
        } else if (job.ticketId) await repo.complete(job.id);
        else if (response.id)
          await repo.retry(
            job.id,
            new Date(now.getTime() + 15 * 60_000),
            0,
            response.id,
          );
        else await retry();
      } catch {
        // Never log provider bodies, device tokens or employee notification content.
        await retry();
      }
    }
  }
  function tick() {
    if (!running)
      running = run()
        .catch(() => {
          console.error(
            'Push worker unavailable; queued deliveries will retry.',
          );
        })
        .finally(() => {
          running = undefined;
        });
    return running;
  }
  return {
    tick,
    start() {
      const timer = setInterval(() => void tick(), 10_000).unref();
      void tick();
      return async () => {
        clearInterval(timer);
        await running;
      };
    },
  };
}
