// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestApp } from './helpers.js';

describe('timetable (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  let hod: { id: string; token: string };
  let meena: { id: string; token: string };
  let kiran: { id: string; token: string };
  let eceHod: { id: string; token: string };
  let cse: number;
  let ece: number;
  const ids: Record<string, number> = {};
  let entryId: string;

  const entry = (overrides: Record<string, unknown> = {}) => ({
    departmentId: cse,
    semester: 5,
    section: 'A',
    subjectId: ids.dbms,
    facultyId: meena.id,
    roomId: ids.lh203,
    day: 'MON',
    startPeriod: 2,
    endPeriod: 2,
    ...overrides,
  });

  before(async () => {
    t = await startTestApp();
    cse = await t.department('CSE');
    ece = await t.department('ECE');
    hod = await t.person({
      key: 'tthod',
      role: 'HOD',
      code: 'TT-CSE-001',
      department: 'CSE',
    });
    meena = await t.person({
      key: 'meena',
      role: 'Faculty',
      code: 'TT-CSE-021',
      department: 'CSE',
    });
    kiran = await t.person({
      key: 'kiran',
      role: 'Faculty',
      code: 'TT-CSE-025',
      department: 'CSE',
    });
    eceHod = await t.person({
      key: 'tteceh',
      role: 'HOD',
      code: 'TT-ECE-001',
      department: 'ECE',
    });
  });
  after(() => t.stop());

  test('HOD adds subjects and rooms for their department', async () => {
    const dbms = await t.request('POST', '/timetable/subjects', hod.token, {
      code: 'bcs501',
      name: 'Database Management Systems',
      departmentId: cse,
      semester: 5,
      kind: 'THEORY',
    });
    assert.equal(dbms.status, 201);
    assert.equal(dbms.data.code, 'BCS501');
    ids.dbms = dbms.data.id;
    ids.dbmsLab = (
      await t.request('POST', '/timetable/subjects', hod.token, {
        code: 'BCSL504',
        name: 'DBMS Lab',
        departmentId: cse,
        semester: 5,
        kind: 'LAB',
      })
    ).data.id;
    assert.equal(
      (
        await t.request('POST', '/timetable/subjects', hod.token, {
          code: 'BEC501',
          name: 'ECE subject',
          departmentId: ece,
          semester: 5,
          kind: 'THEORY',
        })
      ).status,
      403,
      'not another department',
    );
    for (const [key, name, kind] of [
      ['lh203', 'LH-203', 'CLASSROOM'],
      ['lh204', 'LH-204', 'CLASSROOM'],
      ['lab1', 'CSE Lab 1', 'LAB'],
      ['lab2', 'CSE Lab 2', 'LAB'],
    ] as const) {
      const room = await t.request('POST', '/timetable/rooms', hod.token, {
        name,
        kind,
      });
      assert.equal(room.status, 201);
      ids[key] = room.data.id;
    }
    const duplicate = await t.request('POST', '/timetable/rooms', hod.token, {
      name: 'lh-203',
      kind: 'CLASSROOM',
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.error?.message, 'Room LH-203 already exists.');
    const periods = await t.request('GET', '/timetable/periods', meena.token);
    assert.equal(periods.data.length, 7);
  });

  test('entries are validated and clashes are refused in plain words', async () => {
    const created = await t.request(
      'POST',
      '/timetable/entries',
      hod.token,
      entry(),
    );
    assert.equal(created.status, 201);
    assert.equal(created.data.faculty.name, 'meena Test');
    entryId = created.data.id;

    const sameFaculty = await t.request(
      'POST',
      '/timetable/entries',
      hod.token,
      entry({ section: 'B', roomId: ids.lh204, startPeriod: 1, endPeriod: 2 }),
    );
    assert.equal(sameFaculty.status, 409);
    assert.equal(sameFaculty.error?.code, 'CLASH');
    assert.equal(
      sameFaculty.error?.message,
      'meena Test already teaches BCS501 to CSE 5A on Monday, period 2.',
    );
    const sameRoom = await t.request(
      'POST',
      '/timetable/entries',
      hod.token,
      entry({ section: 'B', facultyId: kiran.id }),
    );
    assert.match(sameRoom.error?.message ?? '', /^LH-203 is already booked/);

    const theoryInLab = await t.request(
      'POST',
      '/timetable/entries',
      hod.token,
      entry({ subjectId: ids.dbmsLab, roomId: ids.lh204, day: 'TUE' }),
    );
    assert.equal(
      theoryInLab.error?.message,
      'BCSL504 is a lab; choose a lab room.',
    );
    const pastDayEnd = await t.request(
      'POST',
      '/timetable/entries',
      hod.token,
      entry({ day: 'TUE', startPeriod: 7, endPeriod: 8 }),
    );
    assert.equal(pastDayEnd.error?.message, 'The day has 7 periods.');

    const audit = await t.prisma.auditLog.findFirst({
      where: { resourceId: entryId },
    });
    assert.equal(audit?.action, 'timetable.create');
  });

  test('two lab batches of one section can run at the same time', async () => {
    const lab = (batch: string, facultyId: string, roomId: number) =>
      t.request(
        'POST',
        '/timetable/entries',
        hod.token,
        entry({
          subjectId: ids.dbmsLab,
          day: 'WED',
          startPeriod: 5,
          endPeriod: 6,
          batch,
          facultyId,
          roomId,
        }),
      );
    assert.equal((await lab('a1', meena.id, ids.lab1!)).status, 201);
    assert.equal((await lab('A2', kiran.id, ids.lab2!)).status, 201);
    const sameBatch = await lab('A2', hod.id, ids.lab1!);
    assert.equal(sameBatch.status, 409);
  });

  test('each role reads and changes only its scope', async () => {
    const mine = await t.request('GET', '/timetable/entries', meena.token);
    assert.ok(mine.data.length > 0);
    assert.ok(
      mine.data.every(
        (row: { faculty: { id: string } }) => row.faculty.id === meena.id,
      ),
    );
    const kiranSees = await t.request(
      'GET',
      `/timetable/entries?facultyId=${meena.id}`,
      kiran.token,
    );
    assert.deepEqual(kiranSees.data, [], 'faculty see only their own classes');

    const cseClass = await t.request(
      'GET',
      `/timetable/entries?departmentId=${cse}&semester=5&section=A`,
      hod.token,
    );
    assert.equal(cseClass.data.length, 3);
    assert.equal(
      (
        await t.request(
          'GET',
          `/timetable/entries?departmentId=${cse}`,
          eceHod.token,
        )
      ).data.length,
      0,
      'another department is invisible',
    );
    assert.equal(
      (await t.request('DELETE', `/timetable/entries/${entryId}`, eceHod.token))
        .status,
      404,
    );
    assert.equal(
      (
        await t.request(
          'POST',
          '/timetable/entries',
          meena.token,
          entry({ day: 'FRI' }),
        )
      ).status,
      403,
      'faculty cannot edit the timetable',
    );
  });

  test('HOD moves and deletes an entry', async () => {
    const moved = await t.request(
      'PATCH',
      `/timetable/entries/${entryId}`,
      hod.token,
      entry({ day: 'THU', startPeriod: 3, endPeriod: 3 }),
    );
    assert.equal(moved.status, 200);
    assert.equal(moved.data.day, 'THU');
    assert.equal(
      (await t.request('DELETE', `/timetable/entries/${entryId}`, hod.token))
        .status,
      204,
    );
    assert.deepEqual(
      (
        await t.prisma.auditLog.findMany({
          where: { resourceId: entryId },
          orderBy: { createdAt: 'asc' },
          select: { action: true },
        })
      ).map((row) => row.action),
      ['timetable.create', 'timetable.update', 'timetable.delete'],
    );
  });
});
