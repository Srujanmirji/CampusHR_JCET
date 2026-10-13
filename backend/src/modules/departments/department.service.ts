import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type {
  DepartmentRecord,
  DepartmentRepository,
} from './department.repository.js';

const notFound = () => new HttpError(404, 'NOT_FOUND', 'Department not found.');

const toDto = ({ hod, ...department }: DepartmentRecord) => ({
  ...department,
  hod: hod && {
    id: hod.id,
    employeeCode: hod.employeeCode,
    name: `${hod.firstName} ${hod.lastName}`,
  },
});

export function createDepartmentService(repo: DepartmentRepository) {
  async function findOrThrow(id: number) {
    const department = await repo.findById(id);
    if (!department) throw notFound();
    return department;
  }

  return {
    async list() {
      return (await repo.list()).map(({ department, total, teaching }) => ({
        ...toDto(department),
        staff: { total, teaching, nonTeaching: total - teaching },
      }));
    },

    async get(id: number) {
      return toDto(await findOrThrow(id));
    },

    async create(
      access: Access,
      input: { code: string; name: string },
      ip?: string,
    ) {
      if (await repo.findConflict(input.code, input.name)) {
        throw new HttpError(
          409,
          'ALREADY_EXISTS',
          'A department with this code or name already exists.',
        );
      }
      const created = await repo.create(input, {
        actorUserId: access.userId,
        action: 'department.create',
        ip,
      });
      return toDto(created);
    },

    // The code is fixed after creation: it is part of issued employee IDs.
    async update(
      access: Access,
      id: number,
      input: { name?: string; hodEmployeeId?: string | null },
      ip?: string,
    ) {
      const before = await findOrThrow(id);
      if (input.name && (await repo.findNameConflict(input.name, id))) {
        throw new HttpError(
          409,
          'ALREADY_EXISTS',
          'A department with this name already exists.',
        );
      }
      if (input.hodEmployeeId) {
        const hod = await repo.findEmployee(input.hodEmployeeId);
        if (!hod || hod.departmentId !== id || hod.status !== 'ACTIVE') {
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'The HOD must be an active employee of this department.',
          );
        }
      }
      const updated = await repo.update(before, input, {
        actorUserId: access.userId,
        action: 'department.update',
        ip,
      });
      return toDto(updated);
    },

    designations() {
      return repo.designations();
    },
  };
}

export type DepartmentService = ReturnType<typeof createDepartmentService>;
