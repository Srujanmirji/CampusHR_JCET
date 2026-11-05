import { apiFetch } from './session';

export type ExamType = 'VTU_SEMESTER' | 'INTERNAL_ASSESSMENT' | 'LAB_EXAM';

export interface MobileExamSession {
  id: string;
  name: string;
  academicYear: string;
  examType: ExamType;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  notes?: string | null;
  _count?: { duties: number };
}

export type ExamDutyRole =
  | 'CHIEF_SUPERINTENDENT'
  | 'DEPUTY_CHIEF'
  | 'INVIGILATOR'
  | 'RELIEVER'
  | 'SQUAD';

export type ExamDutyStatus =
  | 'ASSIGNED'
  | 'CONFIRMED'
  | 'SWAP_REQUESTED'
  | 'SWAPPED'
  | 'ABSENT'
  | 'COMPLETED';

export interface MobileExamDuty {
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
  role: ExamDutyRole;
  status: ExamDutyStatus;
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

export async function fetchExamSessions(): Promise<MobileExamSession[]> {
  const response = await apiFetch('/exam-duty/sessions');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to load sessions: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data || [];
}

export async function fetchExamDuties(params?: {
  sessionId?: string;
  date?: string;
  facultyId?: string;
  departmentId?: number;
  status?: string;
}): Promise<MobileExamDuty[]> {
  const searchParams = new URLSearchParams();
  if (params?.sessionId) searchParams.set('sessionId', params.sessionId);
  if (params?.date) searchParams.set('date', params.date);
  if (params?.facultyId) searchParams.set('facultyId', params.facultyId);
  if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const response = await apiFetch(`/exam-duty/duties${query}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to load exam duties: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data || [];
}

export async function requestDutySwap(
  dutyId: string,
  data: { swapWithFacultyId: string; reason: string },
): Promise<MobileExamDuty> {
  const response = await apiFetch(`/exam-duty/duties/${dutyId}/swap-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to request swap: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function decideDutySwap(
  dutyId: string,
  data: { decision: 'APPROVED' | 'REJECTED'; remarks?: string },
): Promise<MobileExamDuty> {
  const response = await apiFetch(`/exam-duty/duties/${dutyId}/swap-decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to decide swap: ${response.status} ${errorText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function fetchFacultyList(): Promise<
  Array<{
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: { id: number; code: string; name: string };
  }>
> {
  const response = await apiFetch('/employees?status=ACTIVE&pageSize=100');
  if (!response.ok) return [];
  const result = await response.json();
  return result.data || [];
}
