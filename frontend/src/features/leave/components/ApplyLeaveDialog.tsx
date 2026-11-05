import { useState, type FormEvent, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarCheck2,
  FileUp,
  GraduationCap,
  Info,
  LoaderCircle,
  Paperclip,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/features/auth/hooks/useSession';
import { listEntries, type Day } from '@/features/timetable/api/timetable';
import { ApiError } from '@/services/api';
import { applyLeave, type Balance, type LeaveType } from '../api/leave';
import {
  formatDays,
  formatLeaveDate,
  getLeaveTheme,
  JCET_RESTRICTED_HOLIDAYS,
  JCET_VACATION_PERIODS,
  ODE_DUTY_TYPES,
  OOD_DUTY_TYPES,
  previewDays,
} from '../utils/leave';

type Session = 'FULL' | 'FIRST' | 'SECOND';

const WEEKDAYS: (Day | null)[] = [
  null,
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];

export function ApplyLeaveDialog({
  types,
  balances,
  onClose,
}: {
  types: LeaveType[];
  balances: Balance[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const session = useSession();
  const employeeId =
    session.status === 'signedIn'
      ? (session.user.employeeId ?? undefined)
      : undefined;

  const [typeId, setTypeId] = useState(types[0] ? String(types[0].id) : '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [sessionChoice, setSessionChoice] = useState<Session>('FULL');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState('');

  // Dynamic Official Duty Fields (OOD / ODE)
  const [dutyType, setDutyType] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [location, setLocation] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Restricted Holiday and Vacation selections
  const [restrictedHolidayId, setRestrictedHolidayId] = useState('');
  const [vacationPeriodId, setVacationPeriodId] = useState('');

  const type = types.find((item) => String(item.id) === typeId);
  const code = type?.code ?? '';

  const isOfficialDuty = code === 'OOD' || code === 'ODE';
  const isMedical = code === 'SPL_ML';
  const isRestrictedHoliday = code === 'RH';
  const isVacation = code === 'VL';

  const oneDate = Boolean(start) && start === end;
  const allowHalfDay =
    Boolean(type?.allowHalfDay) && !isRestrictedHoliday && !isVacation;
  const halfDay = allowHalfDay && oneDate && sessionChoice !== 'FULL';
  const days = previewDays(start, end, halfDay);

  const balance = balances.find((item) => item.leaveType.id === type?.id);
  const remaining = balance?.remaining;
  const isPolicyBased = balance?.entitled === null || remaining === null;

  // Handle Restricted Holiday selection (auto-populates date)
  function handleRestrictedHolidaySelect(rhId: string) {
    setRestrictedHolidayId(rhId);
    const holiday = JCET_RESTRICTED_HOLIDAYS.find((h) => h.id === rhId);
    if (holiday) {
      setStart(holiday.date);
      setEnd(holiday.date);
      setSessionChoice('FULL');
      if (!reason) setReason(`Restricted Holiday: ${holiday.name}`);
    }
  }

  // Handle Vacation period selection (auto-populates start/end)
  function handleVacationPeriodSelect(vacId: string) {
    setVacationPeriodId(vacId);
    const vac = JCET_VACATION_PERIODS.find((v) => v.id === vacId);
    if (vac) {
      setStart(vac.startDate);
      setEnd(vac.endDate);
      setSessionChoice('FULL');
      if (!reason) setReason(`Vacation Leave: ${vac.name}`);
    }
  }

  // Handle mock file upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
      toast.success(`Attached ${file.name}`);
    }
  }

  const isNonTeaching =
    session.status === 'signedIn' &&
    (session.user.role === 'NON_TEACHING' ||
      (balance as unknown as { employeeCategory?: string })
        ?.employeeCategory === 'NON_TEACHING');

  const requiresOperationalCoverage = Boolean(
    (balance as unknown as { requiresOperationalCoverage?: boolean })
      ?.requiresOperationalCoverage ??
      (code === 'CL' || code === 'EL' || code === 'SPL_ML'),
  );

  // Academic Impact: query scheduled teaching entries
  const timetableQuery = useQuery({
    queryKey: ['timetable', 'entries', { facultyId: employeeId }],
    queryFn: () => listEntries({ facultyId: employeeId! }),
    enabled: employeeId !== undefined && !isNonTeaching,
  });

  const timetableEntries = timetableQuery.data;
  const affectedClasses = useMemo(() => {
    if (isNonTeaching || !timetableEntries || !start || !end || end < start)
      return [];
    const classes: {
      date: string;
      entry: (typeof timetableEntries)[number];
    }[] = [];
    for (
      let at = new Date(`${start}T00:00:00Z`);
      at <= new Date(`${end}T00:00:00Z`);
      at = new Date(at.getTime() + 86_400_000)
    ) {
      const day = WEEKDAYS[at.getUTCDay()];
      for (const entry of timetableEntries) {
        if (entry.day === day) {
          classes.push({ date: at.toISOString().slice(0, 10), entry });
        }
      }
    }
    return classes;
  }, [timetableEntries, start, end, isNonTeaching]);

  const coverageRequired = isNonTeaching
    ? requiresOperationalCoverage
    : affectedClasses.length > 0;

  const apply = useMutation({
    mutationFn: () =>
      applyLeave({
        leaveTypeId: Number(typeId),
        startDate: start,
        endDate: end,
        halfDay: halfDay ? (sessionChoice as 'FIRST' | 'SECOND') : null,
        reason: reason.trim(),
        dutyType: isOfficialDuty ? dutyType : undefined,
        organisation: isOfficialDuty ? organisation : undefined,
        location: isOfficialDuty ? location : undefined,
        referenceNumber: isOfficialDuty ? referenceNumber : undefined,
        attachmentName: attachmentName || undefined,
        restrictedHolidayId: isRestrictedHoliday
          ? restrictedHolidayId
          : undefined,
        vacationPeriodId: isVacation ? vacationPeriodId : undefined,
        coverageRequired,
        operationalCoverageRole:
          isNonTeaching && coverageRequired
            ? (session.user.role ?? 'Staff')
            : undefined,
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(
        isOfficialDuty
          ? `Recorded official duty for ${formatDays(saved.days)}. Marked as Official Duty upon approval.`
          : `Requested ${formatDays(saved.days)} of ${type?.name}.`,
      );
      onClose();
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError
          ? error.message
          : 'Couldn’t submit your request. Check the fields and try again.',
      ),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!type) {
      setProblem('Choose a leave type.');
      return;
    }
    if (!start) {
      setProblem('Choose a start date.');
      return;
    }
    if (!end) {
      setProblem('Choose an end date.');
      return;
    }
    if (end < start) {
      setProblem('The last day cannot be before the first.');
      return;
    }
    if (days === 0) {
      setProblem(
        'Those dates are Sundays or institutional holidays; no leave needed.',
      );
      return;
    }
    if (
      !isPolicyBased &&
      remaining !== null &&
      remaining !== undefined &&
      days > remaining
    ) {
      setProblem(
        `Only ${formatDays(remaining)} of ${type.name} remaining; this request needs ${formatDays(days)}.`,
      );
      return;
    }
    if (isMedical && !reason.trim() && !attachmentName) {
      setProblem(
        'Please provide a reason or medical certificate for Special / Medical Leave.',
      );
      return;
    }
    if (isOfficialDuty && !dutyType && !reason.trim()) {
      setProblem('Please select or specify the official duty type or reason.');
      return;
    }
    if (!isRestrictedHoliday && !isVacation && reason.trim().length < 3) {
      setProblem('Please provide a reason with at least 3 characters.');
      return;
    }

    setProblem('');
    apply.mutate();
  };

  const theme = type ? getLeaveTheme(type.code) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            Apply for Leave
            {type && (
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${theme?.bg} ${theme?.text}`}
              >
                {type.code}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Submit leave or official duty. Sundays and college holidays are
            automatically excluded.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {/* Leave Type Selector */}
          <Field>
            <FieldLabel htmlFor="leave-type">Leave type</FieldLabel>
            <Select
              value={typeId}
              onValueChange={(val) => {
                setTypeId(val);
                setProblem('');
              }}
            >
              <SelectTrigger id="leave-type" className="w-full">
                <SelectValue placeholder="Choose a leave type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    <span className="font-semibold">{item.code}</span> —{' '}
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {type && (
              <div className="mt-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-medium text-foreground">
                  <span>{type.name}</span>
                  <span>
                    {isPolicyBased
                      ? 'As per policy'
                      : `${remaining ?? type.yearlyQuota} of ${type.yearlyQuota} days left`}
                  </span>
                </div>
                {type.description && <p>{type.description}</p>}
                {isOfficialDuty && (
                  <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium pt-1 border-t border-border/50">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    Treated as Official Duty (not absent) upon approval.
                  </p>
                )}
                {isMedical && (
                  <p className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium pt-1 border-t border-border/50">
                    <Info className="size-3.5 shrink-0" />
                    Supporting medical documentation may be required.
                  </p>
                )}
              </div>
            )}
          </Field>

          {/* Restricted Holiday Picker (RH) */}
          {isRestrictedHoliday && (
            <Field className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <FieldLabel
                htmlFor="rh-select"
                className="text-amber-900 dark:text-amber-200"
              >
                Select Restricted Holiday
              </FieldLabel>
              <Select
                value={restrictedHolidayId}
                onValueChange={handleRestrictedHolidaySelect}
              >
                <SelectTrigger id="rh-select">
                  <SelectValue placeholder="Choose from JCET RH calendar" />
                </SelectTrigger>
                <SelectContent>
                  {JCET_RESTRICTED_HOLIDAYS.map((rh) => (
                    <SelectItem key={rh.id} value={rh.id}>
                      {rh.name} — {formatLeaveDate(rh.date)} ({rh.dayOfWeek})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription className="text-amber-800/80 dark:text-amber-300/80">
                Restricted holidays are fixed institutional occasions. Date is
                set automatically.
              </FieldDescription>
            </Field>
          )}

          {/* Vacation Period Picker (VL) */}
          {isVacation && (
            <Field className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
              <FieldLabel
                htmlFor="vac-select"
                className="text-sky-900 dark:text-sky-200"
              >
                Select Vacation Window
              </FieldLabel>
              <Select
                value={vacationPeriodId}
                onValueChange={handleVacationPeriodSelect}
              >
                <SelectTrigger id="vac-select">
                  <SelectValue placeholder="Choose vacation period" />
                </SelectTrigger>
                <SelectContent>
                  {JCET_VACATION_PERIODS.map((vac) => (
                    <SelectItem key={vac.id} value={vac.id}>
                      {vac.name} ({formatLeaveDate(vac.startDate)} –{' '}
                      {formatLeaveDate(vac.endDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription className="text-sky-800/80 dark:text-sky-300/80">
                Vacation periods follow the VTU / JCET declared semester break
                calendar.
              </FieldDescription>
            </Field>
          )}

          {/* Start and End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="leave-start">First day</FieldLabel>
              <Input
                id="leave-start"
                type="date"
                value={start}
                disabled={isRestrictedHoliday || isVacation}
                onChange={(event) => {
                  const val = event.target.value;
                  setStart(val);
                  if (!end || end < val) setEnd(val);
                  setProblem('');
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="leave-end">Last day</FieldLabel>
              <Input
                id="leave-end"
                type="date"
                min={start}
                value={end}
                disabled={isRestrictedHoliday || isVacation}
                onChange={(event) => {
                  setEnd(event.target.value);
                  setProblem('');
                }}
              />
            </Field>
          </div>

          {/* Half Day Option */}
          {allowHalfDay && oneDate && (
            <Field>
              <FieldLabel htmlFor="leave-session">Session</FieldLabel>
              <Select
                value={sessionChoice}
                onValueChange={(val) => setSessionChoice(val as Session)}
              >
                <SelectTrigger id="leave-session">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full day (1 day)</SelectItem>
                  <SelectItem value="FIRST">First half (morning)</SelectItem>
                  <SelectItem value="SECOND">
                    Second half (afternoon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* OOD Specific Details */}
          {code === 'OOD' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="size-4" />
                Official Duty Details
              </div>
              <p className="text-xs text-muted-foreground">
                Use OOD for official college, VTU, university or academic
                assignments.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="ood-duty-type">Duty type</FieldLabel>
                  <Select value={dutyType} onValueChange={setDutyType}>
                    <SelectTrigger id="ood-duty-type">
                      <SelectValue placeholder="Select duty assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {OOD_DUTY_TYPES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ood-org">
                    Organisation / Institution
                  </FieldLabel>
                  <Input
                    id="ood-org"
                    placeholder="e.g. VTU Belagavi, AICTE"
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ood-location">Location</FieldLabel>
                  <Input
                    id="ood-location"
                    placeholder="e.g. Belagavi Regional Center"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ood-ref">
                    Reference / Order number
                  </FieldLabel>
                  <Input
                    id="ood-ref"
                    placeholder="e.g. VTU/ACA/2026/410"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ODE Specific Examination Duty Details */}
          {code === 'ODE' && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/20 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
                <GraduationCap className="size-4" />
                Official / Examination Duty Details
              </div>
              <p className="text-xs text-muted-foreground">
                Official university examination or evaluation assignment.
                Display label is configurable.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="ode-duty-type">
                    Exam duty type
                  </FieldLabel>
                  <Select value={dutyType} onValueChange={setDutyType}>
                    <SelectTrigger id="ode-duty-type">
                      <SelectValue placeholder="Select exam duty" />
                    </SelectTrigger>
                    <SelectContent>
                      {ODE_DUTY_TYPES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ode-location">
                    Exam Center / Valuation Center
                  </FieldLabel>
                  <Input
                    id="ode-location"
                    placeholder="e.g. Valuation Center Hubballi"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="ode-ref">
                    Allotment / Appointment order #
                  </FieldLabel>
                  <Input
                    id="ode-ref"
                    placeholder="e.g. VTU/EXAM/VAL/2026/89"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Attachments Section (Medical for SPL_ML, Order for OOD/ODE) */}
          {(isMedical || isOfficialDuty) && (
            <Field className="rounded-xl border border-dashed p-3 bg-muted/20">
              <FieldLabel className="flex items-center gap-1.5 text-xs font-semibold">
                <Paperclip className="size-3.5" />
                {isMedical
                  ? 'Medical Certificate / Document'
                  : 'Official Order / Letter Attachment'}
              </FieldLabel>
              <div className="mt-1.5 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  <FileUp className="size-4" />
                  Choose File
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                </label>
                <span className="text-xs text-muted-foreground truncate max-w-[16rem]">
                  {attachmentName || 'No file selected (.pdf, .jpg, .png)'}
                </span>
              </div>
            </Field>
          )}

          {/* Reason Field */}
          <Field>
            <FieldLabel htmlFor="leave-reason">Reason</FieldLabel>
            <Textarea
              id="leave-reason"
              placeholder={
                isOfficialDuty
                  ? 'Briefly describe the official assignment or institutional purpose'
                  : 'Brief reason for your leave request'
              }
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
            />
          </Field>

          {/* Academic / Operational Impact Preview */}
          {Boolean(start && end && end >= start) && (
            <div className="rounded-xl border bg-card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isNonTeaching
                    ? 'Operational Staff Coverage'
                    : 'Academic Impact'}
                </span>
                {isNonTeaching ? (
                  coverageRequired ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <TriangleAlert className="size-3" />
                      Coverage required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CalendarCheck2 className="size-3" />
                      No coverage needed
                    </span>
                  )
                ) : affectedClasses.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <TriangleAlert className="size-3" />
                    Coverage required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CalendarCheck2 className="size-3" />
                    No scheduled classes affected
                  </span>
                )}
              </div>

              {isNonTeaching ? (
                <p className="text-xs text-muted-foreground">
                  {coverageRequired
                    ? 'Departmental operational coverage required for this leave type as per institutional policy. Coordinated by reporting officer.'
                    : 'Non-teaching leave type exempt from operational coverage requirements.'}
                </p>
              ) : affectedClasses.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  <p className="text-xs font-medium text-foreground">
                    {affectedClasses.length} scheduled{' '}
                    {affectedClasses.length === 1 ? 'class is' : 'classes are'}{' '}
                    affected:
                  </p>
                  <ul className="flex flex-col divide-y rounded-md border text-xs">
                    {affectedClasses.slice(0, 3).map(({ date, entry }) => (
                      <li
                        key={`${date}-${entry.id}`}
                        className="flex items-center justify-between p-2"
                      >
                        <div>
                          <span className="font-medium text-foreground">
                            {entry.subject.name}
                          </span>
                          <span className="text-muted-foreground block text-[11px]">
                            {entry.subject.code} · Sem {entry.semester}
                            {entry.section} · Room {entry.room.name}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatLeaveDate(date)} · P{entry.startPeriod}
                        </span>
                      </li>
                    ))}
                    {affectedClasses.length > 3 && (
                      <li className="p-2 text-center text-[11px] text-muted-foreground font-medium">
                        +{affectedClasses.length - 3} more classes
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Your timetable has no classes on these days.
                </p>
              )}
            </div>
          )}

          {/* Validation problem */}
          {problem && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{problem}</span>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending && (
                <LoaderCircle className="animate-spin size-4" />
              )}
              {isOfficialDuty ? 'Submit Official Duty' : 'Submit Leave Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
