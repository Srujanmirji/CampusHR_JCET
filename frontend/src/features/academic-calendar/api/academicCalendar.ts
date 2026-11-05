import { apiRequest } from '@/services/api';

export type CalendarDayType =
  | 'WORKING_DAY'
  | 'WEEKLY_OFF'
  | 'PUBLIC_HOLIDAY'
  | 'RESTRICTED_HOLIDAY'
  | 'VACATION'
  | 'EXAMINATION'
  | 'INSTITUTIONAL_EVENT'
  | 'ACADEMIC_EVENT'
  | 'SPECIAL_WORKING_DAY';

export type SemesterType = 'ODD' | 'EVEN';

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
  semesters?: Semester[];
  _count?: {
    calendarDays: number;
    semesters: number;
  };
}

export interface Semester {
  id: string;
  academicYearId: string;
  academicYear?: AcademicYear;
  name: string;
  type: SemesterType;
  startDate: string;
  endDate: string;
  teachingStartDate: string | null;
  teachingEndDate: string | null;
  examStartDate: string | null;
  examEndDate: string | null;
  isCurrent: boolean;
  status: string;
  _count?: {
    calendarDays: number;
  };
}

export interface CalendarDay {
  id: string;
  date: string;
  academicYearId: string;
  academicYear?: AcademicYear;
  semesterId: string | null;
  semester?: Semester | null;
  dayType: CalendarDayType;
  title: string | null;
  description: string | null;
  isWorkingDay: boolean;
  departmentId: number | null;
  department?: { id: number; code: string; name: string } | null;
  appliesToEmployeeType: string | null;
  source: string | null;
  restrictedHoliday?: RestrictedHoliday | null;
  createdAt: string;
}

export interface RestrictedHoliday {
  id: string;
  calendarDayId: string | null;
  calendarDay?: CalendarDay | null;
  name: string;
  date: string;
  active: boolean;
  annualYear: string;
  eligibleEmployeeTypes: string | null;
  description: string | null;
}

export interface WeeklyWorkingPattern {
  id: string;
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  description: string | null;
}

export interface CalendarOverview {
  currentAcademicYear: AcademicYear | null;
  currentSemester: Semester | null;
  semesterWorkingDays: number;
  upcomingHolidays: CalendarDay[];
  upcomingAcademicEvents: CalendarDay[];
  restrictedHolidaysCount: number;
}

