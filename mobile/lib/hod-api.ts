import { z } from 'zod';
import { apiFetch, type AuthUser } from './session';
export function departmentAccess(user: AuthUser | null, permission: string) {
  if (
    user?.role !== 'HOD' ||
    !user.departmentId ||
    !user.permissions.some(
      (grant) =>
        grant === `${permission}.department` || grant === `${permission}.all`,
    )
  )
    throw new Error(
      'Department information is not available for your account.',
    );
  return user.departmentId;
}
const workloadRow = z.object({
  faculty: z.object({
    id: z.uuid(),
    name: z.string(),
    employeeCode: z.string(),
    department: z.object({
      id: z.number().int(),
      name: z.string(),
      code: z.string(),
    }),
  }),
  totalHours: z.number().nonnegative(),
  minHours: z.number().nullable(),
  maxHours: z.number().nullable(),
  status: z.enum(['UNDERLOADED', 'NORMAL', 'OVERLOADED']).nullable(),
});
export async function getDepartmentWorkload(user: AuthUser | null) {
  const id = departmentAccess(user, 'workload.read');
  const response = await apiFetch(`/workload?departmentId=${id}`);
  const rows = z
    .object({ data: z.array(workloadRow) })
    .parse(await response.json()).data;
  if (rows.some((r) => r.faculty.department.id !== id))
    throw new Error('Workload response includes a different department.');
  return rows;
}
export async function getDepartmentSummary(user: AuthUser | null) {
  departmentAccess(user, 'report.read');
  // Summary has no department query. Only the backend's department-scoped grant is safe here.
  if (
    !user!.permissions.includes('report.read.department') ||
    user!.permissions.includes('report.read.all')
  )
    throw new Error('A department-scoped report is required for this summary.');
  const response = await apiFetch('/reports/summary');
  return z
    .object({
      data: z.object({
        headcount: z.object({ total: z.number().int().nonnegative() }),
        attendance: z.object({ present: z.number().int().nonnegative() }),
        continuity: z.object({
          affectedClasses: z.number().int().nonnegative(),
          classesCovered: z.number().int().nonnegative(),
          coverageRate: z.number().min(0).max(100),
          uncoveredClasses: z.number().int().nonnegative(),
        }),
      }),
    })
    .parse(await response.json()).data;
}
