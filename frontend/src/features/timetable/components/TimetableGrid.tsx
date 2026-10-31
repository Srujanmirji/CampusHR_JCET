import { Fragment } from 'react';
import { Plus, Repeat2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MyClass } from '@/features/substitution/api/substitution';
import { DAYS, type Day, type Entry, type Period } from '../api/timetable';

const days = Object.keys(DAYS) as Day[];

export interface EntrySubstitution {
  date: string;
  label: string;
  kind: 'SUBSTITUTE' | 'NOT_NEEDED' | 'UNCOVERED';
}

/** Periods down, days across. A class spanning periods is shown once. */
export function TimetableGrid({
  periods,
  entries,
  showClass,
  canManage,
  substitutions,
  coveredDuties,
  onAdd,
  onOpen,
}: {
  periods: Period[];
  entries: Entry[];
  /** Label cards with their class, e.g. CSE 5A (for a faculty member's view). */
  showClass: boolean;
  canManage: boolean;
  substitutions?: Record<string, EntrySubstitution[]>;
  coveredDuties?: MyClass[];
  onAdd: (day: Day, period: number) => void;
  onOpen: (entry: Entry) => void;
}) {
  const at = (day: Day, period: number) =>
    entries.filter(
      (entry) =>
        entry.day === day &&
        entry.startPeriod <= period &&
        entry.endPeriod >= period,
    );
  const dutiesAt = (day: Day, period: number) =>
    (coveredDuties ?? []).filter(
      (duty) =>
        duty.entry.day === day &&
        duty.entry.startPeriod <= period &&
        duty.entry.endPeriod >= period,
    );

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
      <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm">
        <caption className="sr-only">Weekly timetable</caption>
        <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="w-28 px-3 py-3 text-left">
              Period
            </th>
            {days.map((day) => (
              <th key={day} scope="col" className="px-3 py-3 text-left">
                {DAYS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period, index) => {
            const next = periods[index + 1];
            const breakAfter = next && next.startTime !== period.endTime;
            return (
              <Fragment key={period.number}>
                <tr className="border-b align-top">
                  <th scope="row" className="px-3 py-3 text-left font-normal">
                    <span className="block font-semibold text-foreground">
                      Period {period.number}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {period.startTime}–{period.endTime}
                    </span>
                  </th>
                  {days.map((day) => {
                    const here = at(day, period.number);
                    const duties = showClass
                      ? dutiesAt(day, period.number)
                      : [];
                    return (
                      <td key={day} className="border-l p-1.5">
                        <div className="flex min-h-16 flex-col gap-1.5">
                          {here.map((entry) => {
                            const subs = substitutions?.[entry.id] ?? [];
                            return entry.startPeriod === period.number ? (
                              canManage ? (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => onOpen(entry)}
                                  aria-label={`Edit ${entry.subject.code}, ${DAYS[entry.day]} period ${entry.startPeriod}`}
                                  className="flex min-h-11 flex-col gap-0.5 rounded-lg border border-primary/20 bg-primary/5 p-2 text-left transition-colors hover:bg-primary/10"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold text-primary">
                                      {entry.subject.code}
                                    </span>
                                    {entry.batch && (
                                      <Badge
                                        variant="outline"
                                        className="h-5 px-1.5 text-[11px]"
                                      >
                                        {entry.batch}
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="line-clamp-1 text-xs text-foreground">
                                    {showClass
                                      ? `${entry.department.code} ${entry.semester}${entry.section}`
                                      : entry.faculty.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {entry.room.name}
                                    {entry.endPeriod > entry.startPeriod &&
                                      ` · periods ${entry.startPeriod}–${entry.endPeriod}`}
                                  </span>
                                  {subs.map((sub) => (
                                    <span
                                      key={`${sub.date}-${sub.label}`}
                                      className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                                    >
                                      <Repeat2 className="size-3 shrink-0" />
                                      <span className="truncate">
                                        {sub.label} · {sub.date}
                                      </span>
                                    </span>
                                  ))}
                                </button>
                              ) : (
                                <div
                                  key={entry.id}
                                  className="flex min-h-11 flex-col gap-0.5 rounded-lg border border-primary/20 bg-primary/5 p-2 text-left"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold text-primary">
                                      {entry.subject.code}
                                    </span>
                                    {entry.batch && (
                                      <Badge
                                        variant="outline"
                                        className="h-5 px-1.5 text-[11px]"
                                      >
                                        {entry.batch}
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="line-clamp-1 text-xs text-foreground">
                                    {showClass
                                      ? `${entry.department.code} ${entry.semester}${entry.section}`
                                      : entry.faculty.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {entry.room.name}
                                    {entry.endPeriod > entry.startPeriod &&
                                      ` · periods ${entry.startPeriod}–${entry.endPeriod}`}
                                  </span>
                                  {subs.map((sub) => (
                                    <span
                                      key={`${sub.date}-${sub.label}`}
                                      className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                                    >
                                      <Repeat2 className="size-3 shrink-0" />
                                      <span className="truncate">
                                        {sub.label} · {sub.date}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )
                            ) : (
                              <span
                                key={entry.id}
                                className="rounded-lg border border-dashed px-2 py-1 text-xs text-muted-foreground"
                              >
                                {entry.subject.code}
                                {entry.batch ? ` (${entry.batch})` : ''}{' '}
                                continues
                              </span>
                            );
                          })}
                          {duties.map((duty) =>
                            duty.entry.startPeriod === period.number ? (
                              <div
                                key={duty.id}
                                className="flex min-h-11 flex-col gap-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-left"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold text-emerald-900">
                                    {duty.entry.subject.code}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="h-5 border-emerald-600/30 bg-emerald-500/15 px-1.5 text-[10px] text-emerald-900"
                                  >
                                    Covering · {duty.date}
                                  </Badge>
                                </span>
                                <span className="line-clamp-1 text-xs text-foreground">
                                  {duty.entry.department.code}{' '}
                                  {duty.entry.semester}
                                  {duty.entry.section} · for{' '}
                                  {duty.coveringFor.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {duty.entry.room.name}
                                </span>
                              </div>
                            ) : (
                              <span
                                key={duty.id}
                                className="rounded-lg border border-dashed border-emerald-500/40 px-2 py-1 text-xs text-emerald-900"
                              >
                                {duty.entry.subject.code} covering continues
                              </span>
                            ),
                          )}
                          {canManage && here.length === 0 && (
                            <button
                              type="button"
                              aria-label={`Add class on ${DAYS[day]}, period ${period.number}`}
                              onClick={() => onAdd(day, period.number)}
                              className="flex min-h-11 flex-1 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                            >
                              <Plus className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {breakAfter && (
                  <tr className="border-b bg-muted/30">
                    <th
                      scope="row"
                      colSpan={days.length + 1}
                      className="px-3 py-1.5 text-left text-xs font-normal text-muted-foreground"
                    >
                      Break · {period.endTime}–{next.startTime}
                    </th>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
