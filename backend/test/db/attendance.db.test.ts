import assert from 'node:assert/strict';
import { before, after, describe, test } from 'node:test';
import { startTestApp } from './helpers.js';

describe('mobile attendance (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  let faculty: { id: string; token: string },
    hod: { id: string; token: string },
    outsider: { id: string; token: string };
  const today = new Date().toISOString().slice(0, 10);
  before(async () => {
    t = await startTestApp();
    faculty = await t.person({
      key: 'attfaculty',
      code: 'ATT-CSE-001',
      role: 'Faculty',
      department: 'CSE',
    });
    hod = await t.person({
      key: 'atthod',
      code: 'ATT-CSE-002',
      role: 'HOD',
      department: 'CSE',
    });
    outsider = await t.person({
      key: 'attoutside',
      code: 'ATT-ECE-001',
      role: 'Faculty',
      department: 'ECE',
    });
  });
  after(async () => {
    const employees = await t.prisma.employee.findMany({
      where: { employeeCode: { startsWith: 'ATT-' } },
      select: { id: true },
    });
    const ids = employees.map((person) => person.id);
    await t.prisma.attendanceCorrection.deleteMany({
      where: { employeeId: { in: ids } },
    });
    await t.prisma.attendance.deleteMany({
      where: { employeeId: { in: ids } },
    });
    await t.prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'attfaculty@jcet.test',
            'atthod@jcet.test',
            'attoutside@jcet.test',
            'attadmin@jcet.test',
          ],
        },
      },
    });
    await t.prisma.employee.deleteMany({ where: { id: { in: ids } } });
    await t.stop();
  });
  test('simultaneous explicit punches cannot toggle or overwrite the recorded times', async () => {
    const punch = (action: string) =>
      t.request('POST', '/attendance/punch', faculty.token, {
        action,
        date: today,
        source: 'MOBILE',
      });
    const checksIn = await Promise.all([punch('CHECK_IN'), punch('CHECK_IN')]);
    assert.deepEqual(
      checksIn.map((result) => result.status).sort(),
      [200, 409],
    );
    const first = (await t.request('GET', '/attendance/today', faculty.token))
      .data;
    assert.ok(first.checkIn);
    assert.equal(first.checkOut, null);
    assert.equal(first.source, 'MOBILE');
    assert.equal((await punch('CHECK_IN')).status, 409);
    assert.equal(
      (await t.request('GET', '/attendance/today', faculty.token)).data.checkIn,
      first.checkIn,
    );
    const checksOut = await Promise.all([
      punch('CHECK_OUT'),
      punch('CHECK_OUT'),
    ]);
    assert.deepEqual(
      checksOut.map((result) => result.status).sort(),
      [200, 409],
    );
    const last = (await t.request('GET', '/attendance/today', faculty.token))
      .data;
    assert.ok(last.checkOut);
    assert.equal(last.checkIn, first.checkIn);
    assert.equal((await punch('CHECK_OUT')).status, 409);
    assert.equal(
      (await t.request('GET', '/attendance/today', faculty.token)).data
        .checkOut,
      last.checkOut,
    );
  });
  test('stale date, forbidden role and unknown action cannot punch; legacy browser payload is retained', async () => {
    assert.equal(
      (
        await t.request('POST', '/attendance/punch', outsider.token, {
          action: 'CHECK_IN',
          date: '2000-01-01',
          source: 'MOBILE',
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await t.request('POST', '/attendance/punch', outsider.token, {
          action: 'WRONG',
          source: 'MOBILE',
        })
      ).status,
      400,
    );
    const superAdmin = await t.person({
      key: 'attadmin',
      code: 'ATT-ADM-001',
      role: 'Super Admin',
      department: 'CSE',
    });
    assert.equal(
      (
        await t.request('POST', '/attendance/punch', superAdmin.token, {
          action: 'CHECK_IN',
          date: today,
          source: 'MOBILE',
        })
      ).status,
      403,
    );
    const legacy = await t.request(
      'POST',
      '/attendance/punch',
      outsider.token,
      { source: 'WEB' },
    );
    assert.equal(legacy.status, 200);
    assert.ok(legacy.data.checkIn);
    assert.equal(legacy.data.checkOut, null);
  });
  test('correction queries accept an explicit own employee filter but preserve department/own scope', async () => {
    const input = {
      date: today,
      requestedCheckIn: `${today}T09:00:00.000Z`,
      requestedCheckOut: `${today}T17:00:00.000Z`,
      requestedStatus: 'PRESENT',
      reason: 'Attendance test correction.',
    };
    for (const person of [faculty, hod, outsider])
      assert.equal(
        (
          await t.request(
            'POST',
            '/attendance/corrections',
            person.token,
            input,
          )
        ).status,
        201,
      );
    const own = await t.request(
      'GET',
      `/attendance/corrections?employeeId=${hod.id}&page=1&limit=10`,
      hod.token,
    );
    assert.equal(own.status, 200);
    assert.equal(own.data.length, 1);
    assert.equal(own.data[0].employeeId, hod.id);
    const forbidden = await t.request(
      'GET',
      `/attendance/corrections?employeeId=${outsider.id}`,
      hod.token,
    );
    assert.deepEqual(forbidden.data, []);
    const forcedOwn = await t.request(
      'GET',
      `/attendance/corrections?employeeId=${outsider.id}`,
      faculty.token,
    );
    assert.equal(forcedOwn.data.length, 1);
    assert.equal(forcedOwn.data[0].employeeId, faculty.id);
    for (const query of [
      'limit=-1',
      'page=0',
      'status=INVALID',
      'employeeId=nope',
    ])
      assert.equal(
        (await t.request('GET', `/attendance/corrections?${query}`, hod.token))
          .status,
        400,
      );
  });
  test('missing own employee/department cannot broaden attendance or correction reads', async () => {
    await t.prisma.user.updateMany({
      where: { employeeId: outsider.id },
      data: { employeeId: null },
    });
    for (const path of ['/attendance', '/attendance/corrections'])
      assert.deepEqual((await t.request('GET', path, outsider.token)).data, []);
    await t.prisma.user.updateMany({
      where: { employeeId: hod.id },
      data: { employeeId: null },
    });
    for (const path of ['/attendance', '/attendance/corrections'])
      assert.deepEqual((await t.request('GET', path, hod.token)).data, []);
  });
});
