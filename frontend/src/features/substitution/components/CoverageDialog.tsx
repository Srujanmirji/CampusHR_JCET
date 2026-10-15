import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { Period } from '@/features/timetable/api/timetable';
import { ApiError } from '@/services/api';
import { assignCoverage } from '../api/substitution';
import { classTime, cohort, formatClassDate } from '../utils/format';
import type { Choice } from './AffectedClassCard';

/** Confirms a substitute, or records how the class runs without one. */
export function CoverageDialog({
  leaveId,
  choice,
  periods,
  onClose,
  restoreFocus,
}: {
  leaveId: string;
  choice: Choice;
  periods: Period[] | undefined;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const { item, candidate } = choice;
  const subject = `${item.entry.subject.name} — ${cohort(item.entry)}`;

  const save = useMutation({
    mutationFn: () =>
      assignCoverage({
        leaveRequestId: leaveId,
        timetableEntryId: item.entry.id,
        date: item.date,
        substituteId: candidate?.faculty.id ?? null,
        ...(candidate ? {} : { note: note.trim() }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['substitution'] });
      toast.success(
        candidate
          ? `${candidate.faculty.name} has been assigned successfully.`
          : 'Class marked: no substitute required.',
      );
      onClose();
    },
    onError: (failure) => {
      // Someone else may have covered it or taken the candidate meanwhile.
      void queryClient.invalidateQueries({ queryKey: ['substitution'] });
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Couldn’t save. Try again.',
      );
    },
  });

  function confirm() {
    if (!candidate && note.trim().length < 3) {
      setError('Describe how this class will be handled without a substitute.');
      return;
    }
    setError('');
    save.mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="workflow-confirmation"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {candidate
              ? 'Confirm faculty assignment'
              : 'No substitute required?'}
          </DialogTitle>
          <DialogDescription>
            {candidate
              ? `Assign ${candidate.faculty.name} to ${subject}?`
              : `Record an alternative arrangement for ${subject}. This class will count as covered without a substitute.`}
          </DialogDescription>
        </DialogHeader>
        <p className="confirmation-class-info">
          {formatClassDate(item.date)} · {classTime(item.entry, periods)} ·{' '}
          {item.entry.room.name} · {item.hours} teaching{' '}
          {item.hours === 1 ? 'hour' : 'hours'}
        </p>
        {!candidate && (
          <div className="flex flex-col gap-2">
            <label htmlFor="waiver-reason" className="text-sm font-medium">
              Academic arrangement
            </label>
            <Textarea
              id="waiver-reason"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'assignment-error' : undefined}
              placeholder="e.g. Supervised independent study agreed with the HOD."
            />
          </div>
        )}
        {error && (
          <p
            id="assignment-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="confirmation-actions">
          <Button variant="accent" disabled={save.isPending} onClick={confirm}>
            {save.isPending && <LoaderCircle className="animate-spin" />}
            {candidate
              ? 'Confirm Assignment'
              : 'Confirm No Substitute Required'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
