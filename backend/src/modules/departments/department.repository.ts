import { writeAudit, type AuditEntry } from '../../common/audit.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export const departmentSelect = {
  id: true,
  code: true,
  name: true,
  hod: {
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  },
} satisfies Prisma.DepartmentSelect;

export type DepartmentRecord = Prisma.DepartmentGetPayload<{
  select: typeof departmentSelect;
}>;

type Audit = Omit<AuditEntry, 'resource' | 'resourceId' | 'before' | 'after'>;

export function createDepartmentRepository(prisma: PrismaClient) {
  return {
    async list() {
      const [departments, teaching, all] = await prisma.$transaction([
        prisma.department.findMany({
          select: departmentSelect,
          orderBy: { name: 'asc' },
        }),
        prisma.employee.groupBy({
          by: ['departmentId'],
          where: { status: 'ACTIVE', designation: { category: 'TEACHING' } },
          orderBy: { departmentId: 'asc' },
          _count: { _all: true },
        }),
        prisma.employee.groupBy({
          by: ['departmentId'],
          where: { status: 'ACTIVE' },
          orderBy: { departmentId: 'asc' },
          _count: { _all: true },
        }),
      ]);
      const count = (rows: typeof all, id: number) => {
        const row = rows.find((candidate) => candidate.departmentId === id);
        const counted = row?._count;
        return typeof counted === 'object' ? (counted._all ?? 0) : 0;
      };
      return departments.map((department) => ({
        department,
        total: count(all, department.id),
        teaching: count(teaching, department.id),
      }));
    },

    findById(id: number) {
      return prisma.department.findUnique({
        where: { id },
        select: departmentSelect,
      });
    },

    findConflict(code: string, name: string) {
      return prisma.department.findFirst({
        where: {
          OR: [{ code }, { name: { equals: name, mode: 'insensitive' } }],
        },
        select: { code: true },
      });
    },

    findNameConflict(name: string, exceptId: number) {
      return prisma.department.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id: exceptId },
        },
        select: { id: true },
      });
    },

    findEmployee(id: string) {
      return prisma.employee.findUnique({
        where: { id },
        select: { departmentId: true, status: true },
      });
    },

    create(data: { code: string; name: string }, audit: Audit) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.department.create({
          data,
          select: departmentSelect,
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'department',
          resourceId: String(created.id),
          after: created,
        });
        return created;
      });
    },

    update(
      before: DepartmentRecord,
      data: { name?: string; hodEmployeeId?: string | null },
      audit: Audit,
    ) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.department.update({
          where: { id: before.id },
          data,
          select: departmentSelect,
        });
        await writeAudit(tx, {
          ...audit,
          resource: 'department',
          resourceId: String(before.id),
          before,
          after: updated,
        });
        return updated;
      });
    },

    designations() {
      return prisma.designation.findMany({
        select: { id: true, name: true, category: true, level: true },
        orderBy: [{ category: 'asc' }, { level: 'asc' }, { name: 'asc' }],
      });
    },
  };
}

export type DepartmentRepository = ReturnType<
  typeof createDepartmentRepository
>;
