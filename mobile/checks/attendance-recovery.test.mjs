import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createCorrectionIntent,
  matchesCorrectionIntent,
} from '../components/attendance/correction-recovery.ts';
import { attendanceFixtures } from './attendance-fixtures.mjs';

const record = attendanceFixtures().correction;
const input = {
  date: '2026-10-21',
  checkIn: '09:00',
  checkOut: '17:00',
  requestedStatus: 'PRESENT',
  reason: 'Device missed my attendance.',
};

test('an uncertain payload remains blocked after discarding its draft, including equivalent reason whitespace', () => {
  const intent = createCorrectionIntent(record.employeeId, input);
  const blocked = new Set([intent.fingerprint]);
  const replacement = { ...input, reason: ` ${input.reason} ` };
  assert.equal(
    blocked.has(
      createCorrectionIntent(record.employeeId, replacement).fingerprint,
    ),
    true,
  );
  for (const change of [
    { date: '2026-10-20' },
    { checkIn: '09:01' },
    { checkOut: '' },
    { requestedStatus: 'LATE' },
    { reason: 'A different attendance correction.' },
  ]) {
    assert.equal(
      blocked.has(
        createCorrectionIntent(record.employeeId, { ...input, ...change })
          .fingerprint,
      ),
      false,
    );
  }
  assert.equal(
    blocked.has(createCorrectionIntent('another-employee', input).fingerprint),
    false,
  );
});

test('the retained intent is a snapshot of the submitted draft', () => {
  const draft = { ...input, reason: ` ${input.reason} ` };
  const intent = createCorrectionIntent(record.employeeId, draft);
  draft.date = '2026-10-20';
  draft.reason = 'Edited after submission';
  assert.equal(intent.input.date, input.date);
  assert.equal(intent.input.reason, input.reason);
  assert.equal(matchesCorrectionIntent(intent, record), true);
});

test('an exact request is identified even after review, without requiring a new pending write', () => {
  const intent = createCorrectionIntent(record.employeeId, input);
  for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
    assert.equal(matchesCorrectionIntent(intent, { ...record, status }), true);
  }
  assert.equal(
    matchesCorrectionIntent(intent, {
      ...record,
      requestedCheckIn: '2026-10-21T14:30:00+05:30',
    }),
    true,
  );
});

test('a similar correction never resolves a different employee, UTC day, requested status, reason or exact time', () => {
  const intent = createCorrectionIntent(record.employeeId, input);
  for (const change of [
    { employeeId: 'another-employee' },
    { date: '2026-10-20T00:00:00.000Z' },
    { requestedStatus: 'LATE' },
    { reason: 'Different reason.' },
    { requestedCheckIn: null },
    { requestedCheckIn: '2026-10-21T09:00:01.000Z' },
    { requestedCheckIn: '2026-10-21T09:00:00+05:30' },
    { requestedCheckOut: null },
    { requestedCheckOut: '2026-10-21T17:01:00.000Z' },
  ]) {
    assert.equal(
      matchesCorrectionIntent(intent, { ...record, ...change }),
      false,
    );
  }
});

test('blank time fields match requested removals only', () => {
  const intent = createCorrectionIntent(record.employeeId, {
    ...input,
    checkIn: '',
    checkOut: '',
    requestedStatus: 'ABSENT',
  });
  const removal = {
    ...record,
    requestedCheckIn: null,
    requestedCheckOut: null,
    requestedStatus: 'ABSENT',
  };
  assert.equal(matchesCorrectionIntent(intent, removal), true);
  assert.equal(
    matchesCorrectionIntent(intent, {
      ...removal,
      requestedCheckIn: record.requestedCheckIn,
    }),
    false,
  );
});
