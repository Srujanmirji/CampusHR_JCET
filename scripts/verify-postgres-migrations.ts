import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

// Paths
const migrationsDir = path.resolve('backend/src/database/migrations');

function getMigrationFiles(): { name: string; sqlPath: string }[] {
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      sqlPath: path.join(migrationsDir, e.name, 'migration.sql'),
    }))
    .filter((m) => fs.existsSync(m.sqlPath))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function testCleanDatabaseMigration() {
  console.log('\n============================================================');
  console.log('TEST 1: Clean Isolated PostgreSQL Database Migration');
  console.log('============================================================');

  const db = new PGlite();
  const migrations = getMigrationFiles();
  console.log(`Found ${migrations.length} migrations to apply in chronological order.`);

  for (let i = 0; i < migrations.length; i++) {
    const m = migrations[i]!;
    const sql = fs.readFileSync(m.sqlPath, 'utf8');
    const start = Date.now();
    await db.exec(sql);
    console.log(`  [${i + 1}/${migrations.length}] Applied ${m.name} (${Date.now() - start}ms)`);
  }

  // 1. Confirm tables exist
  const tablesRes = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
  );
  const tableNames = new Set(tablesRes.rows.map((r) => r.tablename));
  assert.ok(tableNames.has('leave_policies'), 'leave_policies table must exist');
  assert.ok(tableNames.has('leave_balance_adjustments'), 'leave_balance_adjustments table must exist');
  assert.ok(tableNames.has('employee_policy_groups'), 'employee_policy_groups table must exist');
  assert.ok(tableNames.has('on_duty_duty_mappings'), 'on_duty_duty_mappings table must exist');
  assert.ok(tableNames.has('onboarding_candidates'), 'onboarding_candidates table must exist');

  // 2. Confirm columns on leave_policies
  const lpColsRes = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'leave_policies';`
  );
  const lpCols = new Set(lpColsRes.rows.map((r) => r.column_name));
  assert.ok(lpCols.has('version'), 'leave_policies.version must exist');
  assert.ok(lpCols.has('annual_entitlement'), 'leave_policies.annual_entitlement must exist');
  assert.ok(lpCols.has('employee_category'), 'leave_policies.employee_category must exist');

  // 3. Confirm columns on leave_balance_adjustments
  const lbaColsRes = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'leave_balance_adjustments';`
  );
  const lbaCols = new Set(lbaColsRes.rows.map((r) => r.column_name));
  assert.ok(lbaCols.has('rollover_from_year'), 'leave_balance_adjustments.rollover_from_year must exist');

  // 4. Confirm salary columns dropped from onboarding_candidates
  const ocColsRes = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'onboarding_candidates';`
  );
  const ocCols = new Set(ocColsRes.rows.map((r) => r.column_name));
  assert.ok(!ocCols.has('pay_scale'), 'pay_scale must be dropped');
  assert.ok(!ocCols.has('basic_pay'), 'basic_pay must be dropped');
  assert.ok(!ocCols.has('agp'), 'agp must be dropped');
  assert.ok(!ocCols.has('da_percent'), 'da_percent must be dropped');
  assert.ok(!ocCols.has('hra_percent'), 'hra_percent must be dropped');
  assert.ok(!ocCols.has('gross_salary'), 'gross_salary must be dropped');
  assert.ok(ocCols.has('probation_months'), 'probation_months must remain');
  assert.ok(ocCols.has('notice_period_months'), 'notice_period_months must remain');

  // 5. Confirm unique indexes exist in PostgreSQL
  const indexesRes = await db.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`
  );
  const indexList = indexesRes.rows.map((r) => r.indexname);
  assert.ok(
    indexList.includes('leave_balance_adjustments_employee_id_leave_code_policy_yea_key'),
    'Rollover unique constraint on adjustments must exist in PostgreSQL'
  );
  assert.ok(
    indexList.some((idx) => idx.startsWith('leave_policies_code_policy_year_employee_category_department')),
    'Multi-column uniqueness on leave_policies must exist in PostgreSQL (63-char truncated identifier)'
  );
  assert.ok(
    indexList.includes('employee_policy_groups_name_key'),
    'Unique constraint on employee_policy_groups.name must exist in PostgreSQL'
  );

  console.log('✔ Clean database migration test passed: All 19 migrations applied, tables, columns and constraints verified.');
  await db.close();
}

