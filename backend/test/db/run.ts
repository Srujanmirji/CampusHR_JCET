// Runs the database tests against a real PostgreSQL.
//
// By default it starts a throwaway in-memory PostgreSQL (PGlite) on a free
// port, applies the migrations, runs the tests and discards it. Nothing on
// disk is touched, so development data is never at risk.
//
// To use your own server instead, set TEST_DATABASE_URL. That database is
// wiped first, so it must be on a different server (host:port) from
// DATABASE_URL: `prisma dev` serves one database whatever name is requested.
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const external = process.env.TEST_DATABASE_URL;

const server = (value: string | undefined) => {
  if (!value) return undefined;
  const { hostname, port } = new URL(value);
  const host = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
    ? 'localhost'
    : hostname;
  return `${host}:${port || '5432'}`;
};
if (external && server(external) === server(process.env.DATABASE_URL)) {
  console.error(
    `TEST_DATABASE_URL is on the same server as DATABASE_URL (${server(external)}). ` +
      'Use a separate PostgreSQL server, or unset it to use an in-memory one.',
  );
  process.exit(1);
}

// Asynchronous on purpose: the in-memory server runs in this process and must
// keep answering while the commands run.
async function run(url: string, first: [string, string[]]) {
  const env = { ...process.env, DATABASE_URL: url };
  for (const [command, args] of [
    first,
    [
      'node',
      [
        '--import',
        'tsx',
        '--test',
        // One file at a time: they share one database.
        '--test-concurrency=1',
        'test/db/*.test.ts',
      ],
    ] as const,
  ]) {
    const child = spawn(command, args, { env, stdio: 'inherit' });
    const [status] = (await once(child, 'exit')) as [number | null];
    if (status !== 0) return status ?? 1;
  }
  return 0;
}

if (external) {
  process.exit(
    await run(external, ['npx', ['prisma', 'migrate', 'reset', '--force']]),
  );
}

const db = await PGlite.create();
const pg = new PGLiteSocketServer({
  db,
  host: '127.0.0.1',
  port: 0,
  // Prisma opens a small pool of connections.
  maxConnections: 20,
});
await pg.start();
const url = `postgresql://postgres:postgres@${pg.getServerConn()}/postgres?sslmode=disable`;
console.log(`In-memory PostgreSQL at ${pg.getServerConn()}`);
try {
  // A brand-new database, so applying migrations is all the setup needed.
  process.exitCode = await run(url, ['npx', ['prisma', 'migrate', 'deploy']]);
} finally {
  await pg.stop();
  await db.close();
}
