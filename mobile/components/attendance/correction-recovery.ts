import type { Correction, CorrectionInput } from '../../lib/attendance-api';

export type CorrectionIntent = {
  employeeId: string;
  input: CorrectionInput;
  fingerprint: string;
};

/** Mirrors the submitted payload, including the schema's reason trimming. */
export function createCorrectionIntent(
  employeeId: string,
  input: CorrectionInput,
): CorrectionIntent {
  const submitted = { ...input, reason: input.reason.trim() };
  return {
    employeeId,
    input: submitted,
    fingerprint: JSON.stringify([
      employeeId,
      submitted.date,
      submitted.checkIn,
      submitted.checkOut,
      submitted.requestedStatus,
      submitted.reason,
    ]),
  };
}

const sameRequestedTime = (
  recorded: string | null,
  date: string,
  time: string,
) =>
  time
    ? recorded !== null &&
      Date.parse(recorded) === Date.parse(`${date}T${time}:00.000Z`)
    : recorded === null;

/** A matching read establishes an existing request; it does not confirm our POST. */
export function matchesCorrectionIntent(
  intent: CorrectionIntent,
  correction: Correction,
): boolean {
  return (
    correction.employeeId === intent.employeeId &&
    correction.date.slice(0, 10) === intent.input.date &&
    correction.requestedStatus === intent.input.requestedStatus &&
    correction.reason === intent.input.reason &&
    sameRequestedTime(
      correction.requestedCheckIn,
      intent.input.date,
      intent.input.checkIn,
    ) &&
    sameRequestedTime(
      correction.requestedCheckOut,
      intent.input.date,
      intent.input.checkOut,
    )
  );
}
