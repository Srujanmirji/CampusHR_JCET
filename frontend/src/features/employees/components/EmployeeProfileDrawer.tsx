import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, LoaderCircle, Pencil, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useScope } from '@/features/auth/hooks/useCan';
import { useSession } from '@/features/auth/hooks/useSession';
import { ApiError } from '@/services/api';
import {
  archiveEmployee,
  EMPLOYMENT_TYPES,
  STAFF_CATEGORIES,
  updateEmployee,
  type Employee,
} from '../api/employees';
import { initialsOf } from '../utils/initials';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children || '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t pt-4">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export function EmployeeProfileDrawer({
  employee,
  open,
  onOpenChange,
  onEdit,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const scopeOf = useScope();
  const session = useSession();
  const queryClient = useQueryClient();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['employees'] });
    void queryClient.invalidateQueries({ queryKey: ['departments'] });
  };
  const archive = useMutation({
    mutationFn: (id: string) => archiveEmployee(id),
    onSuccess: (archived) => {
      refresh();
      setConfirmArchive(false);
      onOpenChange(false);
      toast.success(
        `Archived ${archived.firstName} ${archived.lastName}. Their CampusHR login is disabled.`,
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : 'Could not archive.',
      ),
  });
  const savePhone = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      updateEmployee(id, { phone: value.trim() || null }),
    onSuccess: () => {
      refresh();
      setPhone(null);
      toast.success('Phone number updated.');
    },
    onError: (error) =>
      setPhoneError(
        error instanceof ApiError
          ? error.message
          : 'Could not save. Try again.',
      ),
  });

  if (!employee) return null;
  const active = employee.status === 'ACTIVE';
  const isSelf =
    session.status === 'signedIn' && session.user.employeeId === employee.id;
  const canEditAll = active && scopeOf('employee.update') === 'all';
  const canEditPhone =
    active && !canEditAll && isSelf && scopeOf('employee.update') === 'own';
  const canArchive = active && scopeOf('employee.archive') === 'all';
  const name = `${employee.firstName} ${employee.lastName}`;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setPhone(null);
          onOpenChange(next);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <div className="flex items-center gap-4">
              <Avatar className="size-14 border">
                <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                  {initialsOf(employee)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <SheetTitle className="text-xl">{name}</SheetTitle>
                <SheetDescription>
                  {employee.designation.name} · {employee.department.name}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {employee.employeeCode}
                  </span>
                  <StatusBadge
                    status={active ? 'Active' : 'Inactive'}
                    label={active ? 'Active' : 'Archived'}
                  />
                  {employee.isHod && <Badge variant="outline">HOD</Badge>}
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-6">
            {(canEditAll || canArchive || canEditPhone) && (
              <div className="flex flex-wrap gap-2">
                {canEditAll && (
                  <Button onClick={onEdit}>
                    <Pencil />
                    Edit
                  </Button>
                )}
                {canEditPhone && phone === null && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhoneError('');
                      setPhone(employee.phone ?? '');
                    }}
                  >
                    <Phone />
                    Update phone
                  </Button>
                )}
                {canArchive && (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmArchive(true)}
                  >
                    <Archive />
                    Archive
                  </Button>
                )}
              </div>
            )}

            {phone !== null && (
              <form
                className="flex flex-col gap-3 rounded-lg border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    phone.trim() &&
                    !/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())
                  ) {
                    setPhoneError('Enter a valid phone number.');
                    return;
                  }
                  savePhone.mutate({ id: employee.id, value: phone });
                }}
              >
                <Field data-invalid={Boolean(phoneError)}>
                  <FieldLabel htmlFor="own-phone">Phone number</FieldLabel>
                  <Input
                    id="own-phone"
                    type="tel"
                    autoFocus
                    value={phone}
                    aria-invalid={Boolean(phoneError)}
                    aria-describedby={
                      phoneError ? 'own-phone-error' : undefined
                    }
                    onChange={(event) => setPhone(event.target.value)}
                  />
                  {phoneError && (
                    <FieldError id="own-phone-error">{phoneError}</FieldError>
                  )}
                </Field>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPhone(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savePhone.isPending}>
                    {savePhone.isPending && (
                      <LoaderCircle className="animate-spin" />
                    )}
                    Save phone
                  </Button>
                </div>
              </form>
            )}

            <Section title="Employment">
              <Detail label="Employee ID">
                <span className="font-mono">{employee.employeeCode}</span>
              </Detail>
              <Detail label="Department">{employee.department.name}</Detail>
              <Detail label="Designation">{employee.designation.name}</Detail>
              <Detail label="Staff category">
                {STAFF_CATEGORIES[employee.designation.category]}
              </Detail>
              <Detail label="Employment type">
                {EMPLOYMENT_TYPES[employee.employmentType]}
              </Detail>
              <Detail label="Joined">
                {dateFormat.format(
                  new Date(`${employee.joiningDate}T00:00:00Z`),
                )}
              </Detail>
            </Section>
            <Section title="Contact">
              <Detail label="College email">
                <a
                  className="underline-offset-4 hover:underline"
                  href={`mailto:${employee.email}`}
                >
                  {employee.email}
                </a>
              </Detail>
              <Detail label="Phone">{employee.phone}</Detail>
            </Section>
            <Section title="Academic">
              <Detail label="Highest qualification">
                {employee.qualification}
              </Detail>
              <Detail label="Specialization">{employee.specialization}</Detail>
              <Detail label="Experience">
                {employee.experienceYears == null
                  ? null
                  : `${employee.experienceYears} ${employee.experienceYears === 1 ? 'year' : 'years'}`}
              </Detail>
            </Section>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive {name}?</DialogTitle>
            <DialogDescription>
              They leave the active directory, their CampusHR login is disabled,
              and any HOD post they hold is cleared. The record and its history
              are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmArchive(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={archive.isPending}
              onClick={() => archive.mutate(employee.id)}
            >
              {archive.isPending && <LoaderCircle className="animate-spin" />}
              Archive employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
