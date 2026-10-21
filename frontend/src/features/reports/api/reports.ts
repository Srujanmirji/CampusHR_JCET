import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

export interface ExecutiveSummaryDto {
  headcount: {
    total: number;
    teaching: number;
    nonTeaching: number;
    doctorates: number;
    cadre: {
      professors: number;
      associateProfessors: number;
      assistantProfessors: number;
      others: number;
    };
  };
  attendance: {
    todayRate: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    totalToday: number;
    departmentAverages: { department: string; rate: number }[];
  };
  leave: {
    monthlyLeaveDays: number;
    activeLeavesToday: number;
    monthlyTrends: { month: string; CL: number; ML: number; EL: number; other: number }[];
  };
  continuity: {
    affectedClasses: number;
    classesCovered: number;
    coverageRate: number;
    uncoveredClasses: number;
  };
  workload: {
    normalLoadPercentage: number;
    totalAudited: number;
  };
}

export interface AttendanceReportDto {
  summary: { totalEmployees: number; averageRate: number };
  records: {
    employeeId: string;
    employeeCode: string;
    name: string;
    department: string;
    designation: string;
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    totalRecorded: number;
    attendanceRate: number;
  }[];
}

export interface LeaveReportDto {
  summary: { totalDays: number; totalRequests: number };
  byType: { type: string; days: number }[];
  records: {
    employeeId: string;
    employeeCode: string;
    name: string;
    department: string;
    designation: string;
    totalRequests: number;
    totalApprovedDays: number;
    clDays: number;
    mlDays: number;
    elDays: number;
    otherDays: number;
  }[];
}

export interface WorkloadReportDto {
  summary: { normal: number; overload: number; underload: number };
  records: {
    facultyId: string;
    employeeCode: string;
    name: string;
    department: string;
    designation: string;
    theoryHours: number;
    labHours: number;
    totalHours: number;
    minThreshold: number;
    maxThreshold: number;
    status: 'NORMAL' | 'OVERLOAD' | 'UNDERLOAD';
  }[];
}

export interface ContinuityReportDto {
  summary: {
    totalImpacted: number;
    covered: number;
    uncovered: number;
    coverageRate: number;
  };
  records: {
    id: string;
    date: string;
    originalFaculty: string;
    department: string;
    subject: string;
    period: string;
    kind: string;
    substituteFaculty: string | null;
    status: 'COVERED' | 'UNCOVERED';
  }[];
}

export function useReportsSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: async () => {
      const res = (await apiRequest('/reports/summary')) as { data: ExecutiveSummaryDto };
      return res.data;
    },
  });
}

export function useAttendanceReport(params?: { from?: string; to?: string; departmentId?: number }) {
  return useQuery({
    queryKey: ['reports', 'attendance', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      if (params?.departmentId) query.set('departmentId', String(params.departmentId));
      const res = (await apiRequest(`/reports/attendance?${query.toString()}`)) as { data: AttendanceReportDto };
      return res.data;
    },
  });
}

export function useLeaveReport(params?: { from?: string; to?: string; departmentId?: number }) {
  return useQuery({
    queryKey: ['reports', 'leave', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      if (params?.departmentId) query.set('departmentId', String(params.departmentId));
      const res = (await apiRequest(`/reports/leave?${query.toString()}`)) as { data: LeaveReportDto };
      return res.data;
    },
  });
}

export function useWorkloadReport(params?: { departmentId?: number }) {
  return useQuery({
    queryKey: ['reports', 'workload', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.departmentId) query.set('departmentId', String(params.departmentId));
      const res = (await apiRequest(`/reports/workload?${query.toString()}`)) as { data: WorkloadReportDto };
      return res.data;
    },
  });
}

export function useContinuityReport(params?: { from?: string; to?: string; departmentId?: number }) {
  return useQuery({
    queryKey: ['reports', 'continuity', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      if (params?.departmentId) query.set('departmentId', String(params.departmentId));
      const res = (await apiRequest(`/reports/continuity?${query.toString()}`)) as { data: ContinuityReportDto };
      return res.data;
    },
  });
}

export async function downloadReportCsv(
  reportType: 'attendance' | 'leave' | 'workload' | 'continuity',
  params?: { from?: string; to?: string; departmentId?: number },
) {
  const query = new URLSearchParams();
  query.set('format', 'csv');
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.departmentId) query.set('departmentId', String(params.departmentId));

  const url = `/api/v1/reports/${reportType}?${query.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to generate CSV export.');
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `JCET-${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
