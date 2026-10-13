import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

export const employeeCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{1,30}$/, 'Use letters, digits and hyphens.');

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.')
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional();

export const employeeCreateSchema = z.object({
  employeeCode: employeeCodeSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  phone: phoneSchema,
  departmentId: z.number().int().positive(),
  designationId: z.number().int().positive(),
  employmentType: z.enum(['PERMANENT', 'CONTRACT', 'PROBATIONARY', 'VISITING']),
  joiningDate: z.iso.date(),
  qualification: optionalText(200),
  specialization: optionalText(200),
  experienceYears: z.number().int().min(0).max(60).nullable().optional(),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = employeeCreateSchema.partial().strict();
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

// Own-scope updates: contact details only (product/USER_ROLES.md, note 1).
export const ownUpdateSchema = z.object({ phone: phoneSchema }).strict();

export const employeeListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  category: z.enum(['TEACHING', 'NON_TEACHING']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type EmployeeListQuery = z.infer<typeof employeeListSchema>;
