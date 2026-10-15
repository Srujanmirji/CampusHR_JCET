import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LoaderCircle, RefreshCw, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/services/api';
import {
  createLogin,
  getLogin,
  listRoles,
  updateLogin,
  type Login,
  type LoginChanges,
} from '../api/logins';

const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const errorText = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Something went wrong. Try again.';

// 16 characters without look-alikes (0/O, 1/l/I), easy to read out.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

type Mode = 'create' | 'role' | 'password';

/** HR's view of an employee's CampusHR login (`user.manage`). */
export function LoginSection({
  employeeId,
  name,
  active,
  isSelf,
}: {
  employeeId: string;
  name: string;
  active: boolean;
  isSelf: boolean;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null);
  const login = useQuery({
    queryKey: ['logins', employeeId],
    queryFn: () => getLogin(employeeId),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Login['status'] }) =>
      updateLogin(id, { status }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['logins', employeeId], saved);
      toast.success(
        saved.status === 'ACTIVE'
          ? `${name} can sign in again.`
          : `${name} is signed out and can no longer sign in.`,
      );
    },
    onError: (error) => toast.error(errorText(error)),
  });

  return (
    <section
      aria-labelledby="login-heading"
      className="flex flex-col gap-3 border-t pt-4"
    >
      <h3 id="login-heading" className="text-sm font-semibold text-primary">
        CampusHR login
      </h3>
      {login.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : login.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {errorText(login.error)}{' '}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => void login.refetch()}
          >
            Try again
          </Button>
        </p>
      ) : !login.data ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {active
              ? `${name} can’t sign in yet.`
              : 'Archived employees can’t have a login.'}
          </p>
          {active && (
            <Button onClick={() => setMode('create')}>
              <KeyRound />
              Create login
            </Button>
          )}
        </div>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="text-sm">{login.data.role.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge
                  status={
                    login.data.status === 'ACTIVE' ? 'Active' : 'Inactive'
                  }
                  label={
                    login.data.status === 'ACTIVE'
                      ? 'Can sign in'
                      : 'Turned off'
                  }
                />
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Signs in with</dt>
              <dd className="text-sm">
                <span className="break-all">{login.data.email}</span> or their
                employee ID
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Last sign-in</dt>
              <dd className="text-sm">
                {login.data.lastLoginAt
                  ? dateTime.format(new Date(login.data.lastLoginAt))
                  : 'Never'}
              </dd>
            </div>
          </dl>
          {!active ? null : isSelf ? (
            <p className="text-xs text-muted-foreground">
              Another administrator changes your own role or status.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setMode('role')}>
                <UserCog />
                Change role
              </Button>
              <Button variant="outline" onClick={() => setMode('password')}>
                <RefreshCw />
                Set new password
              </Button>
              <Button
                variant={
                  login.data.status === 'ACTIVE' ? 'destructive' : 'outline'
                }
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({
                    id: login.data!.id,
                    status:
                      login.data!.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  })
                }
              >
                {setStatus.isPending && (
                  <LoaderCircle className="animate-spin" />
                )}
                {login.data.status === 'ACTIVE'
                  ? 'Turn off login'
                  : 'Turn on login'}
              </Button>
            </div>
          )}
        </>
      )}
      {mode && (
        <LoginDialog
          mode={mode}
          employeeId={employeeId}
          name={name}
          login={login.data ?? null}
          onClose={() => setMode(null)}
        />
      )}
    </section>
  );
}

const TITLES: Record<Mode, string> = {
  create: 'Create login',
  role: 'Change role',
  password: 'Set new password',
};

function LoginDialog({
  mode,
  employeeId,
  name,
  login,
  onClose,
}: {
  mode: Mode;
  employeeId: string;
  name: string;
  login: Login | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const needsRole = mode !== 'password';
  const needsPassword = mode !== 'role';
  const roles = useQuery({
    queryKey: ['logins', 'roles'],
    queryFn: listRoles,
    enabled: needsRole,
  });
  const [roleId, setRoleId] = useState(login ? String(login.role.id) : '');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState('');

  const save = useMutation({
    mutationFn: () => {
      if (mode === 'create') {
        return createLogin({ employeeId, roleId: Number(roleId), password });
      }
      const changes: LoginChanges =
        mode === 'role' ? { roleId: Number(roleId) } : { password };
      return updateLogin(login!.id, changes);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['logins', employeeId], saved);
      toast.success(
        mode === 'create'
          ? `${name} can now sign in. Give them the password in person.`
          : mode === 'role'
            ? `${name} is now ${saved.role.name}.`
            : `New password set; ${name} was signed out everywhere.`,
      );
      onClose();
    },
    onError: (error) => setProblem(errorText(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (needsRole && !roleId) return setProblem('Choose a role.');
    if (needsPassword && password.length < 12) {
      return setProblem('Use at least 12 characters.');
    }
    setProblem('');
    save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>
            {mode === 'password'
              ? `${name} will be signed out and must use the new password.`
              : mode === 'role'
                ? 'The new role applies from their next action.'
                : `${name} signs in with their college email or employee ID.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {needsRole && (
            <Field>
              <FieldLabel htmlFor="login-role">Role</FieldLabel>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="login-role" className="w-full">
                  <SelectValue
                    placeholder={roles.isPending ? 'Loading…' : 'Choose a role'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(roles.data ?? []).map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {needsPassword && (
            <Field>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="login-password"
                  className="font-mono"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                >
                  Generate
                </Button>
              </div>
              <FieldDescription>
                At least 12 characters. Shown here so you can hand it over.
              </FieldDescription>
            </Field>
          )}
          {problem && <FieldError>{problem}</FieldError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="animate-spin" />}
              {TITLES[mode]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