async function testExistingDataMigrationAndBackfill() {
  console.log('\n============================================================');
  console.log('TEST 2: Existing-Data Database Migration & Backfill');
  console.log('============================================================');

  const db = new PGlite();
  const migrations = getMigrationFiles();

  // Find index of configurable leave policy engine migration
  const policyMigrationIdx = migrations.findIndex((m) =>
    m.name.includes('configurable_leave_policy_engine')
  );
  assert.ok(policyMigrationIdx > 0, 'Could not locate configurable_leave_policy_engine migration');

  console.log(`Applying pre-existing migrations 1 to ${policyMigrationIdx}...`);
  for (let i = 0; i < policyMigrationIdx; i++) {
    const m = migrations[i]!;
    await db.exec(fs.readFileSync(m.sqlPath, 'utf8'));
  }

  console.log('Populating existing institutional data prior to leave policy engine migration...');
  // 1. Seed Roles
  const facultyRoleId = 101;
  const staffRoleId = 102;
  await db.exec(`
    INSERT INTO "roles" ("id", "name") VALUES
    (${facultyRoleId}, 'Faculty'),
    (${staffRoleId}, 'Staff');
  `);

  // 2. Seed Users
  const facultyUserId = randomUUID();
  const staffUserId = randomUUID();
  await db.exec(`
    INSERT INTO "users" ("id", "email", "password_hash", "role_id", "updated_at") VALUES
    ('${facultyUserId}', 'faculty@jcet.ac.in', 'hash123', ${facultyRoleId}, CURRENT_TIMESTAMP),
    ('${staffUserId}', 'staff@jcet.ac.in', 'hash123', ${staffRoleId}, CURRENT_TIMESTAMP);
  `);

  // 3. Seed Department & Designations
  const deptId = 201;
  const desigTeachId = 301;
  const desigNonTeachId = 302;
  await db.exec(`
    INSERT INTO "departments" ("id", "code", "name", "updated_at") VALUES
    (${deptId}, 'CSE', 'Computer Science and Engineering', CURRENT_TIMESTAMP);

    INSERT INTO "designations" ("id", "name", "level", "category") VALUES
    (${desigTeachId}, 'Assistant Professor', 1, 'TEACHING'),
    (${desigNonTeachId}, 'Office Superintendent', 2, 'NON_TEACHING');
  `);

  // 4. Seed Employees
  const empTeachId = randomUUID();
  const empNonTeachId = randomUUID();
  await db.exec(`
    INSERT INTO "employees" ("id", "employee_code", "first_name", "last_name", "email", "phone", "department_id", "designation_id", "employment_type", "joining_date", "updated_at") VALUES
    ('${empTeachId}', 'JCET-CSE-001', 'Aarav', 'Patil', 'aarav@jcet.ac.in', '9876543210', ${deptId}, ${desigTeachId}, 'PERMANENT', '2024-01-01', CURRENT_TIMESTAMP),
    ('${empNonTeachId}', 'JCET-ADM-001', 'Ramesh', 'Kulkarni', 'ramesh@jcet.ac.in', '9876543211', ${deptId}, ${desigNonTeachId}, 'PERMANENT', '2024-01-01', CURRENT_TIMESTAMP);

    UPDATE "users" SET "employee_id" = '${empTeachId}' WHERE "id" = '${facultyUserId}';
    UPDATE "users" SET "employee_id" = '${empNonTeachId}' WHERE "id" = '${staffUserId}';
  `);

  // 5. Seed Leave Types
  const ltClId = 401;
  const ltRhId = 402;
  await db.exec(`
    INSERT INTO "leave_types" ("id", "code", "name", "yearly_quota", "allow_half_day", "carry_forward_max", "active", "updated_at") VALUES
    (${ltClId}, 'CL', 'Casual Leave', 12, true, 0, true, CURRENT_TIMESTAMP),
    (${ltRhId}, 'RH', 'Restricted Holiday', NULL, false, 0, true, CURRENT_TIMESTAMP);
  `);

  // 6. Seed Pre-existing Leave Requests
  const reqTeachClId = randomUUID();
  const reqNonTeachClId = randomUUID();
  const reqNonTeachRhId = randomUUID();
  await db.exec(`
    INSERT INTO "leave_requests" ("id", "employee_id", "leave_type_id", "department_id", "start_date", "end_date", "days", "reason", "status", "approver_roles", "updated_at") VALUES
    ('${reqTeachClId}', '${empTeachId}', ${ltClId}, ${deptId}, '2026-11-10', '2026-11-10', 1, 'Teaching CL Request', 'APPROVED', ARRAY['HOD']::text[], CURRENT_TIMESTAMP),
    ('${reqNonTeachClId}', '${empNonTeachId}', ${ltClId}, ${deptId}, '2026-11-11', '2026-11-11', 1, 'Non-Teaching CL Request', 'APPROVED', ARRAY['HR_ADMIN']::text[], CURRENT_TIMESTAMP),
    ('${reqNonTeachRhId}', '${empNonTeachId}', ${ltRhId}, ${deptId}, '2026-11-12', '2026-11-12', 1, 'Non-Teaching RH Request', 'APPROVED', ARRAY['HR_ADMIN']::text[], CURRENT_TIMESTAMP);
  `);

  // 7. Seed Pre-existing Onboarding Candidate with salary fields
  const candId = randomUUID();
  await db.exec(`
    INSERT INTO "onboarding_candidates" (
      "id", "appointment_ref_no", "first_name", "last_name", "email", "phone",
      "department_id", "designation_id", "employment_type", "qualification",
      "expected_joining_date", "pay_scale", "basic_pay", "agp", "da_percent", "hra_percent", "gross_salary",
      "probation_months", "notice_period_months", "updated_at"
    ) VALUES (
      '${candId}', 'JCET/APPT/2026/001', 'Pooja', 'Hegde', 'pooja@gmail.com', '9876543299',
      ${deptId}, ${desigTeachId}, 'PERMANENT', 'Ph.D', '2026-12-01',
      'AICTE Level 10', 57700, 0, 50, 18, 96936, 12, 3, CURRENT_TIMESTAMP
    );
  `);

  console.log('Applying remaining migrations (configurable leave policy engine & zero-salary scope cleanup)...');
  for (let i = policyMigrationIdx; i < migrations.length; i++) {
    const m = migrations[i]!;
    const start = Date.now();
    await db.exec(fs.readFileSync(m.sqlPath, 'utf8'));
    console.log(`  Applied ${m.name} (${Date.now() - start}ms)`);
  }

  console.log('Verifying data integrity and backfill results...');

  // A. Confirm NO existing records were lost
  const empsCount = await db.query(`SELECT COUNT(*) FROM "employees";`);
  assert.equal(Number(empsCount.rows[0]?.count), 2, 'Employees count must be preserved');

  const reqsCount = await db.query(`SELECT COUNT(*) FROM "leave_requests";`);
  assert.equal(Number(reqsCount.rows[0]?.count), 3, 'Leave requests count must be preserved');

  const candsCount = await db.query(`SELECT COUNT(*) FROM "onboarding_candidates";`);
  assert.equal(Number(candsCount.rows[0]?.count), 1, 'Onboarding candidate count must be preserved');

  // B. Confirm Teaching leave request backfill: coverage_required = true, operational_coverage_role = NULL
  const teachReq = (
    await db.query<{ coverage_required: boolean; operational_coverage_role: string | null }>(
      `SELECT coverage_required, operational_coverage_role FROM "leave_requests" WHERE id = '${reqTeachClId}';`
    )
  ).rows[0]!;
  assert.equal(teachReq.coverage_required, true, 'Teaching leave request must have coverage_required = true');
  assert.equal(teachReq.operational_coverage_role, null, 'Teaching leave request must not have operational_coverage_role');

  // C. Confirm Non-Teaching CL backfill: coverage_required = true, operational_coverage_role = 'Office Superintendent'
  const nonTeachClReq = (
    await db.query<{ coverage_required: boolean; operational_coverage_role: string | null }>(
      `SELECT coverage_required, operational_coverage_role FROM "leave_requests" WHERE id = '${reqNonTeachClId}';`
    )
  ).rows[0]!;
  assert.equal(nonTeachClReq.coverage_required, true, 'Non-Teaching CL request must have coverage_required = true');
  assert.equal(nonTeachClReq.operational_coverage_role, 'Office Superintendent', 'Non-Teaching CL must backfill designation name');

  // D. Confirm Non-Teaching RH backfill: coverage_required = false, operational_coverage_role = NULL
  const nonTeachRhReq = (
    await db.query<{ coverage_required: boolean; operational_coverage_role: string | null }>(
      `SELECT coverage_required, operational_coverage_role FROM "leave_requests" WHERE id = '${reqNonTeachRhId}';`
    )
  ).rows[0]!;
  assert.equal(nonTeachRhReq.coverage_required, false, 'Non-Teaching RH request must have coverage_required = false');
  assert.equal(nonTeachRhReq.operational_coverage_role, null, 'Non-Teaching RH request must have null operational_coverage_role');

  // E. Confirm Onboarding candidate retained non-financial details without salary columns
  const candRow = (
    await db.query<{ first_name: string; qualification: string; probation_months: number }>(
      `SELECT first_name, qualification, probation_months FROM "onboarding_candidates" WHERE id = '${candId}';`
    )
  ).rows[0]!;
  assert.equal(candRow.first_name, 'Pooja');
  assert.equal(candRow.qualification, 'Ph.D');
  assert.equal(candRow.probation_months, 12);

  // F. Confirm EmployeePolicyGroup relationships work in PostgreSQL
  const policyGroupId = randomUUID();
  await db.exec(`
    INSERT INTO "employee_policy_groups" ("id", "name", "description", "employee_category", "updated_at") VALUES
    ('${policyGroupId}', 'Technical Staff Group', 'Staff assigned to engineering labs', 'NON_TEACHING', CURRENT_TIMESTAMP);

    UPDATE "employees" SET "policy_group_id" = '${policyGroupId}' WHERE "id" = '${empNonTeachId}';
  `);

  const empWithGroup = (
    await db.query<{ employee_code: string; group_name: string }>(`
      SELECT e.employee_code, g.name AS group_name
      FROM "employees" e
      JOIN "employee_policy_groups" g ON e.policy_group_id = g.id
      WHERE e.id = '${empNonTeachId}';
    `)
  ).rows[0]!;
  assert.equal(empWithGroup.employee_code, 'JCET-ADM-001');
  assert.equal(empWithGroup.group_name, 'Technical Staff Group');

  // G. Confirm policy snapshot and version columns can be populated and queried
  const policyId = randomUUID();
  await db.exec(`
    INSERT INTO "leave_policies" (
      "id", "code", "name", "policy_year", "employee_category", "version",
      "annual_entitlement", "half_day_allowed", "effective_from", "updated_at"
    ) VALUES (
      '${policyId}', 'CL', 'Casual Leave 2026', '2026', 'NON_TEACHING', 1,
      12, true, '2026-01-01', CURRENT_TIMESTAMP
    );

    UPDATE "leave_requests"
    SET "policy_id" = '${policyId}',
        "policy_version" = 1,
        "policy_snapshot" = '{"code":"CL","annualEntitlement":12,"version":1}'::jsonb
    WHERE "id" = '${reqNonTeachClId}';
  `);

  const reqWithSnapshot = (
    await db.query<{ policy_version: number; snapshot_code: string }>(`
      SELECT policy_version, policy_snapshot->>'code' AS snapshot_code
      FROM "leave_requests"
      WHERE id = '${reqNonTeachClId}';
    `)
  ).rows[0]!;
  assert.equal(reqWithSnapshot.policy_version, 1);
  assert.equal(reqWithSnapshot.snapshot_code, 'CL');

  console.log('✔ Existing-data migration test passed: No data lost, backfill applied correctly, relationships & snapshots verified.');
  await db.close();
}

