// Runs the database tests against TEST_DATABASE_URL, which is wiped first.
//
// The test database must live on a different PostgreSQL server (host:port)
// from DATABASE_URL. A different database name on the same server is not
// enough: `prisma dev` serves a single database whatever name is requested, so
// "campushr_test" there is the development database itself.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error(
    'Set TEST_DATABASE_URL to a disposable PostgreSQL server. Its data is deleted.',
  );
  process.exit(1);
}

const server = (value: string | undefined) => {
  if (!value) return undefined;
  const { hostname, port } = new URL(value);
  const host = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
    ? 'localhost'
    : hostname;
  return `${host}:${port || '5432'}`;
};
if (server(url) === server(process.env.DATABASE_URL)) {
  console.error(
    `TEST_DATABASE_URL is on the same server as DATABASE_URL (${server(url)}). ` +
      'Use a separate PostgreSQL server so development data cannot be wiped.',
  );
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url };
const steps: [string, string[]][] = [
  ['npx', ['prisma', 'migrate', 'reset', '--force']],
  ['node', ['--import', 'tsx', '--test', 'test/db/*.test.ts']],
];
for (const [command, args] of steps) {
  const { status } = spawnSync(command, args, { env, stdio: 'inherit' });
  if (status !== 0) process.exit(status ?? 1);
}
