import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type { ReportsRepository } from './reports.repository.js';
import type { ReportQuery } from './reports.schema.js';

export interface ReportsService {
  getExecutiveSummary(access: Access): Promise<Awaited<ReturnType<ReportsRepository['getExecutiveSummary']>>>;
  getAttendanceReport(
    access: Access,
    query: ReportQuery,
  ): Promise<{ data: Awaited<ReturnType<ReportsRepository['getAttendanceReport']>>; csv?: string }>;
  getLeaveReport(
    access: Access,
    query: ReportQuery,
  ): Promise<{ data: Awaited<ReturnType<ReportsRepository['getLeaveReport']>>; csv?: string }>;
  getWorkloadReport(
    access: Access,
    query: ReportQuery,
  ): Promise<{ data: Awaited<ReturnType<ReportsRepository['getWorkloadReport']>>; csv?: string }>;
  getContinuityReport(
    access: Access,
    query: ReportQuery,
  ): Promise<{ data: Awaited<ReturnType<ReportsRepository['getContinuityReport']>>; csv?: string }>;
}

function resolveScopeDepartment(access: Access, requestedDeptId?: number): number | undefined {
  if (access.scope === 'own') {
    throw new HttpError(403, 'FORBIDDEN', 'Access denied. You do not have permission to view reports.');
  }

  if (access.scope === 'department') {
    if (!access.departmentId) {
      throw new HttpError(403, 'FORBIDDEN', 'User is not assigned to a department.');
    }
    return access.departmentId;
  }

  return requestedDeptId;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export function createReportsService(repo: ReportsRepository): ReportsService {
  return {
    async getExecutiveSummary(access) {
      const deptId = resolveScopeDepartment(access);
      return repo.getExecutiveSummary(deptId);
    },

    async getAttendanceReport(access, query) {
      const deptId = resolveScopeDepartment(access, query.departmentId);
      const data = await repo.getAttendanceReport({
        from: query.from,
        to: query.to,
        departmentId: deptId,
      });

      if (query.format === 'csv') {
        const headers = [
          'Employee Code',
          'Name',
          'Department',
          'Designation',
          'Days Present',
          'Days Late',
          'Days Half-Day',
          'Days Absent',
          'Days On Leave',
          'Total Recorded',
          'Attendance Rate (%)',
        ];
        const rows = data.records.map((r) => [
          r.employeeCode,
          r.name,
          r.department,
          r.designation,
          r.present,
          r.late,
          r.halfDay,
          r.absent,
          r.onLeave,
          r.totalRecorded,
          r.attendanceRate,
        ]);
        return { data, csv: toCsv(headers, rows) };
      }

      return { data };
    },

    async getLeaveReport(access, query) {
      const deptId = resolveScopeDepartment(access, query.departmentId);
      const data = await repo.getLeaveReport({
        from: query.from,
        to: query.to,
        departmentId: deptId,
      });

      if (query.format === 'csv') {
        const headers = [
          'Employee Code',
          'Name',
          'Department',
          'Designation',
          'Total Requests',
          'Total Approved Days',
          'Casual Leave (CL)',
          'Medical Leave (ML)',
          'Earned Leave (EL)',
          'Other Leaves',
        ];
        const rows = data.records.map((r) => [
          r.employeeCode,
          r.name,
          r.department,
          r.designation,
          r.totalRequests,
          r.totalApprovedDays,
          r.clDays,
          r.mlDays,
          r.elDays,
          r.otherDays,
        ]);
        return { data, csv: toCsv(headers, rows) };
      }

      return { data };
    },

    async getWorkloadReport(access, query) {
      const deptId = resolveScopeDepartment(access, query.departmentId);
      const data = await repo.getWorkloadReport({ departmentId: deptId });

      if (query.format === 'csv') {
        const headers = [
          'Employee Code',
          'Faculty Name',
          'Department',
          'Designation',
          'Theory Hours/Wk',
          'Lab Hours/Wk',
          'Total Teaching Hours',
          'Min AICTE Hours',
          'Max AICTE Hours',
          'Workload Status',
        ];
        const rows = data.records.map((r) => [
          r.employeeCode,
          r.name,
          r.department,
          r.designation,
          r.theoryHours,
          r.labHours,
          r.totalHours,
          r.minThreshold,
          r.maxThreshold,
          r.status,
        ]);
        return { data, csv: toCsv(headers, rows) };
      }

      return { data };
    },

    async getContinuityReport(access, query) {
      const deptId = resolveScopeDepartment(access, query.departmentId);
      const data = await repo.getContinuityReport({
        from: query.from,
        to: query.to,
        departmentId: deptId,
      });

      if (query.format === 'csv') {
        const headers = [
          'Date',
          'Original Faculty',
          'Department',
          'Subject',
          'Period',
          'Substitution Type',
          'Substitute Faculty',
          'Coverage Status',
        ];
        const rows = data.records.map((r) => [
          r.date,
          r.originalFaculty,
          r.department,
          r.subject,
          r.period,
          r.kind,
          r.substituteFaculty || 'N/A',
          r.status,
        ]);
        return { data, csv: toCsv(headers, rows) };
      }

      return { data };
    },
  };
}
