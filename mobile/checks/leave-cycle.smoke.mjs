// Real backend + persistent local demo database. No fixture mode/reset endpoints.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const origin = 'http://127.0.0.1:4012';
const evidence =
  globalThis.process.env.CYCLE_EVIDENCE || '/tmp/campushr-leave-cycle.json';
const marker = await (await globalThis.fetch(`${origin}/__demo`)).json();
assert.equal(marker.kind, 'campushr-persistent-local-demo');
const sessions = {};
for (const [key, email] of Object.entries({
  faculty: 'faculty-check@jcet.test',
  hod: 'home-check@jcet.test',
  hr: 'hr-check@jcet.test',
  cover: 'coverage-recipient@jcet.test',
})) {
  const response = await globalThis.fetch(
    `${origin}/api/v1/auth/native/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'home-check-only' }),
    },
  );
  assert.equal(response.status, 200, `Sign in ${key}`);
  sessions[key] = await response.json();
}
assert.equal(
  new Set(Object.values(sessions).map((s) => s.user.employeeId)).size,
  4,
);
async function request(who, path, method = 'GET', body, expected = 200) {
  const response = await globalThis.fetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${sessions[who].accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = response.status === 204 ? null : await response.json();
  assert.ok(
    (Array.isArray(expected) ? expected : [expected]).includes(response.status),
    `${who} ${method} ${path}: ${response.status} ${JSON.stringify(json)}`,
  );
  return json?.data;
}
async function verifySaved(saved) {
  const leave = await request('faculty', `/leave/requests/${saved.leaveId}`);
  assert.equal(leave.status, 'APPROVED');
  assert.deepEqual(
    leave.decisions.map((d) => d.role),
    ['HOD', 'HR Admin'],
  );
  const classes = await request('hod', `/substitution/leave/${saved.leaveId}`);
  assert.equal(classes.classes.length, saved.assignments.length);
  assert.ok(
    classes.classes.every(
      (row) => row.coverage?.substitute?.id === sessions.cover.user.employeeId,
    ),
  );
  const duties = await request('cover', '/substitution/mine');
  assert.equal(
    duties.filter(
      (d) =>
        saved.assignments.includes(d.id) &&
        d.date === saved.date &&
        d.coveringFor.id === saved.employeeId,
    ).length,
    saved.assignments.length,
  );
  const facultyNotes = await request('faculty', '/notifications?limit=50');
  assert.ok(
    facultyNotes.some(
      (n) => n.kind === 'leave.approved' && n.link?.includes(saved.leaveId),
    ),
  );
  const coverNotes = await request('cover', '/notifications?limit=50');
  assert.ok(
    coverNotes.some(
      (n) => n.kind === 'substitution.assigned' && n.body.includes(saved.date),
    ),
  );
}
if (globalThis.process.argv.includes('--verify-saved')) {
  await verifySaved(JSON.parse(readFileSync(evidence, 'utf8')));
  globalThis.console.log(
    'Saved leave, decisions, coverage, duties and notifications survive restart: PASS.',
  );
} else {
  const existing = await request(
    'faculty',
    `/leave/requests?employeeId=${sessions.faculty.user.employeeId}`,
  );
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 14);
  while (future.getUTCDay() !== 1) future.setUTCDate(future.getUTCDate() + 1);
  for (
    let attempts = 0;
    attempts < 16;
    attempts++, future.setUTCDate(future.getUTCDate() + 7)
  ) {
    const date = future.toISOString().slice(0, 10);
    if (
      !existing.some(
        (r) =>
          ['PENDING', 'APPROVED'].includes(r.status) &&
          r.startDate <= date &&
          r.endDate >= date,
      )
    )
      break;
    assert.ok(attempts < 15, 'Choose an unused future Monday.');
  }
  const date = future.toISOString().slice(0, 10),
    year = future.getUTCFullYear();
  const balancePath = `/leave/balances?employeeId=${sessions.faculty.user.employeeId}&year=${year}`;
  const before = (await request('faculty', balancePath)).find(
    (b) => b.leaveType.code === 'CL',
  );
  const leave = await request(
    'faculty',
    '/leave/requests',
    'POST',
    {
      leaveTypeId: before.leaveType.id,
      startDate: date,
      endDate: date,
      halfDay: null,
      reason: `Complete approval cycle check ${new Date().toISOString()}`,
    },
    201,
  );
  assert.equal(leave.pendingRole, 'HOD');
  const path = `/leave/requests/${leave.id}`;
  assert.ok(
    (await request('hod', '/leave/requests?awaitingMe=true')).some(
      (r) => r.id === leave.id,
    ),
  );
  await request('hr', `${path}/approve`, 'PATCH', {}, 403);
  await request('faculty', `${path}/approve`, 'PATCH', {}, 403);
  await request(
    'hod',
    `/substitution/leave/${leave.id}`,
    'GET',
    undefined,
    404,
  );
  const recommended = await request('hod', `${path}/approve`, 'PATCH', {
    note: 'Teaching plan reviewed. Recommend HR approval.',
  });
  assert.equal(recommended.status, 'PENDING');
  assert.equal(recommended.pendingRole, 'HR Admin');
  await request('hod', `${path}/approve`, 'PATCH', {}, 403);
  assert.ok(
    (await request('hr', '/leave/requests?awaitingMe=true')).some(
      (r) => r.id === leave.id,
    ),
  );
  const approved = await request('hr', `${path}/approve`, 'PATCH', {
    note: 'Balance checked. Final approval recorded.',
  });
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.pendingRole, null);
  const after = (await request('faculty', balancePath)).find(
    (b) => b.leaveType.code === 'CL',
  );
  assert.equal(after.used, before.used + 1);
  assert.equal(after.pending, before.pending);
  assert.equal(after.remaining, before.remaining - 1);
  const detail = await request('hod', `/substitution/leave/${leave.id}`);
  assert.equal(detail.classes.length, 2);
  const assignments = [];
  for (const slot of detail.classes) {
    const candidates = await request(
      'hod',
      `/substitution/leave/${leave.id}/candidates?entryId=${slot.entry.id}&date=${date}`,
    );
    assert.ok(
      candidates.some(
        (c) => c.faculty.id === sessions.cover.user.employeeId && c.eligible,
      ),
    );
    const body = {
      leaveRequestId: leave.id,
      timetableEntryId: slot.entry.id,
      date,
      substituteId: sessions.cover.user.employeeId,
      note: 'Assigned after final HR approval.',
    };
    const assignment = await request(
      'hod',
      '/substitution/assignments',
      'POST',
      body,
      201,
    );
    assignments.push(assignment.id);
    await request('hod', '/substitution/assignments', 'POST', body, [400, 409]);
  }
  const saved = {
    verifiedAt: new Date().toISOString(),
    date,
    leaveId: leave.id,
    assignments,
    employeeId: sessions.faculty.user.employeeId,
    substituteId: sessions.cover.user.employeeId,
    balance: after,
    expectedRoles: ['HOD', 'HR Admin'],
  };
  await verifySaved(saved);
  writeFileSync(evidence, JSON.stringify(saved, null, 2) + '\n');
  globalThis.console.log(
    `Full leave cycle PASS: ${leave.id}; ${date}; 2 covered classes; stored faculty and substitute notifications. Evidence: ${evidence}`,
  );
}
