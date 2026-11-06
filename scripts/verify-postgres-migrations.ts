import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createPrismaClient } from '../backend/src/database/prisma.js';
import { createLeavePolicyRepository } from '../backend/src/modules/leave/leave-policy.repository.js';
import { createLeavePolicyService } from '../backend/src/modules/leave/leave-policy.service.js';
import { createLeaveRepository } from '../backend/src/modules/leave/leave.repository.js';
import type { Access } from '../backend/src/modules/auth/auth.service.js';
import type { HttpError } from '../backend/src/common/http-error.js';

const migrationsDir = path.resolve('backend/src/database/migrations');

async function runCliCmd(
  cmd: string,
  args: string[],
  databaseUrl: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args, {
      cwd: 'backend',
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode ?? 0, stdout, stderr });
    });
  });
}

async function testCleanDatabasePrismaMigration() {
  console.log('\n============================================================');
  console.log('TEST 1: Clean Isolated PostgreSQL Database Prisma Migration');
  console.log('============================================================');

  const db = await PGlite.create();
  const server = new PGLiteSocketServer({
    db,
    host: '127.0.0.1',
    port: 0,
    maxConnections: 30,
  });
  await server.start();
  const conn = server.getServerConn();
  const url = `postgresql://postgres:postgres@${conn}/postgres?sslmode=disable`;
  console.log(`Scratch PostgreSQL server listening on 127.0.0.1 (redacted URL)`);

  try {
    // 1. Prisma validate
    console.log('\n--- 1.1 Running npx prisma validate ---');
    const valResult = await runCliCmd('npx', ['prisma', 'validate'], url);
    console.log(valResult.stdout.trim());
    assert.equal(valResult.exitCode, 0, 'Prisma schema validation must pass');

    // 2. Prisma migrate deploy
    console.log('\n--- 1.2 Running npx prisma migrate deploy ---');
    const deployResult = await runCliCmd('npx', ['prisma', 'migrate', 'deploy'], url);
    console.log(deployResult.stdout.trim());
    if (deployResult.exitCode !== 0) {
      console.error('DEPLOY ERROR:', deployResult.stderr);
    }
    assert.equal(deployResult.exitCode, 0, 'prisma migrate deploy must succeed');
    assert.ok(
      deployResult.stdout.includes('19 migrations found') || deployResult.stdout.includes('All migrations have been successfully applied'),
      'Must apply all 19 migrations'
    );

    // 3. Prisma migrate status
    console.log('\n--- 1.3 Running npx prisma migrate status ---');
    const statusResult = await runCliCmd('npx', ['prisma', 'migrate', 'status'], url);
    console.log(statusResult.stdout.trim());
    assert.equal(statusResult.exitCode, 0, 'prisma migrate status must succeed');
    assert.ok(statusResult.stdout.includes('Database schema is up to date'), 'Schema must be reported up to date');

    // 4. Confirm Prisma Migration History in _prisma_migrations
    console.log('\n--- 1.4 Inspecting _prisma_migrations Table ---');
    const migsRes = await db.query<{
      id: string;
      migration_name: string;
      finished_at: string | null;
      rolled_back_at: string | null;
    }>(
      `SELECT id, migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY finished_at ASC;`
    );
    console.log(`Recorded migrations count: ${migsRes.rows.length}`);
    assert.equal(migsRes.rows.length, 19, 'Must have recorded exactly 19 migrations');
    for (const row of migsRes.rows) {
      assert.ok(row.finished_at !== null, `Migration ${row.migration_name} must be finished`);
      assert.equal(row.rolled_back_at, null, `Migration ${row.migration_name} must not be rolled back`);
    }
    console.log(`✔ All 19 migrations recorded with non-null finished_at and null rolled_back_at.`);

    // 5. Inspect Tables
    console.log('\n--- 1.5 Inspecting Database Tables ---');
    const tablesRes = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
    );
    const tableNames = new Set(tablesRes.rows.map((r) => r.tablename));
    assert.ok(tableNames.has('leave_policies'), 'leave_policies table must exist');
    assert.ok(tableNames.has('leave_balance_adjustments'), 'leave_balance_adjustments table must exist');
    assert.ok(tableNames.has('employee_policy_groups'), 'employee_policy_groups table must exist');
    assert.ok(tableNames.has('on_duty_duty_mappings'), 'on_duty_duty_mappings table must exist');
    assert.ok(tableNames.has('onboarding_candidates'), 'onboarding_candidates table must exist');
    console.log(`✔ Verified tables exist: leave_policies, leave_balance_adjustments, employee_policy_groups, on_duty_duty_mappings, onboarding_candidates.`);

    // 6. Inspect Columns & Negative Salary Checks
    console.log('\n--- 1.6 Inspecting Columns & Confirming Absence of Salary Fields ---');
    const ocColsRes = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'onboarding_candidates';`
    );
    const ocCols = new Set(ocColsRes.rows.map((r) => r.column_name));
    assert.ok(!ocCols.has('pay_scale'), 'pay_scale must be absent');
    assert.ok(!ocCols.has('basic_pay'), 'basic_pay must be absent');
    assert.ok(!ocCols.has('agp'), 'agp must be absent');
    assert.ok(!ocCols.has('da_percent'), 'da_percent must be absent');
    assert.ok(!ocCols.has('hra_percent'), 'hra_percent must be absent');
    assert.ok(!ocCols.has('gross_salary'), 'gross_salary must be absent');
    assert.ok(ocCols.has('probation_months'), 'probation_months must exist');
    assert.ok(ocCols.has('notice_period_months'), 'notice_period_months must exist');
    console.log(`✔ Zero salary columns confirmed on onboarding_candidates: pay_scale, basic_pay, agp, da_percent, hra_percent, gross_salary all absent.`);

    // 7. Inspect Constraints and Indexes
    console.log('\n--- 1.7 Inspecting PostgreSQL Indexes & Constraints ---');
    const indexesRes = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`
    );
    const indexList = indexesRes.rows.map((r) => r.indexname);
    assert.ok(
      indexList.includes('leave_balance_adjustments_employee_id_leave_code_policy_yea_key'),
      'Unique constraint on leave_balance_adjustments must exist'
    );
    assert.ok(
      indexList.some((idx) => idx.startsWith('leave_policies_code_policy_year_employee_category_department')),
      'Multi-column unique index on leave_policies must exist'
    );
    assert.ok(
      indexList.includes('employee_policy_groups_name_key'),
      'Unique index on employee_policy_groups.name must exist'
    );
    console.log(`✔ Verified unique constraints & indexes on leave_balance_adjustments, leave_policies, employee_policy_groups.`);

    console.log('\n✔ TEST 1 PASSED: Clean PostgreSQL Prisma Migration verified.');
  } finally {
    await server.stop();
    await db.close();
  }
}

