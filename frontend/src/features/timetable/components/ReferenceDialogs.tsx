import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/services/api';
import {
  createRoom,
  createSubject,
  listRooms,
  listSubjects,
} from '../api/timetable';

const message = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Something went wrong. Try again.';

export function SubjectsDialog({
  departmentId,
  departmentCode,
  semester,
  onClose,
}: {
  departmentId: number;
  departmentCode: string;
  semester: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'THEORY' | 'LAB'>('THEORY');
  const subjects = useQuery({
    queryKey: ['timetable', 'subjects', departmentId, semester],
    queryFn: () => listSubjects(departmentId, semester),
  });
  const add = useMutation({
    mutationFn: () =>
      createSubject({
        code: code.trim(),
        name: name.trim(),
        departmentId,
        semester,
        kind,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: ['timetable', 'subjects'],
      });
      toast.success(`Added ${created.code}.`);
      setCode('');
      setName('');
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (code.trim() && name.trim().length >= 2) add.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Subjects · {departmentCode} semester {semester}
          </DialogTitle>
          <DialogDescription>
            Use the VTU course code, e.g. BCS501.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-56 flex-col divide-y overflow-y-auto rounded-lg border">
          {subjects.data?.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              No subjects yet.
            </li>
          )}
          {subjects.data?.map((subject) => (
            <li
              key={subject.id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <span>
                <span className="font-mono font-semibold">{subject.code}</span>{' '}
                · {subject.name}
              </span>
              <Badge variant="outline">
                {subject.kind === 'LAB' ? 'Lab' : 'Theory'}
              </Badge>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Field>
            <FieldLabel htmlFor="subject-code">Code</FieldLabel>
            <Input
              id="subject-code"
              className="font-mono uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="subject-name">Name</FieldLabel>
            <Input
              id="subject-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="subject-kind">Type</FieldLabel>
            <Select
              value={kind}
              onValueChange={(value) => setKind(value as 'THEORY' | 'LAB')}
            >
              <SelectTrigger id="subject-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="THEORY">Theory</SelectItem>
                <SelectItem value="LAB">Lab</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="self-end" disabled={add.isPending}>
            {add.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Plus />
            )}
            Add subject
          </Button>
          {add.isError && (
            <FieldError className="sm:col-span-2">
              {message(add.error)}
            </FieldError>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RoomsDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'CLASSROOM' | 'LAB'>('CLASSROOM');
  const rooms = useQuery({
    queryKey: ['timetable', 'rooms'],
    queryFn: listRooms,
  });
  const add = useMutation({
    mutationFn: () => createRoom({ name: name.trim(), kind }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['timetable', 'rooms'] });
      toast.success(`Added ${created.name}.`);
      setName('');
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rooms and labs</DialogTitle>
          <DialogDescription>Shared by all departments.</DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-56 flex-col divide-y overflow-y-auto rounded-lg border">
          {rooms.data?.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No rooms yet.</li>
          )}
          {rooms.data?.map((room) => (
            <li
              key={room.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              {room.name}
              <Badge variant="outline">
                {room.kind === 'LAB' ? 'Lab' : 'Classroom'}
              </Badge>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 sm:grid-cols-[2fr_1fr]"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) add.mutate();
          }}
        >
          <Field>
            <FieldLabel htmlFor="room-name">Name</FieldLabel>
            <Input
              id="room-name"
              placeholder="e.g. LH-203"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="room-kind">Type</FieldLabel>
            <Select
              value={kind}
              onValueChange={(value) => setKind(value as 'CLASSROOM' | 'LAB')}
            >
              <SelectTrigger id="room-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLASSROOM">Classroom</SelectItem>
                <SelectItem value="LAB">Lab</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button
            type="submit"
            className="sm:col-span-2"
            disabled={add.isPending}
          >
            {add.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Plus />
            )}
            Add room
          </Button>
          {add.isError && (
            <FieldError className="sm:col-span-2">
              {message(add.error)}
            </FieldError>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
