import { HttpError } from '../../common/http-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import type { RoleName } from '../auth/permissions.js';
import { APPROVER_CHAIN, countLeaveDays, yearBalance } from './leave.rules.js';
import type {
  LeaveRepository,
  RequestRecord,
  TakenRecord,
} from './leave.repository.js';
import type {
  BalanceQuery,
  LeaveApplyInput,
  LeaveListQuery,
  LeaveTypeInput,
  LeaveTypeUpdate,
} from './leave.schema.js';

const invalid = (message: string) =>
  new HttpError(400, 'VALIDATION_ERROR', message);
const forbidden = (message: string) => new HttpError(403, 'FORBIDDEN', message);
const notFound = () =>
  new HttpError(404, 'NOT_FOUND', 'Leave request not found.');
const changed = () =>
  new HttpError(
    409,
    'ALREADY_DECIDED',
    'This request has just been decided or cancelled. Refresh to see it.',
  );

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const formatDays = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

// Serializable transactions abort when two writes race; ask to retry.
const isWriteConflict = (error: unknown) =>
  error instanceof Error &&
  ((error as { code?: string }).code === 'P2034' ||
    /could not serialize|40001/.test(String(error)));

export function toRequestDto(request: RequestRecord) {
  return {
    id: request.id,
    employee: {
      id: request.employee.id,
      employeeCode: request.employee.employeeCode,
      name: `${request.employee.firstName} ${request.employee.lastName}`,
    },
    department: request.department,
    leaveType: request.leaveType,
    startDate: isoDate(request.startDate),
    endDate: isoDate(request.endDate),
    halfDay: request.halfDay,
    days: request.days,
    reason: request.reason,
    status: request.status,
    approverRoles: request.approverRoles,
    pendingRole: request.pendingRole,
    decisions: request.decisions.map((decision) => ({
      step: decision.step,
      role: decision.role,
      approved: decision.approved,
      note: decision.note,
      decidedAt: decision.decidedAt,
      decidedBy: decision.decider.employee
        ? `${decision.decider.employee.firstName} ${decision.decider.employee.lastName}`
        : decision.decider.email,
    })),
    createdAt: request.createdAt,
  };
}

/** Requests with at least one day in `month` (YYYY-MM). */
function overlapsMonth(month: string): Prisma.LeaveRequestWhereInput {
  const first = toDate(`${month}-01`);
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  );
  return { startDate: { lte: last }, endDate: { gte: first } };
}

/** Approved and pending days per year for one leave type. */
function daysByYear(taken: TakenRecord[], leaveTypeId: number) {
  const approved = new Map<number, number>();
  const pending = new Map<number, number>();
  for (const request of taken) {
    if (request.leaveTypeId !== leaveTypeId) continue;
    const bucket = request.status === 'APPROVED' ? approved : pending;
    const year = request.startDate.getUTCFullYear();
    bucket.set(year, (bucket.get(year) ?? 0) + request.days);
  }
  return { approved, pending };
}

/** Requests the user may read at their `leave.read` scope; null for none. */
function readScope(access: Access): Prisma.LeaveRequestWhereInput | null {
  const own = access.employeeId ? [{ employeeId: access.employeeId }] : [];
  switch (access.scope) {
    case 'all':
      return {};
    case 'department':
      return access.departmentId === null && own.length === 0
        ? null
        : {
            OR: [
              ...(access.departmentId === null
                ? []
                : [{ departmentId: access.departmentId }]),
              ...own,
            ],
          };
    case 'own':
      return own[0] ?? null;
  }
}

