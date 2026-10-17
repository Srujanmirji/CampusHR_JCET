import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LoaderCircle, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { SectionHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { listDepartments } from '@/features/departments/api/departments';
import { ApiError } from '@/services/api';
import { sendAnnouncement } from '../api/notifications';

const EVERYONE = 'all';

/** HR, Principal and Super Admin write to everyone or one department; HODs to their own. */
export function AnnouncementForm({ wholeCollege }: { wholeCollege: boolean }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState(EVERYONE);
  const [problem, setProblem] = useState('');
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    enabled: wholeCollege,
  });

  const send = useMutation({
    mutationFn: () =>
      sendAnnouncement({
        title: title.trim(),
        body: body.trim(),
        ...(wholeCollege && audience !== EVERYONE
          ? { departmentId: Number(audience) }
          : {}),
      }),
    onSuccess: ({ recipients }) => {
      toast.success(
        `Announcement sent to ${recipients} ${recipients === 1 ? 'person' : 'people'}.`,
      );
      setTitle('');
      setBody('');
      setProblem('');
    },
    onError: (error) =>
      setProblem(
        error instanceof ApiError ? error.message : 'Couldn’t send. Try again.',
      ),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const missing =
      title.trim().length < 3
        ? 'Give the announcement a title.'
        : body.trim().length < 3
          ? 'Write the message.'
          : '';
    setProblem(missing);
    if (!missing) send.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Send an announcement"
          description={
            wholeCollege
              ? 'Everyone with a login, or one department, gets it in their notifications.'
              : 'Everyone in your department with a login gets it in their notifications.'
          }
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {wholeCollege && (
            <Field>
              <FieldLabel htmlFor="announcement-audience">Send to</FieldLabel>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger
                  id="announcement-audience"
                  className="w-full sm:w-72"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EVERYONE}>Everyone</SelectItem>
                  {(departments.data ?? []).map((department) => (
                    <SelectItem
                      key={department.id}
                      value={String(department.id)}
                    >
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="announcement-title">Title</FieldLabel>
            <Input
              id="announcement-title"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="announcement-body">Message</FieldLabel>
            <Textarea
              id="announcement-body"
              maxLength={1000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          {problem && <FieldError role="alert">{problem}</FieldError>}
          <Button
            type="submit"
            className="self-start"
            disabled={send.isPending}
          >
            {send.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Megaphone />
            )}
            Send announcement
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
