import { apiFetch } from './session';

export interface MobileCalendarDay {
  id: string;
  date: string;
  dayType: string;
  title: string | null;
  description: string | null;
  isWorkingDay: boolean;
  appliesToEmployeeType: string | null;
}

export interface MobileCalendarOverview {
  currentAcademicYear: { id: string; name: string; startDate: string; endDate: string } | null;
  currentSemester: { id: string; name: string; type: string; startDate: string; endDate: string } | null;
  semesterWorkingDays: number;
  upcomingHolidays: MobileCalendarDay[];
  upcomingAcademicEvents: MobileCalendarDay[];
  restrictedHolidaysCount: number;
}

export interface MobileRestrictedHoliday {
  id: string;
  name: string;
  date: string;
  active: boolean;
  annualYear: string;
  eligibleEmployeeTypes: string | null;
  description: string | null;
}

export async function fetchMobileCalendarOverview(): Promise<MobileCalendarOverview | null> {
  try {
    const res = await apiFetch('/api/v1/academic-calendar/overview');
    if (!res.ok) return null;
    return (await res.json()) as MobileCalendarOverview;
  } catch {
    return null;
  }
}

export async function fetchMobileCalendarDays(monthStr?: string): Promise<MobileCalendarDay[]> {
  try {
    const query = monthStr ? `?month=${monthStr}&pageSize=100` : '?pageSize=100';
    const res = await apiFetch(`/api/v1/academic-calendar${query}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function fetchMobileRestrictedHolidays(): Promise<MobileRestrictedHoliday[]> {
  try {
    const res = await apiFetch('/api/v1/restricted-holidays');
    if (!res.ok) return [];
    return (await res.json()) as MobileRestrictedHoliday[];
  } catch {
    return [];
  }
}
