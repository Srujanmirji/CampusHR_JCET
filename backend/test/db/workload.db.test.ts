// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestApp } from './helpers.js';

describe('workload (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  type Person = { id: string; token: string };
  let hod: Person, asha: Person, ravi: Person, eceFaculty: Person;
  let principal: Person, clerk: Person;
  let assistant: number;

  before(async () => {
    t = await startTestApp();
    const cse = await t.department('CSE');
    assistant = await t.designation('Assistant Professor');
    hod = await t.person({
      key: 'wlhod',
      role: 'HOD',
      code: 'WL-CSE-001',
      department: 'CSE',
    });
    asha = await t.person({
      key: 'wlasha',
      role: 'Faculty',
      code: 'WL-CSE-021',
      department: 'CSE',
    });
    ravi = await t.person({
      key: 'wlravi',
      role: 'Faculty',
      code: 'WL-CSE-022',
      department: 'CSE',
      designation: 'Professor',
    });
    eceFaculty = await t.person({
      key: 'wlece',
      role: 'Faculty',
      code: 'WL-ECE-021',
      department: 'ECE',
    });
    principal = await t.person({
      key: 'wlprincipal',
      role: 'Principal',
      code: 'WL-ADM-001',
      department: 'ADMIN',
      designation: 'Professor',
    });
    clerk = await t.person({
      key: 'wlclerk',
      role: 'Non-Teaching Staff',
      code: 'WL-ADM-050',
      department: 'ADMIN',
      designation: 'Office Assistant',
    });

    const subject = (code: string, kind: 'THEORY' | 'LAB') =>
      t.prisma.subject.create({
        data: { code, name: code, departmentId: cse, semester: 3, kind },
      });
    const theory = await subject('WLT301', 'THEORY');
    const lab = await subject('WLL302', 'LAB');
    const room = await t.prisma.room.create({
      data: { name: 'WL Lab 1', kind: 'LAB' },
    });
    const classes = [
      [theory.id, 'MON', 1, 1],
      [theory.id, 'TUE', 1, 2],
      [lab.id, 'WED', 5, 7],
    ] as const;
    for (const [subjectId, day, startPeriod, endPeriod] of classes) {
      await t.prisma.timetableEntry.create({
        data: {
          departmentId: cse,
          semester: 3,
          section: 'A',
          subjectId,
          facultyId: asha.id,
          roomId: room.id,
          day,
          startPeriod,
          endPeriod,
        },
      });
    }
  });
  after(() => t.stop());

  test('HOD sees their department with hours split by theory and lab', async () => {
    const { status, data } = await t.request('GET', '/workload', hod.token);
    assert.equal(status, 200);
    const ids = data.map((row: { faculty: { id: string } }) => row.faculty.id);
    assert.ok(ids.includes(ravi.id));
    assert.ok(!ids.includes(eceFaculty.id), 'other departments hidden');
    const row = data.find(
      (item: { faculty: { id: string } }) => item.faculty.id === asha.id,
    );
    assert.equal(row.faculty.designation.name, 'Assistant Professor');
    assert.deepEqual(
      [row.theoryHours, row.labHours, row.totalHours],
      [3, 3, 6],
    );
    assert.deepEqual([row.minHours, row.maxHours], [14, 18]);
    assert.equal(row.status, 'UNDERLOADED');
  });

  test('faculty see only their own workload', async () => {
    const list = await t.request('GET', '/workload', asha.token);
    assert.deepEqual(
      list.data.map((row: { faculty: { id: string } }) => row.faculty.id),
      [asha.id],
    );
    const own = await t.request(
      'GET',
      `/workload/faculty/${asha.id}`,
      asha.token,
    );
    assert.equal(own.status, 200);
    assert.equal(own.data.classes.length, 3);
    assert.equal(own.data.classes[0].subject.code, 'WLT301');
    const other = await t.request(
      'GET',
      `/workload/faculty/${ravi.id}`,
      asha.token,
    );
    assert.equal(other.status, 404);
  });

  test('non-teaching staff have no workload access', async () => {
    const { status } = await t.request('GET', '/workload', clerk.token);
    assert.equal(status, 403);
  });

  test('Principal changes a band; status follows and the change is audited', async () => {
    const thresholds = await t.request(
      'GET',
      '/workload/thresholds',
      hod.token,
    );
    assert.deepEqual(
      thresholds.data.map(
        (row: { designation: { name: string } }) => row.designation.name,
      ),
      ['Professor', 'Associate Professor', 'Assistant Professor'],
    );

    const path = `/workload/thresholds/${assistant}`;
    assert.equal(
      (await t.request('PUT', path, hod.token, { minHours: 4, maxHours: 6 }))
        .status,
      403,
    );
    const invalid = await t.request('PUT', path, principal.token, {
      minHours: 8,
      maxHours: 6,
    });
    assert.equal(invalid.status, 400);
    const nonTeaching = await t.designation('Office Assistant');
    assert.equal(
      (
        await t.request(
          'PUT',
          `/workload/thresholds/${nonTeaching}`,
          principal.token,
          { minHours: 1, maxHours: 2 },
        )
      ).status,
      404,
    );

    const saved = await t.request('PUT', path, principal.token, {
      minHours: 4,
      maxHours: 6,
    });
    assert.equal(saved.status, 200);
    assert.deepEqual([saved.data.minHours, saved.data.maxHours], [4, 6]);
    const own = await t.request(
      'GET',
      `/workload/faculty/${asha.id}`,
      asha.token,
    );
    assert.equal(own.data.status, 'NORMAL');
    const audit = await t.prisma.auditLog.findFirst({
      where: {
        action: 'workload_threshold.update',
        resourceId: String(assistant),
      },
    });
    assert.ok(audit, 'threshold change audited');

    // Restore the seeded band for later test files.
    await t.request('PUT', path, principal.token, {
      minHours: 14,
      maxHours: 18,
    });
  });
});
