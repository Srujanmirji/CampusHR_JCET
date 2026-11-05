import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export interface OnDutyRecord {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    department: {
      id: number;
      code: string;
      name: string;
    };
    designation: {
      id: number;
      name: string;
      category: 'TEACHING' | 'NON_TEACHING';
    };
  };
  category:
    | 'UNIVERSITY_VALUATION'
    | 'EXTERNAL_EXAMINER'
    | 'CONFERENCE_SEMINAR'
    | 'FDP_WORKSHOP'
    | 'BOS_BOE_MEETING'
    | 'OFFICIAL_COLLEGE_DUTY'
    | 'OTHER';
  title: string;
  description: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: 'PENDING' | 'RECOMMENDED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  attachmentUrl: string | null;
  attachmentName: string | null;
  attendanceCertificateUrl: string | null;
  hodReviewedById: string | null;
  hodReviewedBy?: {
    id: string;
    email: string;
  } | null;
  hodReviewedAt: Date | null;
  hodNote: string | null;
  finalApprovedById: string | null;
  finalApprovedBy?: {
    id: string;
    email: string;
  } | null;
  finalApprovedAt: Date | null;
  finalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnDutyMetrics {
  total: number;
  pending: number;
  recommended: number;
  approved: number;
  rejected: number;
}

export interface OnDutyRepository {
  list(
    where: Prisma.OnDutyRequestWhereInput,
    pagination: { skip: number; take: number },
  ): Promise<{ rows: OnDutyRecord[]; total: number }>;
  findById(id: string): Promise<OnDutyRecord | null>;
  getMetrics(where: Prisma.OnDutyRequestWhereInput): Promise<OnDutyMetrics>;
  create(data: Prisma.OnDutyRequestCreateInput): Promise<OnDutyRecord>;
  update(id: string, data: Prisma.OnDutyRequestUpdateInput): Promise<OnDutyRecord>;
  findEmployee(
    id: string,
  ): Promise<{ id: string; employeeCode: string; departmentId: number; firstName: string; lastName: string } | null>;
  creditAttendanceForDates(params: {
    employeeId: string;
    dates: Date[];
    dutyTitle: string;
  }): Promise<void>;
}

const defaultInclude = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      departmentId: true,
      department: { select: { id: true, code: true, name: true } },
      designation: { select: { id: true, name: true, category: true } },
    },
  },
  hodReviewedBy: { select: { id: true, email: true } },
  finalApprovedBy: { select: { id: true, email: true } },
} as const;

export function createOnDutyRepository(prisma: PrismaClient): OnDutyRepository {
  return {
    async list(where, { skip, take }) {
      const [rows, total] = await Promise.all([
        prisma.onDutyRequest.findMany({
          where,
          include: defaultInclude,
          orderBy: { startDate: 'desc' },
          skip,
          take,
        }),
        prisma.onDutyRequest.count({ where }),
      ]);
      return { rows: rows as unknown as OnDutyRecord[], total };
    },

    async findById(id) {
      const row = await prisma.onDutyRequest.findUnique({
        where: { id },
        include: defaultInclude,
      });
      return row as unknown as OnDutyRecord | null;
    },

    async getMetrics(where) {
      const [total, pending, recommended, approved, rejected] = await Promise.all([
        prisma.onDutyRequest.count({ where }),
        prisma.onDutyRequest.count({ where: { ...where, status: 'PENDING' } }),
        prisma.onDutyRequest.count({ where: { ...where, status: 'RECOMMENDED' } }),
        prisma.onDutyRequest.count({ where: { ...where, status: 'APPROVED' } }),
        prisma.onDutyRequest.count({ where: { ...where, status: 'REJECTED' } }),
      ]);
      return { total, pending, recommended, approved, rejected };
    },

    async create(data) {
      const row = await prisma.onDutyRequest.create({
        data,
        include: defaultInclude,
      });
      return row as unknown as OnDutyRecord;
    },

    async update(id, data) {
      const row = await prisma.onDutyRequest.update({
        where: { id },
        data,
        include: defaultInclude,
      });
      return row as unknown as OnDutyRecord;
    },

    async findEmployee(id) {
      return prisma.employee.findUnique({
        where: { id },
        select: {
          id: true,
          employeeCode: true,
          departmentId: true,
          firstName: true,
          lastName: true,
        },
      });
    },

    async creditAttendanceForDates({ employeeId, dates, dutyTitle }) {
      await prisma.$transaction(
        dates.map((date) =>
          prisma.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId,
                date,
              },
            },
            update: {
              status: 'ON_DUTY',
              source: 'MANUAL',
              notes: `Official On-Duty: ${dutyTitle}`,
            },
            create: {
              employeeId,
              date,
              status: 'ON_DUTY',
              source: 'MANUAL',
              notes: `Official On-Duty: ${dutyTitle}`,
            },
          }),
        ),
      );
    },
  };
}
