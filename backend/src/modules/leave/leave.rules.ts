// Leave rules that need no database (features/LEAVE_MANAGEMENT.md).
import type { RoleName } from '../auth/permissions.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SUNDAY = 0;

/**
 * Institutional holidays observed at JCET Hubballi (`MM-DD` recurring or
 * `YYYY-MM-DD` specific dates).
 */
export const CAMPUS_HOLIDAYS: Readonly<Record<string, string>> = {
  '01-26': 'Republic Day',
  '05-01': 'May Day',
  '08-15': 'Independence Day',
  '10-02': 'Gandhi Jayanti',
  '11-01': 'Karnataka Rajyotsava',
  '12-25': 'Christmas',
};

const DEFAULT_HOLIDAYS = new Set(Object.keys(CAMPUS_HOLIDAYS));

export function isCampusHoliday(
  date: Date,
  holidays: ReadonlySet<string> = DEFAULT_HOLIDAYS,
) {
  const iso = date.toISOString().slice(0, 10);
  return holidays.has(iso) || holidays.has(iso.slice(5));
}

/**
 * Working days in an inclusive date range, Sundays and institutional holidays
 * excluded (JCET works Monday–Saturday); 0.5 for a half day.
 */
export function countLeaveDays(
  start: Date,
  end: Date,
  halfDay: boolean,
  holidays: ReadonlySet<string> = DEFAULT_HOLIDAYS,
) {
  if (halfDay) {
    return start.getUTCDay() === SUNDAY || isCampusHoliday(start, holidays)
      ? 0
      : 0.5;
  }
  let days = 0;
  for (let at = start.getTime(); at <= end.getTime(); at += DAY_MS) {
    const current = new Date(at);
    if (current.getUTCDay() !== SUNDAY && !isCampusHoliday(current, holidays)) {
      days += 1;
    }
  }
  return days;
}

/**
 * Approved Restricted Holiday (RH) calendar for JCET Hubballi.
 * Faculty pick from eligible restricted holidays rather than entering arbitrary dates.
 */
export interface RestrictedHolidayOption {
  id: string;
  name: string;
  date: string;
  dayOfWeek: string;
}

export const JCET_RESTRICTED_HOLIDAYS: readonly RestrictedHolidayOption[] = [
  { id: 'rh-shivaratri', name: 'Maha Shivaratri', date: '2026-02-16', dayOfWeek: 'Monday' },
  { id: 'rh-ugadi', name: 'Chandramana Ugadi', date: '2026-03-20', dayOfWeek: 'Friday' },
  { id: 'rh-good-friday', name: 'Good Friday', date: '2026-04-03', dayOfWeek: 'Friday' },
  { id: 'rh-varamahalakshmi', name: 'Varamahalakshmi Vrata', date: '2026-08-28', dayOfWeek: 'Friday' },
  { id: 'rh-janmashtami', name: 'Krishna Janmashtami', date: '2026-09-04', dayOfWeek: 'Friday' },
  { id: 'rh-guru-nanak', name: 'Guru Nanak Jayanti', date: '2026-11-24', dayOfWeek: 'Tuesday' },
  { id: 'rh-christmas-eve', name: 'Christmas Eve', date: '2026-12-24', dayOfWeek: 'Thursday' },
];

/**
 * Institutional vacation windows declared by JCET Hubballi / VTU.
 */
export interface VacationPeriodOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
}

export const JCET_VACATION_PERIODS: readonly VacationPeriodOption[] = [
  {
    id: 'vac-summer-2026',
    name: 'Even Semester Summer Vacation 2026',
    startDate: '2026-06-15',
    endDate: '2026-07-15',
    description: 'Annual summer vacation for eligible teaching faculty upon completion of semester exams.',
  },
  {
    id: 'vac-winter-2026',
    name: 'Odd Semester Winter Vacation 2026',
    startDate: '2026-12-15',
    endDate: '2026-12-31',
    description: 'Winter vacation between odd and even semesters.',
  },
];

/** Official Duty options for On Official Duty (OOD). */
export const OOD_DUTY_TYPES = [
  'VTU Academic Work',
  'University Examination Work',
  'Official Academic Meeting',
  'Institutional Representation',
  'Academic Committee Duty',
  'Official Conference / Workshop',
  'Official Institutional Visit',
] as const;

/** Examination duty options for Official Duty / Examination Duty (ODE). */
export const ODE_DUTY_TYPES = [
  'VTU Examination Invigilation',
  'Central Valuation / Evaluation',
  'Flying Squad / Special Squad',
  'External Lab Examiner',
  'Deputy Chief Superintendent',
] as const;

