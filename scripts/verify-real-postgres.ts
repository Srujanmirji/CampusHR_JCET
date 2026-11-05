// Genuine PostgreSQL sign-off for migrations and annual leave rollover.
//
// Runs against a real PostgreSQL server (not PGlite). Pass an admin URL for a
// disposable local server, e.g.:
//
//   VERIFY_PG_ADMIN_URL=postgresql://user@127.0.0.1:55432/postgres \
//     node --import tsx scripts/verify-real-postgres.ts
//
// It creates (and drops first) three scratch databases on that server. It refuses
// to run against a non-local host or against the server named in DATABASE_URL.
// Migration files are never moved or edited: the "existing data" baseline uses
// a temporary copy of migrations 1–18 in the OS temp directory.
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { createPrismaClient } from '../backend/src/database/prisma.js';
import { HttpError } from '../backend/src/common/http-error.js';
import { createLeavePolicyRepository } from '../backend/src/modules/leave/leave-policy.repository.js';
import { createLeavePolicyService } from '../backend/src/modules/leave/leave-policy.service.js';
import { createLeaveRepository } from '../backend/src/modules/leave/leave.repository.js';
import type { Access } from '../backend/src/modules/auth/auth.service.js';

const backendDir = path.resolve('backend');
const schemaPath = path.join(backendDir, 'src/database/schema.prisma');
const migrationsDir = path.join(backendDir, 'src/database/migrations');
const CLEANUP_MIGRATION = '20261105153000_zero_salary_scope_cleanup';
const SALARY_COLUMNS = ['pay_scale', 'basic_pay', 'agp', 'da_percent', 'hra_percent', 'gross_salary'];

// Load the app's DATABASE_URL only to refuse running against that server.
dotenv.config({ path: path.join(backendDir, '.env'), quiet: true });

const adminUrl = process.env.VERIFY_PG_ADMIN_URL;
if (!adminUrl) {
  console.error('Set VERIFY_PG_ADMIN_URL to an admin URL of a disposable local PostgreSQL server.');
  process.exit(2);
}
const admin = new URL(adminUrl);
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(admin.hostname)) {
  console.error(`Refusing to run against non-local host ${admin.hostname}.`);
  process.exit(2);
}
if (process.env.DATABASE_URL) {
  const app = new URL(process.env.DATABASE_URL);
  if (app.hostname === admin.hostname && (app.port || '5432') === (admin.port || '5432')) {
    console.error('VERIFY_PG_ADMIN_URL is on the same server as DATABASE_URL. Use a separate server.');
    process.exit(2);
  }
}

const redact = (u: string) => {
  const x = new URL(u);
  if (x.password) x.password = '***';
  return x.toString();
};
const dbUrl = (name: string) => {
  const x = new URL(adminUrl);
  x.pathname = `/${name}`;
  return x.toString();
};

async function adminQuery(sql: string) {
  const c = new pg.Client({ connectionString: adminUrl });
  await c.connect();
  try {
    return await c.query(sql);
  } finally {
    await c.end();
  }
}

async function freshDatabase(name: string) {
  await adminQuery(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await adminQuery(`CREATE DATABASE "${name}"`);
  return dbUrl(name);
}

async function withDb<T>(url: string, fn: (c: pg.Client) => Promise<T>) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

function prisma(args: string[], url: string) {
  return new Promise<{ code: number; out: string }>((resolve) => {
    let out = '';
    const child = spawn('npx', ['prisma', ...args], {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL: url },
    });
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code: code ?? 1, out: out.trim() }));
  });
}

function show(label: string, r: { code: number; out: string }, url: string) {
  console.log(`\n$ DATABASE_URL=${redact(url)} npx prisma ${label}`);
  console.log(r.out); // Prisma prints host/port/database only, never credentials
  console.log(`[exit code: ${r.code}]`);
}