async function testExistingDataPrismaMigrationAndPreservation() {
  console.log('\n============================================================');
  console.log('TEST 2: Existing-Data PostgreSQL Database Migration & Preservation');
  console.log('============================================================');

  const cleanupMigrationName = '20261105153000_zero_salary_scope_cleanup';
  const originalMigrationPath = path.join(migrationsDir, cleanupMigrationName);
  const tempMigrationPath = path.resolve('backend/src/database/_temp_cleanup_migration');

  const db = await PGlite.create();
  const server = new PGLiteSocketServer({
    db,
    host: '127.0.0.1',
    port: 0,
    maxConnections: 30,
  });
  await server.start();
  const conn = server.getServerConn();
  const url = `postgresql://postgres:postgres@${conn}/postgres?sslmode=disable`;

  try {
    // Step A: Temporarily stash migration 19 so Prisma deploys migrations 1..18 with authentic checksums
    console.log('Stashing migration 19 to establish existing-data baseline via Prisma migrate deploy...');
    fs.renameSync(originalMigrationPath, tempMigrationPath);

    let deploy18Res: { exitCode: number; stdout: string; stderr: string };
    try {
      deploy18Res = await runCliCmd('npx', ['prisma', 'migrate', 'deploy'], url);
    } finally {
      // Ensure migration 19 is always restored
      if (fs.existsSync(tempMigrationPath)) {
        fs.renameSync(tempMigrationPath, originalMigrationPath);
      }
    }

    console.log(deploy18Res.stdout.trim());
    assert.equal(deploy18Res.exitCode, 0, 'Deploying 18 pre-existing migrations must succeed');

    // Step B: Seed representative existing records with candidate having salary columns
    const deptId = 101;
    const desigTeachId = 201;
    const desigNonTeachId = 202;
    const roleFacultyId = 301;
    const roleStaffId = 302;
    const facultyUserId = randomUUID();
    const staffUserId = randomUUID();
    const facultyEmpId = randomUUID();
    const staffEmpId = randomUUID();
    const candidateId = randomUUID();
    const leaveTypeId = 401;
    const leaveRequestId = randomUUID();

    console.log('Seeding pre-existing institutional workforce, leave, and candidate records...');
    await db.exec(`
      INSERT INTO "roles" ("id", "name") VALUES
      (${roleFacultyId}, 'Faculty'),
      (${roleStaffId}, 'Staff');

      INSERT INTO "departments" ("id", "code", "name", "updated_at") VALUES
      (${deptId}, 'CSE', 'Computer Science and Engineering', CURRENT_TIMESTAMP);

      INSERT INTO "designations" ("id", "name", "level", "category") VALUES
      (${desigTeachId}, 'Assistant Professor', 1, 'TEACHING'),
      (${desigNonTeachId}, 'Office Superintendent', 2, 'NON_TEACHING');

      INSERT INTO "users" ("id", "email", "password_hash", "role_id", "updated_at") VALUES
      ('${facultyUserId}', 'faculty.cs@jcet.ac.in', 'hash123', ${roleFacultyId}, CURRENT_TIMESTAMP),
      ('${staffUserId}', 'staff.lab@jcet.ac.in', 'hash123', ${roleStaffId}, CURRENT_TIMESTAMP);

      INSERT INTO "employees" ("id", "employee_code", "first_name", "last_name", "email", "phone", "department_id", "designation_id", "employment_type", "joining_date", "updated_at") VALUES
      ('${facultyEmpId}', 'JCET-CSE-001', 'Ramesh', 'Patil', 'ramesh.p@jcet.ac.in', '9876543210', ${deptId}, ${desigTeachId}, 'PERMANENT', '2024-01-01', CURRENT_TIMESTAMP),
      ('${staffEmpId}', 'JCET-STAFF-001', 'Suresh', 'Kumar', 'suresh.k@jcet.ac.in', '9876543211', ${deptId}, ${desigNonTeachId}, 'PERMANENT', '2024-01-01', CURRENT_TIMESTAMP);

      UPDATE "users" SET "employee_id" = '${facultyEmpId}' WHERE "id" = '${facultyUserId}';
      UPDATE "users" SET "employee_id" = '${staffEmpId}' WHERE "id" = '${staffUserId}';

      INSERT INTO "leave_types" ("id", "code", "name", "yearly_quota", "allow_half_day", "carry_forward_max", "active", "updated_at") VALUES
      (${leaveTypeId}, 'EL', 'Earned Leave', 10, true, 15, true, CURRENT_TIMESTAMP);

      INSERT INTO "leave_requests" ("id", "employee_id", "leave_type_id", "department_id", "start_date", "end_date", "days", "reason", "status", "approver_roles", "updated_at") VALUES
      ('${leaveRequestId}', '${facultyEmpId}', ${leaveTypeId}, ${deptId}, '2026-11-10', '2026-11-12', 2, 'Attending Faculty Workshop', 'APPROVED', ARRAY['HOD']::text[], CURRENT_TIMESTAMP);
    `);

    // Insert candidate with pre-existing salary fields (which existed in migration 15)
    await db.exec(`
      INSERT INTO "onboarding_candidates" (
        "id", "appointment_ref_no", "first_name", "last_name", "email", "phone",
        "department_id", "designation_id", "employment_type", "qualification",
        "expected_joining_date", "pay_scale", "basic_pay", "agp", "da_percent", "hra_percent", "gross_salary",
        "probation_months", "notice_period_months", "updated_at"
      ) VALUES (
        '${candidateId}', 'JCET/APPT/2026/001', 'Pooja', 'Hegde', 'pooja.hegde@jcet.ac.in', '9876543299',
        ${deptId}, ${desigTeachId}, 'PERMANENT', 'Ph.D in AI & Robotics', '2026-12-01',
        'AICTE Level 10', 57700, 0, 50, 18, 96936, 12, 3, CURRENT_TIMESTAMP
      );
    `);

    console.log('Pre-existing candidate inserted with non-financial details AND salary columns.');

    // Step C: Now run prisma migrate deploy via Prisma CLI with migration 19 present!
    console.log('\n--- 2.1 Running npx prisma migrate deploy to apply zero-salary cleanup ---');
    const deployRes = await runCliCmd('npx', ['prisma', 'migrate', 'deploy'], url);
    console.log(deployRes.stdout.trim());
    if (deployRes.exitCode !== 0) {
      console.error('DEPLOY ERROR:', deployRes.stderr);
    }
    assert.equal(deployRes.exitCode, 0, 'prisma migrate deploy must succeed on existing data');

    console.log('\n--- 2.2 Running npx prisma migrate status ---');
    const statusRes = await runCliCmd('npx', ['prisma', 'migrate', 'status'], url);
    console.log(statusRes.stdout.trim());
    assert.equal(statusRes.exitCode, 0, 'prisma migrate status must report up to date');
    assert.ok(statusRes.stdout.includes('Database schema is up to date'), 'Schema must be up to date');

    // Step D: Verify candidate data preservation
    console.log('\n--- 2.3 Inspecting Candidate Data Preservation & Column Absence ---');
    const candRow = await db.query<{
      id: string;
      appointment_ref_no: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      department_id: number;
      designation_id: number;
      employment_type: string;
      qualification: string;
      probation_months: number;
      notice_period_months: number;
    }>(
      `SELECT id, appointment_ref_no, first_name, last_name, email, phone, department_id, designation_id,
              employment_type, qualification, probation_months, notice_period_months
       FROM "onboarding_candidates" WHERE id = '${candidateId}';`
    );
    assert.equal(candRow.rows.length, 1, 'Candidate record must be preserved');
    const c = candRow.rows[0]!;
    assert.equal(c.first_name, 'Pooja');
    assert.equal(c.last_name, 'Hegde');
    assert.equal(c.appointment_ref_no, 'JCET/APPT/2026/001');
    assert.equal(c.email, 'pooja.hegde@jcet.ac.in');
    assert.equal(c.employment_type, 'PERMANENT');
    assert.equal(c.qualification, 'Ph.D in AI & Robotics');
    assert.equal(Number(c.probation_months), 12);
    assert.equal(Number(c.notice_period_months), 3);
    console.log('✔ Non-financial candidate details 100% preserved: name, ref no, email, qualification, probation, notice period.');

    // Confirm querying dropped salary columns fails
    let salaryQueryFailed = false;
    try {
      await db.query(`SELECT gross_salary FROM "onboarding_candidates" WHERE id = '${candidateId}';`);
    } catch (err: unknown) {
      salaryQueryFailed = true;
      console.log(`✔ Querying gross_salary correctly threw PostgreSQL error: ${(err as Error).message}`);
    }
    assert.ok(salaryQueryFailed, 'gross_salary column must not exist in table');

    // Confirm employee, department, and leave records are intact
    const empCount = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM "employees";`);
    const reqCount = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM "leave_requests";`);
    assert.equal(Number(empCount.rows[0]?.count), 2, 'Employees must be preserved');
    assert.equal(Number(reqCount.rows[0]?.count), 1, 'Leave requests must be preserved');
    console.log('✔ Employees, departments, and leave requests preserved intact.');

    console.log('\n✔ TEST 2 PASSED: Existing-data migration and non-financial data preservation verified.');
  } finally {
    if (fs.existsSync(tempMigrationPath)) {
      fs.renameSync(tempMigrationPath, originalMigrationPath);
    }
    await server.stop();
    await db.close();
  }
}

