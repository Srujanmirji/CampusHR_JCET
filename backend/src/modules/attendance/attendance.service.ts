import { HttpError } from '../../common/http-error.js';
import type {
  AttendanceStatus,
  CorrectionStatus,
} from '../../generated/prisma/enums.js';
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
  BiometricImportPayload,
  BiometricSyncPayload,
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

export interface BiometricSyncResult {
  syncedCount: number;
  unmatchedCount: number;
  unmatchedCodes: string[];
  recordsCreatedOrUpdated: number;
  datesAffected: string[];
  deviceId: string;
}

export interface BiometricImportResult {
  importedCount: number;
  unmatchedCount: number;
  unmatchedCodes: string[];
  recordsCreatedOrUpdated: number;
}

export interface BiometricDevice {
  id: string;
  name: string;
  location: string;
  ipAddress?: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSyncAt: string | null;
  model: string;
}

export interface BiometricStatsResult {
  todayBiometricCount: number;
  totalAttendanceToday: number;
  recentPunches: AttendanceRecord[];
  activeDevicesCount: number;
  lastSyncTime: string | null;
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
  syncBiometricPunches(
    payload: BiometricSyncPayload,
    machineDeviceId?: string,
  ): Promise<BiometricSyncResult>;
  importBiometricRows(
    payload: BiometricImportPayload,
  ): Promise<BiometricImportResult>;
  getBiometricStats(): Promise<BiometricStatsResult>;
  getBiometricDevices(): Promise<BiometricDevice[]>;
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

