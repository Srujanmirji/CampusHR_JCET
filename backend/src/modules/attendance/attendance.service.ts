import { HttpError } from '../../common/http-error.js';
import type { CorrectionStatus } from '../../generated/prisma/enums.js';
import type { Access } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import type {
  AttendanceRecord,
  AttendanceRepository,
  AttendanceSettingsData,
  CorrectionRecord,
} from './attendance.repository.js';
import type {
  AttendanceSettingsInput,
  CorrectionRequestInput,
  ListAttendanceQuery,
  ManualRecordInput,
  PunchInput,
  ReviewCorrectionInput,
} from './attendance.schema.js';

export interface AttendanceListResult {
  data: AttendanceRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CorrectionListResult {
  data: CorrectionRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AttendanceService {
  punch(access: Access, input: PunchInput): Promise<AttendanceRecord>;
  today(access: Access): Promise<AttendanceRecord | null>;
  list(
    access: Access,
    query: ListAttendanceQuery,
  ): Promise<AttendanceListResult>;
  manualRecord(
    access: Access,
    input: ManualRecordInput,
  ): Promise<AttendanceRecord>;
  requestCorrection(
    access: Access,
    input: CorrectionRequestInput,
  ): Promise<CorrectionRecord>;
  listCorrections(
    access: Access,
    query: {
      employeeId?: string;
      status?: CorrectionStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<CorrectionListResult>;
  reviewCorrection(
    access: Access,
    id: string,
    input: ReviewCorrectionInput,
  ): Promise<CorrectionRecord>;
  getSettings(): Promise<AttendanceSettingsData>;
  updateSettings(
    access: Access,
    input: AttendanceSettingsInput,
  ): Promise<AttendanceSettingsData>;
}

function startOfDate(dateStr?: string | Date): Date {
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function createAttendanceService(
  repo: AttendanceRepository,
  notifier?: Notifier,
): AttendanceService {
  return {
    async punch(access: Access, input: PunchInput) {
      if (!access.employeeId) {
        throw new HttpError(
          400,
          'NO_EMPLOYEE',
          'Only staff linked to an employee record can punch in/out.',
        );
      }

      const now = new Date();
      const today = startOfDate(now);
      if (input.date && input.date !== today.toISOString().slice(0, 10))
        throw new HttpError(
          409,
          'DATE_CHANGED',
          'Attendance day changed. Refresh before punching.',
        );
      const settings = await repo.getSettings();
      const existing = await repo.findByEmployeeAndDate(
        access.employeeId,
        today,
      );

      if (
        input.action === 'CHECK_IN' &&
        (existing?.checkIn || existing?.checkOut)
      )
        throw new HttpError(
          409,
          'PUNCH_CHANGED',
          'Check-in is already recorded. Refresh attendance.',
        );
      if (
        input.action === 'CHECK_OUT' &&
        (!existing?.checkIn || existing.checkOut)
      )
        throw new HttpError(
          409,
          'PUNCH_CHANGED',
          'Check-out is unavailable or already recorded. Refresh attendance.',
        );
      if (!existing || !existing.checkIn) {
        // First punch of the day: Check-In
        const [startHour, startMinute] = settings.workDayStart
          .split(':')
          .map(Number);
        const expectedStart = new Date(today);
        expectedStart.setUTCHours(
          startHour,
          startMinute + settings.gracePeriodMinutes,
          0,
          0,
        );

        const status = now > expectedStart ? 'LATE' : 'PRESENT';

        return repo.recordPunch({
          action: input.action,
          employeeId: access.employeeId,
          date: today,
          checkIn: now,
          status,
          source: input.source,
          notes: input.notes,
        });
      }

      // Subsequent punch of the day: Check-Out
      const checkInTime = new Date(existing.checkIn);
      const diffHours =
        (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      let status = existing.status;

      if (diffHours < settings.halfDayHours && status !== 'ON_LEAVE') {
        status = 'HALF_DAY';
      }

      return repo.recordPunch({
        action: input.action,
        employeeId: access.employeeId,
        date: today,
        checkIn: existing.checkIn,
        checkOut: now,
        status,
        source: input.source,
        notes: input.notes ?? existing.notes,
      });
    },

    async today(access: Access) {
      if (!access.employeeId) {
        return null;
      }
      const today = startOfDate();
      return repo.findByEmployeeAndDate(access.employeeId, today);
    },

    async list(access: Access, query: ListAttendanceQuery) {
      const skip = (query.page - 1) * query.limit;
      const take = query.limit;

      if (
        (access.scope === 'own' && !access.employeeId) ||
        (access.scope === 'department' && !access.departmentId)
      )
        return {
          data: [],
          meta: {
            total: 0,
            page: query.page,
            limit: query.limit,
            totalPages: 1,
          },
        };
      let employeeId = query.employeeId;
      let departmentId = query.departmentId;

      if (access.scope === 'own') {
        employeeId = access.employeeId ?? undefined;
      } else if (access.scope === 'department') {
        departmentId = access.departmentId ?? undefined;
      }

      const date = query.date ? startOfDate(query.date) : undefined;
      const startDate = query.startDate
        ? startOfDate(query.startDate)
        : undefined;
      const endDate = query.endDate ? startOfDate(query.endDate) : undefined;

      const { items, total } = await repo.list({
        date,
        startDate,
        endDate,
        departmentId,
        employeeId,
        status: query.status,
        skip,
        take,
      });

      return {
        data: items,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit) || 1,
        },
      };
    },

    async manualRecord(_access: Access, input: ManualRecordInput) {
      const date = startOfDate(input.date);
      const checkIn = input.checkIn ? new Date(input.checkIn) : undefined;
      const checkOut = input.checkOut ? new Date(input.checkOut) : undefined;

      return repo.recordPunch({
        employeeId: input.employeeId,
        date,
        checkIn,
        checkOut,
        status: input.status,
        source: 'MANUAL',
        notes: input.notes,
      });
    },

    async requestCorrection(access: Access, input: CorrectionRequestInput) {
      if (!access.employeeId) {
        throw new HttpError(
          400,
          'NO_EMPLOYEE',
          'Only staff linked to an employee record can request corrections.',
        );
      }

      const date = startOfDate(input.date);
      const existing = await repo.findByEmployeeAndDate(
        access.employeeId,
        date,
      );

      const correction = await repo.createCorrection({
        attendanceId: existing?.id ?? null,
        employeeId: access.employeeId,
        date,
        requestedCheckIn: input.requestedCheckIn
          ? new Date(input.requestedCheckIn)
          : null,
        requestedCheckOut: input.requestedCheckOut
          ? new Date(input.requestedCheckOut)
          : null,
        requestedStatus: input.requestedStatus,
        reason: input.reason,
      });

      if (notifier && access.departmentId) {
        await notifier.notifyRole(
          'HOD',
          access.departmentId,
          {
            kind: 'attendance.correction.requested',
            title: 'Attendance correction requested',
            body: `An attendance correction for ${input.date} was submitted for your department.`,
            link: '/attendance',
          },
          access.employeeId,
        );
      }

      return correction;
    },

    async listCorrections(access: Access, query) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 50;
      const skip = (page - 1) * limit;

      if (
        (access.scope === 'own' && !access.employeeId) ||
        (access.scope === 'department' && !access.departmentId)
      )
        return { data: [], meta: { total: 0, page, limit, totalPages: 1 } };
      let employeeId = query.employeeId;
      let departmentId: number | undefined;

      if (access.scope === 'own') {
        employeeId = access.employeeId ?? undefined;
      } else if (access.scope === 'department') {
        departmentId = access.departmentId ?? undefined;
      }

      const { items, total } = await repo.listCorrections({
        employeeId,
        departmentId,
        status: query.status,
        skip,
        take: limit,
      });

      return {
        data: items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    },

    async reviewCorrection(
      access: Access,
      id: string,
      input: ReviewCorrectionInput,
    ) {
      const correction = await repo.findCorrectionById(id);
      if (!correction) {
        throw new HttpError(404, 'NOT_FOUND', 'Correction request not found.');
      }

      if (correction.status !== 'PENDING') {
        throw new HttpError(
          400,
          'ALREADY_REVIEWED',
          'Correction request has already been reviewed.',
        );
      }

      if (access.scope === 'department') {
        if (correction.employee.departmentId !== access.departmentId) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'Cannot review corrections outside your department.',
          );
        }
      }

      const now = new Date();
      const updated = await repo.updateCorrection(id, {
        status: input.status,
        reviewedByUserId: access.userId,
        reviewedAt: now,
        reviewNote: input.reviewNote,
      });

      if (input.status === 'APPROVED') {
        await repo.applyCorrection({
          employeeId: correction.employeeId,
          date: correction.date,
          checkIn: correction.requestedCheckIn,
          checkOut: correction.requestedCheckOut,
          status: correction.requestedStatus,
        });
      }

      // Notify the applicant
      if (notifier) {
        await notifier.notifyEmployee(correction.employeeId, {
          kind: `attendance.correction.${input.status.toLowerCase()}`,
          title: `Attendance correction ${input.status.toLowerCase()}`,
          body: `Your attendance correction request for ${new Date(correction.date).toISOString().split('T')[0]} was ${input.status.toLowerCase()}.`,
          link: '/attendance',
        });
      }

      return updated;
    },

    async getSettings() {
      return repo.getSettings();
    },

    async updateSettings(_access: Access, input: AttendanceSettingsInput) {
      return repo.updateSettings(input);
    },
  };
}