export interface CalendarListResponse {
  data: CalendarDay[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export async function fetchCalendarOverview(): Promise<CalendarOverview> {
  return (await apiRequest('/api/v1/academic-calendar/overview')) as CalendarOverview;
}

export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  return (await apiRequest('/api/v1/academic-years')) as AcademicYear[];
}

export async function getCurrentAcademicYear(): Promise<AcademicYear | null> {
  return (await apiRequest('/api/v1/academic-years/current')) as AcademicYear | null;
}

export async function createAcademicYear(payload: {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}): Promise<AcademicYear> {
  return (await apiRequest('/api/v1/academic-years', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as AcademicYear;
}

export async function updateAcademicYear(
  id: string,
  payload: Partial<AcademicYear>,
): Promise<AcademicYear> {
  return (await apiRequest(`/api/v1/academic-years/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })) as AcademicYear;
}

export async function setCurrentAcademicYear(id: string): Promise<AcademicYear> {
  return (await apiRequest(`/api/v1/academic-years/${id}/set-current`, {
    method: 'POST',
  })) as AcademicYear;
}

export async function fetchSemesters(academicYearId?: string): Promise<Semester[]> {
  const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
  return (await apiRequest(`/api/v1/semesters${query}`)) as Semester[];
}

export async function createSemester(payload: {
  academicYearId: string;
  name: string;
  type: SemesterType;
  startDate: string;
  endDate: string;
  teachingStartDate?: string | null;
  teachingEndDate?: string | null;
  examStartDate?: string | null;
  examEndDate?: string | null;
  isCurrent?: boolean;
}): Promise<Semester> {
  return (await apiRequest('/api/v1/semesters', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as Semester;
}

export async function updateSemester(
  id: string,
  payload: Partial<Semester>,
): Promise<Semester> {
  return (await apiRequest(`/api/v1/semesters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })) as Semester;
}

export async function setCurrentSemester(id: string): Promise<Semester> {
  return (await apiRequest(`/api/v1/semesters/${id}/set-current`, {
    method: 'POST',
  })) as Semester;
}

export async function fetchCalendarDays(filters: {
  academicYearId?: string;
  semesterId?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  dayType?: string;
  isWorkingDay?: boolean;
  departmentId?: number;
  appliesToEmployeeType?: string;
  page?: number;
  pageSize?: number;
}): Promise<CalendarListResponse> {
  const params = new URLSearchParams();
  if (filters.academicYearId) params.set('academicYearId', filters.academicYearId);
  if (filters.semesterId) params.set('semesterId', filters.semesterId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.month) params.set('month', filters.month);
  if (filters.dayType && filters.dayType !== 'ALL') params.set('dayType', filters.dayType);
  if (filters.isWorkingDay !== undefined) params.set('isWorkingDay', String(filters.isWorkingDay));
  if (filters.departmentId) params.set('departmentId', String(filters.departmentId));
  if (filters.appliesToEmployeeType) params.set('appliesToEmployeeType', filters.appliesToEmployeeType);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return (await apiRequest(`/api/v1/academic-calendar${queryStr}`)) as CalendarListResponse;
}

export async function createCalendarDay(payload: {
  date: string;
  academicYearId: string;
  semesterId?: string | null;
  dayType: CalendarDayType;
  title?: string | null;
  description?: string | null;
  isWorkingDay: boolean;
  departmentId?: number | null;
  appliesToEmployeeType?: string | null;
}): Promise<CalendarDay> {
  return (await apiRequest('/api/v1/academic-calendar', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as CalendarDay;
}

export async function createCalendarRange(payload: {
  startDate: string;
  endDate: string;
  academicYearId: string;
  semesterId?: string | null;
  dayType: CalendarDayType;
  title: string;
  description?: string | null;
  isWorkingDay: boolean;
  departmentId?: number | null;
  appliesToEmployeeType?: string | null;
}): Promise<{ count: number }> {
  return (await apiRequest('/api/v1/academic-calendar/range', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as { count: number };
}

export async function updateCalendarDay(
  id: string,
  payload: Partial<CalendarDay>,
): Promise<CalendarDay> {
  return (await apiRequest(`/api/v1/academic-calendar/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })) as CalendarDay;
}

export async function deleteCalendarDay(id: string): Promise<CalendarDay> {
  return (await apiRequest(`/api/v1/academic-calendar/${id}`, {
    method: 'DELETE',
  })) as CalendarDay;
}

export async function fetchHolidays(academicYearId?: string): Promise<CalendarDay[]> {
  const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
  return (await apiRequest(`/api/v1/holidays${query}`)) as CalendarDay[];
}

export async function fetchRestrictedHolidays(annualYear?: string): Promise<RestrictedHoliday[]> {
  const query = annualYear ? `?annualYear=${annualYear}` : '';
  return (await apiRequest(`/api/v1/restricted-holidays${query}`)) as RestrictedHoliday[];
}

export async function createRestrictedHoliday(payload: {
  name: string;
  date: string;
  annualYear: string;
  eligibleEmployeeTypes?: string;
  description?: string | null;
  active?: boolean;
}): Promise<RestrictedHoliday> {
  return (await apiRequest('/api/v1/restricted-holidays', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as RestrictedHoliday;
}

export async function updateRestrictedHoliday(
  id: string,
  payload: Partial<RestrictedHoliday>,
): Promise<RestrictedHoliday> {
  return (await apiRequest(`/api/v1/restricted-holidays/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })) as RestrictedHoliday;
}

export async function fetchWeeklyPatterns(): Promise<WeeklyWorkingPattern[]> {
  return (await apiRequest('/api/v1/academic-calendar/working-pattern')) as WeeklyWorkingPattern[];
}

export async function updateWeeklyPatterns(
  patterns: WeeklyWorkingPattern[],
): Promise<WeeklyWorkingPattern[]> {
  return (await apiRequest('/api/v1/academic-calendar/working-pattern', {
    method: 'PATCH',
    body: JSON.stringify({ patterns }),
  })) as WeeklyWorkingPattern[];
}