/**
 * Full policy configuration schema for JCET Leave categories.
 */
export interface JcetLeavePolicy {
  code: 'CL' | 'EL' | 'SPL_ML' | 'OOD' | 'ODE' | 'RH' | 'VL';
  name: string;
  description: string;
  /** Days per calendar year. null indicates "As per policy" (unfixed/rule-based). */
  annualEntitlement: number | null;
  carryForwardAllowed: boolean;
  carryForwardLimit: number;
  allowHalfDay: boolean;
  attachmentRequired: boolean;
  reasonRequired: boolean;
  minimumNoticeDays: number;
  maximumConsecutiveDays: number;
  approvalChain: RoleName[];
  /** Treated attendance status when approved. OOD and ODE map to Official Duty (never absent). */
  attendanceStatus: 'Leave' | 'Medical / Special Leave' | 'Official Duty' | 'Restricted Holiday' | 'Vacation Leave';
  affectsTimetable: boolean;
  requiresCoverage: boolean;
  applicableEmployeeTypes: ('TEACHING' | 'NON_TEACHING')[];
  active: boolean;
  displayOrder: number;
  colorToken: 'blue' | 'violet' | 'rose' | 'teal' | 'cyan' | 'amber' | 'sky';
}

/**
 * JCET Leave Categories:
 * 1. CL: Casual Leave (12 days, Blue/Indigo, Half-day allowed)
 * 2. EL: Earned Leave (10 days, Violet, Configurable half-day)
 * 3. SPL_ML: Special / Medical Leave (As per policy, Rose/Coral, Medical cert required)
 * 4. OOD: On Official Duty (12 days, Green/Teal, Official institutional/VTU duty, Official Duty attendance)
 * 5. ODE: Official / Examination Duty (12 days, Cyan/Teal, Configurable label, Official Duty attendance)
 * 6. RH: Restricted Holiday (As per policy, Amber, Calendar picker)
 * 7. VL: Vacation Leave (As per policy, Sky/Cyan, Vacation window)
 */
export const JCET_LEAVE_TYPES: readonly JcetLeavePolicy[] = [
  {
    code: 'CL',
    name: 'Casual Leave',
    description: 'For personal matters and unforeseen short-term absence.',
    annualEntitlement: 12,
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    allowHalfDay: true,
    attachmentRequired: false,
    reasonRequired: true,
    minimumNoticeDays: 1,
    maximumConsecutiveDays: 3,
    approvalChain: ['HOD', 'HR Admin'],
    attendanceStatus: 'Leave',
    affectsTimetable: true,
    requiresCoverage: true,
    applicableEmployeeTypes: ['TEACHING', 'NON_TEACHING'],
    active: true,
    displayOrder: 1,
    colorToken: 'blue',
  },
  {
    code: 'EL',
    name: 'Earned Leave',
    description: 'Earned through continuous service periods as per university norms.',
    annualEntitlement: 10,
    carryForwardAllowed: true,
    carryForwardLimit: 15,
    allowHalfDay: false,
    attachmentRequired: false,
    reasonRequired: true,
    minimumNoticeDays: 7,
    maximumConsecutiveDays: 15,
    approvalChain: ['HOD', 'HR Admin', 'Principal'],
    attendanceStatus: 'Leave',
    affectsTimetable: true,
    requiresCoverage: true,
    applicableEmployeeTypes: ['TEACHING', 'NON_TEACHING'],
    active: true,
    displayOrder: 2,
    colorToken: 'violet',
  },
  {
    code: 'SPL_ML',
    name: 'Special / Medical Leave',
    description: 'Medical exigencies or special institutional approvals. Supporting medical certificate required.',
    annualEntitlement: null, // "As per policy"
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    allowHalfDay: false,
    attachmentRequired: true,
    reasonRequired: true,
    minimumNoticeDays: 0,
    maximumConsecutiveDays: 30,
    approvalChain: ['HOD', 'HR Admin', 'Principal'],
    attendanceStatus: 'Medical / Special Leave',
    affectsTimetable: true,
    requiresCoverage: true,
    applicableEmployeeTypes: ['TEACHING', 'NON_TEACHING'],
    active: true,
    displayOrder: 3,
    colorToken: 'rose',
  },
  {
    code: 'OOD',
    name: 'On Official Duty',
    description: 'Official institutional or academic assignments (VTU work, meetings, conferences, committee duty).',
    annualEntitlement: 12,
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    allowHalfDay: true,
    attachmentRequired: true,
    reasonRequired: true,
    minimumNoticeDays: 2,
    maximumConsecutiveDays: 5,
    approvalChain: ['HOD', 'Principal'],
    attendanceStatus: 'Official Duty',
    affectsTimetable: true,
    requiresCoverage: true,
    applicableEmployeeTypes: ['TEACHING'],
    active: true,
    displayOrder: 4,
    colorToken: 'teal',
  },
  {
    code: 'ODE',
    name: 'Official / Examination Duty',
    description: 'Examination and valuation assignments (VTU invigilation, valuation center assignment, flying squad).',
    annualEntitlement: 12,
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    allowHalfDay: true,
    attachmentRequired: true,
    reasonRequired: true,
    minimumNoticeDays: 2,
    maximumConsecutiveDays: 6,
    approvalChain: ['HOD', 'Principal'],
    attendanceStatus: 'Official Duty',
    affectsTimetable: true,
    requiresCoverage: true,
    applicableEmployeeTypes: ['TEACHING'],
    active: true,
    displayOrder: 5,
    colorToken: 'cyan',
  },
  {
    code: 'RH',
    name: 'Restricted Holiday',
    description: 'Institutional optional holidays selected from the approved JCET restricted holiday calendar.',
    annualEntitlement: null, // "As per policy"
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    allowHalfDay: false,
    attachmentRequired: false,
    reasonRequired: false,
    minimumNoticeDays: 3,
    maximumConsecutiveDays: 1,
    approvalChain: ['HOD', 'HR Admin'],
    attendanceStatus: 'Restricted Holiday',
    affectsTimetable: true,
    requiresCoverage: true,
    applicableEmployeeTypes: ['TEACHING', 'NON_TEACHING'],
    active: true,
    displayOrder: 6,
    colorToken: 'amber',
  },
  {
    code: 'VL',
    name: 'Vacation Leave',
    description: 'Semester-break vacation for eligible faculty as declared by the Principal / VTU calendar.',
    annualEntitlement: null, // "As per policy"
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    allowHalfDay: false,
    attachmentRequired: false,
    reasonRequired: false,
    minimumNoticeDays: 7,
    maximumConsecutiveDays: 30,
    approvalChain: ['HOD', 'Principal'],
    attendanceStatus: 'Vacation Leave',
    affectsTimetable: true,
    requiresCoverage: true,
    applicableEmployeeTypes: ['TEACHING'],
    active: true,
    displayOrder: 7,
    colorToken: 'sky',
  },
];