async function inspectSchema(url: string) {
  return withDb(url, async (c) => {
    const migrations = await c.query<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null; checksum: string }>(
      `SELECT migration_name, finished_at, rolled_back_at, checksum FROM _prisma_migrations ORDER BY migration_name`,
    );
    const tables = await c.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    const fks = await c.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'`,
    );
    const uniques = await c.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM pg_indexes WHERE schemaname = 'public' AND indexdef LIKE 'CREATE UNIQUE INDEX%'`,
    );
    const indexes = await c.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`,
    );
    const policyFks = await c.query<{ table_name: string; constraint_name: string }>(
      `SELECT table_name, constraint_name FROM information_schema.table_constraints
        WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
          AND table_name IN ('leave_policies','leave_balance_adjustments','employee_policy_groups','leave_requests','onboarding_candidates','employees')
        ORDER BY table_name, constraint_name`,
    );
    const candidateCols = await c.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_candidates'`,
    );
    return {
      migrations: migrations.rows,
      tableCount: Number(tables.rows[0]!.n),
      fkCount: Number(fks.rows[0]!.n),
      uniqueCount: Number(uniques.rows[0]!.n),
      indexes: indexes.rows,
      policyFks: policyFks.rows,
      candidateCols: new Set(candidateCols.rows.map((r) => r.column_name)),
    };
  });
}

function assertSchema(s: Awaited<ReturnType<typeof inspectSchema>>, label: string) {
  const onDisk = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(migrationsDir, e.name, 'migration.sql')))
    .map((e) => e.name)
    .sort();
  assert.equal(onDisk.length, 19, 'expected 19 migration directories on disk');
  assert.deepEqual(s.migrations.map((m) => m.migration_name), onDisk, `${label}: _prisma_migrations matches disk`);
  for (const m of s.migrations) {
    assert.ok(m.finished_at, `${m.migration_name} finished`);
    assert.equal(m.rolled_back_at, null, `${m.migration_name} not rolled back`);
  }
  const names = s.indexes.map((i) => i.indexname);
  const rollover = s.indexes.find((i) => i.indexname === 'leave_balance_adjustments_employee_id_leave_code_policy_yea_key');
  assert.ok(rollover?.indexdef.startsWith('CREATE UNIQUE INDEX'), 'rollover unique index exists');
  assert.ok(
    ['employee_id', 'leave_code', 'policy_year', 'adjustment_type', 'rollover_from_year'].every((col) => rollover!.indexdef.includes(col)),
    'rollover unique index covers employee, leave code, policy year, adjustment type, source year',
  );
  assert.ok(names.some((n) => n.startsWith('leave_policies_code_policy_year_employee_category_department')), 'leave_policies unique index');
  assert.ok(names.includes('employee_policy_groups_name_key'), 'employee_policy_groups name unique');
  for (const col of SALARY_COLUMNS) assert.ok(!s.candidateCols.has(col), `${label}: ${col} absent`);
  for (const col of ['probation_months', 'notice_period_months', 'appointment_ref_no', 'qualification']) {
    assert.ok(s.candidateCols.has(col), `${label}: ${col} present`);
  }
  const fkTables = new Set(s.policyFks.map((f) => f.table_name));
  for (const t of ['leave_policies', 'leave_balance_adjustments', 'leave_requests', 'onboarding_candidates', 'employees']) {
    assert.ok(fkTables.has(t), `${label}: ${t} has foreign keys`);
  }
  console.log(`\n[${label}] _prisma_migrations: ${s.migrations.length} rows, all finished, none rolled back, names match disk`);
  console.log(`[${label}] public tables: ${s.tableCount}, foreign keys: ${s.fkCount}, unique indexes: ${s.uniqueCount}, indexes: ${s.indexes.length}`);
  console.log(`[${label}] rollover unique index: ${rollover!.indexdef}`);
  console.log(`[${label}] FKs on key tables: ${s.policyFks.map((f) => `${f.table_name}.${f.constraint_name}`).join(', ')}`);
  console.log(`[${label}] salary columns on onboarding_candidates: none of ${SALARY_COLUMNS.join(', ')}`);
}

// Tables created or altered by the leave-policy / zero-salary work on this branch.
const BRANCH_TABLES = [
  'leave_policies',
  'leave_balance_adjustments',
  'employee_policy_groups',
  'on_duty_duty_mappings',
  'leave_requests',
  'leave_types',
  'employees',
  'onboarding_candidates',
];
// Drift that already exists on origin/main (migrations 20261101170000,
// 20261105000000, 20261105003000). Reported, not fixed here: unrelated features.
const KNOWN_MAIN_DRIFT = ['circulars', 'exam_duties', 'exam_sessions', 'work_assignments', 'password_reset_challenges'];

