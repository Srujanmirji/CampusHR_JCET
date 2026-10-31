import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError } from '../src/common/http-error.js';
import type { Access } from '../src/modules/auth/auth.service.js';
import type { ReportsRepository } from '../src/modules/reports/reports.repository.js';
import { createReportsService } from '../src/modules/reports/reports.service.js';

function createMockReportsRepository(): ReportsRepository {
  return {
    async getExecutiveSummary(departmentId) {
      return {
        headcount: {
          total: departmentId ? 15 : 60,
          teaching: departmentId ? 12 : 48,
          nonTeaching: departmentId ? 3 : 12,
          doctorates: departmentId ? 6 : 24,
          cadre: {
            professors: departmentId ? 2 : 8,
            associateProfessors: departmentId ? 4 : 16,
            assistantProfessors: departmentId ? 6 : 24,
            others: 0,
          },
        },
        attendance: {
          todayRate: 95.5,
          present: departmentId ? 14 : 56,
          absent: departmentId ? 1 : 4,
          late: 1,
          onLeave: 1,
          totalToday: departmentId ? 15 : 60,
          departmentAverages: [{ department: 'CSE', rate: 95.5 }],
        },
        leave: {
          monthlyLeaveDays: departmentId ? 8 : 32,
          activeLeavesToday: 1,
          monthlyTrends: [
            { month: 'Jul 2026', CL: 12, ML: 4, EL: 2, other: 1 },
            { month: 'Aug 2026', CL: 14, ML: 5, EL: 3, other: 1 },
          ],
        },
        continuity: {
          affectedClasses: 18,
          classesCovered: 17,
          coverageRate: 94,
          uncoveredClasses: 1,
        },
        workload: {
          normalLoadPercentage: 85.0,
          totalAudited: 48,
        },
      };
    },

    async getAttendanceReport({ departmentId }) {
      return {
        summary: {
          totalEmployees: departmentId ? 1 : 2,
          averageRate: 95.0,
        },
        records: [
          {
            employeeId: 'emp-1',
            employeeCode: 'JCET-CSE-001',
            name: 'Prof. Zeeshan Madras',
            department: 'CSE',
            designation: 'Assistant Professor',
            present: 19,
            late: 1,
            halfDay: 0,
            absent: 0,
            onLeave: 0,
            totalRecorded: 20,
            attendanceRate: 100,
          },
        ],
      };
    },

    async getLeaveReport() {
      return {
        summary: { totalDays: 10, totalRequests: 5 },
        byType: [
          { type: 'CL', days: 6 },
          { type: 'ML', days: 4 },
        ],
        records: [
          {
            employeeId: 'emp-1',
            employeeCode: 'JCET-CSE-001',
            name: 'Prof. Zeeshan Madras',
            department: 'CSE',
            designation: 'Assistant Professor',
            totalRequests: 2,
            totalApprovedDays: 4,
            clDays: 2,
            mlDays: 2,
            elDays: 0,
            otherDays: 0,
          },
        ],
      };
    },

    async getWorkloadReport() {
      return {
        summary: { normal: 1, overload: 0, underload: 0 },
        records: [
          {
            facultyId: 'emp-1',
            employeeCode: 'JCET-CSE-001',
            name: 'Prof. Zeeshan Madras',
            department: 'CSE',
            designation: 'Assistant Professor',
            theoryHours: 12,
            labHours: 4,
            totalHours: 16,
            minThreshold: 14,
            maxThreshold: 18,
            status: 'NORMAL',
          },
        ],
      };
    },

    async getContinuityReport() {
      return {
        summary: {
          totalImpacted: 1,
          covered: 1,
          uncovered: 0,
          coverageRate: 100,
        },
        records: [
          {
            id: 'sub-1',
            date: '2026-10-21',
            originalFaculty: 'Dr. Ramesh Kulkarni',
            department: 'CSE',
            subject: 'Computer Networks',
            period: 'Period 3',
            kind: 'SUBSTITUTE',
            substituteFaculty: 'Prof. Zeeshan Madras',
            status: 'COVERED',
          },
        ],
      };
    },
  };
}

