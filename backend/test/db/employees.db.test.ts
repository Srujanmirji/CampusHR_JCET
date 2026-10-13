// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { envSchema } from '../../src/config/env.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import { seedReferenceData } from '../../src/database/reference-data.js';
import { createPrismaAuthRepository } from '../../src/modules/auth/auth.repository.js';
import type { RoleName } from '../../src/modules/auth/permissions.js';

const password = 'db-test-password';
const prisma = createPrismaClient(process.env.DATABASE_URL!);
const env = envSchema.parse({
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  CORS_ORIGIN: 'http://localhost:5173',
});

describe('employees and departments (PostgreSQL)', () => {
  let server: Server;
  let base: string;
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  let cse: number;
  let ece: number;
  let assistantProfessor: number;
  let officeAssistant: number;

  async function person(
    key: string,
    role: RoleName,
    code: string,
    departmentId: number,
    designationId: number,
  ) {
    const employee = await prisma.employee.create({
      data: {
        employeeCode: code,
        firstName: key,
        lastName: 'Test',
        email: `${key}@jcet.test`,
        departmentId,
        designationId,
        employmentType: 'PERMANENT',
        joiningDate: new Date('2020-06-01T00:00:00Z'),
      },
    });
    const roleRow = await prisma.role.findUniqueOrThrow({
      where: { name: role },
    });
    await prisma.user.create({
      data: {
        email: `${key}@jcet.test`,
        passwordHash: await bcrypt.hash(password, 4),
        roleId: roleRow.id,
        employeeId: employee.id,
      },
    });
    ids[key] = employee.id;
  }

  const request = (
    method: string,
    path: string,
    who?: string,
    body?: unknown,
  ) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const json = async (response: Response) =>
    (await response.json()) as {
      data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      meta?: Record<string, number>;
      error?: { code: string; message: string };
    };

  before(async () => {
    await seedReferenceData(prisma);
    cse = (
      await prisma.department.findUniqueOrThrow({ where: { code: 'CSE' } })
    ).id;
    ece = (
      await prisma.department.findUniqueOrThrow({ where: { code: 'ECE' } })
    ).id;
    const admin = (
      await prisma.department.findUniqueOrThrow({ where: { code: 'ADMIN' } })
    ).id;
    assistantProfessor = (
      await prisma.designation.findUniqueOrThrow({
        where: { name: 'Assistant Professor' },
      })
    ).id;
    officeAssistant = (
      await prisma.designation.findUniqueOrThrow({
        where: { name: 'Office Assistant' },
      })
    ).id;
    await person('hr', 'HR Admin', 'JCET-ADMIN-001', admin, officeAssistant);
    await person('hod', 'HOD', 'JCET-CSE-001', cse, assistantProfessor);
    await person('asha', 'Faculty', 'JCET-CSE-021', cse, assistantProfessor);
    await person('ravi', 'Faculty', 'JCET-ECE-004', ece, assistantProfessor);

    server = createApp(env, {
      authRepository: createPrismaAuthRepository(prisma),
      prisma,
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}/api/v1`;

    for (const [key, identifier] of [
      ['hr', 'hr@jcet.test'],
      ['hod', 'HOD@JCET.TEST'],
      ['asha', 'jcet-cse-021'], // employee ID, any case
      ['ravi', 'JCET-ECE-004'],
    ]) {
      const response = await request('POST', '/auth/login', undefined, {
        identifier,
        password,
      });
      assert.equal(response.status, 200, `login ${identifier}`);
      tokens[key!] = (
        (await response.json()) as { accessToken: string }
      ).accessToken;
    }
  });

  after(async () => {
    server?.close();
    await prisma.$disconnect();
  });

  test('each role sees only its scope', async () => {
    const names = async (who: string) =>
      (await json(await request('GET', '/employees', who))).data
        .map((employee: { firstName: string }) => employee.firstName)
        .sort();
    assert.deepEqual(await names('hr'), ['asha', 'hod', 'hr', 'ravi']);
    assert.deepEqual(await names('hod'), ['asha', 'hod']);
    assert.deepEqual(await names('asha'), ['asha']);

    const list = await json(
      await request('GET', '/employees?search=JCET-CSE', 'hr'),
    );
    assert.deepEqual(list.meta, {
      page: 1,
      pageSize: 25,
      total: 2,
      teaching: 2,
      nonTeaching: 0,
    });
    assert.equal(
      (await request('GET', `/employees/${ids.ravi}`, 'hod')).status,
      404,
      'outside the HOD department looks like not found',
    );
  });

  test('HR creates an employee with a suggested ID; duplicates are refused', async () => {
    const suggestion = await json(
      await request('GET', `/employees/next-code?departmentId=${cse}`, 'hr'),
    );
    assert.equal(suggestion.data.employeeCode, 'JCET-CSE-022');
    const input = {
      employeeCode: suggestion.data.employeeCode,
      firstName: 'Priya',
      lastName: 'Kulkarni',
      email: 'Priya.Kulkarni@jcet.test',
      departmentId: cse,
      designationId: assistantProfessor,
      employmentType: 'CONTRACT',
      joiningDate: '2024-07-15',
      experienceYears: 3,
    };
    const created = await request('POST', '/employees', 'hr', input);
    assert.equal(created.status, 201);
    const employee = (await json(created)).data;
    assert.equal(employee.email, 'priya.kulkarni@jcet.test');
    assert.equal(employee.joiningDate, '2024-07-15');
    assert.equal(employee.designation.category, 'TEACHING');

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { resource: 'employee', resourceId: employee.id },
    });
    assert.equal(audit.action, 'employee.create');
    assert.equal(
      (audit.afterJson as { employeeCode: string }).employeeCode,
      'JCET-CSE-022',
    );

    const sameCode = await request('POST', '/employees', 'hr', {
      ...input,
      email: 'other@jcet.test',
    });
    assert.equal(sameCode.status, 409);
    const sameEmail = await request('POST', '/employees', 'hr', {
      ...input,
      employeeCode: 'JCET-CSE-099',
    });
    assert.equal(
      (await json(sameEmail)).error?.message,
      'Another employee already uses this email.',
    );
    assert.equal(
      (
        await request('POST', '/employees', 'hr', {
          ...input,
          departmentId: 9999,
          employeeCode: 'X-1',
          email: 'x@jcet.test',
        })
      ).status,
      400,
    );
    assert.equal(
      (await request('POST', '/employees', 'hod', input)).status,
      403,
    );
  });

  test('staff may change only their own phone number', async () => {
    const own = await request('PATCH', `/employees/${ids.asha}`, 'asha', {
      phone: '+91 98450 11221',
    });
    assert.equal(own.status, 200);
    assert.equal((await json(own)).data.phone, '+91 98450 11221');
    assert.equal(
      (
        await request('PATCH', `/employees/${ids.asha}`, 'asha', {
          firstName: 'X',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request('PATCH', `/employees/${ids.ravi}`, 'asha', {
          phone: '123 4567',
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request('PATCH', `/employees/${ids.asha}`, 'hod', {
          phone: '123 4567',
        })
      ).status,
      403,
      'HODs have no employee.update',
    );
  });

  test('departments: HOD must belong to the department', async () => {
    assert.equal(
      (
        await request('PATCH', `/departments/${cse}`, 'hr', {
          hodEmployeeId: ids.ravi,
        })
      ).status,
      400,
    );
    const assigned = await request('PATCH', `/departments/${cse}`, 'hr', {
      hodEmployeeId: ids.hod,
    });
    assert.equal(assigned.status, 200);
    assert.equal((await json(assigned)).data.hod.employeeCode, 'JCET-CSE-001');

    const list = (await json(await request('GET', '/departments', 'asha')))
      .data;
    const cseRow = list.find((row: { code: string }) => row.code === 'CSE');
    assert.deepEqual(cseRow.staff, { total: 3, teaching: 3, nonTeaching: 0 });
    assert.equal(
      (
        await request('POST', '/departments', 'asha', {
          code: 'EEE',
          name: 'Electrical',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request('POST', '/departments', 'hr', {
          code: 'cse',
          name: 'Duplicate',
        })
      ).status,
      409,
    );
    assert.equal((await request('GET', '/designations', 'asha')).status, 200);
  });

  test('archiving ends the login and clears the HOD post', async () => {
    const archived = await request('DELETE', `/employees/${ids.hod}`, 'hr');
    assert.equal(archived.status, 200);
    assert.equal((await json(archived)).data.status, 'ARCHIVED');
    const department = await prisma.department.findUniqueOrThrow({
      where: { id: cse },
    });
    assert.equal(department.hodEmployeeId, null);
    assert.equal(
      (await request('GET', '/employees', 'hod')).status,
      401,
      'an archived employee is signed out at once',
    );
    const login = await request('POST', '/auth/login', undefined, {
      identifier: 'JCET-CSE-001',
      password,
    });
    assert.equal(login.status, 401);
    const actions = await prisma.auditLog.findMany({
      where: { resourceId: ids.hod },
      select: { action: true },
    });
    assert.deepEqual(
      actions.map((row) => row.action),
      ['employee.archive'],
    );
  });
});
