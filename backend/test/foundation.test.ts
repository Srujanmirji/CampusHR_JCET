import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { envSchema } from '../src/config/env.js';
import { createMemoryAuthRepository, unusedPrisma } from './fakes.js';

test('foundation validates configuration and handles HTTP requests safely', async () => {
  const input = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost/campushr_test',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    CORS_ORIGIN: 'http://localhost:5173',
  };
  assert.equal(
    envSchema.safeParse({ ...input, JWT_ACCESS_SECRET: 'short' }).success,
    false,
  );
  assert.equal(
    envSchema.safeParse({ ...input, DATABASE_URL: 'https://localhost' })
      .success,
    false,
  );
  assert.equal(envSchema.safeParse({ ...input, PORT: 70000 }).success, false);
  assert.equal(
    envSchema.safeParse({ ...input, CORS_ORIGIN: '*' }).success,
    false,
  );

  const server = createApp(envSchema.parse(input), {
    authRepository: createMemoryAuthRepository().repo,
    prisma: unusedPrisma,
  }).listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const url = `http://127.0.0.1:${address.port}/api/v1`;
    const response = await fetch(`${url}/health`, {
      headers: { Origin: input.CORS_ORIGIN },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: 'ok',
      service: 'campushr-api',
    });
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      input.CORS_ORIGIN,
    );
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(
      (await fetch(`${url}/employees`)).status,
      401,
      'domain routes require sign-in',
    );
    const missing = await fetch(`${url}/no-such-route`);
    assert.equal(missing.status, 404);
    const invalid = await fetch(`${url}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), {
      error: {
        code: 'INVALID_REQUEST',
        message: 'The request could not be processed.',
      },
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('in production the API also serves the web app, and API 404s stay JSON', async () => {
  const webDir = mkdtempSync(join(tmpdir(), 'campushr-web-'));
  mkdirSync(join(webDir, 'assets'));
  writeFileSync(join(webDir, 'index.html'), '<div id="root"></div>');
  writeFileSync(join(webDir, 'assets', 'app.js'), 'console.log(1)');
  const server = createApp(
    envSchema.parse({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost/campushr_test',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'https://campushr.example',
    }),
    {
      authRepository: createMemoryAuthRepository().repo,
      prisma: unusedPrisma,
      webDir,
    },
  ).listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    const page = await fetch(`${base}/leave?tab=calendar`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /id="root"/);
    assert.equal(page.headers.get('cache-control'), 'no-cache');
    assert.match(
      page.headers.get('content-security-policy') ?? '',
      /script-src 'self'/,
    );
    assert.equal((await fetch(`${base}/assets/app.js`)).status, 200);
    const missing = await fetch(`${base}/api/v1/no-such-route`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  } finally {
    server.close();
    rmSync(webDir, { recursive: true, force: true });
  }
});
