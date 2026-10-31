import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { homeUser, employeeId } from './home-fixtures.mjs';
let data, paths;
mock.module('../lib/session.ts', {
  exports: {
    apiFetch: async (path) => {
      paths.push(path);
      return globalThis.Response.json({ data });
    },
  },
});
const { departmentAccess, getDepartmentWorkload, getDepartmentSummary } =
  await import('../lib/hod-api.ts');
const user = {
  ...homeUser,
  permissions: [...homeUser.permissions, 'report.read.department'],
};
beforeEach(() => {
  paths = [];
  data = [
    {
      faculty: {
        id: employeeId,
        name: 'Faculty One',
        employeeCode: 'CSE001',
        department: { id: 1, name: 'Computer Science', code: 'CSE' },
      },
      totalHours: 15,
      minHours: 12,
      maxHours: 18,
      status: 'NORMAL',
    },
  ];
});
test('HOD workload uses an explicit department and validates its returned scope', async () => {
  const rows = await getDepartmentWorkload(user);
  assert.equal(rows[0].totalHours, 15);
  assert.deepEqual(paths, ['/workload?departmentId=1']);
});
test('department screens reject missing department, other roles and absent grants before a request', async () => {
  for (const who of [
    null,
    { ...user, departmentId: null },
    { ...user, role: 'Faculty' },
    { ...user, permissions: [] },
    { ...user, permissions: ['workload.read.own'] },
  ])
    assert.throws(() => departmentAccess(who, 'workload.read'));
  assert.deepEqual(paths, []);
});
test('foreign department workload cannot be displayed', async () => {
  data[0].faculty.department.id = 2;
  await assert.rejects(getDepartmentWorkload(user), /different department/);
});
test('malformed workload numbers and statuses are rejected', async () => {
  data[0].totalHours = -1;
  await assert.rejects(getDepartmentWorkload(user));
  data[0].totalHours = 15;
  data[0].status = 'FANTASTIC';
  await assert.rejects(getDepartmentWorkload(user));
});
test('a global report grant cannot silently substitute for department-specific reporting', async () => {
  await assert.rejects(
    getDepartmentSummary({
      ...user,
      permissions: [...user.permissions, 'report.read.all'],
    }),
    /department-scoped/,
  );
  assert.deepEqual(paths, []);
});
test('summary renders server values, rejects an invalid coverage percentage', async () => {
  data = {
    headcount: { total: 34 },
    attendance: { present: 31 },
    continuity: {
      affectedClasses: 10,
      classesCovered: 8,
      coverageRate: 80,
      uncoveredClasses: 2,
    },
  };
  assert.equal((await getDepartmentSummary(user)).continuity.coverageRate, 80);
  data.continuity.coverageRate = 101;
  await assert.rejects(getDepartmentSummary(user));
});
