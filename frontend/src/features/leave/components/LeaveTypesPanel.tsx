import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit2,
  LoaderCircle,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/services/api';
import {
  listLeaveTypes,
  saveLeaveType,
  type LeaveType,
  type LeaveTypeInput,
} from '../api/leave';
import { getLeaveTheme } from '../utils/leave';

/** HR's leave types (`leave_type.manage`): JCET's quotas and rules as configurable data. */
export function LeaveTypesPanel() {
  const types = useQuery({
    queryKey: ['leave', 'types'],
    queryFn: listLeaveTypes,
  });
  const [editing, setEditing] = useState<LeaveType | 'new' | null>(null);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="JCET Leave Policy & Types"
          description="Institutional categories, annual quotas, approval chains, and attendance mapping for Jain College of Engineering & Technology, Hubballi."
          action={
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" />
              Add leave type
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="px-0">
        {types.isPending ? (
          <div className="flex flex-col gap-2 px-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : types.isError ? (
          <EmptyState
            title="Couldn’t load leave types"
            description={types.error.message}
            actionLabel="Try again"
            onAction={() => void types.refetch()}
          />
        ) : types.data.length === 0 ? (
          <EmptyState
            title="No leave types configured"
            description="Add JCET’s leave types (CL, EL, SPL/ML, OOD, ODE, RH, VL) so staff can apply."
          />
        ) : (
          <Table className="min-w-[50rem]">
            <TableCaption className="sr-only">
              JCET Leave categories and institutional rules
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="pl-6">
                  Code & Category
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Entitlement
                </TableHead>
                <TableHead scope="col">Attendance Treatment</TableHead>
                <TableHead scope="col">Half Days</TableHead>
                <TableHead scope="col">Document Req.</TableHead>
                <TableHead scope="col">Timetable Impact</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="pr-6">
                  <span className="sr-only">Edit</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.data.map((type) => {
                const theme = getLeaveTheme(type.code);
                const isPolicyBased = type.yearlyQuota === null;
                const isOfficialDuty = type.code === 'OOD' || type.code === 'ODE';

                return (
                  <TableRow key={type.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${theme.bg} ${theme.text}`}
                        >
                          {type.code}
                        </span>
                        <div>
                          <span className="font-medium text-foreground">{type.name}</span>
                          {type.description && (
                            <span className="block text-xs text-muted-foreground line-clamp-1">
                              {type.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right tabular-nums font-semibold">
                      {isPolicyBased ? (
                        <span className="text-xs text-muted-foreground font-normal">
                          As per policy
                        </span>
                      ) : (
                        `${type.yearlyQuota} days`
                      )}
                    </TableCell>

                    <TableCell>
                      {isOfficialDuty ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <ShieldCheck className="size-3.5" />
                          Official Duty
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {type.attendanceStatus || (type.code === 'RH' ? 'Restricted Holiday' : type.code === 'VL' ? 'Vacation Leave' : 'Leave')}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs">
                      {type.allowHalfDay ? 'Allowed' : 'Disabled'}
                    </TableCell>

                    <TableCell className="text-xs">
                      {type.attachmentRequired ? 'Required' : 'Optional'}
                    </TableCell>

                    <TableCell className="text-xs">
                      {type.affectsTimetable !== false ? 'Smart Substitution' : 'None'}
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        status={type.active ? 'Active' : 'Inactive'}
                        label={type.active ? 'In use' : 'Retired'}
                      />
                    </TableCell>

                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${type.name}`}
                        onClick={() => setEditing(type)}
                      >
                        <Edit2 className="size-3.5 mr-1" />
                        Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {editing && (
        <EditLeaveTypeDialog
          type={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function EditLeaveTypeDialog({
  type,
  onClose,
}: {
  type?: LeaveType;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(type?.code ?? '');
  const [name, setName] = useState(type?.name ?? '');
  const [description, setDescription] = useState(type?.description ?? '');
  const [asPerPolicy, setAsPerPolicy] = useState(
    type ? type.yearlyQuota === null : false,
  );
  const [quota, setQuota] = useState(type?.yearlyQuota?.toString() ?? '12');
  const [carry, setCarry] = useState(type?.carryForwardMax?.toString() ?? '0');
  const [allowHalfDay, setAllowHalfDay] = useState(type?.allowHalfDay ?? false);
  const [attachmentRequired, setAttachmentRequired] = useState(
    type?.attachmentRequired ?? false,
  );
  const [reasonRequired, setReasonRequired] = useState(
    type?.reasonRequired ?? true,
  );
  const [minimumNoticeDays, setMinimumNoticeDays] = useState(
    type?.minimumNoticeDays?.toString() ?? '1',
  );
  const [maximumConsecutiveDays, setMaximumConsecutiveDays] = useState(
    type?.maximumConsecutiveDays?.toString() ?? '15',
  );
  const [attendanceStatus, setAttendanceStatus] = useState(
    type?.attendanceStatus ?? 'Leave',
  );
  const [affectsTimetable, setAffectsTimetable] = useState(
    type?.affectsTimetable ?? true,
  );
  const [active, setActive] = useState(type?.active ?? true);
  const [problem, setProblem] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const input: LeaveTypeInput = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        yearlyQuota: asPerPolicy ? null : Number(quota),
        annualEntitlement: asPerPolicy ? null : Number(quota),
        carryForwardAllowed: Number(carry) > 0,
        carryForwardMax: Number(carry),
        allowHalfDay,
        attachmentRequired,
        reasonRequired,
        minimumNoticeDays: Number(minimumNoticeDays),
        maximumConsecutiveDays: Number(maximumConsecutiveDays),
        attendanceStatus,
        affectsTimetable,
        requiresCoverage: affectsTimetable,
        active,
      };
      return saveLeaveType(type?.id, input);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(`Updated policy for ${saved.name}.`);
      onClose();
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError ? error.message : 'Couldn’t save. Try again.',
      ),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setProblem('Provide a leave type code (e.g. CL, OOD, ODE).');
      return;
    }
    if (name.trim().length < 2) {
      setProblem('Provide a category name.');
      return;
    }
    if (!asPerPolicy && (isNaN(Number(quota)) || Number(quota) < 0)) {
      setProblem('Enter a valid yearly quota or select "As per policy".');
      return;
    }

    setProblem('');
    save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5" />
            {type ? `Configure ${type.name} (${type.code})` : 'Add Leave Category'}
          </DialogTitle>
          <DialogDescription>
            Configure JCET institutional rules, attendance treatment, and quotas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4 text-xs" noValidate>
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <Field>
              <FieldLabel htmlFor="type-code">Code</FieldLabel>
              <Input
                id="type-code"
                className="font-mono uppercase font-semibold"
                maxLength={8}
                value={code}
                disabled={Boolean(type)}
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="type-name">Name</FieldLabel>
              <Input
                id="type-name"
                value={name}
                placeholder="e.g. Official / Examination Duty"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="type-desc">Description</FieldLabel>
            <Textarea
              id="type-desc"
              rows={2}
              value={description}
              placeholder="Institutional policy guidance displayed to faculty"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {/* Quota and As per policy toggle */}
          <div className="rounded-xl border bg-muted/30 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Annual Entitlement</span>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                <Checkbox
                  checked={asPerPolicy}
                  onCheckedChange={(checked) => setAsPerPolicy(checked === true)}
                />
                As per policy (no fixed quota)
              </label>
            </div>
            {!asPerPolicy && (
              <Field>
                <FieldLabel htmlFor="type-quota">Days per calendar year</FieldLabel>
                <Input
                  id="type-quota"
                  inputMode="decimal"
                  value={quota}
                  onChange={(event) => setQuota(event.target.value)}
                />
              </Field>
            )}
          </div>

          {/* Attendance Status Treatment */}
          <Field>
            <FieldLabel htmlFor="type-attendance">Attendance Treatment</FieldLabel>
            <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
              <SelectTrigger id="type-attendance">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Leave">Leave (Normal personal absence)</SelectItem>
                <SelectItem value="Official Duty">Official Duty (OOD / ODE — NOT absent)</SelectItem>
                <SelectItem value="Medical / Special Leave">Medical / Special Leave</SelectItem>
                <SelectItem value="Restricted Holiday">Restricted Holiday</SelectItem>
                <SelectItem value="Vacation Leave">Vacation Leave</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Determines how approved records reflect in biometric logs and executive attendance rate.
            </FieldDescription>
          </Field>

          {/* Operational Rules */}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="type-min-notice">Minimum Notice (days)</FieldLabel>
              <Input
                id="type-min-notice"
                type="number"
                value={minimumNoticeDays}
                onChange={(e) => setMinimumNoticeDays(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="type-max-days">Max Consecutive Days</FieldLabel>
              <Input
                id="type-max-days"
                type="number"
                value={maximumConsecutiveDays}
                onChange={(e) => setMaximumConsecutiveDays(e.target.value)}
              />
            </Field>
          </div>

          {/* Carry forward rules */}
          <Field>
            <FieldLabel htmlFor="type-carry">Carry-forward limit (days)</FieldLabel>
            <Input
              id="type-carry"
              inputMode="decimal"
              value={carry}
              onChange={(event) => setCarry(event.target.value)}
            />
            <FieldDescription>
              Maximum unused days moved to next year (0 for none).
            </FieldDescription>
          </Field>

          {/* Checkbox Options */}
          <div className="flex flex-col gap-2 rounded-xl border p-3 bg-muted/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={allowHalfDay}
                onCheckedChange={(checked) => setAllowHalfDay(checked === true)}
              />
              Allow half-day applications
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={attachmentRequired}
                onCheckedChange={(checked) => setAttachmentRequired(checked === true)}
              />
              Require supporting document / allotment order
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={reasonRequired}
                onCheckedChange={(checked) => setReasonRequired(checked === true)}
              />
              Require application reason
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={affectsTimetable}
                onCheckedChange={(checked) => setAffectsTimetable(checked === true)}
              />
              Triggers academic impact detection & smart substitution
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={active}
                onCheckedChange={(checked) => setActive(checked === true)}
              />
              Active category (in use across portal and mobile)
            </label>
          </div>

          {problem && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-destructive">
              {problem}
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="animate-spin size-4" />}
              Save Policy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
