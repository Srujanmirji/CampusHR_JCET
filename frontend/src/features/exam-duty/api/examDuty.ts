import { apiRequest } from '@/services/api';

export interface ExamSession {
  id: string;
  name: string;
  academicYear: string;
  examType: 'VTU_SEMESTER' | 'INTERNAL_ASSESSMENT' | 'LAB_EXAM';
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  notes?: string | null;
  _count?: { duties: number };
}

export interface ExamDuty {
  id: string;
  sessionId: string;
  session?: { id: string; name: string; examType: string };
  date: string;
  sessionTime: 'MORNING' | 'AFTERNOON';
  reportingTime: string;
  roomId: number | null;
  room?: { id: number; name: string } | null;
  facultyId: string;
  faculty?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    department?: { id: number; code: string; name: string };
    designation?: { id: number; name: string };
    phone: string | null;
    email: string;
  };
  role:
    | 'CHIEF_SUPERINTENDENT'
    | 'DEPUTY_CHIEF'
    | 'INVIGILATOR'
    | 'RELIEVER'
    | 'SQUAD';
  status:
    | 'ASSIGNED'
    | 'CONFIRMED'
    | 'SWAP_REQUESTED'
    | 'SWAPPED'
    | 'ABSENT'
    | 'COMPLETED';
  swapWithFacultyId?: string | null;
  swapWithFaculty?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
  swapReason?: string | null;
  swapStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  remarks?: string | null;
}

export async function fetchExamSessions(): Promise<ExamSession[]> {
  const res = (await apiRequest('/api/v1/exam-duty/sessions')) as {
    data: ExamSession[];
  };
  return res.data;
}

export async function createExamSession(data: {
  name: string;
  academicYear: string;
  examType?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}): Promise<ExamSession> {
  const res = (await apiRequest('/api/v1/exam-duty/sessions', {
    method: 'POST',
    body: data,
  })) as { data: ExamSession };
  return res.data;
}

export async function fetchExamDuties(params?: {
  sessionId?: string;
  date?: string;
  facultyId?: string;
  departmentId?: number;
  status?: string;
}): Promise<ExamDuty[]> {
  const search = new URLSearchParams();
  if (params?.sessionId) search.set('sessionId', params.sessionId);
  if (params?.date) search.set('date', params.date);
  if (params?.facultyId) search.set('facultyId', params.facultyId);
  if (params?.departmentId) search.set('departmentId', String(params.departmentId));
  if (params?.status) search.set('status', params.status);

  const query = search.toString() ? `?${search.toString()}` : '';
  const res = (await apiRequest(`/api/v1/exam-duty/duties${query}`)) as {
    data: ExamDuty[];
  };
  return res.data;
}

export async function createExamDuty(data: {
  sessionId: string;
  date: string;
  sessionTime: string;
  reportingTime?: string;
  roomId?: number | null;
  facultyId: string;
  role?: string;
  remarks?: string;
}): Promise<ExamDuty> {
  const res = (await apiRequest('/api/v1/exam-duty/duties', {
    method: 'POST',
    body: data,
  })) as { data: ExamDuty };
  return res.data;
}

export async function autoAllotExamDuties(data: {
  sessionId: string;
  date: string;
  sessionTime: string;
  reportingTime?: string;
  roomIds: number[];
  departmentIds?: number[];
  excludeFacultyIds?: string[];
}): Promise<{
  allottedCount: number;
  duties: ExamDuty[];
  unallocatedRoomIds: number[];
}> {
  const res = (await apiRequest('/api/v1/exam-duty/auto-allot', {
    method: 'POST',
    body: data,
  })) as {
    data: {
      allottedCount: number;
      duties: ExamDuty[];
      unallocatedRoomIds: number[];
    };
  };
  return res.data;
}

export async function requestDutySwap(
  dutyId: string,
  data: { swapWithFacultyId: string; reason: string },
): Promise<ExamDuty> {
  const res = (await apiRequest(`/api/v1/exam-duty/duties/${dutyId}/swap-request`, {
    method: 'POST',
    body: data,
  })) as { data: ExamDuty };
  return res.data;
}

export async function decideDutySwap(
  dutyId: string,
  data: { decision: 'APPROVED' | 'REJECTED'; remarks?: string },
): Promise<ExamDuty> {
  const res = (await apiRequest(`/api/v1/exam-duty/duties/${dutyId}/swap-decide`, {
    method: 'POST',
    body: data,
  })) as { data: ExamDuty };
  return res.data;
}

export async function exportExamDutyCsv(sessionId?: string): Promise<Blob> {
  const query = sessionId ? `?sessionId=${sessionId}&format=csv` : '?format=csv';
  return (await apiRequest(`/api/v1/exam-duty/duties${query}`, {
    responseType: 'blob',
  })) as Blob;
}
