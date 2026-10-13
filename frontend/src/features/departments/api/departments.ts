import { z } from 'zod';
import { apiRequest } from '@/services/api';

const departmentSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  hod: z
    .object({ id: z.string(), employeeCode: z.string(), name: z.string() })
    .nullable(),
});
const departmentWithStaffSchema = departmentSchema.extend({
  staff: z.object({
    total: z.number(),
    teaching: z.number(),
    nonTeaching: z.number(),
  }),
});
export type Department = z.infer<typeof departmentWithStaffSchema>;

const designationSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.enum(['TEACHING', 'NON_TEACHING']),
  level: z.number(),
});
export type Designation = z.infer<typeof designationSchema>;

export async function listDepartments() {
  return z
    .object({ data: z.array(departmentWithStaffSchema) })
    .parse(await apiRequest('/departments')).data;
}

export async function listDesignations() {
  return z
    .object({ data: z.array(designationSchema) })
    .parse(await apiRequest('/designations')).data;
}

export async function createDepartment(input: { code: string; name: string }) {
  return z
    .object({ data: departmentSchema })
    .parse(await apiRequest('/departments', { method: 'POST', body: input }))
    .data;
}

export async function updateDepartment(
  id: number,
  input: { name?: string; hodEmployeeId?: string | null },
) {
  return z
    .object({ data: departmentSchema })
    .parse(
      await apiRequest(`/departments/${id}`, { method: 'PATCH', body: input }),
    ).data;
}
