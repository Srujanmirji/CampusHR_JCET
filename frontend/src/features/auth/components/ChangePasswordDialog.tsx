import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { ApiError } from '@/services/api';
import { changePassword } from '../api/auth';

const MIN_LENGTH = 12;

/** The signed-in user replaces their own password. */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState('');

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setProblem('');
  };
  const save = useMutation({
    mutationFn: () =>
      changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      toast.success('Password changed. Your other devices are signed out.');
      reset();
      onOpenChange(false);
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError
          ? error.message
          : 'Couldn’t change your password. Try again.',
      ),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const missing = !current
      ? 'Enter your current password.'
      : next.length < MIN_LENGTH
        ? `Use at least ${MIN_LENGTH} characters.`
        : next !== confirm
          ? 'The new passwords don’t match.'
          : next === current
            ? 'Choose a password different from your current one.'
            : '';
    setProblem(missing);
    if (!missing) save.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            You stay signed in here; your other devices are signed out.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
            />
            <FieldDescription>
              At least {MIN_LENGTH} characters.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">
              Repeat new password
            </FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </Field>
          {problem && <FieldError role="alert">{problem}</FieldError>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="animate-spin" />}
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
