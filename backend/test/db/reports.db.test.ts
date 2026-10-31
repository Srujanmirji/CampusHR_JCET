import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestApp } from './helpers.js';
import { createReportsRepository } from '../../src/modules/reports/reports.repository.js';

let t: Awaited<ReturnType<typeof startTestApp>>;
before(async () => {
  t = await startTestApp();
});
after(async () => {
  await t.stop();
});

test('reports use recorded values, period spans and uncovered dated classes within their scope', async () => {
  const p = t.prisma;
  const dept = await p.department.create({
    data: { code: 'RPT', name: 'Report test department' },
  });
  const designation = await p.designation.create({
    data: { name: 'Report test teacher', category: 'TEACHING', level: 99 },
  });
  const repo = createReportsRepository(p);
  try {
    const empty = await repo.getExecutiveSummary(dept.id);
    assert.equal(empty.headcount.total, 0);
    assert.equal(empty.attendance.todayRate, 0);
    assert.equal(empty.leave.monthlyLeaveDays, 0);
    assert.equal(empty.continuity.affectedClasses, 0);
    assert.equal(empty.continuity.classesCovered, 0);
    assert.equal(empty.workload.totalAudited, 0);
    assert.ok(
      empty.leave.monthlyTrends.every(
        (month) => month.CL + month.ML + month.EL + month.other === 0,
      ),
    );
    const employee = await p.employee.create({
      data: {
        employeeCode: 'RPT-001',
        firstName: 'Report',
        lastName: 'Teacher',
        email: 'report-teacher@jcet.test',
        departmentId: dept.id,
        designationId: designation.id,
        employmentType: 'PERMANENT',
        joiningDate: new Date('2020-01-01Z'),
      },
    });
    const room = await p.room.create({
      data: { name: 'Report test lab', kind: 'LAB' },
    });
    const subject = await p.subject.create({
      data: {
        code: 'RPTLAB',
        name: 'Report lab',
        kind: 'LAB',
        departmentId: dept.id,
        semester: 8,
      },
    });
    const entry = await p.timetableEntry.create({
      data: {
        facultyId: employee.id,
        departmentId: dept.id,
        subjectId: subject.id,
        roomId: room.id,
        semester: 8,
        section: 'A',
        day: 'MON',
        startPeriod: 1,
        endPeriod: 3,
      },
    });
    const unconfigured = await repo.getWorkloadReport({
      departmentId: dept.id,
    });
    assert.equal(unconfigured.records[0]!.totalHours, 3);
    assert.equal(unconfigured.records[0]!.status, 'UNCONFIGURED');
    await p.workloadThreshold.create({
      data: { designationId: designation.id, minHours: 4, maxHours: 6 },
    });
    const workload = await repo.getWorkloadReport({ departmentId: dept.id });
    assert.equal(workload.summary.underload, 1);
    assert.equal(workload.records[0]!.labHours, 3);
    const type = await p.leaveType.create({
      data: { code: 'RPTLEAVE', name: 'Report leave', yearlyQuota: null },
    });
    const leave = await p.leaveRequest.create({
      data: {
        employeeId: employee.id,
        departmentId: dept.id,
        leaveTypeId: type.id,
        startDate: new Date('2026-10-19Z'),
        endDate: new Date('2026-10-26Z'),
        days: 7,
        reason: 'Report tests',
        status: 'APPROVED',
        approverRoles: [],
      },
    });
    const continuity = await repo.getContinuityReport({
      departmentId: dept.id,
      from: '2026-10-19',
      to: '2026-10-26',
    });
    assert.deepEqual(continuity.summary, {
      totalImpacted: 2,
      covered: 0,
      uncovered: 2,
      coverageRate: 0,
    });
    const role = await p.role.findUniqueOrThrow({
      where: { name: 'Super Admin' },
    });
    const assigner = await p.user.create({
      data: {
        email: 'report-assigner@jcet.test',
        passwordHash: 'unused-test-hash',
        roleId: role.id,
      },
    });
    await p.substitution.create({
      data: {
        leaveRequestId: leave.id,
        timetableEntryId: entry.id,
        date: new Date('2026-10-19Z'),
        kind: 'NOT_NEEDED',
        assignedByUserId: assigner.id,
        note: 'No substitute needed for test',
      },
    });
    const covered = await repo.getContinuityReport({
      departmentId: dept.id,
      from: '2026-10-19',
      to: '2026-10-26',
    });
    assert.deepEqual(covered.summary, {
      totalImpacted: 2,
      covered: 1,
      uncovered: 1,
      coverageRate: 50,
    });
    assert.ok(covered.records.every((row) => row.department === 'RPT'));
    const clipped = await repo.getLeaveReport({
      departmentId: dept.id,
      from: '2026-10-20',
      to: '2026-10-21',
    });
    assert.equal(clipped.summary.totalDays, 2);
    const today = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
    );
    await p.attendance.create({
      data: {
        employeeId: employee.id,
        date: today,
        status: 'HALF_DAY',
        source: 'MOBILE',
      },
    });
    const live = await repo.getExecutiveSummary(dept.id);
    assert.equal(live.headcount.total, 1);
    assert.equal(live.attendance.todayRate, 50);
    assert.equal(live.attendance.present, 0);
    assert.equal(live.attendance.absent, 0);
    assert.equal(live.workload.normalLoadPercentage, 0);
  } finally {
    await p.substitution.deleteMany({
      where: { timetableEntry: { departmentId: dept.id } },
    });
    await p.user.deleteMany({ where: { email: 'report-assigner@jcet.test' } });
    await p.leaveRequest.deleteMany({ where: { departmentId: dept.id } });
    await p.attendance.deleteMany({
      where: { employee: { departmentId: dept.id } },
    });
    await p.timetableEntry.deleteMany({ where: { departmentId: dept.id } });
    await p.employee.deleteMany({ where: { departmentId: dept.id } });
    await p.subject.deleteMany({ where: { departmentId: dept.id } });
    await p.room.deleteMany({ where: { name: 'Report test lab' } });
    await p.leaveType.deleteMany({ where: { code: 'RPTLEAVE' } });
    await p.designation.delete({ where: { id: designation.id } });
    await p.department.delete({ where: { id: dept.id } });
  }
});
