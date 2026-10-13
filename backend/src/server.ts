import 'dotenv/config';
import { createApp } from './app.js';
import { envSchema } from './config/env.js';
import { createPrismaClient } from './database/prisma.js';
import { createPrismaAuthRepository } from './modules/auth/auth.repository.js';

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
  );
  process.exit(1);
}

const prisma = createPrismaClient(parsed.data.DATABASE_URL);
const server = createApp(parsed.data, {
  authRepository: createPrismaAuthRepository(prisma),
  prisma,
}).listen(parsed.data.PORT, () => {
  console.log(`CampusHR API listening on port ${parsed.data.PORT}`);
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
