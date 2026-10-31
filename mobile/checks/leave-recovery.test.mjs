import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leaveRequest } from './leave-fixtures.mjs';
import {
  findRecordedLeaveIntent,
  isAmbiguousLeaveIntent,
  leaveSubmissionFingerprint,
  leaveSubmissionIntent,
  retainAmbiguousLeaveIntent,
} from '../components/leave/leave-submission-recovery.ts';

const payload = {
  leaveTypeId: leaveRequest.leaveType.id,
  startDate: leaveRequest.startDate,
  endDate: leaveRequest.endDate,
  halfDay: leaveRequest.halfDay,
  reason: leaveRequest.reason,
};
const intent = leaveSubmissionIntent(leaveRequest.employee.id, payload);

test('recovery fingerprints capture the submitted employee and normalized contract without mutating the draft', () => {
  const draft = {
    ...payload,
    reason: `  ${payload.reason}  `,
    halfDay: undefined,
  };
  const snapshot = leaveSubmissionIntent(leaveRequest.employee.id, draft);
  assert.equal(
    leaveSubmissionFingerprint(snapshot),
    leaveSubmissionFingerprint(intent),
  );
  assert.equal(draft.reason, `  ${payload.reason}  `);
  draft.reason = 'Different request';
  assert.equal(snapshot.reason, payload.reason);
  assert.equal(snapshot.halfDay, null);
});

test('an existing record must exactly match every submitted field and employee; status does not imply a new write', () => {
  assert.equal(findRecordedLeaveIntent(intent, []), undefined);
  for (const patch of [
    { employee: { ...leaveRequest.employee, id: 'another-employee' } },
    { leaveType: { ...leaveRequest.leaveType, id: 2 } },
    { startDate: '2026-10-23' },
    { endDate: '2026-10-23' },
    { halfDay: 'FIRST' },
    { halfDay: 'SECOND' },
    { reason: 'Different reason' },
  ]) {
    assert.equal(
      findRecordedLeaveIntent(intent, [{ ...leaveRequest, ...patch }]),
      undefined,
    );
  }
  for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']) {
    const existing = { ...leaveRequest, status };
    assert.equal(findRecordedLeaveIntent(intent, [existing]), existing);
    assert.equal(existing.id, leaveRequest.id);
    assert.equal(existing.status, status);
  }
});

test('discarding an ambiguous draft permits a different intent while keeping the same payload blocked across reopen and history checks', () => {
  const original = new Set();
  const blocked = retainAmbiguousLeaveIntent(original, intent);
  assert.equal(original.size, 0);
  assert.equal(isAmbiguousLeaveIntent(blocked, intent), true);
  // Resetting form values has no authority to remove the submitted fingerprint.
  const resetDraft = leaveSubmissionIntent(intent.employeeId, {
    ...payload,
    reason: '',
  });
  const different = leaveSubmissionIntent(intent.employeeId, {
    ...payload,
    reason: 'Different request',
  });
  assert.equal(isAmbiguousLeaveIntent(blocked, resetDraft), false);
  assert.equal(isAmbiguousLeaveIntent(blocked, different), false);
  // Neither a read returning no match nor a matching record authorizes resubmission.
  assert.equal(findRecordedLeaveIntent(intent, []), undefined);
  assert.equal(isAmbiguousLeaveIntent(blocked, intent), true);
  assert.equal(findRecordedLeaveIntent(intent, [leaveRequest]), leaveRequest);
  assert.equal(isAmbiguousLeaveIntent(blocked, intent), true);
  const reopenedDraft = leaveSubmissionIntent(intent.employeeId, {
    ...payload,
    reason: ` ${payload.reason} `,
  });
  assert.equal(isAmbiguousLeaveIntent(blocked, reopenedDraft), true);
});

test('multiple uncertain submissions retain independent guards instead of locking all future requests', () => {
  const different = leaveSubmissionIntent(intent.employeeId, {
    ...payload,
    reason: 'Conference attendance',
  });
  const another = leaveSubmissionIntent(intent.employeeId, {
    ...payload,
    reason: 'Medical appointment',
  });
  const first = retainAmbiguousLeaveIntent(new Set(), intent);
  const second = retainAmbiguousLeaveIntent(first, different);
  assert.equal(first.size, 1);
  assert.equal(second.size, 2);
  assert.equal(isAmbiguousLeaveIntent(second, intent), true);
  assert.equal(isAmbiguousLeaveIntent(second, different), true);
  assert.equal(isAmbiguousLeaveIntent(second, another), false);
  const otherEmployee = leaveSubmissionIntent(
    'different-session-employee',
    payload,
  );
  assert.equal(isAmbiguousLeaveIntent(second, otherEmployee), false);
});
