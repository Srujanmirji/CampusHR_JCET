import { homeFixtures, homeUser, employeeId } from './home-fixtures.mjs';
export function scheduleFixture(date = '2026-10-21', day = 'WED') {
  const entry = globalThis.structuredClone(
    homeFixtures(date, day)['/timetable/entries'].data[0],
  );
  entry.id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  entry.faculty = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    employeeCode: 'ABSENT001',
    name: 'Absent Faculty',
  };
  entry.subject.name =
    'Advanced Distributed Database Management Systems and Applications Laboratory';
  entry.subject.kind = 'LAB';
  entry.startPeriod = 2;
  entry.endPeriod = 3;
  entry.batch = 'A2';
  entry.room.name = 'Computer Laboratory 3';
  return {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    kind: 'SUBSTITUTE',
    date,
    substitute: { id: employeeId, employeeCode: 'IOS004', name: 'Home Test' },
    coveringFor: entry.faculty,
    note: 'Supervise the scheduled lab batch.',
    assignedAt: `${date}T02:00:00.000Z`,
    entry,
  };
}
export const scheduleUser = {
  ...homeUser,
  permissions: [...homeUser.permissions, 'substitution.read.own'],
};
export const schedulePeriods = [
  { number: 1, startTime: '09:00', endTime: '10:00' },
  { number: 2, startTime: '10:00', endTime: '11:00' },
  { number: 3, startTime: '11:15', endTime: '12:15' },
];
