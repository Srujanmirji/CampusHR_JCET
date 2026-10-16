import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus } from 'lucide-react';
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
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { ApiError } from '@/services/api';
import { listLeaveTypes, saveLeaveType, type LeaveType } from '../api/leave';

/** HR's leave types (`leave_type.manage`): JCET's quotas and rules as data. */
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
          title="Leave types"
          description="Quotas and rules from JCET’s leave policy. Balances recalculate when you change them."
          action={
            <Button onClick={() => setEditing('new')}>
              <Plus />
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
            title="No leave types yet"
            description="Add JCET’s leave types (e.g. Casual Leave, 12 days) so staff can apply."
          />
        ) : (
          <Table className="min-w-[40rem]">
            <TableCaption className="sr-only">
              Leave types and their yearly rules
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="pl-6">
                  Leave type
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Days a year
                </TableHead>
                <TableHead scope="col">Half days</TableHead>
                <TableHead scope="col" className="text-right">
                  Carry over
                </TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="pr-6">
                  <span className="sr-only">Edit</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.data.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="pl-6">
                    <span className="font-mono font-semibold">{type.code}</span>{' '}
                    · {type.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {type.yearlyQuota ?? 'No limit'}
                  </TableCell>
                  <TableCell>{type.allowHalfDay ? 'Allowed' : 'No'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {type.carryForwardMax
                      ? `Up to ${type.carryForwardMax}`
                      : 'None'}
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
                      aria-label={`Edit ${type.name}`}
                      onClick={() => setEditing(type)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editing && (
        <LeaveTypeDialog
          type={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

const halves = (value: string) => {
  const number = Number(value);
  return (
    value.trim() !== '' &&
    Number.isInteger(number * 2) &&
    number >= 0 &&
    number <= 366
  );
};

function LeaveTypeDialog({
  type,
  onClose,
}: {
  type: LeaveType | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(type?.code ?? '');
  const [name, setName] = useState(type?.name ?? '');
  const [quota, setQuota] = useState(type?.yearlyQuota?.toString() ?? '');
  const [unlimited, setUnlimited] = useState(
    type ? type.yearlyQuota === null : false,
  );
  const [carry, setCarry] = useState(type?.carryForwardMax.toString() ?? '0');
  const [allowHalfDay, setAllowHalfDay] = useState(type?.allowHalfDay ?? false);
  const [active, setActive] = useState(type?.active ?? true);
  const [problem, setProblem] = useState('');

  const save = useMutation({
    mutationFn: () =>
      saveLeaveType(type?.id, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        yearlyQuota: unlimited ? null : Number(quota),
        allowHalfDay,
        carryForwardMax: Number(carry),
        active,
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(`Saved ${saved.name}.`);
      onClose();
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError ? error.message : 'Couldn’t save. Try again.',
      ),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const missing = !/^[A-Za-z]{1,6}$/.test(code.trim())
      ? 'Use 1–6 letters for the code, e.g. CL.'
      : name.trim().length < 2
        ? 'Give the leave type a name.'
        : !unlimited && !halves(quota)
          ? 'Days a year: whole or half days, 0–366.'
          : !halves(carry)
            ? 'Carry over: whole or half days, 0–366.'
            : '';
    setProblem(missing);
    if (!missing) save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type ? `Edit ${type.name}` : 'Add leave type'}
          </DialogTitle>
          <DialogDescription>
            Days are counted Monday to Saturday.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submit}
          className="grid grid-cols-[6rem_1fr] gap-4"
          noValidate
        >
          <Field>
            <FieldLabel htmlFor="type-code">Code</FieldLabel>
            <Input
              id="type-code"
              className="font-mono uppercase"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="type-name">Name</FieldLabel>
            <Input
              id="type-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field className="col-span-2">
            <FieldLabel htmlFor="type-quota">Days a year</FieldLabel>
            <Input
              id="type-quota"
              inputMode="decimal"
              disabled={unlimited}
              value={unlimited ? '' : quota}
              onChange={(event) => setQuota(event.target.value)}
            />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={unlimited}
                onCheckedChange={(checked) => setUnlimited(checked === true)}
              />
              No yearly limit (e.g. loss of pay)
            </label>
          </Field>
          <Field className="col-span-2">
            <FieldLabel htmlFor="type-carry">
              Unused days carried into next year
            </FieldLabel>
            <Input
              id="type-carry"
              inputMode="decimal"
              value={carry}
              onChange={(event) => setCarry(event.target.value)}
            />
            <FieldDescription>
              The most that carries over; 0 for none.
            </FieldDescription>
          </Field>
          <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm">
            <Checkbox
              checked={allowHalfDay}
              onCheckedChange={(checked) => setAllowHalfDay(checked === true)}
            />
            Can be taken as a half day
          </label>
          <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm">
            <Checkbox
              checked={active}
              onCheckedChange={(checked) => setActive(checked === true)}
            />
            In use (retired types keep their history)
          </label>
          {problem && <FieldError className="col-span-2">{problem}</FieldError>}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