async function testApplicationLevelRolloverConcurrency() {
  console.log('\n============================================================');
  console.log('TEST 3: Application-Level Rollover Concurrency Verification');
  console.log('============================================================');

  const db = await PGlite.create();
  const server = new PGLiteSocketServer({
    db,
    host: '127.0.0.1',
    port: 0,
    maxConnections: 30,
  });
  await server.start();
  const conn = server.getServerConn();
  const url = `postgresql://postgres:postgres@${conn}/postgres?sslmode=disable`;

  try {
    // Deploy all migrations
    await runCliCmd('npx', ['prisma', 'migrate', 'deploy'], url);

    const prisma = createPrismaClient(url);

    // Setup institutional baseline data through Prisma
    console.log('Setting up institutional baseline data for rollover concurrency test...');
    const dept = await prisma.department.create({
      data: {
        code: 'MECH',
        name: 'Mechanical Engineering',
      },
    });

    const desig = await prisma.designation.create({
      data: {
        name: 'Assistant Professor',
        level: 1,
        category: 'TEACHING',
      },
    });

    const hrRole = await prisma.role.create({
      data: {
        name: 'HR Admin',
      },
    });

    const hrUser = await prisma.user.create({
      data: {
        email: 'hr.director@jcet.ac.in',
        passwordHash: 'hashed_pw',
        roleId: hrRole.id,
      },
    });

    const facultyRole = await prisma.role.create({
      data: {
        name: 'Faculty',
      },
    });

    const facultyUser = await prisma.user.create({
      data: {
        email: 'prof.mech@jcet.ac.in',
        passwordHash: 'hashed_pw',
        roleId: facultyRole.id,
      },
    });

    const facultyEmp = await prisma.employee.create({
      data: {
        employeeCode: 'JCET-MECH-005',
        firstName: 'Prashant',
        lastName: 'Kulkarni',
        email: 'prof.mech@jcet.ac.in',
        departmentId: dept.id,
        designationId: desig.id,
        employmentType: 'PERMANENT',
        joiningDate: new Date('2024-01-01'),
      },
    });

    await prisma.user.update({
      where: { id: facultyUser.id },
      data: { employeeId: facultyEmp.id },
    });

    const elType = await prisma.leaveType.create({
      data: {
        code: 'EL',
        name: 'Earned Leave',
        yearlyQuota: 10,
        allowHalfDay: true,
        carryForwardMax: 15,
        active: true,
      },
    });

    // Create 2026 leave policy with carry-forward enabled
    await prisma.leavePolicy.create({
      data: {
        code: 'EL',
        name: 'Earned Leave 2026',
        policyYear: '2026',
        effectiveFrom: new Date('2026-01-01'),
        employeeCategory: 'TEACHING',
        leaveType: { connect: { id: elType.id } },
        annualEntitlement: 10,
        carryForwardAllowed: true,
        carryForwardLimit: 15,
        affectsTimetable: true,
        requiresAcademicCoverage: true,
        requiresOperationalCoverage: false,
        active: true,
      },
    });

    const adminAccess: Access = {
      userId: hrUser.id,
      role: 'HR Admin',
      scope: 'all',
      employeeId: null,
      departmentId: null,
    };

    // Instantiate real repositories and real services
    const policyRepo = createLeavePolicyRepository(prisma);
    const leaveRepo = createLeaveRepository(prisma);
    const policyService = createLeavePolicyService(policyRepo, leaveRepo);

    console.log(`Prepared Employee ${facultyEmp.employeeCode} (${facultyEmp.id}), Leave Type ${elType.code}, Policy Year 2026.`);

    // 1. Trigger two simultaneous rollover requests through the real application service
    console.log('\n--- 3.1 Triggering Simultaneous Application-Level Rollover Requests ---');
    const rolloverEntries = [
      {
        employeeId: facultyEmp.id,
        leaveCode: 'EL',
        policyYear: '2026',
        adjustmentType: 'CARRY_FORWARD_CORRECTION' as const,
        days: 8,
        reason: '[ANNUAL_ROLLOVER_2025_2026] Carried forward 8 days from 2025',
      },
    ];

    const promise1 = policyService.executeRolloverLedger(adminAccess, 2025, 2026, rolloverEntries);
    const promise2 = policyService.executeRolloverLedger(adminAccess, 2025, 2026, rolloverEntries);

    const results = await Promise.allSettled([promise1, promise2]);

    console.log(`Request 1 status: ${results[0].status}`);
    console.log(`Request 2 status: ${results[1].status}`);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one concurrent rollover request must be fulfilled');
    assert.equal(rejected.length, 1, 'Exactly one concurrent rollover request must be rejected');

    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason as HttpError;
    const errorStatus = rejectedReason.status ?? (rejectedReason as any).statusCode;
    console.log(`\nControlled error response received by losing request:`);
    console.log(`  HTTP Status: ${errorStatus}`);
    console.log(`  Error Code:  ${rejectedReason.code}`);
    console.log(`  Message:     "${rejectedReason.message}"`);

    assert.equal(
      errorStatus,
      409,
      'Losing request must receive HTTP 409 Conflict'
    );
    assert.equal(
      rejectedReason.code,
      'ROLLOVER_ALREADY_EXECUTED',
      'Losing request must receive code ROLLOVER_ALREADY_EXECUTED'
    );

    // 2. Confirm database state: exactly ONE adjustment committed
    console.log('\n--- 3.2 Inspecting Resulting Database State ---');
    const adjustmentsInDb = await prisma.leaveBalanceAdjustment.findMany({
      where: {
        employeeId: facultyEmp.id,
        leaveCode: 'EL',
        policyYear: '2026',
        adjustmentType: 'CARRY_FORWARD_CORRECTION',
      },
      include: {
        actorUser: { select: { email: true } },
      },
    });

    console.log(`Total committed adjustments in PostgreSQL: ${adjustmentsInDb.length}`);
    for (const adj of adjustmentsInDb) {
      console.log(`  Adjustment ID: ${adj.id}`);
      console.log(`  Employee ID:   ${adj.employeeId}`);
      console.log(`  Leave Code:    ${adj.leaveCode}`);
      console.log(`  Policy Year:   ${adj.policyYear}`);
      console.log(`  From Year:     ${adj.rolloverFromYear}`);
      console.log(`  Days:          ${adj.days}`);
      console.log(`  Reason:        "${adj.reason}"`);
      console.log(`  Actor User:    ${adj.actorUser?.email}`);
    }

    assert.equal(adjustmentsInDb.length, 1, 'Exactly one rollover adjustment must exist in PostgreSQL');
    assert.equal(adjustmentsInDb[0]?.days, 8, 'Committed adjustment must have exact 8 carried days');
    assert.equal(adjustmentsInDb[0]?.rolloverFromYear, 2025, 'Committed adjustment must record rollover_from_year = 2025');

    // 3. Confirm that leave balance does not duplicate
    const totalAdjustedDays = adjustmentsInDb.reduce((acc, row) => acc + row.days, 0);
    assert.equal(totalAdjustedDays, 8, 'Total credited days must be exactly 8, preventing duplicate credit');
    console.log('✔ Duplicate balance credit prevented: total credited days = 8.');

    // 4. Retry after existing execution safely acknowledges prior execution
    console.log('\n--- 3.3 Verifying Subsequent Retry Behavior ---');
    let retryError: HttpError | null = null;
    try {
      await policyService.executeRolloverLedger(adminAccess, 2025, 2026, rolloverEntries);
    } catch (err: unknown) {
      retryError = err as HttpError;
    }

    assert.ok(retryError !== null, 'Subsequent retry must be caught safely');
    const retryStatus = retryError?.status ?? (retryError as any)?.statusCode;
    assert.equal(
      retryStatus,
      409,
      'Retry must return 409 Conflict'
    );
    assert.equal(
      retryError?.code,
      'ROLLOVER_ALREADY_EXECUTED',
      'Retry must return ROLLOVER_ALREADY_EXECUTED'
    );
    console.log(`✔ Retry safely rejected with 409 Conflict: "${retryError?.message}".`);

    // Verify database remains unchanged after retry
    const afterRetryCount = await prisma.leaveBalanceAdjustment.count({
      where: {
        employeeId: facultyEmp.id,
        leaveCode: 'EL',
        policyYear: '2026',
      },
    });
    assert.equal(afterRetryCount, 1, 'Database adjustments count remains 1 after retry');
    console.log('✔ Database integrity verified: no partial or corrupted records exist.');

    await prisma.$disconnect();
    console.log('\n✔ TEST 3 PASSED: Application-level rollover concurrency verified.');
  } finally {
    await server.stop();
    await db.close();
  }
}

async function main() {
  console.log('================================================================');
  console.log('CAMPUSHR — PRISMA MIGRATION & APPLICATION CONCURRENCY RUNNER');
  console.log('================================================================');
  try {
    await testCleanDatabasePrismaMigration();
    await testExistingDataPrismaMigrationAndPreservation();
    await testApplicationLevelRolloverConcurrency();
    console.log('\n================================================================');
    console.log('ALL PRISMA MIGRATION AND APPLICATION CONCURRENCY TESTS PASSED (3/3)');
    console.log('================================================================');
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  }
}

main();
