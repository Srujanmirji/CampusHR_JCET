import { apiRequest } from '@/services/api';

export type CandidateStatus =
  | 'OFFER_PENDING'
  | 'OFFER_ISSUED'
  | 'OFFER_ACCEPTED'
  | 'DOCUMENTS_SUBMITTED'
  | 'ONBOARDED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface DocumentsChecklist {
  degreeCertificate: boolean;
  pgMarksheet: boolean;
  experienceCertificate: boolean;
  relievingOrder: boolean;
  aadhaarPan: boolean;
  addressProof: boolean;
}

export interface OnboardingCandidate {
  id: string;
  appointmentRefNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: number;
  department: {
    id: number;
    code: string;
    name: string;
  };
  designationId: number;
  designation: {
    id: number;
    name: string;
    category: 'TEACHING' | 'NON_TEACHING';
  };
  employmentType: 'PERMANENT' | 'CONTRACT' | 'PROBATIONARY' | 'VISITING';
  qualification: string;
  specialization: string | null;
  experienceYears: number;
  expectedJoiningDate: string;
  status: CandidateStatus;
  probationMonths: number;
  noticePeriodMonths: number;
  documentsChecklist: DocumentsChecklist | null;
  employeeId: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
  issuedById: string | null;
  issuedBy?: {
    id: string;
    email: string;
  } | null;
  issuedAt: string | null;
  joinedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentLetterData {
  refNo: string;
  issueDate: string;
  candidateName: string;
  email: string;
  phone: string;
  department: string;
  departmentCode: string;
  designation: string;
  category: 'TEACHING' | 'NON_TEACHING';
  employmentType: string;
  probationMonths: number;
  noticePeriodMonths: number;
  expectedJoiningDate: string;
  institution: {
    name: string;
    address: string;
    affiliation: string;
    authorizedSignatory: string;
  };
  termsAndConditions: string[];
}

export interface CandidateListResponse {
  data: OnboardingCandidate[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pending: number;
    issued: number;
    accepted: number;
    onboarded: number;
  };
}

export async function fetchCandidates(filters: {
  status?: string;
  departmentId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<CandidateListResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.departmentId) params.set('departmentId', String(filters.departmentId));
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return (await apiRequest(`/api/v1/onboarding${queryStr}`)) as CandidateListResponse;
}

export async function getCandidate(id: string): Promise<{
  data: OnboardingCandidate & { letter: AppointmentLetterData };
}> {
  return (await apiRequest(`/api/v1/onboarding/${id}`)) as {
    data: OnboardingCandidate & { letter: AppointmentLetterData };
  };
}

export async function createCandidate(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: number;
  designationId: number;
  employmentType: string;
  qualification: string;
  specialization?: string;
  experienceYears?: number;
  expectedJoiningDate: string;
  probationMonths?: number;
  noticePeriodMonths?: number;
  notes?: string;
}): Promise<{ data: OnboardingCandidate }> {
  return (await apiRequest('/api/v1/onboarding', {
    method: 'POST',
    body: payload,
  })) as { data: OnboardingCandidate };
}

export async function updateCandidate(
  id: string,
  payload: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    departmentId: number;
    designationId: number;
    employmentType: string;
    qualification: string;
    specialization?: string;
    experienceYears?: number;
    expectedJoiningDate?: string;
    probationMonths?: number;
    noticePeriodMonths?: number;
    documentsChecklist?: Partial<DocumentsChecklist>;
    notes?: string;
  }>,
): Promise<{ data: OnboardingCandidate }> {
  return (await apiRequest(`/api/v1/onboarding/${id}`, {
    method: 'PATCH',
    body: payload,
  })) as { data: OnboardingCandidate };
}

export async function issueAppointmentLetter(id: string): Promise<{
  data: OnboardingCandidate & { letter: AppointmentLetterData };
}> {
  return (await apiRequest(`/api/v1/onboarding/${id}/issue-letter`, {
    method: 'POST',
  })) as {
    data: OnboardingCandidate & { letter: AppointmentLetterData };
  };
}

export async function updateCandidateStatus(
  id: string,
  payload: { status: CandidateStatus; notes?: string },
): Promise<{ data: OnboardingCandidate }> {
  return (await apiRequest(`/api/v1/onboarding/${id}/status`, {
    method: 'POST',
    body: payload,
  })) as { data: OnboardingCandidate };
}

export async function completeOnboarding(
  id: string,
  payload: {
    createLoginAccount?: boolean;
    temporaryPassword?: string;
    joiningDate?: string;
  },
): Promise<{
  data: {
    candidate: OnboardingCandidate;
    employee: { id: string; employeeCode: string };
    generatedPassword?: string;
  };
}> {
  return (await apiRequest(`/api/v1/onboarding/${id}/complete`, {
    method: 'POST',
    body: payload,
  })) as {
    data: {
      candidate: OnboardingCandidate;
      employee: { id: string; employeeCode: string };
      generatedPassword?: string;
    };
  };
}
