// Persistent local demo, never the configured development/production database.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createApp } from '../../src/app.js';
import { envSchema } from '../../src/config/env.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createRealtime } from '../../src/modules/notifications/notifications.realtime.js';
import { seedDemo } from './seed.js';
import { initializeDemo } from './initialize.js';

const backend = fileURLToPath(new URL('../../', import.meta.url));
const directory = join(backend, '.demo');
await mkdir(directory, { recursive: true, mode: 0o700 });
const secretFile = join(directory, 'jwt-secret');
try {
  await writeFile(secretFile, randomBytes(32).toString('hex'), {
    flag: 'wx',
    mode: 0o600,
  });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
}
const secret = await readFile(secretFile, 'utf8');
const db = new PGlite(join(directory, 'pgdata'));
await db.waitReady;
const pg = new PGLiteSocketServer({
  db,
  host: '127.0.0.1',
  port: 54329,
  maxConnections: 20,
});
await pg.start();
const url = `postgresql://postgres:postgres@${pg.getServerConn()}/postgres?sslmode=disable`;
const migration = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL('../../../node_modules/prisma/build/index.js', import.meta.url),
    ),
    'migrate',
    'deploy',
  ],
  {
    cwd: backend,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  },
);
const [status] = await once(migration, 'exit');
if (status !== 0) {
  await pg.stop();
  await db.close();
  throw new Error('Local demo migrations failed.');
}
const prisma = createPrismaClient(url);
const people = await initializeDemo(directory, () => seedDemo(prisma));
const env = envSchema.parse({
  NODE_ENV: 'development',
  PORT: 4012,
  DATABASE_URL: url,
  JWT_ACCESS_SECRET: secret,
  CORS_ORIGIN: 'http://127.0.0.1:4012',
  PUSH_ENABLED: 'false',
});
const authRepository = createPrismaAuthRepository(prisma);
const auth = createAuthService(authRepository, secret);
const realtime = createRealtime();
const app = express();
app.get('/__demo', (_req, res) =>
  res.json({ kind: 'campushr-persistent-local-demo', accounts: people }),
);
// Serve the optional same-origin HR web build without production cookie settings.
const web = fileURLToPath(new URL('../../../frontend/dist/', import.meta.url));
if (existsSync(join(web, 'index.html'))) {
  app.use(express.static(web, { index: false }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/'))
      return res.sendFile(join(web, 'index.html'));
    next();
  });
}
app.use(createApp(env, { authRepository, prisma, realtime }));
const server = app.listen(4012, '127.0.0.1');
await once(server, 'listening');
const io = realtime.attach(server, {
  origin: env.CORS_ORIGIN,
  verify: (token) => auth.verifyAccessToken(token).userId,
});
console.log(
  'Persistent CampusHR demo: http://127.0.0.1:4012; database backend/.demo/pgdata; local accounts only.',
);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, async () => {
    if (stopping) return;
    stopping = true;
    await io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
    await pg.stop();
    await db.close();
    process.exit(0);
  });
