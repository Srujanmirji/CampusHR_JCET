// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { startTestApp } from './helpers.js';

describe('logins (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  type Person = { id: string; token: string };
  let admin: Person, hr: Person, faculty: Person;
  const roleIds: Record<string, number> = {};
  let ravi: string;
  let raviLogin: string;
  const firstPassword = 'FirstPassword123!';

  const signIn = async (identifier: string, password: string) => {
    const response = await fetch(`${t.base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    return {
      status: response.status,
      ...((await response.json()) as {
        accessToken?: string;
        user?: { role: string };
      }),
    };
  };
  const employee = async (code: string, status: 'ACTIVE' | 'ARCHIVED') =>
    (
      await t.prisma.employee.create({
        data: {
          employeeCode: code,
          firstName: code,
          lastName: 'Test',
          email: `${code.toLowerCase()}@jcet.test`,
          departmentId: await t.department('CSE'),
          designationId: await t.designation('Assistant Professor'),
          employmentType: 'PERMANENT',
          joiningDate: new Date('2021-06-01T00:00:00Z'),
          status,
        },
      })
    ).id;

  before(async () => {
    t = await startTestApp();
    admin = await t.person({
      key: 'usadmin',
      role: 'Super Admin',
      code: 'US-ADM-001',
      department: 'ADMIN',
      designation: 'System Administrator',
    });
    hr = await t.person({
      key: 'ushr',
      role: 'HR Admin',
      code: 'US-ADM-002',
      department: 'ADMIN',
      designation: 'Assistant Registrar / HR Officer',
    });
    faculty = await t.person({
      key: 'usfac',
      role: 'Faculty',
      code: 'US-CSE-021',
      department: 'CSE',
    });
    for (const role of await t.prisma.role.findMany()) {
      roleIds[role.name] = role.id;
    }
    ravi = await employee('US-CSE-030', 'ACTIVE');
  });
  after(() => t.stop());

  test('only Super Admin and HR Admin manage logins; HR cannot give Super Admin', async () => {
    assert.equal(
      (await t.request('GET', '/users/roles', faculty.token)).status,
      403,
    );
    const hrRoles = await t.request('GET', '/users/roles', hr.token);
    assert.ok(
      !hrRoles.data.some(
        (role: { name: string }) => role.name === 'Super Admin',
      ),
    );
    const adminRoles = await t.request('GET', '/users/roles', admin.token);
    assert.equal(adminRoles.data.length, 6);
    const denied = await t.request('POST', '/users', hr.token, {
      employeeId: ravi,
      roleId: roleIds['Super Admin'],
      password: firstPassword,
    });
    assert.equal(denied.status, 403);
  });

  test('HR creates a login; the employee signs in with their employee ID', async () => {
    assert.equal(
      (await t.request('GET', `/users/employee/${ravi}`, hr.token)).data,
      null,
    );
    const created = await t.request('POST', '/users', hr.token, {
      employeeId: ravi,
      roleId: roleIds.Faculty,
      password: firstPassword,
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.email, 'us-cse-030@jcet.test');
    assert.equal(created.data.role.name, 'Faculty');
    assert.equal(created.data.passwordHash, undefined);
    raviLogin = created.data.id;
    assert.equal((await signIn('US-CSE-030', firstPassword)).status, 200);

    const audit = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'user.create', resourceId: raviLogin },
    });
    assert.ok(!JSON.stringify(audit.afterJson).includes('passwordHash'));

    const again = await t.request('POST', '/users', hr.token, {
      employeeId: ravi,
      roleId: roleIds.Faculty,
      password: firstPassword,
    });
    assert.equal(again.status, 409);
    const archived = await employee('US-CSE-031', 'ARCHIVED');
    const refused = await t.request('POST', '/users', hr.token, {
      employeeId: archived,
      roleId: roleIds.Faculty,
      password: firstPassword,
    });
    assert.equal(refused.status, 400);
    const short = await t.request('POST', '/users', hr.token, {
      employeeId: await employee('US-CSE-032', 'ACTIVE'),
      roleId: roleIds.Faculty,
      password: 'short',
    });
    assert.equal(short.status, 400);
  });

  test('deactivating signs the person out; a new password replaces the old', async () => {
    const session = await signIn('US-CSE-030', firstPassword);
    const off = await t.request('PATCH', `/users/${raviLogin}`, hr.token, {
      status: 'INACTIVE',
    });
    assert.equal(off.data.status, 'INACTIVE');
    assert.equal(
      (await t.request('GET', '/auth/me', session.accessToken)).status,
      401,
    );
    assert.equal((await signIn('US-CSE-030', firstPassword)).status, 401);

    await t.request('PATCH', `/users/${raviLogin}`, hr.token, {
      status: 'ACTIVE',
      password: 'SecondPassword456!',
      roleId: roleIds.HOD,
    });
    assert.equal((await signIn('US-CSE-030', firstPassword)).status, 401);
    const back = await signIn('US-CSE-030', 'SecondPassword456!');
    assert.equal(back.status, 200);
    assert.equal(back.user?.role, 'HOD');
  });

  test('nobody changes their own access, and HR cannot touch a Super Admin', async () => {
    const hrLogin = await t.request(
      'GET',
      `/users/employee/${hr.id}`,
      hr.token,
    );
    assert.equal(
      (
        await t.request('PATCH', `/users/${hrLogin.data.id}`, hr.token, {
          status: 'INACTIVE',
        })
      ).status,
      403,
    );
    const adminLogin = await t.request(
      'GET',
      `/users/employee/${admin.id}`,
      hr.token,
    );
    assert.equal(
      (
        await t.request('PATCH', `/users/${adminLogin.data.id}`, hr.token, {
          password: 'TakenOverPassword42!',
        })
      ).status,
      403,
    );
    assert.equal(
      (await t.request('PATCH', `/users/${raviLogin}`, hr.token, {})).status,
      400,
    );
  });

  test('a signed token for an unknown subject is 401, not a server error', async () => {
    const token = jwt.sign({ role: 'HR Admin' }, 'a'.repeat(32), {
      issuer: 'campushr-api',
      audience: 'campushr',
      subject: '2',
      algorithm: 'HS256',
      expiresIn: 60,
    });
    assert.equal((await t.request('GET', '/users/roles', token)).status, 401);
  });
});
