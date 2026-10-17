// Runs only through `npm run test:db` (see test/db/run.ts).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { io as connect, type Socket } from 'socket.io-client';
import { startTestApp } from './helpers.js';

describe('notifications (PostgreSQL)', () => {
  let t: Awaited<ReturnType<typeof startTestApp>>;
  type Person = { id: string; token: string };
  let hr: Person, hod: Person, asha: Person, eceFaculty: Person;
  let leaveTypeId: number;
  type Row = { id: string; kind: string; title: string; link: string | null };

  const mine = async (who: Person, query = '') =>
    (await t.request(
      'GET',
      `/notifications${query}`,
      who.token,
    )) as unknown as {
      status: number;
      data: Row[];
      hasMore: boolean;
    };
  /** Resolves with the arguments of the next `event` on `socket`. */
  const next = (socket: Socket, event: string) =>
    new Promise<unknown[]>((resolve) =>
      socket.once(event, (...args: unknown[]) => resolve(args)),
    );
  const unread = async (who: Person) =>
    (await t.request('GET', '/notifications/unread-count', who.token)).data
      .count as number;

  before(async () => {
    t = await startTestApp();
    hr = await t.person({
      key: 'nthr',
      role: 'HR Admin',
      code: 'NT-ADM-002',
      department: 'ADMIN',
      designation: 'Assistant Registrar / HR Officer',
    });
    hod = await t.person({
      key: 'nthod',
      role: 'HOD',
      code: 'NT-CSE-001',
      department: 'CSE',
      designation: 'Professor',
    });
    asha = await t.person({
      key: 'ntasha',
      role: 'Faculty',
      code: 'NT-CSE-021',
      department: 'CSE',
    });
    eceFaculty = await t.person({
      key: 'ntece',
      role: 'Faculty',
      code: 'NT-ECE-021',
      department: 'ECE',
    });
    leaveTypeId = (
      await t.prisma.leaveType.create({
        data: { code: 'NTL', name: 'NT Leave', yearlyQuota: null },
      })
    ).id;
  });
  after(() => t.stop());

  test('each leave step tells the next approver and the applicant', async () => {
    const applied = await t.request('POST', '/leave/requests', asha.token, {
      leaveTypeId,
      startDate: '2026-12-07',
      endDate: '2026-12-08',
      reason: 'Family function',
    });
    assert.equal(applied.status, 201);
    const forHod = (await mine(hod)).data.find(
      (n) => n.kind === 'leave.waiting',
    );
    assert.equal(forHod?.title, 'Leave request from ntasha Test');
    assert.equal(
      forHod?.link,
      `/leave?tab=requests&request=${applied.data.id}`,
    );
    assert.equal(
      (await mine(eceFaculty)).data.some((n) => n.kind === 'leave.waiting'),
      false,
    );

    await t.request(
      'PATCH',
      `/leave/requests/${applied.data.id}/approve`,
      hod.token,
      {},
    );
    assert.equal((await mine(asha)).data[0]?.kind, 'leave.progress');
    assert.ok(
      (await mine(hr)).data.some(
        (n) => n.kind === 'leave.waiting' && n.link?.includes(applied.data.id),
      ),
    );
    await t.request(
      'PATCH',
      `/leave/requests/${applied.data.id}/approve`,
      hr.token,
      {},
    );
    assert.equal((await mine(asha)).data[0]?.kind, 'leave.approved');
  });

  test('pages, read one, read all; nobody reads another’s', async () => {
    for (const title of ['One', 'Two', 'Three']) {
      await t.prisma.notification.create({
        data: {
          userId: (
            await t.prisma.user.findUniqueOrThrow({
              where: { employeeId: eceFaculty.id },
            })
          ).id,
          kind: 'announcement',
          title,
          body: 'x',
        },
      });
    }
    const first = await mine(eceFaculty, '?limit=2');
    assert.equal(first.data.length, 2);
    assert.equal(first.hasMore, true);
    const rest = await mine(eceFaculty, `?limit=2&after=${first.data[1]!.id}`);
    assert.ok(rest.data.every((n) => !first.data.some((m) => m.id === n.id)));

    const before = await unread(eceFaculty);
    const id = first.data[0]!.id;
    assert.equal(
      (await t.request('PATCH', `/notifications/${id}/read`, asha.token))
        .status,
      404,
      'not hers',
    );
    assert.equal(
      (await t.request('PATCH', `/notifications/${id}/read`, eceFaculty.token))
        .status,
      204,
    );
    assert.equal(await unread(eceFaculty), before - 1);
    await t.request('PATCH', '/notifications/read-all', eceFaculty.token);
    assert.equal(await unread(eceFaculty), 0);
  });

  test('announcements reach the right people, and sockets hear it live', async () => {
    const origin = new URL(t.base).origin;
    const socket = connect(origin, {
      path: '/api/v1/socket.io',
      auth: { token: asha.token },
      transports: ['websocket'],
    });
    await next(socket, 'connect');
    const intruder = connect(origin, {
      path: '/api/v1/socket.io',
      auth: { token: 'not-a-token' },
      transports: ['websocket'],
    });
    const [refused] = (await next(intruder, 'connect_error')) as [Error];
    assert.equal(refused.message, 'UNAUTHENTICATED');
    intruder.close();

    const live = next(socket, 'notifications:changed');
    const toCse = await t.request(
      'POST',
      '/notifications/announcements',
      hod.token,
      { title: 'Department meeting', body: 'Friday 3 pm in the seminar hall.' },
    );
    assert.equal(toCse.status, 201);
    await live;
    socket.close();
    assert.ok(
      (await mine(asha)).data.some((n) => n.title === 'Department meeting'),
    );
    assert.ok(
      !(await mine(eceFaculty)).data.some(
        (n) => n.title === 'Department meeting',
      ),
    );
    assert.equal(
      (
        await t.request('POST', '/notifications/announcements', hod.token, {
          title: 'Other department',
          body: 'Not allowed.',
          departmentId: await t.department('ECE'),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await t.request('POST', '/notifications/announcements', asha.token, {
          title: 'Hello',
          body: 'Faculty cannot announce.',
        })
      ).status,
      403,
    );
    const everyone = await t.request(
      'POST',
      '/notifications/announcements',
      hr.token,
      { title: 'Holiday', body: 'Campus closed on Monday.' },
    );
    assert.ok(everyone.data.recipients >= 3);
    assert.ok((await mine(eceFaculty)).data.some((n) => n.title === 'Holiday'));
    assert.ok(
      !(await mine(hr)).data.some((n) => n.title === 'Holiday'),
      'not to the sender',
    );
    assert.ok(
      await t.prisma.auditLog.findFirst({
        where: { action: 'announcement.send' },
      }),
    );
  });
});
