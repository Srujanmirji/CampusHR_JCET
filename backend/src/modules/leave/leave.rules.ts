// Leave rules that need no database (features/LEAVE_MANAGEMENT.md).
import type { RoleName } from '../auth/permissions.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SUNDAY = 0;

/**
 * Working days in an inclusive date range, Sundays excluded (JCET works
 * Monday–Saturday); 0.5 for a half day.
 * ponytail: holidays are not subtracted yet; add a holiday calendar when HR
 * publishes one.
 */
export function countLeaveDays(start: Date, end: Date, halfDay: boolean) {
  if (halfDay) return start.getUTCDay() === SUNDAY ? 0 : 0.5;
  let days = 0;
  for (let at = start.getTime(); at <= end.getTime(); at += DAY_MS) {
    if (new Date(at).getUTCDay() !== SUNDAY) days += 1;
  }
  return days;
}

/**
 * Who approves, in order, by the applicant's role (decided 13 October 2026,
 * product/USER_ROLES.md). HR Admin's own leave is not in the decision; it
 * goes to the Principal until JCET says otherwise.
 */
export const APPROVER_CHAIN: Partial<Record<RoleName, RoleName[]>> = {
  Faculty: ['HOD', 'HR Admin'],
  'Non-Teaching Staff': ['HR Admin'],
  HOD: ['Principal'],
  Principal: ['Super Admin'],
  'HR Admin': ['Principal'],
};

export interface YearBalance {
  /** Quota plus carried-in days; null for a type without a limit. */
  entitled: number | null;
  carriedIn: number;
  used: number;
  pending: number;
  /** Null for a type without a limit. */
  remaining: number | null;
}

/**
 * A year's balance for one leave type. Unused days carry into the next year
 * up to `carryForwardMax`, starting from `firstYear` (the joining year).
 * ponytail: past years use today's quota, so a quota change applies
 * backwards too; store yearly balances if JCET needs history to stay fixed.
 */
export function yearBalance(
  type: { yearlyQuota: number | null; carryForwardMax: number },
  daysByYear: { approved: Map<number, number>; pending: Map<number, number> },
  year: number,
  firstYear: number,
): YearBalance {
  const used = daysByYear.approved.get(year) ?? 0;
  const pending = daysByYear.pending.get(year) ?? 0;
  if (type.yearlyQuota === null) {
    return { entitled: null, carriedIn: 0, used, pending, remaining: null };
  }
  let carriedIn = 0;
  for (let y = firstYear; y < year; y++) {
    const left =
      type.yearlyQuota + carriedIn - (daysByYear.approved.get(y) ?? 0);
    carriedIn = Math.min(type.carryForwardMax, Math.max(0, left));
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