async function driftCheck(url: string, label: string) {
  const r = await prisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'src/database/schema.prisma', '--exit-code'], url);
  show('migrate diff --from-config-datasource --to-schema src/database/schema.prisma --exit-code', r, url);
  const drifted = [...r.out.matchAll(/Changed the `([^`]+)` table/g)].map((m) => m[1]!);
  const branchDrift = drifted.filter((t) => BRANCH_TABLES.includes(t));
  const unknown = drifted.filter((t) => !KNOWN_MAIN_DRIFT.includes(t) && !BRANCH_TABLES.includes(t));
  console.log(`[${label}] drift on branch tables: ${branchDrift.length ? branchDrift.join(', ') : 'none'}`);
  console.log(`[${label}] pre-existing drift inherited from main: ${drifted.filter((t) => KNOWN_MAIN_DRIFT.includes(t)).join(', ') || 'none'}`);
  assert.deepEqual(branchDrift, [], `${label}: no drift on tables changed by this branch`);
  assert.deepEqual(unknown, [], `${label}: no unexpected drift`);
}

// ---------------------------------------------------------------------------

async function cleanDatabase(version: string) {
  console.log('\n================ TEST 1: clean database ================');
  const url = await freshDatabase('campushr_verify_clean');

  const v = await prisma(['validate'], url);
  show('validate', v, url);
  assert.equal(v.code, 0);

  const d = await prisma(['migrate', 'deploy'], url);
  show('migrate deploy', d, url);
  assert.equal(d.code, 0);

  const s = await prisma(['migrate', 'status'], url);
  show('migrate status', s, url);
  assert.equal(s.code, 0);
  assert.match(s.out, /Database schema is up to date/);

  assertSchema(await inspectSchema(url), 'clean');
  await driftCheck(url, 'clean');
  console.log(`\nTEST 1 PASSED on ${version}`);
}

async function existingDataDatabase() {
  console.log('\n================ TEST 2: existing-data database ================');
  const url = await freshDatabase('campushr_verify_existing');

  // Baseline: deploy migrations 1–18 from a temporary copy so checksums match.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'campushr-migrations-'));
  const tmpMigrations = path.join(tmp, 'migrations');
  fs.cpSync(migrationsDir, tmpMigrations, { recursive: true });
  fs.rmSync(path.join(tmpMigrations, CLEANUP_MIGRATION), { recursive: true, force: true });
  const tmpConfig = path.join(tmp, 'prisma.config.mjs');
  fs.writeFileSync(
    tmpConfig,
    `export default { schema: ${JSON.stringify(schemaPath)}, migrations: { path: ${JSON.stringify(tmpMigrations)} }, datasource: { url: process.env.DATABASE_URL } };\n`,
  );
  let baseline: { code: number; out: string };
  try {
    baseline = await prisma(['migrate', 'deploy', '--config', tmpConfig], url);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  show('migrate deploy --config <temp copy of migrations 1–18>', baseline, url);
  assert.equal(baseline.code, 0);
  assert.match(baseline.out, /18 migrations found/);

  const ids = {
    facultyUser: randomUUID(),
    staffUser: randomUUID(),
    facultyEmp: randomUUID(),
    staffEmp: randomUUID(),
    candidate: randomUUID(),
    reqFaculty: randomUUID(),
    reqStaff: randomUUID(),
    policyFaculty: randomUUID(),
    policyStaff: randomUUID(),
  };

  await withDb(url, async (c) => {
    await c.query(`
      INSERT INTO roles (id, name) VALUES (301, 'Faculty'), (302, 'Staff');
      INSERT INTO departments (id, code, name, updated_at) VALUES (101, 'CSE', 'Computer Science and Engineering', now());
      INSERT INTO designations (id, name, level, category) VALUES
        (201, 'Assistant Professor', 1, 'TEACHING'),
        (202, 'Office Superintendent', 2, 'NON_TEACHING');
      INSERT INTO users (id, email, password_hash, role_id, updated_at) VALUES
        ('${ids.facultyUser}', 'faculty.cs@jcet.ac.in', 'hash', 301, now()),
        ('${ids.staffUser}', 'staff.office@jcet.ac.in', 'hash', 302, now());
      INSERT INTO employees (id, employee_code, first_name, last_name, email, phone, department_id, designation_id, employment_type, joining_date, updated_at) VALUES
        ('${ids.facultyEmp}', 'JCET-CSE-001', 'Ramesh', 'Patil', 'ramesh.p@jcet.ac.in', '9876543210', 101, 201, 'PERMANENT', '2024-01-01', now()),
        ('${ids.staffEmp}', 'JCET-ADM-001', 'Suresh', 'Kumar', 'suresh.k@jcet.ac.in', '9876543211', 101, 202, 'PERMANENT', '2024-01-01', now());
      UPDATE users SET employee_id = '${ids.facultyEmp}' WHERE id = '${ids.facultyUser}';
      UPDATE users SET employee_id = '${ids.staffEmp}' WHERE id = '${ids.staffUser}';
      INSERT INTO leave_types (id, code, name, yearly_quota, allow_half_day, carry_forward_max, active, updated_at) VALUES
        (401, 'CL', 'Casual Leave', 12, true, 0, true, now()),
        (402, 'EL', 'Earned Leave', 10, false, 0, true, now());
      INSERT INTO leave_requests (id, employee_id, leave_type_id, department_id, start_date, end_date, days, reason, status, approver_roles, updated_at) VALUES
        ('${ids.reqFaculty}', '${ids.facultyEmp}', 401, 101, '2026-11-10', '2026-11-10', 1, 'Teaching CL request', 'APPROVED', ARRAY['HOD']::text[], now()),
        ('${ids.reqStaff}', '${ids.staffEmp}', 402, 101, '2026-11-11', '2026-11-12', 2, 'Non-teaching EL request', 'PENDING', ARRAY['HR_ADMIN']::text[], now());
    `);
    // Leave policies exist from migration 18; insert one per workforce category.
    await c.query(
      `INSERT INTO leave_policies (id, code, name, policy_year, employee_category, leave_type_id, annual_entitlement, effective_from, updated_at)
       VALUES ($1, 'CL', 'Casual Leave (Teaching)', '2026', 'TEACHING', 401, 12, '2026-01-01', now()),
              ($2, 'EL', 'Earned Leave (Non-Teaching)', '2026', 'NON_TEACHING', 402, 10, '2026-01-01', now())`,
      [ids.policyFaculty, ids.policyStaff],
    );
    await c.query(
      `INSERT INTO onboarding_candidates (
         id, appointment_ref_no, first_name, last_name, email, phone, department_id, designation_id,
         employment_type, qualification, expected_joining_date,
         pay_scale, basic_pay, agp, da_percent, hra_percent, gross_salary,
         probation_months, notice_period_months, updated_at)
       VALUES ($1, 'JCET/APPT/2026/001', 'Pooja', 'Hegde', 'pooja.hegde@jcet.ac.in', '9876543299', 101, 201,
         'PERMANENT', 'Ph.D', '2026-12-01',
         'Level 10', 57700, 0, 50, 18, 96936, 12, 3, now())`,
      [ids.candidate],
    );
  });

  const snapshot = (c: pg.Client) =>
    Promise.all([
      c.query(`SELECT id, employee_code, first_name, last_name, email, phone, department_id, designation_id, employment_type::text, joining_date::text FROM employees ORDER BY id`),
      c.query(`SELECT id, employee_id, leave_type_id, department_id, start_date::text, end_date::text, days::text, reason, status::text FROM leave_requests ORDER BY id`),
      c.query(`SELECT id, code, name, policy_year, employee_category::text, leave_type_id, annual_entitlement::text FROM leave_policies ORDER BY id`),
      c.query(`SELECT id, appointment_ref_no, first_name, last_name, email, phone, department_id, designation_id, employment_type::text, qualification, expected_joining_date::text, probation_months, notice_period_months FROM onboarding_candidates ORDER BY id`),
    ]).then(([e, r, p, o]) => ({ employees: e.rows, leaveRequests: r.rows, leavePolicies: p.rows, candidates: o.rows }));

  const before = await withDb(url, snapshot);
  const salaryBefore = await withDb(url, (c) => c.query(`SELECT gross_salary::text FROM onboarding_candidates`));
  console.log(
    `\nSeeded before cleanup migration: employees=${before.employees.length}, leave_requests=${before.leaveRequests.length}, ` +
      `leave_policies=${before.leavePolicies.length}, onboarding_candidates=${before.candidates.length} (gross_salary present: ${salaryBefore.rows[0]!.gross_salary})`,
  );

  const d = await prisma(['migrate', 'deploy'], url);
  show('migrate deploy', d, url);
  assert.equal(d.code, 0);
  assert.match(d.out, new RegExp(`Applying migration \`${CLEANUP_MIGRATION}\``));

  const s = await prisma(['migrate', 'status'], url);
  show('migrate status', s, url);
  assert.equal(s.code, 0);
  assert.match(s.out, /Database schema is up to date/);

  const after = await withDb(url, snapshot);
  assert.deepEqual(after, before, 'all non-financial employee, leave request, leave policy and candidate fields unchanged');
  console.log(
    `\nAfter cleanup migration: employees=${after.employees.length}, leave_requests=${after.leaveRequests.length}, ` +
      `leave_policies=${after.leavePolicies.length}, onboarding_candidates=${after.candidates.length} — every non-financial column identical to before`,
  );
  const gone = await withDb(url, (c) => c.query(`SELECT gross_salary FROM onboarding_candidates`).then(() => null, (e: Error) => e.message));
  assert.equal(gone, 'column "gross_salary" does not exist');
  console.log(`SELECT gross_salary → ERROR: ${gone}`);

  assertSchema(await inspectSchema(url), 'existing-data');
  await driftCheck(url, 'existing-data');
  console.log('\nTEST 2 PASSED');
}

