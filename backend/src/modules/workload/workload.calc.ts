// Weekly load from timetable classes (features/FACULTY_WORKLOAD.md).
// One period counts as one contact hour, as in VTU workload norms.

export type LoadStatus = 'UNDERLOADED' | 'NORMAL' | 'OVERLOADED';

export interface Band {
  minHours: number;
  maxHours: number;
}

export interface TaughtClass {
  kind: 'THEORY' | 'LAB';
  startPeriod: number;
  endPeriod: number;
}

export function weeklyHours(classes: TaughtClass[]) {
  const hoursOf = (kind: TaughtClass['kind']) =>
    classes
      .filter((entry) => entry.kind === kind)
      .reduce((sum, entry) => sum + entry.endPeriod - entry.startPeriod + 1, 0);
  const theoryHours = hoursOf('THEORY');
  const labHours = hoursOf('LAB');
  return { theoryHours, labHours, totalHours: theoryHours + labHours };
}

/** Null when the designation has no band set. */
export function loadStatus(
  totalHours: number,
  band: Band | null,
): LoadStatus | null {
  if (!band) return null;
  if (totalHours < band.minHours) return 'UNDERLOADED';
  if (totalHours > band.maxHours) return 'OVERLOADED';
  return 'NORMAL';
}
