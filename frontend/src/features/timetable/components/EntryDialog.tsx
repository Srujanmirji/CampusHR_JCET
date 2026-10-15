import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Trash2 } from 'lucide-react';
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
import { listEmployees } from '@/features/employees/api/employees';
import { ApiError } from '@/services/api';
import {
  DAYS,
  deleteEntry,
  listRooms,
  listSubjects,
  saveEntry,
  type Day,
  type Entry,
  type Period,
} from '../api/timetable';

export interface EntryTarget {
  departmentId: number;
  departmentCode: string;
  semester: number;
  section: string;
  day: Day;
  period: number;
  entry?: Entry;
}

const message = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Something went wrong. Try again.';

/** Add a class to an empty slot, or edit / delete an existing one. */
export function EntryDialog({
  target,
  periods,
  onClose,
}: {
  target: EntryTarget;
  periods: Period[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { entry } = target;
  const [subjectId, setSubjectId] = useState(
    entry ? String(entry.subject.id) : '',
  );
  const [facultyId, setFacultyId] = useState(entry?.faculty.id ?? '');
  const [roomId, setRoomId] = useState(entry ? String(entry.room.id) : '');
  const [day, setDay] = useState<Day>(entry?.day ?? target.day);
  const [startPeriod, setStartPeriod] = useState(
    entry?.startPeriod ?? target.period,
  );
  const [endPeriod, setEndPeriod] = useState(entry?.endPeriod ?? target.period);
  const [batch, setBatch] = useState(entry?.batch ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [missing, setMissing] = useState(false);

  const subjects = useQuery({
    queryKey: ['timetable', 'subjects', target.departmentId, target.semester],
    queryFn: () => listSubjects(target.departmentId, target.semester),
  });
  const rooms = useQuery({
    queryKey: ['timetable', 'rooms'],
    queryFn: listRooms,
  });
  const faculty = useQuery({
    queryKey: [
      'employees',
      { departmentId: target.departmentId, category: 'TEACHING' },
    ],
    queryFn: () =>
      listEmployees({
        departmentId: target.departmentId,
        category: 'TEACHING',
        status: 'ACTIVE',
        page: 1,
        pageSize: 100,
      }),
  });

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ['timetable', 'entries'] });
  const save = useMutation({
    mutationFn: () =>
      saveEntry(entry?.id, {
        departmentId: target.departmentId,
        semester: target.semester,
        section: target.section,
        batch: batch.trim() || null,
        subjectId: Number(subjectId),
        facultyId,
        roomId: Number(roomId),
        day,
        startPeriod,
        endPeriod,
      }),
    onSuccess: (saved) => {
      refresh();
      toast.success(
        `${entry ? 'Updated' : 'Added'} ${saved.subject.code} on ${DAYS[saved.day]}.`,
      );
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteEntry(entry!.id),
    onSuccess: () => {
      refresh();
      toast.success(`Removed ${entry!.subject.code} from ${DAYS[entry!.day]}.`);
      onClose();
    },
  });

  const subject = subjects.data?.find((row) => String(row.id) === subjectId);
  const roomChoices = rooms.data?.filter(
    (room) => subject?.kind !== 'LAB' || room.kind === 'LAB',
  );
  const label = `${target.departmentCode} ${target.semester}${target.section}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {entry ? `Edit ${entry.subject.code}` : 'Add class'} · {label}
          </DialogTitle>
          <DialogDescription>
            CampusHR refuses a class that clashes with the faculty member’s, the
            room’s or this section’s other classes.
          </DialogDescription>
        </DialogHeader>
        <form
          id="entry-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!subjectId || !facultyId || !roomId) {
              setMissing(true);
              return;
            }
            save.mutate();
          }}
        >
          <Field className="sm:col-span-2" data-invalid={missing && !subjectId}>
            <FieldLabel htmlFor="entry-subject">Subject</FieldLabel>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="entry-subject">
                <SelectValue
                  placeholder={
                    subjects.isPending ? 'Loading…' : 'Choose a subject'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjects.data?.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.code} · {row.name}
                    {row.kind === 'LAB' ? ' (lab)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjects.data?.length === 0 && (
              <FieldDescription>
                No subjects for semester {target.semester} yet. Add them with
                “Subjects” on the timetable page.
              </FieldDescription>
            )}
          </Field>
          <Field className="sm:col-span-2" data-invalid={missing && !facultyId}>
            <FieldLabel htmlFor="entry-faculty">Faculty</FieldLabel>
            <Select value={facultyId} onValueChange={setFacultyId}>
              <SelectTrigger id="entry-faculty">
                <SelectValue
                  placeholder={
                    faculty.isPending ? 'Loading…' : 'Choose faculty'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {faculty.data?.data.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} ·{' '}
                    {employee.employeeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={missing && !roomId}>
            <FieldLabel htmlFor="entry-room">Room</FieldLabel>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger id="entry-room">
                <SelectValue
                  placeholder={rooms.isPending ? 'Loading…' : 'Choose a room'}
                />
              </SelectTrigger>
              <SelectContent>
                {roomChoices?.map((room) => (
                  <SelectItem key={room.id} value={String(room.id)}>
                    {room.name}
                    {room.kind === 'LAB' ? ' (lab)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="entry-batch">Lab batch (optional)</FieldLabel>
            <Input
              id="entry-batch"
              placeholder="e.g. A1"
              className="uppercase"
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="entry-day">Day</FieldLabel>
            <Select value={day} onValueChange={(value) => setDay(value as Day)}>
              <SelectTrigger id="entry-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DAYS).map(([value, name]) => (
                  <SelectItem key={value} value={value}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                [
                  'entry-start',
                  'From period',
                  startPeriod,
                  (value: number) => {
                    setStartPeriod(value);
                    if (endPeriod < value) setEndPeriod(value);
                  },
                ],
                ['entry-end', 'To period', endPeriod, setEndPeriod],
              ] as const
            ).map(([id, text, value, onChange]) => (
              <Field key={id}>
                <FieldLabel htmlFor={id}>{text}</FieldLabel>
                <Select
                  value={String(value)}
                  onValueChange={(next) => onChange(Number(next))}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem
                        key={period.number}
                        value={String(period.number)}
                      >
                        {period.number} · {period.startTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </div>
          {missing && (!subjectId || !facultyId || !roomId) && (
            <FieldError className="sm:col-span-2">
              Choose a subject, faculty member and room.
            </FieldError>
          )}
          {save.isError && (
            <FieldError className="sm:col-span-2">
              {message(save.error)}
            </FieldError>
          )}
          {remove.isError && (
            <FieldError className="sm:col-span-2">
              {message(remove.error)}
            </FieldError>
          )}
        </form>
        <DialogFooter className="gap-2 sm:justify-between">
          {entry ? (
            <Button
              type="button"
              variant={confirmDelete ? 'destructive' : 'outline'}
              disabled={remove.isPending}
              onClick={() =>
                confirmDelete ? remove.mutate() : setConfirmDelete(true)
              }
            >
              {remove.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              {confirmDelete ? 'Confirm remove' : 'Remove class'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="entry-form" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="animate-spin" />}
              {entry ? 'Save' : 'Add class'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
