import { homeUser, employeeId } from './home-fixtures.mjs';
export const attendanceUser = {
  ...homeUser,
  permissions: [
    ...homeUser.permissions,
    'attendance.check_in.own',
    'attendance_correction.request.own',
  ],
};
export function attendanceFixtures(date = '2026-10-21') {
  const record = {
    id: '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    employeeId,
    date: `${date}T00:00:00.000Z`,
    checkIn: `${date}T09:00:00.000Z`,
    checkOut: `${date}T17:00:00.000Z`,
    status: 'PRESENT',
    source: 'MOBILE',
    notes: null,
  };
  const correction = {
    id: '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    employeeId,
    date: record.date,
    requestedCheckIn: record.checkIn,
    requestedCheckOut: record.checkOut,
    requestedStatus: 'PRESENT',
    reason: 'Device missed my attendance.',
    status: 'PENDING',
    reviewNote: null,
    createdAt: `${date}T17:10:00.000Z`,
  };
  return {
    record,
    correction,
    meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    policy: {
      workDayStart: '09:00',
      workDayEnd: '17:00',
      gracePeriodMinutes: 15,
      halfDayHours: 4,
      fullDayHours: 7,
    },
  };
}
