import { HttpError } from '../../common/http-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import type {
  EmployeeRecord,
  EmployeeRepository,
} from './employee.repository.js';
import {
  ownUpdateSchema,
  type EmployeeCreateInput,
  type EmployeeListQuery,
  type EmployeeUpdateInput,
} from './employee.schema.js';

const notFound = () => new HttpError(404, 'NOT_FOUND', 'Employee not found.');

/**
 * Records the user may see at their scope; null when none (a department or own
 * scope without a linked employee record).
 */
export function employeeScope(
  access: Pick<Access, 'scope' | 'employeeId' | 'departmentId'>,
): Prisma.EmployeeWhereInput | null {
  switch (access.scope) {
    case 'all':
      return {};
    case 'department':
      return access.departmentId === null
        ? null
        : { departmentId: access.departmentId };
    case 'own':
      return access.employeeId === null ? null : { id: access.employeeId };
  }
}

/** Next free code in the JCET-<DEPT>-<NNN> pattern, e.g. JCET-CSE-022. */
export function nextEmployeeCode(departmentCode: string, existing: string[]) {
  const prefix = `JCET-${departmentCode}-`;
  const highest = Math.max(
    0,
    ...existing.map((code) =>
      /^\d+$/.test(code.slice(prefix.length))
        ? Number(code.slice(prefix.length))
        : 0,
    ),
  );
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

export function toEmployeeDto(employee: EmployeeRecord) {
  const { headOf, joiningDate, ...rest } = employee;
  return {
    ...rest,
    joiningDate: joiningDate.toISOString().slice(0, 10),
    isHod: headOf !== null,
  };
}

const toDate = (date: string) => new Date(`${date}T00:00:00Z`);

export function createEmployeeService(repo: EmployeeRepository) {
  async function findVisible(access: Access, id: string) {
    const scope = employeeScope(access);
    const employee = scope && (await repo.findOne({ AND: [scope, { id }] }));
    if (!employee) throw notFound();
    return employee;
  }

  async function assertReferences(
    input: EmployeeUpdateInput,
    exceptId?: string,
  ) {
    if (
      input.departmentId &&
      !(await repo.findDepartment(input.departmentId))
    ) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Choose a valid department.',
      );
    }
    if (
      input.designationId &&
      !(await repo.findDesignation(input.designationId))
    ) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Choose a valid designation.',
      );
    }
    const conflict = await repo.findConflict(input, exceptId);
    if (conflict) {
      throw new HttpError(
        409,
        'ALREADY_EXISTS',
        conflict.email === input.email
          ? 'Another employee already uses this email.'
          : 'This employee ID is already taken.',
      );
    }
  }

  return {
    async list(access: Access, query: EmployeeListQuery) {
      const scope = employeeScope(access);
      const page = { page: query.page, pageSize: query.pageSize };
      if (!scope) {
        return {
          data: [],
          meta: { ...page, total: 0, teaching: 0, nonTeaching: 0 },
        };
      }
      const where: Prisma.EmployeeWhereInput = {
        AND: [
          scope,
          { status: query.status },
          query.departmentId ? { departmentId: query.departmentId } : {},
          query.category ? { designation: { category: query.category } } : {},
          query.search
            ? {
                OR: (
                  ['firstName', 'lastName', 'email', 'employeeCode'] as const
                ).map((field) => ({
                  [field]: { contains: query.search, mode: 'insensitive' },
                })),
              }
            : {},
        ],
      };
      const { rows, total, teaching } = await repo.list(where, {
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      return {
        data: rows.map(toEmployeeDto),
        meta: { ...page, total, teaching, nonTeaching: total - teaching },
      };
    },

    async get(access: Access, id: string) {
      return toEmployeeDto(await findVisible(access, id));
    },

    async nextCode(departmentId: number) {
      const department = await repo.findDepartment(departmentId);
      if (!department)
        throw new HttpError(404, 'NOT_FOUND', 'Department not found.');
      const prefix = `JCET-${department.code}-`;
      return nextEmployeeCode(
        department.code,
        await repo.codesWithPrefix(prefix),
      );
    },

    async create(access: Access, input: EmployeeCreateInput, ip?: string) {
      await assertReferences(input);
      const created = await repo.create(
        { ...input, joiningDate: toDate(input.joiningDate) },
        { actorUserId: access.userId, action: 'employee.create', ip },
      );
      return toEmployeeDto(created);
    },

    async update(
      access: Access,
      id: string,
      input: EmployeeUpdateInput,
      ip?: string,
    ) {
      const before = await findVisible(access, id);
      if (before.status === 'ARCHIVED') {
        throw new HttpError(
          409,
          'ARCHIVED',
          'Archived employees cannot be edited.',
        );
      }
      if (access.scope !== 'all' && !ownUpdateSchema.safeParse(input).success) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'You can only change your own contact details.',
        );
      }
      await assertReferences(input, id);
      const { joiningDate, ...rest } = input;
      const updated = await repo.update(
        before,
        {
          ...rest,
          ...(joiningDate ? { joiningDate: toDate(joiningDate) } : {}),
        },
        { actorUserId: access.userId, action: 'employee.update', ip },
      );
      return toEmployeeDto(updated);
    },

    async archive(access: Access, id: string, ip?: string) {
      const before = await findVisible(access, id);
      if (before.status === 'ARCHIVED') return toEmployeeDto(before);
      const archived = await repo.archive(before, {
        actorUserId: access.userId,
        action: 'employee.archive',
        ip,
      });
      return toEmployeeDto(archived);
    },
  };
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
