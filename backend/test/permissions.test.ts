import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import bcrypt from 'bcrypt';
import express from 'express';
import { requirePermission } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/error.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import {
  defaultGrants,
  MATRIX,
  widestScope,
} from '../src/modules/auth/permissions.js';
import { createMemoryAuthRepository } from './fakes.js';

test('permissions.ts matches the approved matrix in product/USER_ROLES.md', () => {
  const doc = readFileSync(
    new URL('../../product/USER_ROLES.md', import.meta.url),
    'utf8',
  );
  const documented = Object.fromEntries(
    doc
      .split('\n')
      .filter((line) => line.startsWith('| `'))
      .map((line) => {
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim());
        const key = /`([^`]+)`/.exec(cells[0]!)![1]!;
        return [key, cells.slice(1).map((cell) => (cell === '—' ? '-' : cell))];
      }),
  );
  assert.deepEqual(documented, MATRIX);
});

test('roles get their widest scope per action', () => {
  const hod = defaultGrants('HOD');
  assert.ok(hod.includes('leave.approve.department'));
  assert.ok(
    !hod.includes('document.read.department'),
    'HODs never see documents',
  );
  assert.equal(widestScope(defaultGrants('HR Admin'), 'leave.read'), 'all');
  assert.equal(widestScope(hod, 'leave.read'), 'department');
  assert.equal(widestScope(defaultGrants('Faculty'), 'leave.read'), 'own');
  assert.equal(widestScope(defaultGrants('Faculty'), 'report.read'), undefined);
  assert.equal(
    widestScope(defaultGrants('Super Admin'), 'leave.apply'),
    undefined,
    'Super Admin is a system account without self-service',
  );
});

test('requirePermission allows, forbids, and sees deactivation at once', async () => {
  const passwordHash = await bcrypt.hash('pw', 4);
  const users = [
    {
      id: 'hod',
      email: 'hod@jcet.test',
      passwordHash,
      status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
      role: 'HOD',
      permissions: defaultGrants('HOD'),
    },
    {
      id: 'faculty',
      email: 'faculty@jcet.test',
      passwordHash,
      status: 'ACTIVE' as const,
      role: 'Faculty',
      permissions: defaultGrants('Faculty'),
    },
  ];
  const auth = createAuthService(
    createMemoryAuthRepository(users).repo,
    'a'.repeat(32),
  );
  const app = express()
    .get('/reports', ...requirePermission(auth, 'report.read'), (_req, res) => {
      res.json({ scope: res.locals.scope });
    })
    .use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const get = (token?: string) =>
    fetch(`http://127.0.0.1:${address.port}/reports`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  try {
    const hodToken = (await auth.login('hod@jcet.test', 'pw', {})).accessToken;
    const allowed = await get(hodToken);
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), { scope: 'department' });

    const facultyToken = (await auth.login('faculty@jcet.test', 'pw', {}))
      .accessToken;
    const forbidden = await get(facultyToken);
    assert.equal(forbidden.status, 403);
    assert.equal(
      ((await forbidden.json()) as { error: { code: string } }).error.code,
      'FORBIDDEN',
    );

    assert.equal((await get()).status, 401);

    users[0]!.status = 'INACTIVE';
    assert.equal(
      (await get(hodToken)).status,
      401,
      'a still-valid token stops working once the account is deactivated',
    );
  } finally {
    server.close();
  }
});
