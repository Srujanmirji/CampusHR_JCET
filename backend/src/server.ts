import 'dotenv/config';
import { createApp } from './app.js';
import { envSchema } from './config/env.js';
import { createPrismaClient } from './database/prisma.js';
import { createPrismaAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createRealtime } from './modules/notifications/notifications.realtime.js';

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
  );
  process.exit(1);
}

const prisma = createPrismaClient(parsed.data.DATABASE_URL);
const authRepository = createPrismaAuthRepository(prisma);
const realtime = createRealtime();
const server = createApp(parsed.data, {
  authRepository,
  prisma,
  realtime,
}).listen(parsed.data.PORT, () => {
  console.log(`CampusHR API listening on port ${parsed.data.PORT}`);
});
const auth = createAuthService(authRepository, parsed.data.JWT_ACCESS_SECRET);
realtime.attach(server, {
  origin: parsed.data.CORS_ORIGIN,
  verify: (token) => auth.verifyAccessToken(token).userId,
});
server.on('error', (error) => {
  console.error('API failed to start:', error.message);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async (error) => {
      clearTimeout(timeout);
      await prisma.$disconnect();
      process.exit(error ? 1 : 0);
    });
  });
}
