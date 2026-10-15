// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestApp } from './helpers.js';

describe('leave (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  type Person = { id: string; token: string };
  let hr: Person, principal: Person, cseHod: Person, eceHod: Person;
  let asha: Person, clerk: Person;
  const types: Record<string, number> = {};
  let ashaRequest: string;

  // 2026-11-02 is a Monday; 2026-11-08 a Sunday.
  const apply = (who: Person, body: Record<string, unknown>) =>
    t.request('POST', '/leave/requests', who.token, {
      leaveTypeId: types.CL,
      reason: 'Family function',
      ...body,
    });

  before(async () => {
    t = await startTestApp();
    hr = await t.person({
      key: 'lvhr',
      role: 'HR Admin',
      code: 'LV-ADM-002',
      department: 'ADMIN',
      designation: 'Assistant Registrar / HR Officer',
    });
    principal = await t.person({
      key: 'lvprin',
      role: 'Principal',
      code: 'LV-ADM-001',
      department: 'ADMIN',
      designation: 'Professor',
    });
    cseHod = await t.person({
      key: 'lvcsehod',
      role: 'HOD',
      code: 'LV-CSE-001',
      department: 'CSE',
      designation: 'Professor',
    });
    eceHod = await t.person({
      key: 'lvecehod',
      role: 'HOD',
      code: 'LV-ECE-001',
      department: 'ECE',
      designation: 'Professor',
    });
    asha = await t.person({
      key: 'lvasha',
      role: 'Faculty',
      code: 'LV-CSE-021',
      department: 'CSE',
    });
    clerk = await t.person({
      key: 'lvclerk',
      role: 'Non-Teaching Staff',
      code: 'LV-ADM-050',
      department: 'ADMIN',
      designation: 'Office Assistant',
    });
  });
  after(() => t.stop());

  test('HR sets up leave types; others cannot', async () => {
    const cl = await t.request('POST', '/leave/types', hr.token, {
      code: 'cl',
      name: 'Casual Leave',
      yearlyQuota: 12,
      allowHalfDay: true,
    });
    assert.equal(cl.status, 201);
    assert.equal(cl.data.code, 'CL');
    types.CL = cl.data.id;
    types.EL = (
      await t.request('POST', '/leave/types', hr.token, {
        code: 'EL',
        name: 'Earned Leave',
        yearlyQuota: 10,
        carryForwardMax: 5,
      })
    ).data.id;
    types.LOP = (
      await t.request('POST', '/leave/types', hr.token, {
        code: 'LOP',
        name: 'Loss of Pay',
        yearlyQuota: null,
      })
    ).data.id;
    assert.equal(
      (
        await t.request('POST', '/leave/types', asha.token, {
          code: 'XL',
          name: 'Extra',
          yearlyQuota: 1,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await t.request('POST', '/leave/types', hr.token, {
          code: 'CL',
          name: 'Another',
          yearlyQuota: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await t.request('POST', '/leave/types', hr.token, {
          code: 'HL',
          name: 'Odd',
          yearlyQuota: 1.3,
        })
      ).status,
      400,
    );
    const list = await t.request('GET', '/leave/types', asha.token);
    assert.equal(list.data.length, 3);
  });

  test('applying checks dates, half days, overlap and balance', async () => {
    const created = await apply(asha, {
      startDate: '2026-11-07',
      endDate: '2026-11-09',
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.days, 2, 'Sunday 8 November is not counted');
    assert.equal(created.data.pendingRole, 'HOD');
    assert.deepEqual(created.data.approverRoles, ['HOD', 'HR Admin']);
    ashaRequest = created.data.id;

    const overlap = await apply(asha, {
      startDate: '2026-11-09',
      endDate: '2026-11-10',
    });
    assert.equal(overlap.status, 409);
    assert.match(overlap.error!.message, /2026-11-07 to 2026-11-09/);
    assert.equal(
      (await apply(asha, { startDate: '2026-11-15', endDate: '2026-11-15' }))
        .status,
      400,
      'a Sunday alone is no leave',
    );
    assert.equal(
      (
        await apply(asha, {
          leaveTypeId: types.EL,
          startDate: '2026-11-16',
          endDate: '2026-11-16',
          halfDay: 'FIRST',
        })
      ).status,
      400,
      'EL has no half days',
    );
    const tooMuch = await apply(asha, {
      startDate: '2026-11-16',
      endDate: '2026-11-28',
    });
    assert.equal(tooMuch.status, 400);
    assert.equal(tooMuch.error!.code, 'INSUFFICIENT_BALANCE');
    assert.match(tooMuch.error!.message, /Only 10 days of Casual Leave/);
    assert.equal(
      (await apply(asha, { startDate: '2026-12-30', endDate: '2027-01-02' }))
        .status,
      400,
    );
    const unlimited = await apply(asha, {
      leaveTypeId: types.LOP,
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });
    assert.equal(unlimited.status, 201, 'loss of pay has no limit');
  });

  test('the HOD of the department, then HR, approve a faculty request', async () => {
    const path = `/leave/requests/${ashaRequest}`;
    assert.equal(
      (await t.request('PATCH', `${path}/approve`, eceHod.token, {})).status,
      403,
      'another department’s HOD',
    );
    assert.equal(
      (await t.request('PATCH', `${path}/approve`, hr.token, {})).status,
      403,
      'HR waits for the HOD',
    );
    const waiting = await t.request(
      'GET',
      '/leave/requests?awaitingMe=true',
      cseHod.token,
    );
    assert.ok(waiting.data.some((r: { id: string }) => r.id === ashaRequest));

    const first = await t.request('PATCH', `${path}/approve`, cseHod.token, {
      note: 'Fine by me',
    });
    assert.equal(first.data.status, 'PENDING');
    assert.equal(first.data.pendingRole, 'HR Admin');
    assert.equal(
      (await t.request('PATCH', `${path}/approve`, cseHod.token, {})).status,
      403,
      'the HOD step is done',
    );
    const done = await t.request('PATCH', `${path}/approve`, hr.token, {});
    assert.equal(done.data.status, 'APPROVED');
    assert.equal(done.data.pendingRole, null);
    assert.deepEqual(
      done.data.decisions.map((d: { role: string; approved: boolean }) => [
        d.role,
        d.approved,
      ]),
      [
        ['HOD', true],
        ['HR Admin', true],
      ],
    );
    assert.equal(done.data.decisions[0].decidedBy, 'lvcsehod Test');
    assert.equal(
      await t.prisma.auditLog.count({
        where: { resourceId: ashaRequest, action: 'leave.approve' },
      }),
      2,
    );
    assert.equal(
      (await t.request('PATCH', `${path}/cancel`, asha.token)).status,
      409,
      'approved leave cannot be cancelled here',
    );

    const balances = await t.request('GET', '/leave/balances', asha.token);
    const cl = balances.data.find(
      (row: { leaveType: { code: string } }) => row.leaveType.code === 'CL',
    );
    assert.deepEqual([cl.used, cl.pending, cl.remaining], [2, 0, 10]);
  });

  test('rejecting needs a reason; staff go straight to HR; HODs to the Principal', async () => {
    const clerkLeave = await apply(clerk, {
      startDate: '2026-11-03',
      endDate: '2026-11-03',
      halfDay: 'SECOND',
    });
    assert.equal(clerkLeave.data.days, 0.5);
    assert.equal(clerkLeave.data.pendingRole, 'HR Admin');
    const path = `/leave/requests/${clerkLeave.data.id}`;
    assert.equal(
      (await t.request('PATCH', `${path}/reject`, hr.token, {})).status,
      400,
    );
    const rejected = await t.request('PATCH', `${path}/reject`, hr.token, {
      note: 'Audit week',
    });
    assert.equal(rejected.data.status, 'REJECTED');
    assert.equal(rejected.data.decisions[0].note, 'Audit week');

    const hodLeave = await apply(cseHod, {
      startDate: '2026-11-04',
      endDate: '2026-11-04',
    });
    assert.equal(hodLeave.data.pendingRole, 'Principal');
    const approved = await t.request(
      'PATCH',
      `/leave/requests/${hodLeave.data.id}/approve`,
      principal.token,
      {},
    );
    assert.equal(approved.data.status, 'APPROVED');
  });

  test('applicants cancel their own pending leave; reads follow scope', async () => {
    const pending = await apply(asha, {
      startDate: '2026-11-20',
      endDate: '2026-11-20',
    });
    const path = `/leave/requests/${pending.data.id}`;
    assert.equal(
      (await t.request('PATCH', `${path}/cancel`, clerk.token)).status,
      404,
    );
    const cancelled = await t.request('PATCH', `${path}/cancel`, asha.token);
    assert.equal(cancelled.data.status, 'CANCELLED');
    assert.equal(cancelled.data.pendingRole, null);
    assert.equal(
      (await t.request('PATCH', `${path}/approve`, cseHod.token, {})).status,
      409,
    );

    const own = await t.request('GET', '/leave/requests', asha.token);
    assert.ok(
      own.data.every(
        (r: { employee: { id: string } }) => r.employee.id === asha.id,
      ),
    );
    assert.equal(
      (await t.request('GET', `/leave/requests/${ashaRequest}`, eceHod.token))
        .status,
      404,
    );
    const department = await t.request('GET', '/leave/requests', cseHod.token);
    assert.ok(
      department.data.some((r: { id: string }) => r.id === ashaRequest),
    );
    assert.equal(
      (
        await t.request(
          'GET',
          `/leave/balances?employeeId=${asha.id}`,
          eceHod.token,
        )
      ).status,
      404,
    );
  });

  test('the calendar lists requests overlapping a month', async () => {
    const november = await t.request(
      'GET',
      '/leave/requests?month=2026-11',
      asha.token,
    );
    assert.ok(november.data.length > 0);
    assert.ok(
      november.data.every(
        (r: { startDate: string; endDate: string }) =>
          r.startDate <= '2026-11-30' && r.endDate >= '2026-11-01',
      ),
    );
    const october = await t.request(
      'GET',
      '/leave/requests?month=2026-10',
      asha.token,
    );
    assert.equal(october.data.length, 0);
    assert.equal(
      (await t.request('GET', '/leave/requests?month=2026-13', asha.token))
        .status,
      400,
    );
  });

  test('unused earned leave carries into the next year, capped', async () => {
    // Joined 2020 with 10 EL a year and a carry cap of 5.
    const el = (
      await t.request('GET', '/leave/balances?year=2026', asha.token)
    ).data.find(
      (row: { leaveType: { code: string } }) => row.leaveType.code === 'EL',
    );
    assert.deepEqual([el.carriedIn, el.entitled, el.remaining], [5, 15, 15]);
  });
});
