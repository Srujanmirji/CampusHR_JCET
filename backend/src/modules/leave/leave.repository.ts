import { writeAudit, type AuditEntry } from '../../common/audit.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { LeaveTypeInput, LeaveTypeUpdate } from './leave.schema.js';

export const requestSelect = {
  id: true,
  employeeId: true,
  departmentId: true,
  startDate: true,
  endDate: true,
  halfDay: true,
  days: true,
  reason: true,
  status: true,
  approverRoles: true,
  pendingRole: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  },
  department: { select: { id: true, code: true, name: true } },
  leaveType: { select: { id: true, code: true, name: true } },
  decisions: {
    select: {
      step: true,
      role: true,
      approved: true,
      note: true,
      decidedAt: true,
      decider: {
        select: {
          email: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { step: 'asc' },
  },
} satisfies Prisma.LeaveRequestSelect;

export type RequestRecord = Prisma.LeaveRequestGetPayload<{
  select: typeof requestSelect;
}>;

/** The fields the overlap and balance checks need. */
export const takenSelect = {
  leaveTypeId: true,
  startDate: true,
  endDate: true,
  days: true,
  status: true,
} satisfies Prisma.LeaveRequestSelect;
export type TakenRecord = Prisma.LeaveRequestGetPayload<{
  select: typeof takenSelect;
}>;

const takenWhere = (employeeId: string) => ({
  employeeId,
  status: { in: ['PENDING' as const, 'APPROVED' as const] },
});

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createLeaveRepository(prisma: PrismaClient) {
  return {
    types() {
      return prisma.leaveType.findMany({ orderBy: { code: 'asc' } });
    },
    findType(id: number) {
      return prisma.leaveType.findUnique({ where: { id } });
    },
    findTypeConflict(code?: string, name?: string, exceptId?: number) {
      const or = [
        ...(code ? [{ code }] : []),
        ...(name
          ? [{ name: { equals: name, mode: 'insensitive' as const } }]
          : []),
      ];
      if (or.length === 0) return Promise.resolve(null);
      return prisma.leaveType.findFirst({
        where: { OR: or, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      });
    },
    saveType(
      before: { id: number } | null,
      data: LeaveTypeInput | LeaveTypeUpdate,
      audit: Audit,
    ) {
      return prisma.$transaction(async (tx) => {
        const previous = before
          ? await tx.leaveType.findUnique({ where: { id: before.id } })
          : null;
        const saved = before
          ? await tx.leaveType.update({ where: { id: before.id }, data })
          : await tx.leaveType.create({ data: data as LeaveTypeInput });
        await writeAudit(tx, {
          ...audit,
          resource: 'leave_type',
          resourceId: String(saved.id),
          before: previous ?? undefined,
          after: saved,
        });
        return saved;
      });
    },

    /** The acting user's role and employee record. */
    async user(userId: string) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: { select: { name: true } },
          employee: {
            select: {
              id: true,
              departmentId: true,
              joiningDate: true,
              status: true,
            },
          },
        },
      });
    },
    employee(id: string) {
      return prisma.employee.findUnique({
        where: { id },
        select: { id: true, departmentId: true, joiningDate: true },
      });
    },
    taken(employeeId: string) {
      return prisma.leaveRequest.findMany({
        where: takenWhere(employeeId),
        select: takenSelect,
      });
    },

    list(where: Prisma.LeaveRequestWhereInput) {
      return prisma.leaveRequest.findMany({
        where,
        select: requestSelect,
        orderBy: { createdAt: 'desc' },
        // ponytail: newest 500 only; add paging when a filter can exceed it.
        take: 500,
      });
    },
    find(id: string) {
      return prisma.leaveRequest.findUnique({
        where: { id },
        select: requestSelect,
      });
    },

    /**
     * Creates a request. `check` sees the employee's pending and approved
     * leave inside a serializable transaction, so two requests sent at once
     * cannot overlap or overdraw a balance.
     */
    submit(
      data: Prisma.LeaveRequestUncheckedCreateInput,
      check: (taken: TakenRecord[]) => void,
      audit: Audit,
    ) {
      return prisma.$transaction(
        async (tx) => {
          check(
            await tx.leaveRequest.findMany({
              where: takenWhere(data.employeeId),
              select: takenSelect,
            }),
          );
          const created = await tx.leaveRequest.create({
            data,
            select: requestSelect,
          });
          await writeAudit(tx, {
            ...audit,
            resource: 'leave_request',
            resourceId: created.id,
            after: created,
          });
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    },

    /**
     * Moves a pending request on; null when it changed since it was read
     * (someone else decided, or the applicant cancelled).
     */
    advance(
      before: RequestRecord,
      change: {
        status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
        pendingRole: string | null;
        decision?: Omit<Prisma.LeaveDecisionUncheckedCreateInput, 'requestId'>;
      },
      audit: Audit,
    ) {
      return prisma.$transaction(async (tx) => {
        const { count } = await tx.leaveRequest.updateMany({
          where: {
            id: before.id,
            status: 'PENDING',
            updatedAt: before.updatedAt,
          },
          data: { status: change.status, pendingRole: change.pendingRole },
        });
        if (count === 0) return null;
        if (change.decision) {
          await tx.leaveDecision.create({
            data: { ...change.decision, requestId: before.id },
          });
        }
        const after = await tx.leaveRequest.findUniqueOrThrow({
          where: { id: before.id },
          select: requestSelect,
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'leave_request',
          resourceId: before.id,
          before,
          after,
        });
        return after;
      });
    },
  };
}

export type LeaveRepository = ReturnType<typeof createLeaveRepository>;
