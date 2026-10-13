import { writeAudit, type AuditEntry } from '../../common/audit.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export const employeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  employmentType: true,
  joiningDate: true,
  status: true,
  qualification: true,
  specialization: true,
  experienceYears: true,
  department: { select: { id: true, code: true, name: true } },
  designation: { select: { id: true, name: true, category: true } },
  headOf: { select: { id: true } },
} satisfies Prisma.EmployeeSelect;

export type EmployeeRecord = Prisma.EmployeeGetPayload<{
  select: typeof employeeSelect;
}>;

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createEmployeeRepository(prisma: PrismaClient) {
  return {
    async list(
      where: Prisma.EmployeeWhereInput,
      { skip, take }: { skip: number; take: number },
    ) {
      const [rows, total, teaching] = await prisma.$transaction([
        prisma.employee.findMany({
          where,
          select: employeeSelect,
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          skip,
          take,
        }),
        prisma.employee.count({ where }),
        prisma.employee.count({
          where: { AND: [where, { designation: { category: 'TEACHING' } }] },
        }),
      ]);
      return { rows, total, teaching };
    },

    findOne(where: Prisma.EmployeeWhereInput) {
      return prisma.employee.findFirst({ where, select: employeeSelect });
    },

    /** An existing employee using this email or code, other than `exceptId`. */
    findConflict(
      { email, employeeCode }: { email?: string; employeeCode?: string },
      exceptId?: string,
    ) {
      const or = [
        ...(email ? [{ email }] : []),
        ...(employeeCode ? [{ employeeCode }] : []),
      ];
      if (or.length === 0) return Promise.resolve(null);
      return prisma.employee.findFirst({
        where: { OR: or, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
        select: { email: true, employeeCode: true },
      });
    },

    findDepartment(id: number) {
      return prisma.department.findUnique({
        where: { id },
        select: { id: true, code: true },
      });
    },

    findDesignation(id: number) {
      return prisma.designation.findUnique({
        where: { id },
        select: { id: true },
      });
    },

    async codesWithPrefix(prefix: string) {
      const rows = await prisma.employee.findMany({
        where: { employeeCode: { startsWith: prefix } },
        select: { employeeCode: true },
      });
      return rows.map((row) => row.employeeCode);
    },

    create(data: Prisma.EmployeeUncheckedCreateInput, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.employee.create({
          data,
          select: employeeSelect,
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'employee',
          resourceId: created.id,
          after: created,
        });
        return created;
      });
    },

    update(
      before: EmployeeRecord,
      data: Prisma.EmployeeUncheckedUpdateInput,
      audit: Audit,
    ) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.employee.update({
          where: { id: before.id },
          data,
          select: employeeSelect,
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'employee',
          resourceId: before.id,
          before,
          after: updated,
        });
        return updated;
      });
    },

    /** Archives the employee, ends their login, and clears any HOD post. */
    archive(before: EmployeeRecord, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        await tx.department.updateMany({
          where: { hodEmployeeId: before.id },
          data: { hodEmployeeId: null },
        });
        await tx.user.updateMany({
          where: { employeeId: before.id },
          data: { status: 'INACTIVE' },
        });
        const archived = await tx.employee.update({
          where: { id: before.id },
          data: { status: 'ARCHIVED' },
          select: employeeSelect,
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'employee',
          resourceId: before.id,
          before,
          after: archived,
        });
        return archived;
      });
    },
  };
}

export type EmployeeRepository = ReturnType<typeof createEmployeeRepository>;
