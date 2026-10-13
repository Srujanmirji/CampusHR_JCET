import { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ApiError } from '@/services/api';
import {
  listDepartments,
  listDesignations,
} from '@/features/departments/api/departments';
import {
  createEmployee,
  EMPLOYMENT_TYPES,
  nextEmployeeCode,
  updateEmployee,
  type Employee,
} from '../api/employees';

const optional = z.string().trim().max(200);
const formSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter the first name.').max(80),
  lastName: z.string().trim().min(1, 'Enter the last name.').max(80),
  email: z.email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ()-]{7,20})?$/, 'Enter a valid phone number.'),
  departmentId: z.string().min(1, 'Choose a department.'),
  employeeCode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9-]{1,30}$/,
      'Use letters, digits and hyphens.',
    ),
  designationId: z.string().min(1, 'Choose a designation.'),
  employmentType: z.enum(
    ['PERMANENT', 'CONTRACT', 'PROBATIONARY', 'VISITING'],
    {
      error: 'Choose an employment type.',
    },
  ),
  joiningDate: z.iso.date('Enter the joining date.'),
  qualification: optional,
  specialization: optional,
  experienceYears: z.string().regex(/^(\d{1,2})?$/, 'Enter whole years, 0–60.'),
});
type FormValues = z.infer<typeof formSchema>;

const blank = (value: string) => value.trim() || null;

function toValues(employee?: Employee): FormValues {
  return {
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    departmentId: employee ? String(employee.department.id) : '',
    employeeCode: employee?.employeeCode ?? '',
    designationId: employee ? String(employee.designation.id) : '',
    employmentType: employee?.employmentType ?? ('' as 'PERMANENT'),
    joiningDate: employee?.joiningDate ?? '',
    qualification: employee?.qualification ?? '',
    specialization: employee?.specialization ?? '',
    experienceYears:
      employee?.experienceYears == null ? '' : String(employee.experienceYears),
  };
}

