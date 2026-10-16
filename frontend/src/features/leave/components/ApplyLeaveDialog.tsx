import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
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
import {
  Field,
  FieldDescription,
  FieldError,
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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/services/api';
import { applyLeave, type Balance, type LeaveType } from '../api/leave';
import { formatDays, previewDays } from '../utils/leave';

type Session = 'FULL' | 'FIRST' | 'SECOND';

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
  const [typeId, setTypeId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [session, setSession] = useState<Session>('FULL');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState('');

  const type = types.find((item) => String(item.id) === typeId);
  const oneDate = Boolean(start) && start === end;
  const halfDay = Boolean(type?.allowHalfDay) && oneDate && session !== 'FULL';
  const days = previewDays(start, end, halfDay);
  const remaining = balances.find(
    (item) => item.leaveType.id === type?.id,
  )?.remaining;

  const apply = useMutation({
    mutationFn: () =>
      applyLeave({
        leaveTypeId: Number(typeId),
        startDate: start,
        endDate: end,
        halfDay: halfDay ? (session as 'FIRST' | 'SECOND') : null,
        reason: reason.trim(),
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(`Leave requested; now with the ${created.pendingRole}.`);
      onClose();
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError ? error.message : 'Couldn’t send. Try again.',
      ),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const missing = !type
      ? 'Choose a leave type.'
      : !start || !end
        ? 'Choose the dates.'
        : end < start
          ? 'The last day cannot be before the first.'
          : days === 0
            ? 'Those dates are all Sundays.'
            : reason.trim().length < 3
              ? 'Give a short reason.'
              : '';
    setProblem(missing);
    if (!missing) apply.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>
            Sundays are not counted. Your request goes to each approver in turn.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submit}
          className="grid gap-4 sm:grid-cols-2"
          noValidate
        >
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="leave-type">Leave type</FieldLabel>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger id="leave-type" className="w-full">
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {type && (
              <FieldDescription>
                {remaining === null || remaining === undefined
                  ? 'No yearly limit.'
                  : `${formatDays(remaining)} left this year.`}
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="leave-start">From</FieldLabel>
            <Input
              id="leave-start"
              type="date"
              value={start}
              onChange={(event) => {
                setStart(event.target.value);
                if (!end || end < event.target.value)
                  setEnd(event.target.value);
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="leave-end">To</FieldLabel>
            <Input
              id="leave-end"
              type="date"
              min={start || undefined}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </Field>
          {type?.allowHalfDay && oneDate && (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="leave-session">Day</FieldLabel>
              <Select
                value={session}
                onValueChange={(value) => setSession(value as Session)}
              >
                <SelectTrigger id="leave-session" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full day</SelectItem>
                  <SelectItem value="FIRST">First half</SelectItem>
                  <SelectItem value="SECOND">Second half</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="leave-reason">Reason</FieldLabel>
            <Textarea
              id="leave-reason"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <p
            role="status"
            className="text-sm text-muted-foreground sm:col-span-2"
          >
            {days > 0 ? `${formatDays(days)} of leave.` : ' '}
          </p>
          {problem && (
            <FieldError className="sm:col-span-2">{problem}</FieldError>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending && <LoaderCircle className="animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