export function createLeaveService(repo: LeaveRepository) {
  async function roleOf(userId: string) {
    return (await repo.user(userId))?.role.name;
  }

  /** Pending requests the user decides next (never their own). */
  async function awaitingWhere(
    access: Access,
  ): Promise<Prisma.LeaveRequestWhereInput> {
    const role = await roleOf(access.userId);
    return {
      status: 'PENDING',
      pendingRole: role ?? '-',
      ...(role === 'HOD' ? { departmentId: access.departmentId ?? -1 } : {}),
      ...(access.employeeId ? { NOT: { employeeId: access.employeeId } } : {}),
    };
  }

  async function assertTypeFree(
    input: { code?: string; name?: string },
    exceptId?: number,
  ) {
    const clash = await repo.findTypeConflict(input.code, input.name, exceptId);
    if (clash) {
      throw new HttpError(
        409,
        'ALREADY_EXISTS',
        clash.code === input.code
          ? `Leave type ${clash.code} already exists.`
          : `A leave type named ${clash.name} already exists.`,
      );
    }
  }

  return {
    types() {
      return repo.types();
    },

    async createType(access: Access, input: LeaveTypeInput, ip?: string) {
      await assertTypeFree(input);
      return repo.saveType(null, input, {
        actorUserId: access.userId,
        action: 'leave_type.create',
        ip,
      });
    },

    async updateType(
      access: Access,
      id: number,
      input: LeaveTypeUpdate,
      ip?: string,
    ) {
      if (!(await repo.findType(id))) {
        throw new HttpError(404, 'NOT_FOUND', 'Leave type not found.');
      }
      await assertTypeFree(input, id);
      return repo.saveType({ id }, input, {
        actorUserId: access.userId,
        action: 'leave_type.update',
        ip,
      });
    },

    async apply(access: Access, input: LeaveApplyInput, ip?: string) {
      const user = await repo.user(access.userId);
      const employee = user?.employee;
      if (!employee || employee.status !== 'ACTIVE') {
        throw forbidden('Your login is not linked to an active employee.');
      }
      const chain = APPROVER_CHAIN[user.role.name as RoleName];
      if (!chain) throw forbidden('Your role does not apply for leave.');
      const type = await repo.findType(input.leaveTypeId);
      if (!type?.active) throw invalid('Choose a leave type in use.');
      if (input.halfDay && !type.allowHalfDay) {
        throw invalid(`${type.name} cannot be taken as a half day.`);
      }
      const start = toDate(input.startDate);
      const end = toDate(input.endDate);
      const days = countLeaveDays(start, end, input.halfDay !== null);
      if (days === 0) throw invalid('Those dates are all Sundays.');
      const year = start.getUTCFullYear();

      try {
        const created = await repo.submit(
          {
            employeeId: employee.id,
            departmentId: employee.departmentId,
            leaveTypeId: type.id,
            startDate: start,
            endDate: end,
            halfDay: input.halfDay,
            days,
            reason: input.reason,
            approverRoles: chain,
            pendingRole: chain[0]!,
          },
          (taken) => {
            const overlap = taken.find(
              (other) => other.startDate <= end && start <= other.endDate,
            );
            if (overlap) {
              throw new HttpError(
                409,
                'OVERLAP',
                `You already have leave from ${isoDate(overlap.startDate)} to ${isoDate(overlap.endDate)}.`,
              );
            }
            const balance = yearBalance(
              type,
              daysByYear(taken, type.id),
              year,
              employee.joiningDate.getUTCFullYear(),
            );
            if (balance.remaining !== null && days > balance.remaining) {
              throw new HttpError(
                400,
                'INSUFFICIENT_BALANCE',
                `Only ${formatDays(balance.remaining)} of ${type.name} left in ${year}; this request needs ${formatDays(days)}.`,
              );
            }
          },
          { actorUserId: access.userId, action: 'leave.apply', ip },
        );
        return toRequestDto(created);
      } catch (error) {
        if (isWriteConflict(error)) {
          throw new HttpError(
            409,
            'LEAVE_CHANGED',
            'Another of your requests was saved at the same time. Try again.',
          );
        }
        throw error;
      }
    },

    async list(access: Access, query: LeaveListQuery) {
      const scope = readScope(access);
      if (!scope && !query.awaitingMe) return [];
      const rows = await repo.list({
        AND: [
          query.awaitingMe ? await awaitingWhere(access) : scope!,
          query.status ? { status: query.status } : {},
          query.employeeId ? { employeeId: query.employeeId } : {},
          query.year
            ? {
                startDate: {
                  gte: toDate(`${query.year}-01-01`),
                  lte: toDate(`${query.year}-12-31`),
                },
              }
            : {},
          query.month ? overlapsMonth(query.month) : {},
        ],
      });
      return rows.map(toRequestDto);
    },

    async get(access: Access, id: string) {
      const request = await repo.find(id);
      const scope = readScope(access);
      const visible =
        request &&
        (scope
          ? (await repo.list({ AND: [scope, { id }] })).length > 0
          : false);
      if (!request || !visible) throw notFound();
      return toRequestDto(request);
    },

    /** Approves or rejects the step waiting for the caller. */
    async decide(
      access: Access,
      id: string,
      approved: boolean,
      note: string | undefined,
      ip?: string,
    ) {
      const request = await repo.find(id);
      if (!request) throw notFound();
      if (request.employeeId === access.employeeId) {
        throw forbidden('You cannot decide your own leave.');
      }
      if (request.status !== 'PENDING') throw changed();
      const role = await roleOf(access.userId);
      const inDepartment =
        role !== 'HOD' || request.departmentId === access.departmentId;
      if (role !== request.pendingRole || !inDepartment) {
        throw forbidden(
          `This request is waiting for the ${request.pendingRole}${request.pendingRole === 'HOD' ? ` of ${request.department.code}` : ''}.`,
        );
      }
      const step = request.decisions.length;
      const next = approved ? (request.approverRoles[step + 1] ?? null) : null;
      const after = await repo.advance(
        request,
        {
          status: !approved ? 'REJECTED' : next ? 'PENDING' : 'APPROVED',
          pendingRole: next,
          decision: {
            step,
            role,
            deciderUserId: access.userId,
            approved,
            note: note || null,
          },
        },
        {
          actorUserId: access.userId,
          action: approved ? 'leave.approve' : 'leave.reject',
          ip,
        },
      );
      if (!after) throw changed();
      return toRequestDto(after);
    },

    async cancel(access: Access, id: string, ip?: string) {
      const request = await repo.find(id);
      if (!request || request.employeeId !== access.employeeId) {
        throw notFound();
      }
      if (request.status !== 'PENDING') {
        throw new HttpError(
          409,
          'NOT_PENDING',
          'Only a request still waiting for approval can be cancelled.',
        );
      }
      const after = await repo.advance(
        request,
        { status: 'CANCELLED', pendingRole: null },
        { actorUserId: access.userId, action: 'leave.cancel', ip },
      );
      if (!after) throw changed();
      return toRequestDto(after);
    },

    /** Each leave type's balance for one employee and year. */
    async balances(access: Access, query: BalanceQuery) {
      const employeeId = query.employeeId ?? access.employeeId;
      if (!employeeId) throw invalid('Choose an employee.');
      const employee = await repo.employee(employeeId);
      const visible =
        employee &&
        (access.scope === 'all' ||
          employee.id === access.employeeId ||
          (access.scope === 'department' &&
            employee.departmentId === access.departmentId));
      if (!visible)
        throw new HttpError(404, 'NOT_FOUND', 'Employee not found.');
      const year = query.year ?? new Date().getUTCFullYear();
      const taken = await repo.taken(employee.id);
      const firstYear = employee.joiningDate.getUTCFullYear();
      return (await repo.types())
        .map((type) => ({
          leaveType: { id: type.id, code: type.code, name: type.name },
          active: type.active,
          year,
          ...yearBalance(type, daysByYear(taken, type.id), year, firstYear),
        }))
        .filter((row) => row.active || row.used > 0 || row.pending > 0);
    },
  };
}

export type LeaveService = ReturnType<typeof createLeaveService>;
