import { isAbsolute, relative, sep } from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

/** Validate names and configuration only; never print credentials or contact a DB. */
export function stagingProblems(env) {
  const problems = [];
  for (const [key, expected] of Object.entries({
    APP_ENV: 'staging',
    RAILWAY_ENVIRONMENT_NAME: 'staging',
    NODE_ENV: 'production',
    VITE_API_URL: '/api/v1',
  }))
    if (env[key] !== expected) problems.push(`${key} must be ${expected}`);
  if (!env.JWT_ACCESS_SECRET || env.JWT_ACCESS_SECRET.length < 32)
    problems.push('JWT_ACCESS_SECRET must contain at least 32 characters');
  try {
    const origin = new URL(env.CORS_ORIGIN);
    if (
      origin.protocol !== 'https:' ||
      origin.origin !== env.CORS_ORIGIN ||
      /(?:localhost|127\.0\.0\.1|\.internal)$/.test(origin.hostname)
    )
      throw new Error();
  } catch {
    problems.push(
      'CORS_ORIGIN must be the staging HTTPS origin without a trailing slash',
    );
  }
  try {
    const database = new URL(env.DATABASE_URL);
    if (
      !['postgres:', 'postgresql:'].includes(database.protocol) ||
      ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)
    )
      throw new Error();
    if (
      !env.STAGING_DATABASE_HOST ||
      database.hostname !== env.STAGING_DATABASE_HOST ||
      !env.STAGING_DATABASE_PORT ||
      (database.port || '5432') !== env.STAGING_DATABASE_PORT ||
      !env.STAGING_DATABASE_NAME ||
      decodeURIComponent(database.pathname.slice(1)) !==
        env.STAGING_DATABASE_NAME
    )
      problems.push(
        'DATABASE_URL must match the separately verified STAGING_DATABASE_HOST, STAGING_DATABASE_PORT and STAGING_DATABASE_NAME',
      );
    if (
      [...database.searchParams.keys()].some(
        (key) => !['schema', 'sslmode'].includes(key),
      )
    )
      problems.push(
        'DATABASE_URL query may contain only schema and sslmode; target overrides are forbidden',
      );
  } catch {
    problems.push(
      'DATABASE_URL must reference the dedicated hosted staging PostgreSQL',
    );
  }
  const mount = env.RAILWAY_VOLUME_MOUNT_PATH;
  const documents = env.DOCUMENTS_DIR;
  if (!mount || !documents || !isAbsolute(mount) || !isAbsolute(documents)) {
    problems.push(
      'DOCUMENTS_DIR and RAILWAY_VOLUME_MOUNT_PATH must be absolute mounted paths',
    );
  } else {
    const child = relative(mount, documents);
    if (
      !child ||
      child === '..' ||
      child.startsWith(`..${sep}`) ||
      isAbsolute(child)
    )
      problems.push(
        'DOCUMENTS_DIR must be a subdirectory of the private Railway volume',
      );
  }
  return problems;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const problems = stagingProblems(process.env);
  if (problems.length) {
    console.error(
      'Staging startup refused:\n' + problems.map((p) => `- ${p}`).join('\n'),
    );
    process.exitCode = 1;
  } else
    console.log(
      'Staging configuration validated; credentials were not printed.',
    );
}
