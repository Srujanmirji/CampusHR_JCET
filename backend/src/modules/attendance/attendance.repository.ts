import { HttpError } from '../../common/http-error.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  AttendanceStatus,
  AttendanceSource,
  CorrectionStatus,
} from '../../generated/prisma/enums.js';

export const attendanceSelect = {
  id: true,
  employeeId: true,
  date: true,
  checkIn: true,
  checkOut: true,
  status: true,
  source: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      departmentId: true,
      department: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.AttendanceSelect;

export type AttendanceRecord = Prisma.AttendanceGetPayload<{
  select: typeof attendanceSelect;
}>;

export const correctionSelect = {
  id: true,
  attendanceId: true,
  employeeId: true,
  date: true,
  requestedCheckIn: true,
  requestedCheckOut: true,
  requestedStatus: true,
  reason: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      departmentId: true,
      department: { select: { id: true, code: true, name: true } },
    },
  },
  reviewedByUser: {
    select: {
      id: true,
      email: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.AttendanceCorrectionSelect;

export type CorrectionRecord = Prisma.AttendanceCorrectionGetPayload<{
  select: typeof correctionSelect;
}>;

export interface AttendanceSettingsData {
  workDayStart: string;
  workDayEnd: string;
  gracePeriodMinutes: number;
  halfDayHours: number;
  fullDayHours: number;
}

export interface AttendanceRepository {
  getSettings(): Promise<AttendanceSettingsData>;
  updateSettings(data: AttendanceSettingsData): Promise<AttendanceSettingsData>;
  findByEmployeeAndDate(
    employeeId: string,
    date: Date,
  ): Promise<AttendanceRecord | null>;
  findById(id: string): Promise<AttendanceRecord | null>;
  recordPunch(params: {
    action?: 'CHECK_IN' | 'CHECK_OUT';
    employeeId: string;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    status: AttendanceStatus;
    source: AttendanceSource;
    notes?: string | null;
  }): Promise<AttendanceRecord>;
  list(params: {
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    departmentId?: number;
    employeeId?: string;
    status?: AttendanceStatus;
    skip: number;
    take: number;
  }): Promise<{ items: AttendanceRecord[]; total: number }>;
  createCorrection(data: {
    attendanceId?: string | null;
    employeeId: string;
    date: Date;
    requestedCheckIn?: Date | null;
    requestedCheckOut?: Date | null;
    requestedStatus: AttendanceStatus;
    reason: string;
  }): Promise<CorrectionRecord>;
  findCorrectionById(id: string): Promise<CorrectionRecord | null>;
  listCorrections(params: {
    employeeId?: string;
    departmentId?: number;
    status?: CorrectionStatus;
    skip: number;
    take: number;
  }): Promise<{ items: CorrectionRecord[]; total: number }>;
  updateCorrection(
    id: string,
    data: {
      status: CorrectionStatus;
      reviewedByUserId: string;
      reviewedAt: Date;
      reviewNote?: string | null;
    },
  ): Promise<CorrectionRecord>;
  applyCorrection(params: {
    employeeId: string;
    date: Date;
    checkIn?: Date | null;
    checkOut?: Date | null;
    status: AttendanceStatus;
  }): Promise<AttendanceRecord>;
}

export function createAttendanceRepository(
  prisma: PrismaClient,
): AttendanceRepository {
  return {
    async getSettings() {
      const existing = await prisma.attendanceSettings.findFirst();
      if (existing) {
        return {
          workDayStart: existing.workDayStart,
          workDayEnd: existing.workDayEnd,
          gracePeriodMinutes: existing.gracePeriodMinutes,
          halfDayHours: existing.halfDayHours,
          fullDayHours: existing.fullDayHours,
        };
      }
      return {
        workDayStart: '09:00',
        workDayEnd: '17:00',
        gracePeriodMinutes: 15,
        halfDayHours: 4.0,
        fullDayHours: 7.0,
      };
    },

    async updateSettings(data) {
      const existing = await prisma.attendanceSettings.findFirst();
      if (existing) {
        const updated = await prisma.attendanceSettings.update({
          where: { id: existing.id },
          data,
        });
        return {
          workDayStart: updated.workDayStart,
          workDayEnd: updated.workDayEnd,
          gracePeriodMinutes: updated.gracePeriodMinutes,
          halfDayHours: updated.halfDayHours,
          fullDayHours: updated.fullDayHours,
        };
      }
      const created = await prisma.attendanceSettings.create({ data });
      return {
        workDayStart: created.workDayStart,
        workDayEnd: created.workDayEnd,
        gracePeriodMinutes: created.gracePeriodMinutes,
        halfDayHours: created.halfDayHours,
        fullDayHours: created.fullDayHours,
      };
    },

    async findByEmployeeAndDate(employeeId: string, date: Date) {
      return prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
        select: attendanceSelect,
      });
    },

    async findById(id: string) {
      return prisma.attendance.findUnique({
        where: { id },
        select: attendanceSelect,
      });
    },

    async recordPunch(params) {
      if (params.action) {
        const where = { employeeId: params.employeeId, date: params.date };
        const data = {
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          status: params.status,
          source: params.source,
          notes: params.notes,
        };
        let count: number;
        if (params.action === 'CHECK_IN') {
          const created = await prisma.attendance.createMany({
            data: { ...where, ...data },
            skipDuplicates: true,
          });
          count = created.count;
          if (!count)
            count = (
              await prisma.attendance.updateMany({
                where: { ...where, checkIn: null, checkOut: null },
                data,
              })
            ).count;
        } else {
          count = (
            await prisma.attendance.updateMany({
              where: { ...where, checkIn: params.checkIn, checkOut: null },
              data,
            })
          ).count;
        }
        if (!count)
          throw new HttpError(
            409,
            'PUNCH_CHANGED',
            'Attendance changed. Refresh before punching again.',
          );
        return prisma.attendance.findUniqueOrThrow({
          where: { employeeId_date: where },
          select: attendanceSelect,
        });
      }
      return prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: params.employeeId,
            date: params.date,
          },
        },
        update: {
          ...(params.checkIn ? { checkIn: params.checkIn } : {}),
          ...(params.checkOut ? { checkOut: params.checkOut } : {}),
          status: params.status,
          source: params.source,
          ...(params.notes !== undefined ? { notes: params.notes } : {}),
        },
        create: {
          employeeId: params.employeeId,
          date: params.date,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          status: params.status,
          source: params.source,
          notes: params.notes,
        },
        select: attendanceSelect,
      });
    },

    async list(params) {
      const where: Prisma.AttendanceWhereInput = {};
      if (params.date) {
        where.date = params.date;
      } else if (params.startDate || params.endDate) {
        where.date = {};
        if (params.startDate) where.date.gte = params.startDate;
        if (params.endDate) where.date.lte = params.endDate;
      }
      if (params.employeeId) {
        where.employeeId = params.employeeId;
      }
      if (params.status) {
        where.status = params.status;
      }
      if (params.departmentId) {
        where.employee = { departmentId: params.departmentId };
      }

      const [items, total] = await Promise.all([
        prisma.attendance.findMany({
          where,
          select: attendanceSelect,
          orderBy: [{ date: 'desc' }, { checkIn: 'desc' }],
          skip: params.skip,
          take: params.take,
        }),
        prisma.attendance.count({ where }),
      ]);

      return { items, total };
    },

    async createCorrection(data) {
      return prisma.attendanceCorrection.create({
        data: {
          attendanceId: data.attendanceId,
          employeeId: data.employeeId,
          date: data.date,
          requestedCheckIn: data.requestedCheckIn,
          requestedCheckOut: data.requestedCheckOut,
          requestedStatus: data.requestedStatus,
          reason: data.reason,
        },
        select: correctionSelect,
      });
    },

    async findCorrectionById(id: string) {
      return prisma.attendanceCorrection.findUnique({
        where: { id },
        select: correctionSelect,
      });
    },

    async listCorrections(params) {
      const where: Prisma.AttendanceCorrectionWhereInput = {};
      if (params.employeeId) where.employeeId = params.employeeId;
      if (params.status) where.status = params.status;
      if (params.departmentId)
        where.employee = { departmentId: params.departmentId };

      const [items, total] = await Promise.all([
        prisma.attendanceCorrection.findMany({
          where,
          select: correctionSelect,
          orderBy: { createdAt: 'desc' },
          skip: params.skip,
          take: params.take,
        }),
        prisma.attendanceCorrection.count({ where }),
      ]);

      return { items, total };
    },

    async updateCorrection(id, data) {
      return prisma.attendanceCorrection.update({
        where: { id },
        data,
        select: correctionSelect,
      });
    },

    async applyCorrection(params) {
      return prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: params.employeeId,
            date: params.date,
          },
        },
        update: {
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          status: params.status,
          source: 'MANUAL',
          notes: 'Updated via approved attendance correction',
        },
        create: {
          employeeId: params.employeeId,
          date: params.date,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          status: params.status,
          source: 'MANUAL',
          notes: 'Created via approved attendance correction',
        },
        select: attendanceSelect,
      });
    },
  };
}