async function rolloverConcurrency() {
  console.log('\n================ TEST 3: application-level rollover concurrency ================');
  const url = await freshDatabase('campushr_verify_rollover');
  const d = await prisma(['migrate', 'deploy'], url);
  assert.equal(d.code, 0, d.out);

  const setup = createPrismaClient(url);
  const dept = await setup.department.create({ data: { code: 'MECH', name: 'Mechanical Engineering' } });
  const desig = await setup.designation.create({ data: { name: 'Assistant Professor', level: 1, category: 'TEACHING' } });
  const hrRole = await setup.role.create({ data: { name: 'HR Admin' } });
  const hrUser = await setup.user.create({ data: { email: 'hr.verify@jcet.ac.in', passwordHash: 'x', roleId: hrRole.id } });
  const emp = await setup.employee.create({
    data: {
      employeeCode: 'JCET-MECH-005',
      firstName: 'Prashant',
      lastName: 'Kulkarni',
      email: 'prashant.k@jcet.ac.in',
      departmentId: dept.id,
      designationId: desig.id,
      employmentType: 'PERMANENT',
      joiningDate: new Date('2024-01-01'),
    },
  });
  const el = await setup.leaveType.create({ data: { code: 'EL', name: 'Earned Leave', yearlyQuota: 10, carryForwardMax: 15, active: true } });
  for (const year of ['2026', '2027', '2028']) {
    await setup.leavePolicy.create({
      data: {
        code: 'EL',
        name: `Earned Leave ${year}`,
        policyYear: year,
        effectiveFrom: new Date(`${year}-01-01`),
        employeeCategory: 'TEACHING',
        leaveType: { connect: { id: el.id } },
        annualEntitlement: 10,
        carryForwardAllowed: true,
      },
    });
  }

  const access: Access = { userId: hrUser.id, role: 'HR Admin', scope: 'all', employeeId: null, departmentId: null } as Access;

  // Each "server" is an independent stack: its own Prisma client and pool,
  // repositories and service instance (so no shared in-memory lock).
  const makeServer = () => {
    const client = createPrismaClient(url);
    const service = createLeavePolicyService(createLeavePolicyRepository(client), createLeaveRepository(client));
    return { client, service };
  };

  const entries = (from: number, to: number) => [
    {
      employeeId: emp.id,
      leaveCode: 'EL',
      policyYear: String(to),
      adjustmentType: 'CARRY_FORWARD_CORRECTION' as const,
      days: 8,
      reason: `[ANNUAL_ROLLOVER_${from}_${to}] Carried forward 8 days from ${from}`,
    },
    {
      employeeId: emp.id,
      leaveCode: 'EL',
      policyYear: String(to),
      adjustmentType: 'LAPSE' as const,
      days: 2,
      reason: `[ANNUAL_ROLLOVER_${from}_${to}] Lapsed 2 unused days from ${from}`,
    },
  ];

  const ledger = async (to: number) => {
    const rows = await setup.leaveBalanceAdjustment.findMany({
      where: { employeeId: emp.id, leaveCode: 'EL', policyYear: String(to) },
      orderBy: { adjustmentType: 'asc' },
    });
    const carried = rows.filter((r) => r.adjustmentType === 'CARRY_FORWARD_CORRECTION').reduce((a, r) => a + r.days, 0);
    const lapsed = rows.filter((r) => r.adjustmentType === 'LAPSE').reduce((a, r) => a + r.days, 0);
    return { rows, carried, lapsed };
  };

  const describe = (r: PromiseSettledResult<unknown>) =>
    r.status === 'fulfilled'
      ? `fulfilled (${(r.value as unknown[]).length} adjustments)`
      : r.reason instanceof HttpError
        ? `rejected HttpError ${r.reason.status} ${r.reason.code}: ${r.reason.message}`
        : `rejected ${(r.reason as Error)?.constructor?.name}: ${(r.reason as { code?: string })?.code ?? ''} ${(r.reason as Error)?.message}`;

  const checkRace = async (label: string, results: PromiseSettledResult<unknown>[], to: number) => {
    results.forEach((r, i) => console.log(`  request ${i + 1}: ${describe(r)}`));
    const ok = results.filter((r) => r.status === 'fulfilled');
    const bad = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const l = await ledger(to);
    console.log(`  DB: ${l.rows.length} rows for policy_year=${to} (CARRY_FORWARD_CORRECTION=${l.carried} days, LAPSE=${l.lapsed} days)`);
    assert.equal(ok.length, 1, `${label}: exactly one request succeeds`);
    for (const b of bad) {
      assert.ok(b.reason instanceof HttpError, `${label}: loser gets an HttpError, got ${describe(b)}`);
      assert.equal(b.reason.status, 409);
      assert.equal(b.reason.code, 'ROLLOVER_ALREADY_EXECUTED');
    }
    assert.equal(l.rows.length, 2, `${label}: exactly one carry-forward and one lapse row`);
    assert.equal(l.carried, 8, `${label}: carried forward credited once`);
    assert.equal(l.lapsed, 2, `${label}: lapse recorded once`);
  };

  // 3a — one API process, two simultaneous requests.
  console.log('\n3a. Same process (one service instance), 2025 → 2026');
  const single = makeServer();
  await checkRace(
    '3a',
    await Promise.allSettled([
      single.service.executeRolloverLedger(access, 2025, 2026, entries(2025, 2026)),
      single.service.executeRolloverLedger(access, 2025, 2026, entries(2025, 2026)),
    ]),
    2026,
  );

  // 3b — two independent API processes racing in PostgreSQL; repeated to hit the race.
  const a = makeServer();
  const b = makeServer();
  console.log('\n3b. Two independent service instances / connection pools, 2026 → 2027');
  await checkRace(
    '3b',
    await Promise.allSettled([
      a.service.executeRolloverLedger(access, 2026, 2027, entries(2026, 2027)),
      b.service.executeRolloverLedger(access, 2026, 2027, entries(2026, 2027)),
    ]),
    2027,
  );

  // 3c — repeated cross-instance races, each against a fresh target year row set.
  console.log('\n3c. 20 repeated cross-instance races (2027 → 2028 reset between rounds)');
  const outcomes: Record<string, number> = {};
  for (let round = 1; round <= 20; round++) {
    await setup.leaveBalanceAdjustment.deleteMany({ where: { policyYear: '2028' } });
    const results = await Promise.allSettled([
      a.service.executeRolloverLedger(access, 2027, 2028, entries(2027, 2028)),
      b.service.executeRolloverLedger(access, 2027, 2028, entries(2027, 2028)),
    ]);
    for (const r of results) {
      const key = r.status === 'fulfilled' ? 'fulfilled' : describe(r).replace(/:.*/, '');
      outcomes[key] = (outcomes[key] ?? 0) + 1;
    }
    const l = await ledger(2028);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    if (ok !== 1 || l.rows.length !== 2 || l.carried !== 8 || l.lapsed !== 2) {
      results.forEach((r, i) => console.log(`  round ${round} request ${i + 1}: ${describe(r)}`));
      console.log(`  round ${round} DB rows=${l.rows.length} carried=${l.carried} lapsed=${l.lapsed}`);
    }
    assert.equal(ok, 1, `3c round ${round}: exactly one success`);
    for (const r of results) {
      if (r.status === 'rejected') {
        assert.ok(r.reason instanceof HttpError && r.reason.status === 409, `3c round ${round}: ${describe(r)}`);
      }
    }
    assert.equal(l.rows.length, 2, `3c round ${round}: two rows`);
    assert.equal(l.carried, 8);
    assert.equal(l.lapsed, 2);
  }
  console.log(`  outcomes over 40 requests: ${JSON.stringify(outcomes)}`);
  console.log('  every round: exactly 1 success, 2 rows (8 carried, 2 lapsed), loser 409');

  // 3d — partial-failure atomicity: second entry violates an FK, so nothing may be committed.
  console.log('\n3d. Failing transaction leaves no partial ledger rows (2028 → 2029)');
  await setup.leavePolicy.create({
    data: {
      code: 'EL',
      name: 'Earned Leave 2029',
      policyYear: '2029',
      effectiveFrom: new Date('2029-01-01'),
      employeeCategory: 'TEACHING',
      leaveType: { connect: { id: el.id } },
      annualEntitlement: 10,
      carryForwardAllowed: true,
    },
  });
  const repo = createLeavePolicyRepository(a.client);
  const partial = await repo
    .executeRolloverAdjustments!(2028, 2029, [
      { employeeId: emp.id, leaveCode: 'EL', policyYear: '2029', rolloverFromYear: 2028, adjustmentType: 'CARRY_FORWARD_CORRECTION', days: 8, reason: '[ANNUAL_ROLLOVER_2028_2029] ok', actorUserId: hrUser.id },
      { employeeId: randomUUID(), leaveCode: 'EL', policyYear: '2029', rolloverFromYear: 2028, adjustmentType: 'LAPSE', days: 2, reason: '[ANNUAL_ROLLOVER_2028_2029] bad employee', actorUserId: hrUser.id },
    ])
    .then(() => 'committed', (e: Error) => `${e.constructor.name}: ${(e as { code?: string }).code ?? ''}`);
  const afterFail = await ledger(2029);
  console.log(`  failing batch result: ${partial}`);
  console.log(`  DB: ${afterFail.rows.length} rows for policy_year=2029`);
  assert.notEqual(partial, 'committed');
  assert.equal(afterFail.rows.length, 0, 'no partial rows after failed transaction');

  // 3e — retries: after a failure the corrected request succeeds once; repeating it is a safe 409.
  console.log('\n3e. Retry after failure, then repeat retries');
  const retry1 = await Promise.allSettled([a.service.executeRolloverLedger(access, 2028, 2029, entries(2028, 2029))]);
  console.log(`  retry 1: ${describe(retry1[0]!)}`);
  assert.equal(retry1[0]!.status, 'fulfilled');
  for (const [i, svc] of [a.service, b.service, single.service].entries()) {
    const r = await Promise.allSettled([svc.executeRolloverLedger(access, 2028, 2029, entries(2028, 2029))]);
    console.log(`  repeat ${i + 1}: ${describe(r[0]!)}`);
    assert.equal(r[0]!.status, 'rejected');
    assert.ok((r[0] as PromiseRejectedResult).reason instanceof HttpError);
    assert.equal(((r[0] as PromiseRejectedResult).reason as HttpError).status, 409);
  }
  const final = await ledger(2029);
  console.log(`  DB: ${final.rows.length} rows for policy_year=2029 (carried=${final.carried}, lapsed=${final.lapsed})`);
  assert.equal(final.rows.length, 2);
  assert.equal(final.carried, 8);
  assert.equal(final.lapsed, 2);

  const total = await setup.leaveBalanceAdjustment.groupBy({ by: ['policyYear', 'adjustmentType'], _count: true, _sum: { days: true }, orderBy: { policyYear: 'asc' } });
  console.log('\n  Final leave_balance_adjustments by policy_year / type:');
  for (const t of total) console.log(`    ${t.policyYear} ${t.adjustmentType}: rows=${t._count} days=${t._sum.days}`);

  await Promise.all([setup.$disconnect(), single.client.$disconnect(), a.client.$disconnect(), b.client.$disconnect()]);
  console.log('\nTEST 3 PASSED');
}

async function main() {
  console.log(`Target server: ${redact(adminUrl!)}`);
  const version = (await adminQuery('SELECT version()')).rows[0].version as string;
  console.log(`SELECT version(): ${version}`);
  assert.ok(!/pglite/i.test(version), 'must not be PGlite');
  await cleanDatabase(version);
  await existingDataDatabase();
  await rolloverConcurrency();
  console.log('\nALL GENUINE POSTGRESQL CHECKS PASSED (3/3)');
}

main().catch((e) => {
  console.error('\nVERIFICATION FAILED:', e);
  process.exit(1);
});
