import bcrypt from 'bcrypt';
import { HttpError } from '../../common/http-error.js';
import { BCRYPT_COST, type Access } from '../auth/auth.service.js';
import type { UserRepository } from './users.repository.js';
import type { LoginCreateInput, LoginUpdateInput } from './users.schema.js';

// product/USER_ROLES.md footnote 4: HR Admin cannot create or assign it.
const SUPER_ADMIN = 'Super Admin';

const forbidden = (message: string) => new HttpError(403, 'FORBIDDEN', message);
const invalid = (message: string) =>
  new HttpError(400, 'VALIDATION_ERROR', message);
const notFound = () => new HttpError(404, 'NOT_FOUND', 'Login not found.');

export function createUserService(repo: UserRepository) {
  /** The role, if the acting user may give it. */
  async function assignableRole(access: Access, roleId: number) {
    const role = await repo.findRole(roleId);
    if (!role) throw invalid('Choose a valid role.');
    if (
      role.name === SUPER_ADMIN &&
      (await repo.roleOf(access.userId)) !== SUPER_ADMIN
    ) {
      throw forbidden('Only a Super Admin can give the Super Admin role.');
    }
    return role;
  }

  return {
    /** Roles the acting user may give. */
    async roles(access: Access) {
      const roles = await repo.roles();
      return (await repo.roleOf(access.userId)) === SUPER_ADMIN
        ? roles
        : roles.filter((role) => role.name !== SUPER_ADMIN);
    },

    /** The employee's login, or null when they have none. */
    forEmployee(employeeId: string) {
      return repo.findByEmployee(employeeId);
    },

    async create(access: Access, input: LoginCreateInput, ip?: string) {
      const employee = await repo.findEmployee(input.employeeId);
      if (!employee) throw invalid('Choose a valid employee.');
      if (employee.status !== 'ACTIVE') {
        throw invalid('Archived employees cannot have a login.');
      }
      if (await repo.findByEmployee(input.employeeId)) {
        throw new HttpError(
          409,
          'ALREADY_EXISTS',
          'This employee already has a login.',
        );
      }
      if (await repo.findByEmail(employee.email)) {
        throw new HttpError(
          409,
          'ALREADY_EXISTS',
          `Another login already uses ${employee.email}.`,
        );
      }
      const role = await assignableRole(access, input.roleId);
      return repo.create(
        {
          email: employee.email,
          passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
          roleId: role.id,
          employeeId: input.employeeId,
        },
        { actorUserId: access.userId, action: 'user.create', ip },
      );
    },

    async update(
      access: Access,
      id: string,
      input: LoginUpdateInput,
      ip?: string,
    ) {
      const before = await repo.findById(id);
      if (!before) throw notFound();
      const changesAccess =
        input.roleId !== undefined || input.status !== undefined;
      if (before.id === access.userId && changesAccess) {
        throw forbidden(
          'You can’t change the role or status of your own login.',
        );
      }
      if (
        before.role.name === SUPER_ADMIN &&
        (await repo.roleOf(access.userId)) !== SUPER_ADMIN
      ) {
        throw forbidden('Only a Super Admin can change a Super Admin login.');
      }
      if (input.status === 'ACTIVE' && before.employeeId) {
        const employee = await repo.findEmployee(before.employeeId);
        if (employee?.status !== 'ACTIVE') {
          throw invalid('This employee is archived; their login stays off.');
        }
      }
      const role =
        input.roleId === undefined
          ? undefined
          : await assignableRole(access, input.roleId);
      return repo.update(
        before,
        {
          ...(role ? { roleId: role.id } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.password
            ? { passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) }
            : {}),
        },
        {
          actorUserId: access.userId,
          action: 'user.update',
          ip,
          // Signs the person out everywhere when disabled or given a new password.
          endSessions: input.status === 'INACTIVE' || Boolean(input.password),
        },
      );
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
