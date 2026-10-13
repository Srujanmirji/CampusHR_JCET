import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, LoaderCircle, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { EmptyState } from '@/components/shared/EmptyState';
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
import { useCan } from '@/features/auth/hooks/useCan';
import { listEmployees } from '@/features/employees/api/employees';
import { ApiError } from '@/services/api';
import {
  createDepartment,
  listDepartments,
  updateDepartment,
  type Department,
} from '../api/departments';

const NO_HOD = 'NONE';

const message = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Something went wrong. Try again.';

function AddDepartmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () =>
      createDepartment({ code: code.trim(), name: name.trim() }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success(`Added ${created.name}.`);
      onOpenChange(false);
      setCode('');
      setName('');
    },
  });
  const codeInvalid = code !== '' && !/^[A-Za-z0-9]{2,10}$/.test(code.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add department</DialogTitle>
          <DialogDescription>
            The code becomes part of employee IDs (JCET-CODE-001) and can’t be
            changed later.
          </DialogDescription>
        </DialogHeader>
        <form
          id="add-department"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!codeInvalid && code.trim() && name.trim().length >= 2)
              create.mutate();
          }}
        >
          <Field data-invalid={codeInvalid}>
            <FieldLabel htmlFor="department-code">Code</FieldLabel>
            <Input
              id="department-code"
              className="font-mono uppercase"
              placeholder="e.g. EEE"
              value={code}
              aria-invalid={codeInvalid}
              aria-describedby="department-code-help"
              onChange={(event) => setCode(event.target.value)}
            />
            <FieldDescription id="department-code-help">
              2–10 letters or digits.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="department-name">Name</FieldLabel>
            <Input
              id="department-name"
              placeholder="e.g. Electrical & Electronics Engineering"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          {create.isError && <FieldError>{message(create.error)}</FieldError>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-department"
            disabled={
              create.isPending ||
              codeInvalid ||
              !code.trim() ||
              name.trim().length < 2
            }
          >
            {create.isPending && <LoaderCircle className="animate-spin" />}
            Add department
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDepartmentDialog({
  department,
  onClose,
}: {
  department: Department;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(department.name);
  const [hodId, setHodId] = useState(department.hod?.id ?? NO_HOD);
  const staff = useQuery({
    queryKey: [
      'employees',
      { departmentId: department.id, status: 'ACTIVE', pageSize: 100 },
    ],
    queryFn: () =>
      listEmployees({
        departmentId: department.id,
        status: 'ACTIVE',
        page: 1,
        pageSize: 100,
      }),
  });
  const save = useMutation({
    mutationFn: () =>
      updateDepartment(department.id, {
        name: name.trim(),
        hodEmployeeId: hodId === NO_HOD ? null : hodId,
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Saved ${saved.name}.`);
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {department.code}</DialogTitle>
          <DialogDescription>
            The HOD must be an active employee of this department. Changes are
            recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-department"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) save.mutate();
          }}
        >
          <Field>
            <FieldLabel htmlFor="edit-department-name">Name</FieldLabel>
            <Input
              id="edit-department-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-department-hod">
              Head of department
            </FieldLabel>
            <Select
              value={hodId}
              onValueChange={setHodId}
              disabled={staff.isPending}
            >
              <SelectTrigger id="edit-department-hod">
                <SelectValue
                  placeholder={staff.isPending ? 'Loading…' : undefined}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_HOD}>Not assigned</SelectItem>
                {staff.data?.data.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} ·{' '}
                    {employee.employeeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {staff.data?.data.length === 0 && (
              <FieldDescription>
                Add employees to this department first.
              </FieldDescription>
            )}
          </Field>
          {save.isError && <FieldError>{message(save.error)}</FieldError>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-department"
            disabled={save.isPending || name.trim().length < 2}
          >
            {save.isPending && <LoaderCircle className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DepartmentsPage() {
  const can = useCan();
  const canManage = can('department.manage');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  });

  return (
    <PageTransition>
      <PageHeader
        title="Departments"
        description="Academic departments and Administration, with their heads and staff strength."
        action={
          canManage ? (
            <Button onClick={() => setAdding(true)}>
              <Plus />
              Add department
            </Button>
          ) : undefined
        }
      />
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {departments.isPending ? (
          <div
            role="status"
            aria-label="Loading departments"
            className="flex flex-col gap-3 p-4"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : departments.isError ? (
          <div className="p-8">
            <EmptyState
              title="Couldn’t load departments"
              description={departments.error.message}
              actionLabel="Try again"
              onAction={() => void departments.refetch()}
            />
          </div>
        ) : departments.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No departments yet"
              description={
                canManage
                  ? 'Add the first department to start organising staff.'
                  : 'Departments appear here once HR adds them.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Departments</caption>
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Department
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Head of department
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Teaching
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Non-teaching
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Total
                  </th>
                  {canManage && (
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departments.data.map((department) => (
                  <tr key={department.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Building2
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {department.name}
                          </span>
                          <Badge variant="outline" className="w-fit font-mono">
                            {department.code}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {department.hod ? (
                        <div className="flex flex-col">
                          <span>{department.hod.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {department.hod.employeeCode}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {department.staff.teaching}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {department.staff.nonTeaching}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {department.staff.total}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          aria-label={`Edit ${department.name}`}
                          onClick={() => setEditing(department)}
                        >
                          <Pencil />
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AddDepartmentDialog open={adding} onOpenChange={setAdding} />
      {editing && (
        <EditDepartmentDialog
          key={editing.id}
          department={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </PageTransition>
  );
}
