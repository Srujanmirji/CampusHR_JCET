import { randomUUID } from 'node:crypto';
import { HttpError } from '../src/common/http-error.js';
import type {
  AttendanceRecord,
  AttendanceRepository,
  CorrectionRecord,
} from '../src/modules/attendance/attendance.repository.js';

function mockEmployee() {
  return {
    id: 'emp-1',
    employeeCode: 'JCET-CSE-001',
    firstName: 'Faculty',
    lastName: 'User',
    departmentId: 1,
    department: { id: 1, code: 'CSE', name: 'Computer Science' },
  };
}

export function createMemoryAttendanceRepository(): AttendanceRepository {
  let settings = {
    workDayStart: '09:00',
    workDayEnd: '17:00',
    gracePeriodMinutes: 15,
    halfDayHours: 4.0,
    fullDayHours: 7.0,
  };
  const attendanceRecords: AttendanceRecord[] = [];
  const corrections: CorrectionRecord[] = [];

  return {
    async getSettings() {
      return { ...settings };
    },
    async updateSettings(data) {
      settings = { ...data };
      return { ...settings };
    },
    async findByEmployeeAndDate(employeeId: string, date: Date) {
      const dStr = date.toISOString().split('T')[0];
      return (
        attendanceRecords.find(
          (r) =>
            r.employeeId === employeeId &&
            new Date(r.date).toISOString().split('T')[0] === dStr,
        ) ?? null
      );
    },
    async findById(id: string) {
      return attendanceRecords.find((r) => r.id === id) ?? null;
    },
    async recordPunch(params) {
      const dStr = params.date.toISOString().split('T')[0];
      const idx = attendanceRecords.findIndex(
        (r) =>
          r.employeeId === params.employeeId &&
          new Date(r.date).toISOString().split('T')[0] === dStr,
      );
      const current = idx >= 0 ? attendanceRecords[idx] : null;
      if (
        (params.action === 'CHECK_IN' &&
          (current?.checkIn || current?.checkOut)) ||
        (params.action === 'CHECK_OUT' &&
          (!current?.checkIn || current.checkOut))
      )
        throw new HttpError(
          409,
          'PUNCH_CHANGED',
          'Attendance changed. Refresh.',
        );
      if (idx >= 0) {
        attendanceRecords[idx] = {
          ...attendanceRecords[idx],
          checkIn: params.checkIn ?? attendanceRecords[idx].checkIn,
          checkOut: params.checkOut ?? attendanceRecords[idx].checkOut,
          status: params.status,
          source: params.source,
          notes: params.notes ?? attendanceRecords[idx].notes,
          updatedAt: new Date(),
        };
        return attendanceRecords[idx];
      }
      const newRec: AttendanceRecord = {
        id: randomUUID(),
        employeeId: params.employeeId,
        date: params.date,
        checkIn: params.checkIn ?? null,
        checkOut: params.checkOut ?? null,
        status: params.status,
        source: params.source,
        notes: params.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: mockEmployee(),
      };
      attendanceRecords.push(newRec);
      return newRec;
    },
    async list(params) {
      let items = [...attendanceRecords];
      if (params.employeeId)
        items = items.filter((r) => r.employeeId === params.employeeId);
      if (params.startDate)
        items = items.filter((r) => r.date >= params.startDate!);
      if (params.endDate)
        items = items.filter((r) => r.date <= params.endDate!);
      if (params.date)
        items = items.filter(
          (r) => r.date.getTime() === params.date!.getTime(),
        );
      if (params.departmentId)
        items = items.filter(
          (r) => r.employee.departmentId === params.departmentId,
        );
      if (params.status)
        items = items.filter((r) => r.status === params.status);
      return {
        items: items.slice(params.skip, params.skip + params.take),
        total: items.length,
      };
    },
    async createCorrection(data) {
      const newCorr: CorrectionRecord = {
        id: randomUUID(),
        attendanceId: data.attendanceId ?? null,
        employeeId: data.employeeId,
        date: data.date,
        requestedCheckIn: data.requestedCheckIn ?? null,
        requestedCheckOut: data.requestedCheckOut ?? null,
        requestedStatus: data.requestedStatus,
        reason: data.reason,
        status: 'PENDING',
        reviewedByUserId: null,
        reviewedAt: null,
        reviewNote: null,
        reviewedByUser: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        employee: mockEmployee(),
      };
      corrections.push(newCorr);
      return newCorr;
    },
    async findCorrectionById(id: string) {
      return corrections.find((c) => c.id === id) ?? null;
    },
    async listCorrections(params) {
      let items = [...corrections];
      if (params.employeeId)
        items = items.filter((c) => c.employeeId === params.employeeId);
      if (params.status)
        items = items.filter((c) => c.status === params.status);
      return {
        items: items.slice(params.skip, params.skip + params.take),
        total: items.length,
      };
    },
    async updateCorrection(id, data) {
      const idx = corrections.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('Not found');
      corrections[idx] = {
        ...corrections[idx],
        status: data.status,
        reviewedByUserId: data.reviewedByUserId,
        reviewedAt: data.reviewedAt,
        reviewNote: data.reviewNote ?? null,
        updatedAt: new Date(),
      };
      return corrections[idx];
    },
    async applyCorrection(params) {
      return this.recordPunch({
        employeeId: params.employeeId,
        date: params.date,
        checkIn: params.checkIn ?? undefined,
        checkOut: params.checkOut ?? undefined,
        status: params.status,
        source: 'MANUAL',
      });
    },
  };
}