test('HR Admin and Principal can view institutional executive summary', async () => {
  const repo = createMockReportsRepository();
  const service = createReportsService(repo);

  const hrAccess: Access = {
    scope: 'all',
    userId: 'user-hr',
    employeeId: 'emp-hr',
    departmentId: 1,
  };

  const summary = await service.getExecutiveSummary(hrAccess);
  assert.equal(summary.headcount.total, 60);
  assert.equal(summary.attendance.todayRate, 95.5);
  assert.equal(summary.continuity.coverageRate, 94);
});

test('HOD is scoped to own department in reports', async () => {
  const repo = createMockReportsRepository();
  const service = createReportsService(repo);

  const hodAccess: Access = {
    scope: 'department',
    userId: 'user-hod',
    employeeId: 'emp-hod',
    departmentId: 2,
  };

  const summary = await service.getExecutiveSummary(hodAccess);
  // Returns department-scoped headcount
  assert.equal(summary.headcount.total, 15);
  assert.equal(summary.headcount.teaching, 12);
});

test('Faculty and Staff are denied access to reports', async () => {
  const repo = createMockReportsRepository();
  const service = createReportsService(repo);

  const facultyAccess: Access = {
    scope: 'own',
    userId: 'user-fac',
    employeeId: 'emp-fac',
    departmentId: 1,
  };

  await assert.rejects(
    async () => {
      await service.getExecutiveSummary(facultyAccess);
    },
    (err: unknown) => err instanceof HttpError && err.status === 403,
  );

  await assert.rejects(
    async () => {
      await service.getAttendanceReport(facultyAccess, { format: 'json' });
    },
    (err: unknown) => err instanceof HttpError && err.status === 403,
  );
});

test('Reports service generates valid CSV export when format=csv requested', async () => {
  const repo = createMockReportsRepository();
  const service = createReportsService(repo);

  const adminAccess: Access = {
    scope: 'all',
    userId: 'user-admin',
    employeeId: null,
    departmentId: null,
  };

  const result = await service.getAttendanceReport(adminAccess, {
    format: 'csv',
  });
  assert.ok(result.csv);
  assert.ok(result.csv.includes('Employee Code,Name,Department,Designation'));
  assert.ok(
    result.csv.includes(
      'JCET-CSE-001,Prof. Zeeshan Madras,CSE,Assistant Professor',
    ),
  );
});

test('Workload and Continuity reports calculate metrics and CSV headers correctly', async () => {
  const repo = createMockReportsRepository();
  const service = createReportsService(repo);

  const hrAccess: Access = {
    scope: 'all',
    userId: 'user-hr',
    employeeId: 'emp-hr',
    departmentId: 1,
  };

  const workload = await service.getWorkloadReport(hrAccess, { format: 'csv' });
  assert.equal(workload.data.records[0].status, 'NORMAL');
  assert.ok(
    workload.csv?.includes('Theory Hours/Wk,Lab Hours/Wk,Total Teaching Hours'),
  );

  const continuity = await service.getContinuityReport(hrAccess, {
    format: 'csv',
  });
  assert.equal(continuity.data.summary.coverageRate, 100);
  assert.ok(
    continuity.csv?.includes('Original Faculty,Department,Subject,Period'),
  );
});

test('report dates reject impossible dates and reversed ranges', async () => {
  const { reportQuerySchema } =
    await import('../src/modules/reports/reports.schema.js');
  for (const input of [
    { from: '2026-02-30' },
    { to: '2026-13-01' },
    { from: '2026-10-22', to: '2026-10-01' },
  ]) {
    assert.equal(reportQuerySchema.safeParse(input).success, false);
  }
  assert.equal(
    reportQuerySchema.safeParse({ from: '2024-02-29', to: '2024-03-01' })
      .success,
    true,
  );
});

test('CSV quotes delimiters and makes formula-looking employee text inert', async () => {
  const repo = createMockReportsRepository();
  const original = repo.getAttendanceReport;
  repo.getAttendanceReport = async (query) => {
    const data = await original(query);
    data.records[0]!.name = '=HYPERLINK("https://example.test","open")';
    data.records[0]!.department = 'CSE\rECE';
    return data;
  };
  const result = await createReportsService(repo).getAttendanceReport(
    { scope: 'all', userId: 'csv', employeeId: null, departmentId: null },
    { format: 'csv' },
  );
  assert.ok(
    result.csv?.includes(`"'=HYPERLINK(""https://example.test"",""open"")"`),
  );
  assert.ok(result.csv?.includes('"CSE\rECE"'));
});
