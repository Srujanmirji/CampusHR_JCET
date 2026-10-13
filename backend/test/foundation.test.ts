import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { envSchema } from '../src/config/env.js';
import { createMemoryAuthRepository } from './fakes.js';

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
    const missing = await fetch(`${url}/employees`);
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
