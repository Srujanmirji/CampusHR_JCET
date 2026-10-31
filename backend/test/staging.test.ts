import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { envSchema } from '../src/config/env.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createMemoryAuthRepository } from './fakes.js';

test('documents can use an explicit durable directory', () => {
  const input = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    CORS_ORIGIN: 'https://staging.example.edu',
  };
  const parsed = envSchema.parse({
    ...input,
    DOCUMENTS_DIR: '/data/documents',
  });
  assert.equal(parsed.DOCUMENTS_DIR, '/data/documents');
  assert.equal(
    envSchema.safeParse({ ...input, DOCUMENTS_DIR: './temporary' }).success,
    false,
  );
});

test('readiness checks the database and returns no database error details', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'campushr-staging-'));
  let mode = 'ready';
  const prisma = {
    async $queryRaw() {
      if (mode === 'down')
        throw new Error('sensitive database connection details');
      if (mode === 'hung') return new Promise(() => {});
      return [{ ok: 1 }];
    },
  } as unknown as PrismaClient;
  const env = envSchema.parse({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    CORS_ORIGIN: 'http://localhost:5173',
    DOCUMENTS_DIR: join(directory, 'private-documents'),
  });
  const server = createApp(env, {
    prisma,
    authRepository: createMemoryAuthRepository().repo,
  }).listen(0, '127.0.0.1');
  try {
    assert.ok(
      existsSync(env.DOCUMENTS_DIR!),
      'App wiring creates the configured document directory',
    );
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const url = `http://127.0.0.1:${address.port}/api/v1`;
    const ready = await fetch(`${url}/ready`);
    assert.equal(ready.status, 200);
    assert.equal(ready.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await ready.json(), {
      status: 'ready',
      service: 'campushr-api',
    });
    mode = 'down';
    const unavailable = await fetch(`${url}/ready`);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), {
      status: 'unavailable',
      service: 'campushr-api',
    });
    assert.equal((await fetch(`${url}/health`)).status, 200);
    mode = 'hung';
    assert.equal(
      (await fetch(`${url}/ready`)).status,
      503,
      'A hung database cannot hang the readiness response',
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
