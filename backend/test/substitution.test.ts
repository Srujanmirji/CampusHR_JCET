import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inHalf,
  leaveDates,
  scoreCandidate,
  weekOf,
} from '../src/modules/substitution/substitution.rules.js';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

test('a leave covers its working dates; Sundays are skipped', () => {
  // 2026-11-07 is a Saturday.
  assert.deepEqual(leaveDates(day('2026-11-07'), day('2026-11-09')), [
    '2026-11-07',
    '2026-11-09',
  ]);
});

test('half days cover the morning or the afternoon classes', () => {
  const starts = new Map([
    [1, '09:00'],
    [4, '12:15'],
    [5, '14:00'],
    [7, '16:00'],
  ]);
  const morning = { startPeriod: 1, endPeriod: 1 };
  const afternoonLab = { startPeriod: 5, endPeriod: 7 };
  assert.equal(inHalf('FIRST', morning, starts), true);
  assert.equal(inHalf('FIRST', afternoonLab, starts), false);
  assert.equal(inHalf('SECOND', afternoonLab, starts), true);
  assert.equal(
    inHalf('SECOND', { startPeriod: 4, endPeriod: 4 }, starts),
    false,
  );
  assert.equal(inHalf(null, morning, starts), true);
});

test('weeks run Monday to Sunday', () => {
  const { monday, sunday } = weekOf(day('2026-11-08'));
  assert.equal(monday.toISOString().slice(0, 10), '2026-11-02');
  assert.equal(sunday.toISOString().slice(0, 10), '2026-11-08');
  assert.equal(weekOf(day('2026-11-02')).monday.getUTCDate(), 2);
});

test('scores follow the 35/25/15/15/10 rubric', () => {
  const best = scoreCandidate({
    teachesSubject: true,
    teachesSameKindInDepartment: true,
    freeAround: true,
    sameDepartment: true,
    hoursAfter: 0,
    maxHours: 18,
    experienceYears: 12,
  });
  assert.deepEqual(best.points, {
    subject: 35,
    availability: 25,
    department: 15,
    workload: 15,
    experience: 10,
  });
  assert.equal(best.total, 100);

  const facts = {
    teachesSubject: false,
    teachesSameKindInDepartment: true,
    freeAround: false,
    sameDepartment: false,
    hoursAfter: 12,
    maxHours: 18,
    experienceYears: 3,
  };
  const other = scoreCandidate(facts);
  assert.deepEqual(other.points, {
    subject: 15,
    availability: 12,
    department: 5,
    workload: 5,
    experience: 3,
  });
  assert.equal(
    scoreCandidate({ ...facts, maxHours: null }).points.workload,
    7,
    'no band: midway',
  );
});
