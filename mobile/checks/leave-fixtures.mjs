import { randomUUID } from 'node:crypto';
import { homeUser } from './home-fixtures.mjs';
export const leavePermissions = [
  'leave.apply.own',
  'leave.cancel.own',
  'leave.approve.department',
];
export const leaveType = {
  id: 1,
  code: 'CL',
  name: 'Casual Leave',
  yearlyQuota: 15,
  allowHalfDay: true,
  carryForwardMax: 0,
  active: true,
};
export const leaveRequest = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  employee: {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    employeeCode: 'IOS007F',
    name: 'Leave Faculty',
  },
  department: { id: 1, code: 'CSE', name: 'Computer Science' },
  leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
  startDate: '2026-10-22',
  endDate: '2026-10-22',
  halfDay: null,
  days: 1,
  reason: 'Faculty test request',
  status: 'PENDING',
  approverRoles: ['HOD', 'HR Admin'],
  pendingRole: 'HOD',
  decisions: [],
  createdAt: '2026-10-20T00:00:00.000Z',
};
// This repository supports only the current service's filters; reject new shapes.
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every((item) => matches(row, item));
    if (key === 'OR') return value.some((item) => matches(row, item));
    if (key === 'NOT') return !matches(row, value);
    if (key === 'startDate')
      return (
        (!value.gte || row.startDate >= value.gte) &&
        (!value.lt || row.startDate < value.lt)
      );
    if (
      !['id', 'employeeId', 'departmentId', 'status', 'pendingRole'].includes(
        key,
      )
    )
      throw new Error(`Unsupported leave fixture filter: ${key}`);
    return row[key] === value;
  });
}
export function createLeavePreviewRepository(users = [homeUser]) {
  const department = leaveRequest.department;
  const person = (id, code, name) => ({
    id,
    employeeCode: code,
    firstName: name,
    lastName: 'Test',
  });
  const owner = person(homeUser.employeeId, 'IOS004', 'Home');
  const faculty = person(leaveRequest.employee.id, 'IOS007F', 'Leave Faculty');
  const record = (employee, reason, day = 22) => ({
    id: randomUUID(),
    employeeId: employee.id,
    departmentId: 1,
    employee,
    department,
    leaveType: leaveRequest.leaveType,
    leaveTypeId: 1,
    startDate: new Date(`2026-10-${day}T00:00:00Z`),
    endDate: new Date(`2026-10-${day}T00:00:00Z`),
    halfDay: null,
    days: 1,
    reason,
    status: 'PENDING',
    approverRoles: ['HOD', 'HR Admin'],
    pendingRole: 'HOD',
    decisions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const records = [
    record(faculty, 'Faculty test request'),
    record(faculty, 'Another faculty request', 23),
    {
      ...record(owner, 'Personal test request', 24),
      approverRoles: ['Principal'],
      pendingRole: 'Principal',
    },
    {
      ...record(faculty, 'Other department request'),
      departmentId: 2,
      department: { id: 2, code: 'ECE', name: 'Electronics' },
    },
    { ...record(faculty, 'Already with HR'), pendingRole: 'HR Admin' },
  ];
  return {
    types: async () => [
      leaveType,
      {
        ...leaveType,
        id: 2,
        code: 'DL',
        name: 'Duty Leave',
        yearlyQuota: null,
        allowHalfDay: false,
      },
      {
        ...leaveType,
        id: 3,
        code: 'OLD',
        name: 'Inactive type',
        active: false,
      },
    ],
    findType: async (id) =>
      id === 1
        ? leaveType
        : id === 2
          ? { ...leaveType, id: 2, allowHalfDay: false, yearlyQuota: null }
          : null,
    user: async (id) => {
      const actor = users.find((user) => user.id === id);
      if (!actor) return null;
      return {
        role: { name: actor.role },
        employee:
          actor.employeeId === owner.id
            ? {
                id: owner.id,
                departmentId: 1,
                joiningDate: new Date('2024-01-01'),
                status: 'ACTIVE',
              }
            : null,
      };
    },
    employee: async (id) =>
      id === owner.id
        ? { id, departmentId: 1, joiningDate: new Date('2024-01-01') }
        : null,
    taken: async (id) =>
      records.filter(
        (r) =>
          r.employeeId === id && ['PENDING', 'APPROVED'].includes(r.status),
      ),
    list: async (where) =>
      records.filter((row) => matches(row, where)).toReversed(),
    find: async (id) => records.find((row) => row.id === id) ?? null,
    submit: async (data, check) => {
      check(
        records.filter(
          (r) =>
            r.employeeId === data.employeeId &&
            ['PENDING', 'APPROVED'].includes(r.status),
        ),
      );
      const row = {
        ...record(owner, data.reason),
        ...data,
        leaveType:
          data.leaveTypeId === 2
            ? { id: 2, code: 'DL', name: 'Duty Leave' }
            : leaveRequest.leaveType,
      };
      records.push(row);
      return row;
    },
    advance: async (before, change) => {
      const index = records.findIndex(
        (r) =>
          r.id === before.id &&
          r.status === 'PENDING' &&
          r.updatedAt === before.updatedAt,
      );
      if (index === -1) return null;
      const { decision, ...fields } = change;
      const row = {
        ...before,
        ...fields,
        updatedAt: new Date(),
        decisions: [
          ...before.decisions,
          ...(decision
            ? [
                {
                  ...decision,
                  note: decision.note ?? null,
                  decidedAt: new Date(),
                  decider: { email: homeUser.email, employee: owner },
                },
              ]
            : []),
        ],
      };
      records[index] = row;
      return row;
    },
  };
}