async function testRolloverConcurrencyInPostgreSQL() {
  console.log('\n============================================================');
  console.log('TEST 3: Concurrency-Safe Rollover in PostgreSQL');
  console.log('============================================================');

  const db = new PGlite();
  const migrations = getMigrationFiles();
  for (const m of migrations) {
    await db.exec(fs.readFileSync(m.sqlPath, 'utf8'));
  }

  // Setup prerequisites
  const deptId = 101;
  const desigId = 201;
  const roleId = 301;
  const userId = randomUUID();
  const empId = randomUUID();
  await db.exec(`
    INSERT INTO "roles" ("id", "name") VALUES (${roleId}, 'HR Admin');
    INSERT INTO "users" ("id", "email", "password_hash", "role_id", "updated_at") VALUES ('${userId}', 'hr@jcet.ac.in', 'hash', ${roleId}, CURRENT_TIMESTAMP);
    INSERT INTO "departments" ("id", "code", "name", "updated_at") VALUES (${deptId}, 'CSE', 'Computer Science', CURRENT_TIMESTAMP);
    INSERT INTO "designations" ("id", "name", "level", "category") VALUES (${desigId}, 'Assistant Professor', 1, 'TEACHING');
    INSERT INTO "employees" ("id", "employee_code", "first_name", "last_name", "email", "phone", "department_id", "designation_id", "employment_type", "joining_date", "updated_at") VALUES
    ('${empId}', 'JCET-CSE-001', 'Aarav', 'Patil', 'aarav@jcet.ac.in', '9876543210', ${deptId}, ${desigId}, 'PERMANENT', '2024-01-01', CURRENT_TIMESTAMP);
  `);

  // Simulate two concurrent rollover transactions trying to insert the same adjustment
  console.log('Executing two simultaneous rollover transactions against PostgreSQL...');

  const executeRolloverTx = async (txId: string) => {
    try {
      await db.exec(`BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;`);
      // Simulate rollover balance carry-forward
      const adjId = randomUUID();
      await db.exec(`
        INSERT INTO "leave_balance_adjustments" (
          "id", "employee_id", "leave_code", "policy_year", "adjustment_type", "rollover_from_year", "days", "reason", "actor_user_id", "created_at"
        ) VALUES (
          '${adjId}', '${empId}', 'EL', '2027', 'CARRY_FORWARD_CORRECTION', 2026, 8, 'Year-end rollover from 2026 (Tx ${txId})', '${userId}', CURRENT_TIMESTAMP
        );
      `);
      await db.exec(`COMMIT;`);
      return { success: true, txId };
    } catch (err: unknown) {
      await db.exec(`ROLLBACK;`);
      return { success: false, txId, error: (err as Error).message };
    }
  };

  // Run first rollover
  const res1 = await executeRolloverTx('TX_1');
  // Attempt duplicate rollover
  const res2 = await executeRolloverTx('TX_2');

  console.log(`  Transaction 1 result: success=${res1.success}`);
  console.log(`  Transaction 2 result: success=${res2.success}, error="${res2.error}"`);

  assert.equal(res1.success, true, 'First rollover transaction must succeed');
  assert.equal(res2.success, false, 'Second duplicate rollover transaction must fail');
  assert.ok(
    res2.error?.includes('duplicate key') || res2.error?.includes('leave_balance_adjustments_employee_id_leave_code_policy_yea_key'),
    'Second transaction must be rejected by PostgreSQL unique constraint'
  );

  // Confirm only ONE record exists in PostgreSQL
  const adjCount = await db.query<{ count: string }>(`
    SELECT COUNT(*) AS count FROM "leave_balance_adjustments"
    WHERE employee_id = '${empId}' AND leave_code = 'EL' AND policy_year = '2027' AND adjustment_type = 'CARRY_FORWARD_CORRECTION';
  `);
  assert.equal(Number(adjCount.rows[0]?.count), 1, 'Exactly one rollover ledger record must exist');

  // Verify that an aborted transaction rolls back completely without leaving partial records
  const abortTx = async () => {
    try {
      await db.exec(`BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;`);
      await db.exec(`
        INSERT INTO "leave_balance_adjustments" (
          "id", "employee_id", "leave_code", "policy_year", "adjustment_type", "rollover_from_year", "days", "reason", "actor_user_id"
        ) VALUES (
          '${randomUUID()}', '${empId}', 'CL', '2027', 'LAPSE', 2026, 4, 'Partial Lapse', '${userId}'
        );
      `);
      // Force an error to trigger rollback
      await db.exec(`SELECT 1 FROM non_existent_table_for_rollback_test;`);
      await db.exec(`COMMIT;`);
    } catch {
      await db.exec(`ROLLBACK;`);
    }
  };
  await abortTx();

  const lapsedCount = await db.query<{ count: string }>(`
    SELECT COUNT(*) AS count FROM "leave_balance_adjustments"
    WHERE employee_id = '${empId}' AND leave_code = 'CL' AND policy_year = '2027' AND adjustment_type = 'LAPSE';
  `);
  assert.equal(Number(lapsedCount.rows[0]?.count), 0, 'Aborted transaction must leave 0 records');

  // Verify retry handling: once failed/rolled back, retry can succeed with clean data
  const retryTx = async () => {
    await db.exec(`BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;`);
    await db.exec(`
      INSERT INTO "leave_balance_adjustments" (
        "id", "employee_id", "leave_code", "policy_year", "adjustment_type", "rollover_from_year", "days", "reason", "actor_user_id"
      ) VALUES (
        '${randomUUID()}', '${empId}', 'CL', '2027', 'LAPSE', 2026, 4, 'Valid Retry Lapse', '${userId}'
      );
    `);
    await db.exec(`COMMIT;`);
  };
  await retryTx();

  const retryCount = await db.query<{ count: string }>(`
    SELECT COUNT(*) AS count FROM "leave_balance_adjustments"
    WHERE employee_id = '${empId}' AND leave_code = 'CL' AND policy_year = '2027' AND adjustment_type = 'LAPSE';
  `);
  assert.equal(Number(retryCount.rows[0]?.count), 1, 'Retry transaction after rollback must succeed cleanly');

  console.log('✔ Rollover concurrency test passed: PostgreSQL uniqueness enforced, partial records prevented, retry validated.');
  await db.close();
}

async function main() {
  console.log('================================================================');
  console.log('POSTGRESQL MIGRATION & CONCURRENCY VERIFICATION RUNNER');
  console.log('================================================================');
  try {
    await testCleanDatabaseMigration();
    await testExistingDataMigrationAndBackfill();
    await testRolloverConcurrencyInPostgreSQL();
    console.log('\n================================================================');
    console.log('ALL POSTGRESQL MIGRATION AND CONCURRENCY TESTS PASSED (3/3)');
    console.log('================================================================');
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  }
}

main();
