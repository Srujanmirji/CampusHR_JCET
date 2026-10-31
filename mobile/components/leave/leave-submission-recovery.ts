import type { LeaveApplyPayload, LeaveRequestDto } from '../../lib/leave-api';

export type LeaveSubmissionIntent = Readonly<{
  employeeId: string;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  halfDay: 'FIRST' | 'SECOND' | null;
  reason: string;
}>;

// Normalize exactly what the submission contract sends, without changing the draft.
export function leaveSubmissionIntent(
  employeeId: string,
  payload: LeaveApplyPayload,
): LeaveSubmissionIntent {
  return {
    employeeId,
    leaveTypeId: payload.leaveTypeId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    halfDay: payload.halfDay ?? null,
    reason: payload.reason.trim(),
  };
}

export function leaveSubmissionFingerprint(intent: LeaveSubmissionIntent) {
  return JSON.stringify([
    intent.employeeId,
    intent.leaveTypeId,
    intent.startDate,
    intent.endDate,
    intent.halfDay,
    intent.reason,
  ]);
}

export function retainAmbiguousLeaveIntent(
  blocked: ReadonlySet<string>,
  intent: LeaveSubmissionIntent,
): ReadonlySet<string> {
  return new Set([...blocked, leaveSubmissionFingerprint(intent)]);
}

export function isAmbiguousLeaveIntent(
  blocked: ReadonlySet<string>,
  intent: LeaveSubmissionIntent,
) {
  return blocked.has(leaveSubmissionFingerprint(intent));
}

export function findRecordedLeaveIntent(
  intent: LeaveSubmissionIntent,
  records: readonly LeaveRequestDto[],
) {
  const fingerprint = leaveSubmissionFingerprint(intent);
  return records.find(
    (record) =>
      leaveSubmissionFingerprint(
        leaveSubmissionIntent(record.employee.id, {
          leaveTypeId: record.leaveType.id,
          startDate: record.startDate,
          endDate: record.endDate,
          halfDay: record.halfDay,
          reason: record.reason,
        }),
      ) === fingerprint,
  );
}