/** Add an employee, or edit one (HR). */
export function EmployeeFormSheet({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}) {
  const editing = Boolean(employee);
  const queryClient = useQueryClient();
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    enabled: open,
  });
  const designations = useQuery({
    queryKey: ['designations'],
    queryFn: listDesignations,
    enabled: open,
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toValues(employee),
  });

  useEffect(() => {
    if (open) reset(toValues(employee));
  }, [open, employee, reset]);

  // Suggest JCET-<DEPT>-<NNN> when adding, until HR types their own ID.
  const departmentId = useWatch({ control, name: 'departmentId' });
  const suggested = useRef('');
  useEffect(() => {
    if (editing || !departmentId) return;
    let current = true;
    void nextEmployeeCode(Number(departmentId))
      .then((code) => {
        const value = getValues('employeeCode');
        if (current && (!value || value === suggested.current)) {
          suggested.current = code;
          setValue('employeeCode', code, { shouldValidate: true });
        }
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [departmentId, editing, getValues, setValue]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: blank(values.phone),
        departmentId: Number(values.departmentId),
        employeeCode: values.employeeCode,
        designationId: Number(values.designationId),
        employmentType: values.employmentType,
        joiningDate: values.joiningDate,
        qualification: blank(values.qualification),
        specialization: blank(values.specialization),
        experienceYears:
          values.experienceYears === '' ? null : Number(values.experienceYears),
      };
      return employee
        ? updateEmployee(employee.id, input)
        : createEmployee(input);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success(
        `${editing ? 'Saved' : 'Added'} ${saved.firstName} ${saved.lastName} (${saved.employeeCode}).`,
      );
      onOpenChange(false);
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
    } catch (error) {
      setError('root', {
        message:
          error instanceof ApiError
            ? error.message
            : 'Something went wrong. Try again.',
      });
    }
  });

  const fieldError = (name: keyof FormValues) =>
    errors[name] && (
      <FieldError id={`${name}-error`}>{errors[name]?.message}</FieldError>
    );
  const described = (name: keyof FormValues) => ({
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit employee' : 'Add employee'}</SheetTitle>
          <SheetDescription>
            {editing
              ? 'Changes are recorded in the audit log.'
              : 'Creates the employee record. A CampusHR login is set up separately.'}
          </SheetDescription>
        </SheetHeader>
        <form
          id="employee-form"
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-6 px-4"
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.firstName)}>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  {...described('firstName')}
                  {...register('firstName')}
                />
                {fieldError('firstName')}
              </Field>
              <Field data-invalid={Boolean(errors.lastName)}>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  {...described('lastName')}
                  {...register('lastName')}
                />
                {fieldError('lastName')}
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">College email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                {...described('email')}
                {...register('email')}
              />
              {fieldError('email')}
            </Field>
            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="phone">Phone (optional)</FieldLabel>
              <Input
                id="phone"
                type="tel"
                {...described('phone')}
                {...register('phone')}
              />
              {fieldError('phone')}
            </Field>
            <Field data-invalid={Boolean(errors.departmentId)}>
              <FieldLabel htmlFor="departmentId">Department</FieldLabel>
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="departmentId"
                      {...described('departmentId')}
                    >
                      <SelectValue
                        placeholder={
                          departments.isPending
                            ? 'Loading…'
                            : 'Choose a department'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.data?.map((department) => (
                        <SelectItem
                          key={department.id}
                          value={String(department.id)}
                        >
                          {department.name} ({department.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {fieldError('departmentId')}
            </Field>
            <Field data-invalid={Boolean(errors.employeeCode)}>
              <FieldLabel htmlFor="employeeCode">Employee ID</FieldLabel>
              <Input
                id="employeeCode"
                autoComplete="off"
                autoCapitalize="characters"
                className="font-mono uppercase"
                {...described('employeeCode')}
                {...register('employeeCode')}
              />
              {!editing && (
                <FieldDescription>
                  Suggested from the department. Type the college’s existing ID
                  instead if the person already has one.
                </FieldDescription>
              )}
              {fieldError('employeeCode')}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.designationId)}>
                <FieldLabel htmlFor="designationId">Designation</FieldLabel>
                <Controller
                  control={control}
                  name="designationId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="designationId"
                        {...described('designationId')}
                      >
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {(['TEACHING', 'NON_TEACHING'] as const).map(
                          (category) => (
                            <SelectGroup key={category}>
                              <SelectLabel>
                                {category === 'TEACHING'
                                  ? 'Teaching'
                                  : 'Non-teaching'}
                              </SelectLabel>
                              {designations.data
                                ?.filter(
                                  (designation) =>
                                    designation.category === category,
                                )
                                .map((designation) => (
                                  <SelectItem
                                    key={designation.id}
                                    value={String(designation.id)}
                                  >
                                    {designation.name}
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {fieldError('designationId')}
              </Field>
              <Field data-invalid={Boolean(errors.employmentType)}>
                <FieldLabel htmlFor="employmentType">
                  Employment type
                </FieldLabel>
                <Controller
                  control={control}
                  name="employmentType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="employmentType"
                        {...described('employmentType')}
                      >
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EMPLOYMENT_TYPES).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {fieldError('employmentType')}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.joiningDate)}>
                <FieldLabel htmlFor="joiningDate">Joining date</FieldLabel>
                <Input
                  id="joiningDate"
                  type="date"
                  {...described('joiningDate')}
                  {...register('joiningDate')}
                />
                {fieldError('joiningDate')}
              </Field>
              <Field data-invalid={Boolean(errors.experienceYears)}>
                <FieldLabel htmlFor="experienceYears">
                  Experience in years (optional)
                </FieldLabel>
                <Input
                  id="experienceYears"
                  inputMode="numeric"
                  {...described('experienceYears')}
                  {...register('experienceYears')}
                />
                {fieldError('experienceYears')}
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.qualification)}>
              <FieldLabel htmlFor="qualification">
                Highest qualification (optional)
              </FieldLabel>
              <Input
                id="qualification"
                placeholder="e.g. M.Tech in Computer Science & Engineering"
                {...described('qualification')}
                {...register('qualification')}
              />
              {fieldError('qualification')}
            </Field>
            <Field data-invalid={Boolean(errors.specialization)}>
              <FieldLabel htmlFor="specialization">
                Specialization (optional)
              </FieldLabel>
              <Input
                id="specialization"
                {...described('specialization')}
                {...register('specialization')}
              />
              {fieldError('specialization')}
            </Field>
          </FieldGroup>
          {errors.root && (
            <FieldError id="employee-form-error">
              {errors.root.message}
            </FieldError>
          )}
        </form>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="animate-spin" />}
            {editing ? 'Save changes' : 'Add employee'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