/**
 * Who approves, in order, by the applicant's role (decided 13 October 2026,
 * product/USER_ROLES.md). HR Admin's own leave goes to the Principal.
 */
export const APPROVER_CHAIN: Partial<Record<RoleName, RoleName[]>> = {
  Faculty: ['HOD', 'HR Admin'],
  'Non-Teaching Staff': ['HR Admin'],
  HOD: ['Principal'],
  Principal: ['Super Admin'],
  'HR Admin': ['Principal'],
};

export interface YearBalance {
  /** Quota plus carried-in days; null for a type without a fixed limit ("As per policy"). */
  entitled: number | null;
  carriedIn: number;
  used: number;
  pending: number;
  /** Null for a type without a fixed limit ("As per policy"). */
  remaining: number | null;
}

/**
 * A year's balance for one leave type. Unused days carry into the next year
 * up to `carryForwardMax`, starting from `firstYear` (the joining year).
 * When `yearlyQuota` is null (e.g. SPL/ML, RH, VL), returns null entitled and remaining,
 * displaying "As per policy".
 */
export function yearBalance(
  type: { yearlyQuota: number | null; carryForwardMax?: number },
  daysByYear: { approved: Map<number, number>; pending: Map<number, number> },
  year: number,
  firstYear: number,
): YearBalance {
  const used = daysByYear.approved.get(year) ?? 0;
  const pending = daysByYear.pending.get(year) ?? 0;
  if (type.yearlyQuota === null || type.yearlyQuota === undefined) {
    return { entitled: null, carriedIn: 0, used, pending, remaining: null };
  }
  const maxCarry = type.carryForwardMax ?? 0;
  let carriedIn = 0;
  for (let y = firstYear; y < year; y++) {
    const left =
      type.yearlyQuota + carriedIn - (daysByYear.approved.get(y) ?? 0);
    carriedIn = Math.min(maxCarry, Math.max(0, left));
  }
  const entitled = type.yearlyQuota + carriedIn;
  return {
    entitled,
    carriedIn,
    used,
    pending,
    remaining: entitled - used - pending,
  };
}
