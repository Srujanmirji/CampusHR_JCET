import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPROVER_CHAIN,
  countLeaveDays,
  yearBalance,
} from '../src/modules/leave/leave.rules.js';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

test('leave days count Monday–Saturday, inclusive; Sundays and holidays are free', () => {
  // 2026-10-12 is a Monday; 2026-10-18 a Sunday.
  assert.equal(countLeaveDays(day('2026-10-12'), day('2026-10-12'), false), 1);
  assert.equal(countLeaveDays(day('2026-10-12'), day('2026-10-18'), false), 6);
  assert.equal(countLeaveDays(day('2026-10-17'), day('2026-10-19'), false), 2);
  assert.equal(countLeaveDays(day('2026-10-18'), day('2026-10-18'), false), 0);
  assert.equal(countLeaveDays(day('2026-10-13'), day('2026-10-13'), true), 0.5);
  assert.equal(countLeaveDays(day('2026-10-18'), day('2026-10-18'), true), 0);
  // 2026-10-02 is Friday (Gandhi Jayanti holiday)
  assert.equal(countLeaveDays(day('2026-10-01'), day('2026-10-03'), false), 2);
  assert.equal(countLeaveDays(day('2026-10-02'), day('2026-10-02'), true), 0);
});

test('approval chain follows the decided roles', () => {
  assert.deepEqual(APPROVER_CHAIN.Faculty, ['HOD', 'HR Admin']);
  assert.deepEqual(APPROVER_CHAIN['Non-Teaching Staff'], ['HR Admin']);
  assert.deepEqual(APPROVER_CHAIN.HOD, ['Principal']);
  assert.deepEqual(APPROVER_CHAIN.Principal, ['Super Admin']);
  assert.equal(APPROVER_CHAIN['Super Admin'], undefined);
});

test('balances count approved and pending days and carry unused days, capped', () => {
  const type = { yearlyQuota: 12, carryForwardMax: 5 };
  const days = {
    approved: new Map([
      [2024, 2], // 10 unused, 5 carried into 2025
      [2025, 16], // 17 entitled, 1 unused, carried into 2026
      [2026, 3],
    ]),
    pending: new Map([[2026, 1.5]]),
  };
  assert.deepEqual(yearBalance(type, days, 2026, 2024), {
    entitled: 13,
    carriedIn: 1,
    used: 3,
    pending: 1.5,
    remaining: 8.5,
  });
  assert.equal(yearBalance(type, days, 2024, 2024).carriedIn, 0);
  assert.equal(yearBalance(type, days, 2025, 2024).carriedIn, 5);
  assert.equal(
    yearBalance({ yearlyQuota: 12, carryForwardMax: 0 }, days, 2026, 2024)
      .entitled,
    12,
  );
  assert.deepEqual(
    yearBalance({ yearlyQuota: null, carryForwardMax: 0 }, days, 2026, 2024),
    { entitled: null, carriedIn: 0, used: 3, pending: 1.5, remaining: null },
  );
});
