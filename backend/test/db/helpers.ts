// Shared setup for the PostgreSQL tests (run with `npm run test:db`).
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { envSchema } from '../../src/config/env.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import { seedReferenceData } from '../../src/database/reference-data.js';
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createRealtime } from '../../src/modules/notifications/notifications.realtime.js';
import type { RoleName } from '../../src/modules/auth/permissions.js';

export const password = 'db-test-password';

export async function startTestApp() {
  const prisma = createPrismaClient(process.env.DATABASE_URL!);
  await seedReferenceData(prisma);
  const env = envSchema.parse({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    CORS_ORIGIN: 'http://localhost:5173',
  });
  const authRepository = createPrismaAuthRepository(prisma);
  const realtime = createRealtime();
  const server: Server = createApp(env, {
    authRepository,
    prisma,
    realtime,
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  // As in server.ts: sockets authenticate with the access token.
  const io = realtime.attach(server, {
    origin: env.CORS_ORIGIN,
    verify: (token) =>
      createAuthService(
        authRepository,
        env.JWT_ACCESS_SECRET,
      ).verifyAccessToken(token).userId,
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const department = async (code: string) =>
    (await prisma.department.findUniqueOrThrow({ where: { code } })).id;
  const designation = async (name: string) =>
    (await prisma.designation.findUniqueOrThrow({ where: { name } })).id;

  /** Creates an employee with a login and returns their id and token. */
  async function person(input: {
    key: string;
    role: RoleName;
    code: string;
    department: string;
    designation?: string;
  }) {
    const employee = await prisma.employee.create({
      data: {
        employeeCode: input.code,
        firstName: input.key,
        lastName: 'Test',
        email: `${input.key}@jcet.test`,
        departmentId: await department(input.department),
        designationId: await designation(
          input.designation ?? 'Assistant Professor',
        ),
        employmentType: 'PERMANENT',
        joiningDate: new Date('2020-06-01T00:00:00Z'),
      },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: input.role },
    });
    await prisma.user.create({
      data: {
        email: `${input.key}@jcet.test`,
        passwordHash: await bcrypt.hash(password, 4),
        roleId: role.id,
        employeeId: employee.id,
      },
    });
    const response = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: input.code, password }),
    });
    assert.equal(response.status, 200, `login ${input.code}`);
    const { accessToken } = (await response.json()) as { accessToken: string };
    return { id: employee.id, token: accessToken };
  }

  async function request(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json =
      response.status === 204
        ? undefined
        : ((await response.json()) as {
            data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
            error?: { code: string; message: string };
          });
    return { status: response.status, ...json };
  }

  async function stop() {
    await io.close();
    server.close();
    await prisma.$disconnect();
  }

  return { prisma, base, department, designation, person, request, stop };
}
