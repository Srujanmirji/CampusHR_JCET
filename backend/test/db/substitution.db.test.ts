// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestApp } from './helpers.js';

describe('substitution (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  type Person = { id: string; token: string };
  let hod: Person, eceHod: Person, asha: Person, ravi: Person;
  let meena: Person, kiran: Person, lata: Person, heavy: Person;
  let priya: Person;
  let leaveId: string;
  const ids: Record<string, string | number> = {};

  // 2026-11-02 is a Monday.
  const DATE = '2026-11-02';
  type Candidate = {
    faculty: { id: string; name: string };
    score: number;
    points: Record<string, number>;
    eligible: boolean;
  };

  before(async () => {
    t = await startTestApp();
    const cse = await t.department('CSE');
    const ece = await t.department('ECE');
    const staff = (key: string, code: string, department = 'CSE') =>
      t.person({ key, role: 'Faculty', code, department });
    hod = await t.person({
      key: 'sbhod',
      role: 'HOD',
      code: 'SB-CSE-001',
      department: 'CSE',
      designation: 'Professor',
    });
    eceHod = await t.person({
      key: 'sbecehod',
      role: 'HOD',
      code: 'SB-ECE-001',
      department: 'ECE',
      designation: 'Professor',
    });
    asha = await staff('sbasha', 'SB-CSE-021');
    ravi = await staff('sbravi', 'SB-CSE-022');
    meena = await staff('sbmeena', 'SB-CSE-023');
    kiran = await staff('sbkiran', 'SB-CSE-024');
    lata = await staff('sblata', 'SB-CSE-025');
    heavy = await staff('sbheavy', 'SB-CSE-026');
    priya = await staff('sbpriya', 'SB-ECE-021', 'ECE');

    const subject = async (code: string, kind: 'THEORY' | 'LAB') =>
      (
        await t.prisma.subject.create({
          data: { code, name: code, departmentId: cse, semester: 7, kind },
        })
      ).id;
    const theory = await subject('SB501', 'THEORY');
    const lab = await subject('SBL504', 'LAB');
    const other = await subject('SB502', 'THEORY');
    const room = (
      await t.prisma.room.create({ data: { name: 'SB Room', kind: 'LAB' } })
    ).id;
    const teach = (
      who: Person,
      subjectId: number,
      day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI',
      startPeriod: number,
      endPeriod: number,
      section = 'A',
      departmentId = cse,
    ) =>
      t.prisma.timetableEntry.create({
        data: {
          departmentId,
          semester: 7,
          section,
          subjectId,
          facultyId: who.id,
          roomId: room,
          day,
          startPeriod,
          endPeriod,
        },
      });
    ids.theoryEntry = (await teach(asha, theory, 'MON', 2, 2)).id;
    ids.labEntry = (await teach(asha, lab, 'MON', 5, 7)).id;
    await teach(asha, theory, 'TUE', 2, 2); // not on the leave day
    await teach(ravi, theory, 'WED', 2, 2, 'B'); // teaches the subject
    await teach(meena, other, 'THU', 1, 1, 'B'); // another theory subject
    await teach(meena, other, 'MON', 3, 3, 'C'); // back to back with period 2
    await teach(kiran, other, 'MON', 2, 2, 'D'); // busy in the slot
    await teach(lata, theory, 'WED', 3, 3, 'C');
    for (const day of ['WED', 'THU'] as const) {
      await teach(heavy, other, day, 1, 7, 'E');
    }
    await teach(heavy, other, 'FRI', 1, 4, 'E'); // 18 hours already

    const type = await t.prisma.leaveType.create({
      data: { code: 'SBL', name: 'SB Leave', yearlyQuota: null },
    });
    const approved = (who: Person, start: string, end: string) =>
      t.prisma.leaveRequest.create({
        data: {
          employeeId: who.id,
          departmentId: cse,
          leaveTypeId: type.id,
          startDate: new Date(`${start}T00:00:00Z`),
          endDate: new Date(`${end}T00:00:00Z`),
          days: 1,
          reason: 'Test',
          status: 'APPROVED',
          approverRoles: ['HOD', 'HR Admin'],
          pendingRole: null,
        },
      });
    leaveId = (await approved(asha, DATE, DATE)).id;
    await approved(lata, DATE, DATE);
    void ece;
  });
  after(() => t.stop());

  test('HODs see approved leave that touches their department’s classes', async () => {
    const list = await t.request(
      'GET',
      `/substitution/leave?from=${DATE}`,
      hod.token,
    );
    const ashaLeave = list.data.find(
      (row: { leave: { id: string } }) => row.leave.id === leaveId,
    );
    assert.deepEqual([ashaLeave.classes, ashaLeave.covered], [2, 0]);
    const ece = await t.request(
      'GET',
      `/substitution/leave?from=${DATE}`,
      eceHod.token,
    );
    assert.ok(
      !ece.data.some(
        (row: { leave: { id: string } }) => row.leave.id === leaveId,
      ),
    );
    assert.deepEqual(
      (await t.request('GET', '/substitution/leave', asha.token)).data,
      [],
    );
    assert.equal(
      (await t.request('GET', `/substitution/leave/${leaveId}`, eceHod.token))
        .status,
      404,
    );
    const detail = await t.request(
      'GET',
      `/substitution/leave/${leaveId}`,
      hod.token,
    );
    assert.deepEqual(
      detail.data.classes.map(
        (c: {
          date: string;
          hours: number;
          entry: { subject: { code: string } };
        }) => [c.date, c.entry.subject.code, c.hours],
      ),
      [
        [DATE, 'SB501', 1],
        [DATE, 'SBL504', 3],
      ],
    );
  });

  test('candidates are free, not on leave, ranked by the rubric', async () => {
    const { data } = await t.request(
      'GET',
      `/substitution/leave/${leaveId}/candidates?entryId=${ids.theoryEntry}&date=${DATE}`,
      hod.token,
    );
    const names = data.map((c: Candidate) => c.faculty.id);
    assert.ok(!names.includes(asha.id), 'not the absent faculty');
    assert.ok(!names.includes(kiran.id), 'busy in the slot');
    assert.ok(!names.includes(lata.id), 'on leave that day');
    assert.equal(data[0].faculty.id, ravi.id, 'teaches the subject: first');
    assert.equal(data[0].points.subject, 35);
    const meenaRow = data.find((c: Candidate) => c.faculty.id === meena.id);
    assert.deepEqual(
      [meenaRow.points.subject, meenaRow.points.availability],
      [15, 12],
      'same kind of subject; back to back',
    );
    const priyaRow = data.find((c: Candidate) => c.faculty.id === priya.id);
    assert.equal(priyaRow.points.department, 5);
    const last = data.at(-1);
    assert.equal(last.faculty.id, heavy.id);
    assert.equal(last.eligible, false, 'would pass 18 hours');
  });

  test('the HOD assigns a substitute or records no substitute needed', async () => {
    const assign = (who: Person, body: Record<string, unknown>) =>
      t.request('POST', '/substitution/assignments', who.token, {
        leaveRequestId: leaveId,
        timetableEntryId: ids.theoryEntry,
        date: DATE,
        ...body,
      });
    assert.equal((await assign(eceHod, { substituteId: ravi.id })).status, 404);
    const overloaded = await assign(hod, { substituteId: heavy.id });
    assert.equal(overloaded.status, 400);
    assert.match(overloaded.error!.message, /over the 18-hour maximum/);
    const done = await assign(hod, { substituteId: ravi.id });
    assert.equal(done.status, 201);
    assert.equal(done.data.substitute.id, ravi.id);
    assert.equal(
      (await assign(hod, { substituteId: meena.id })).status,
      409,
      'already covered',
    );
    assert.ok(
      await t.prisma.auditLog.findFirst({
        where: { action: 'substitution.assign', resourceId: done.data.id },
      }),
    );

    const lab = { timetableEntryId: ids.labEntry, substituteId: null };
    assert.equal((await assign(hod, lab)).status, 400, 'needs a note');
    const selfStudy = await assign(hod, {
      ...lab,
      note: 'Supervised lab work with the lab instructor.',
    });
    assert.equal(selfStudy.data.kind, 'NOT_NEEDED');

    const list = await t.request(
      'GET',
      `/substitution/leave?from=${DATE}`,
      hod.token,
    );
    const row = list.data.find(
      (r: { leave: { id: string } }) => r.leave.id === leaveId,
    );
    assert.equal(row.covered, 2);
  });

  test('substitutes see their classes; the HOD can undo an assignment', async () => {
    const mine = await t.request('GET', '/substitution/mine', ravi.token);
    assert.equal(mine.data.length, 1);
    assert.equal(mine.data[0].coveringFor.id, asha.id);
    assert.equal(mine.data[0].entry.subject.code, 'SB501');

    assert.equal(
      (
        await t.request(
          'DELETE',
          `/substitution/assignments/${mine.data[0].id}`,
          eceHod.token,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await t.request(
          'DELETE',
          `/substitution/assignments/${mine.data[0].id}`,
          hod.token,
        )
      ).status,
      204,
    );
    assert.equal(
      (await t.request('GET', '/substitution/mine', ravi.token)).data.length,
      0,
    );
  });
});