    async syncBiometricPunches(
      payload: BiometricSyncPayload,
      machineDeviceId?: string,
    ): Promise<BiometricSyncResult> {
      const deviceId =
        machineDeviceId || payload.deviceId || 'TERMINAL_MAIN_GATE';
      const punches = payload.punches;
      if (!punches.length) {
        return {
          syncedCount: 0,
          unmatchedCount: 0,
          unmatchedCodes: [],
          recordsCreatedOrUpdated: 0,
          datesAffected: [],
          deviceId,
        };
      }

      // 1. Gather all unique employee codes
      const rawCodes = [...new Set(punches.map((p) => p.employeeCode.trim()))];
      const employees = await repo.findEmployeesByCodes(rawCodes);
      const employeeMap = new Map<
        string,
        { id: string; employeeCode: string }
      >();
      for (const emp of employees) {
        employeeMap.set(emp.employeeCode.toUpperCase(), emp);
      }

      const settings = await repo.getSettings();
      const [startHour, startMinute] = settings.workDayStart
        .split(':')
        .map(Number);

      const unmatchedCodesSet = new Set<string>();
      const groups = new Map<
        string,
        {
          employeeId: string;
          dateObj: Date;
          punches: Array<{ time: Date; type: string }>;
        }
      >();

      let matchedPunchesCount = 0;

      for (const p of punches) {
        const code = p.employeeCode.trim().toUpperCase();
        const emp = employeeMap.get(code);
        if (!emp) {
          unmatchedCodesSet.add(p.employeeCode);
          continue;
        }

        matchedPunchesCount++;
        const punchTime = new Date(p.timestamp);
        if (isNaN(punchTime.getTime())) continue;

        const dateObj = startOfDate(punchTime);
        const dateKey = `${emp.id}___${dateObj.toISOString().slice(0, 10)}`;

        let group = groups.get(dateKey);
        if (!group) {
          group = { employeeId: emp.id, dateObj, punches: [] };
          groups.set(dateKey, group);
        }
        group.punches.push({ time: punchTime, type: p.punchType });
      }

      const datesAffectedSet = new Set<string>();
      let recordsCreatedOrUpdated = 0;

      for (const group of groups.values()) {
        const { employeeId, dateObj, punches: punchList } = group;
        punchList.sort((a, b) => a.time.getTime() - b.time.getTime());

        const candidateFirst = punchList[0];
        const candidateLast =
          punchList.length > 1 ? punchList[punchList.length - 1] : null;

        const existing = await repo.findByEmployeeAndDate(employeeId, dateObj);

        // Check-In calculation
        let checkIn = candidateFirst.time;
        if (existing?.checkIn) {
          const existingIn = new Date(existing.checkIn);
          checkIn =
            existingIn < candidateFirst.time ? existingIn : candidateFirst.time;
        }

        // Check-Out calculation
        let checkOut: Date | null = null;
        if (candidateLast) {
          checkOut = candidateLast.time;
          if (existing?.checkOut) {
            const existingOut = new Date(existing.checkOut);
            checkOut =
              existingOut > candidateLast.time
                ? existingOut
                : candidateLast.time;
          }
        } else if (candidateFirst.type === 'OUT') {
          checkOut = candidateFirst.time;
          if (existing?.checkIn) {
            checkIn = new Date(existing.checkIn);
          }
        } else if (existing?.checkOut) {
          checkOut = new Date(existing.checkOut);
        }

        // Status calculation
        let status: AttendanceStatus;
        if (existing?.status === 'ON_LEAVE') {
          status = 'ON_LEAVE';
        } else {
          const expectedStart = new Date(dateObj);
          expectedStart.setUTCHours(
            startHour,
            startMinute + settings.gracePeriodMinutes,
            0,
            0,
          );

          status = checkIn > expectedStart ? 'LATE' : 'PRESENT';

          if (checkOut) {
            const diffHours =
              (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            if (diffHours < settings.halfDayHours) {
              status = 'HALF_DAY';
            }
          }
        }

        const notes = payload.location
          ? `Biometric terminal ${deviceId} (${payload.location})`
          : `Biometric terminal ${deviceId}`;

        await repo.upsertBiometricAttendance({
          employeeId,
          date: dateObj,
          checkIn,
          checkOut,
          status,
          source: 'BIOMETRIC',
          notes,
        });

        recordsCreatedOrUpdated++;
        datesAffectedSet.add(dateObj.toISOString().slice(0, 10));
      }

      return {
        syncedCount: matchedPunchesCount,
        unmatchedCount: unmatchedCodesSet.size,
        unmatchedCodes: Array.from(unmatchedCodesSet),
        recordsCreatedOrUpdated,
        datesAffected: Array.from(datesAffectedSet),
        deviceId,
      };
    },

    async importBiometricRows(
      payload: BiometricImportPayload,
    ): Promise<BiometricImportResult> {
      const rows = payload.rows;
      if (!rows.length) {
        return {
          importedCount: 0,
          unmatchedCount: 0,
          unmatchedCodes: [],
          recordsCreatedOrUpdated: 0,
        };
      }

      const rawCodes = [...new Set(rows.map((r) => r.employeeCode.trim()))];
      const employees = await repo.findEmployeesByCodes(rawCodes);
      const employeeMap = new Map<
        string,
        { id: string; employeeCode: string }
      >();
      for (const emp of employees) {
        employeeMap.set(emp.employeeCode.toUpperCase(), emp);
      }

      const settings = await repo.getSettings();
      const [startHour, startMinute] = settings.workDayStart
        .split(':')
        .map(Number);

      const unmatchedCodesSet = new Set<string>();
      let recordsCreatedOrUpdated = 0;
      let importedCount = 0;

      for (const row of rows) {
        const emp = employeeMap.get(row.employeeCode.trim().toUpperCase());
        if (!emp) {
          unmatchedCodesSet.add(row.employeeCode);
          continue;
        }

        importedCount++;
        const dateObj = startOfDate(row.date);
        const checkIn = row.checkIn
          ? new Date(row.checkIn)
          : new Date(
              Date.UTC(
                dateObj.getUTCFullYear(),
                dateObj.getUTCMonth(),
                dateObj.getUTCDate(),
                9,
                0,
                0,
              ),
            );
        const checkOut = row.checkOut ? new Date(row.checkOut) : null;

        let status: AttendanceStatus =
          (row.status as AttendanceStatus) || 'PRESENT';
        if (!row.status) {
          const expectedStart = new Date(dateObj);
          expectedStart.setUTCHours(
            startHour,
            startMinute + settings.gracePeriodMinutes,
            0,
            0,
          );
          if (checkIn > expectedStart) {
            status = 'LATE';
          } else {
            status = 'PRESENT';
          }

          if (checkOut) {
            const diffHours =
              (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            if (diffHours < settings.halfDayHours) {
              status = 'HALF_DAY';
            }
          }
        }

        await repo.upsertBiometricAttendance({
          employeeId: emp.id,
          date: dateObj,
          checkIn,
          checkOut,
          status,
          source: 'BIOMETRIC',
          notes:
            row.notes ||
            `Log file import (${payload.deviceId || 'eTimeTrackLite'})`,
        });

        recordsCreatedOrUpdated++;
      }

      return {
        importedCount,
        unmatchedCount: unmatchedCodesSet.size,
        unmatchedCodes: Array.from(unmatchedCodesSet),
        recordsCreatedOrUpdated,
      };
    },

    async getBiometricStats(): Promise<BiometricStatsResult> {
      const today = startOfDate();
      const stats = await repo.getBiometricStats(today);
      const devices = await this.getBiometricDevices();
      const activeDevicesCount = devices.filter(
        (d) => d.status === 'ONLINE',
      ).length;
      const lastSyncTime = stats.recentPunches[0]?.updatedAt
        ? new Date(stats.recentPunches[0].updatedAt).toISOString()
        : null;

      return {
        todayBiometricCount: stats.todayCount,
        totalAttendanceToday: stats.totalSyncedToday,
        recentPunches: stats.recentPunches,
        activeDevicesCount,
        lastSyncTime,
      };
    },

    async getBiometricDevices(): Promise<BiometricDevice[]> {
      return [
        {
          id: 'JCET-BIO-01',
          name: 'Main Gate Terminal 01',
          location: 'Campus Main Entrance - Ground Floor',
          ipAddress: '192.168.1.101',
          status: 'ONLINE',
          lastSyncAt: new Date().toISOString(),
          model: 'eSSL SilkBio-101TC',
        },
        {
          id: 'JCET-BIO-02',
          name: 'Academic Block A Terminal 02',
          location: 'Academic Block A - 1st Floor Foyer',
          ipAddress: '192.168.1.102',
          status: 'ONLINE',
          lastSyncAt: new Date().toISOString(),
          model: 'ZKTeco uFace800 Plus',
        },
        {
          id: 'JCET-BIO-03',
          name: 'Academic Block B Terminal 03',
          location: 'Academic Block B - 1st Floor Foyer',
          ipAddress: '192.168.1.103',
          status: 'ONLINE',
          lastSyncAt: new Date().toISOString(),
          model: 'ZKTeco uFace800 Plus',
        },
        {
          id: 'JCET-BIO-04',
          name: 'Admin Block Terminal 04',
          location: 'Administrative Block - Reception',
          ipAddress: '192.168.1.104',
          status: 'ONLINE',
          lastSyncAt: new Date().toISOString(),
          model: 'eSSL IN01-A',
        },
        {
          id: 'JCET-BIO-05',
          name: 'Library & Lab Terminal 05',
          location: 'Central Library & CSE Labs - 2nd Floor',
          ipAddress: '192.168.1.105',
          status: 'ONLINE',
          lastSyncAt: new Date().toISOString(),
          model: 'eSSL SilkBio-101TC',
        },
      ];
    },
  };
}
