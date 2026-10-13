// The approved permission matrix (product/USER_ROLES.md). Columns follow ROLES.
// A = all, D = own department, O = own records, - = no access.
// test/permissions.test.ts fails if this and the document drift apart.

export const ROLES = [
  'Super Admin',
  'HR Admin',
  'Principal',
  'HOD',
  'Faculty',
  'Non-Teaching Staff',
] as const;
export type RoleName = (typeof ROLES)[number];

type Cell = 'A' | 'D' | 'O' | '-';
export type Scope = 'all' | 'department' | 'own';

export const MATRIX: Record<string, [Cell, Cell, Cell, Cell, Cell, Cell]> = {
  'employee.read': ['A', 'A', 'A', 'D', 'O', 'O'],
  'employee.create': ['A', 'A', '-', '-', '-', '-'],
  'employee.update': ['A', 'A', '-', '-', 'O', 'O'],
  'employee.archive': ['A', 'A', '-', '-', '-', '-'],
  'employee.read_sensitive': ['A', 'A', '-', '-', 'O', 'O'],
  'department.read': ['A', 'A', 'A', 'A', 'A', 'A'],
  'department.manage': ['A', 'A', '-', '-', '-', '-'],
  'attendance.read': ['A', 'A', 'A', 'D', 'O', 'O'],
  'attendance.check_in': ['-', 'O', 'O', 'O', 'O', 'O'],
  'attendance.record': ['A', 'A', '-', '-', '-', '-'],
  'attendance_correction.request': ['-', 'O', 'O', 'O', 'O', 'O'],
  'attendance_correction.approve': ['A', 'A', '-', 'D', '-', '-'],
  'leave.apply': ['-', 'O', 'O', 'O', 'O', 'O'],
  'leave.read': ['A', 'A', 'A', 'D', 'O', 'O'],
  'leave.cancel': ['-', 'O', 'O', 'O', 'O', 'O'],
  'leave.approve': ['A', 'A', 'A', 'D', '-', '-'],
  'leave_type.manage': ['A', 'A', '-', '-', '-', '-'],
  'timetable.read': ['A', 'A', 'A', 'D', 'O', '-'],
  'timetable.manage': ['A', '-', '-', 'D', '-', '-'],
  'workload.read': ['A', 'A', 'A', 'D', 'O', '-'],
  'workload.configure': ['A', '-', 'A', '-', '-', '-'],
  'substitution.read': ['A', '-', 'A', 'D', 'O', '-'],
  'substitution.assign': ['A', '-', '-', 'D', '-', '-'],
  'document.upload': ['-', 'O', 'O', 'O', 'O', 'O'],
  'document.read': ['A', 'A', '-', 'O', 'O', 'O'],
  'document.verify': ['A', 'A', '-', '-', '-', '-'],
  'academic_profile.read': ['A', 'A', 'A', 'D', 'O', '-'],
  'academic_profile.update': ['A', 'A', '-', 'O', 'O', '-'],
  'notification.read': ['O', 'O', 'O', 'O', 'O', 'O'],
  'announcement.send': ['A', 'A', 'A', 'D', '-', '-'],
  'report.read': ['A', 'A', 'A', 'D', '-', '-'],
  'recruitment.read': ['A', 'A', 'A', 'D', '-', '-'],
  'recruitment.manage': ['A', 'A', '-', '-', '-', '-'],
  'helpdesk.create': ['O', 'O', 'O', 'O', 'O', 'O'],
  'helpdesk.manage': ['A', 'A', '-', '-', '-', '-'],
  'user.manage': ['A', 'A', '-', '-', '-', '-'],
  'role.manage': ['A', '-', '-', '-', '-', '-'],
  'settings.manage': ['A', '-', '-', '-', '-', '-'],
  'audit_log.read': ['A', '-', 'A', '-', '-', '-'],
};

const SCOPE_OF = { A: 'all', D: 'department', O: 'own' } as const;
// Widest first: a wider scope covers the narrower ones.
export const SCOPES: Scope[] = ['all', 'department', 'own'];

/** Permission keys (`resource.action.scope`) granted to a role by default. */
export function defaultGrants(role: RoleName): string[] {
  const column = ROLES.indexOf(role);
  return Object.entries(MATRIX).flatMap(([permission, cells]) => {
    const cell = cells[column]!;
    return cell === '-' ? [] : [`${permission}.${SCOPE_OF[cell]}`];
  });
}

/** The widest scope at which `permission` (`resource.action`) is granted. */
export function widestScope(
  granted: readonly string[],
  permission: string,
): Scope | undefined {
  return SCOPES.find((scope) => granted.includes(`${permission}.${scope}`));
}
