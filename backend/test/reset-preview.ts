// Disposable localhost-only UI verification. Excluded from Railway uploads.
// Never reads backend/.env and never sends an email.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import bcrypt from 'bcrypt';
import { createPrismaClient } from '../src/database/prisma.js';
import { seedReferenceData } from '../src/database/reference-data.js';
import { createPrismaAuthRepository } from '../src/modules/auth/auth.repository.js';
import { createApp } from '../src/app.js';
import { envSchema } from '../src/config/env.js';
import { deliverResetMail } from '../src/modules/auth/password-reset.service.js';

const db = new PGlite();
await db.waitReady;
const pg = new PGLiteSocketServer({
  db,
  host: '127.0.0.1',
  port: 0,
  maxConnections: 20,
});
await pg.start();
const url = `postgresql://postgres:postgres@${pg.getServerConn()}/postgres?sslmode=disable`;
const backend = fileURLToPath(new URL('../', import.meta.url));
const migration = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL('../../node_modules/prisma/build/index.js', import.meta.url),
    ),
    'migrate',
    'deploy',
  ],
  {
    cwd: backend,
    env: { ...process.env, DATABASE_URL: url, DOTENV_CONFIG_PATH: '/dev/null' },
    stdio: 'inherit',
  },
);
const [code] = await once(migration, 'exit');
if (code !== 0) throw new Error('Disposable migration failed');
const prisma = createPrismaClient(url);
await seedReferenceData(prisma);
const role = await prisma.role.findUniqueOrThrow({
  where: { name: 'Super Admin' },
});
await prisma.user.create({
  data: {
    email: 'recovery-test@jcet.test',
    passwordHash: await bcrypt.hash('test-browser-password-2026', 4),
    roleId: role.id,
  },
});
const env = envSchema.parse({
  NODE_ENV: 'production',
  PORT: 4014,
  DATABASE_URL: url,
  JWT_ACCESS_SECRET: 'test-preview-jwt-secret-at-least-32-characters',
  CORS_ORIGIN: 'http://127.0.0.1:4014',
  PASSWORD_RESET_ENABLED: 'true',
  PASSWORD_RESET_SCRIPT_URL:
    'https://script.google.com/macros/s/test-preview/exec',
  PASSWORD_RESET_SCRIPT_SECRET:
    'test-preview-mail-secret-at-least-32-characters',
});
const server = createApp(env, {
  prisma,
  authRepository: createPrismaAuthRepository(prisma),
}).listen(4014, '127.0.0.1');
await once(server, 'listening');
let busy = false;
const timer = setInterval(() => {
  if (busy) return;
  busy = true;
  void deliverResetMail(prisma, env, async (mail) => {
    await writeFile(
      '/tmp/campushr-reset-preview-mail.json',
      JSON.stringify(mail),
      { mode: 0o600 },
    );
  })
    .catch(() => console.warn('Disposable mail preview failed'))
    .finally(() => {
      busy = false;
    });
}, 250).unref();
console.log(
  'Disposable reset UI preview http://127.0.0.1:4014; fake mail only.',
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, async () => {
    clearInterval(timer);
    server.closeAllConnections();
    server.close();
    await prisma.$disconnect();
    await pg.stop();
    await db.close();
    process.exit(0);
  });
