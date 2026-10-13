import { z } from 'zod';
import { apiRequest } from '@/services/api';

export const EMPLOYMENT_TYPES = {
  PERMANENT: 'Permanent',
  CONTRACT: 'Contract',
  PROBATIONARY: 'Probationary',
  VISITING: 'Visiting',
} as const;
export type EmploymentType = keyof typeof EMPLOYMENT_TYPES;

export const STAFF_CATEGORIES = {
  TEACHING: 'Teaching',
  NON_TEACHING: 'Non-teaching',
} as const;

const employeeSchema = z.object({
  id: z.string(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  employmentType: z.enum(['PERMANENT', 'CONTRACT', 'PROBATIONARY', 'VISITING']),
  joiningDate: z.string(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  qualification: z.string().nullable(),
  specialization: z.string().nullable(),
  experienceYears: z.number().nullable(),
  department: z.object({ id: z.number(), code: z.string(), name: z.string() }),
  designation: z.object({
    id: z.number(),
    name: z.string(),
    category: z.enum(['TEACHING', 'NON_TEACHING']),
  }),
  isHod: z.boolean(),
});
export type Employee = z.infer<typeof employeeSchema>;

const listSchema = z.object({
  data: z.array(employeeSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    teaching: z.number(),
    nonTeaching: z.number(),
  }),
});
export type EmployeeList = z.infer<typeof listSchema>;
const oneSchema = z.object({ data: employeeSchema });

export interface EmployeeFilters {
  search?: string;
  departmentId?: number;
  category?: 'TEACHING' | 'NON_TEACHING';
  status: 'ACTIVE' | 'ARCHIVED';
  page: number;
  pageSize: number;
}

export interface EmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departmentId: number;
  designationId: number;
  employmentType: EmploymentType;
  joiningDate: string;
  qualification: string | null;
  specialization: string | null;
  experienceYears: number | null;
}

export async function listEmployees(filters: EmployeeFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return listSchema.parse(await apiRequest(`/employees?${params}`));
}

export async function nextEmployeeCode(departmentId: number) {
  const { data } = z
    .object({ data: z.object({ employeeCode: z.string() }) })
    .parse(
      await apiRequest(`/employees/next-code?departmentId=${departmentId}`),
    );
  return data.employeeCode;
}

export async function createEmployee(input: EmployeeInput) {
  return oneSchema.parse(
    await apiRequest('/employees', { method: 'POST', body: input }),
  ).data;
}

export async function updateEmployee(
  id: string,
  input: Partial<EmployeeInput>,
) {
  return oneSchema.parse(
    await apiRequest(`/employees/${id}`, { method: 'PATCH', body: input }),
  ).data;
}

export async function archiveEmployee(id: string) {
  return oneSchema.parse(
    await apiRequest(`/employees/${id}`, { method: 'DELETE' }),
  ).data;
}
