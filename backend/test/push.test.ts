import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { mock } from 'node:test';
import express from 'express';
import { errorHandler } from '../src/middleware/error.js';
import type { AuthService } from '../src/modules/auth/auth.service.js';
import {
  createPushRouter,
  type PushRepository,
} from '../src/modules/notifications/notifications.push.js';

test('device persistence failures cannot expose routing tokens through API responses or global error logs', async () => {
  const token = 'ExpoPushToken[private-test-routing-token]';
  const auth = {
    authenticateAccessToken: async () => ({ userId: 'owner' }),
    authorize: async () => ({
      userId: 'owner',
      employeeId: null,
      departmentId: null,
      scope: 'own',
    }),
  } as unknown as AuthService;
  const repo = {
    register: async () => {
      throw new Error(`Database invocation includes ${token}`);
    },
  } as unknown as PushRepository;
  const projectId = '10101010-1010-4010-8010-101010101010';
  const logs: unknown[][] = [];
  const logging = mock.method(console, 'error', (...args: unknown[]) =>
    logs.push(args),
  );
  const app = express()
    .use(express.json())
    .use(createPushRouter(auth, repo, { enabled: true, projectId }))
    .use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/devices`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-access',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: 'ios',
        projectId,
        refreshToken: 'a'.repeat(43),
      }),
    });
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes(token));
    assert.ok(!logs.flat().map(String).join(' ').includes(token));
  } finally {
    logging.mock.restore();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
