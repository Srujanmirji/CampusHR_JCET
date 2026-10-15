import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadStatus,
  weeklyHours,
} from '../src/modules/workload/workload.calc.js';

test('weekly hours count each period of a class, split by theory and lab', () => {
  assert.deepEqual(
    weeklyHours([
      { kind: 'THEORY', startPeriod: 1, endPeriod: 1 },
      { kind: 'THEORY', startPeriod: 3, endPeriod: 4 },
      { kind: 'LAB', startPeriod: 5, endPeriod: 7 },
    ]),
    { theoryHours: 3, labHours: 3, totalHours: 6 },
  );
  assert.deepEqual(weeklyHours([]), {
    theoryHours: 0,
    labHours: 0,
    totalHours: 0,
  });
});

test('status compares the total with the band, bounds inclusive', () => {
  const band = { minHours: 14, maxHours: 18 };
  assert.equal(loadStatus(13, band), 'UNDERLOADED');
  assert.equal(loadStatus(14, band), 'NORMAL');
  assert.equal(loadStatus(18, band), 'NORMAL');
  assert.equal(loadStatus(19, band), 'OVERLOADED');
  assert.equal(loadStatus(10, null), null);
});
