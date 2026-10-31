import { randomUUID } from 'node:crypto';
import { homeUser } from './home-fixtures.mjs';
import { scheduleFixture, schedulePeriods } from './schedule-fixtures.mjs';
export const coveragePermissions = [
  'substitution.read.department',
  'substitution.assign.department',
];
export const recipientUser = {
  ...homeUser,
  id: '99999999-9999-4999-8999-999999999999',
  email: 'coverage-recipient@jcet.test',
  role: 'Faculty',
  employeeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  permissions: [
    'timetable.read.own',
    'substitution.read.own',
    'notification.read.own',
  ],
};
const workingDate = new Date();
// Keep coverage in the future across UTC/campus midnight and elapsed periods.
workingDate.setUTCDate(workingDate.getUTCDate() + 1);
if (workingDate.getUTCDay() === 0)
  workingDate.setUTCDate(workingDate.getUTCDate() + 1);
export const coverageDate = workingDate.toISOString().slice(0, 10);
const day = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][
  new Date(coverageDate).getUTCDay()
];
export const coverageFixture = scheduleFixture(coverageDate, day);
export function createCoveragePreviewRepository() {
  const dto = coverageFixture.entry;
  const faculty = {
    id: dto.faculty.id,
    employeeCode: dto.faculty.employeeCode,
    firstName: 'Absent',
    lastName: 'Faculty',
  };
  const entry = {
    ...dto,
    faculty,
    facultyId: faculty.id,
    departmentId: 1,
    subjectId: dto.subject.id,
  };
  const leave = {
    id: 'abababab-abab-4bab-8bab-abababababab',
    employeeId: faculty.id,
    employee: faculty,
    department: dto.department,
    leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
    startDate: new Date(`${coverageDate}T00:00:00Z`),
    endDate: new Date(`${coverageDate}T00:00:00Z`),
    halfDay: null,
    days: 1,
  };
  const recipient = {
    id: recipientUser.employeeId,
    employeeCode: 'COV001',
    firstName: 'Coverage',
    lastName: 'Recipient',
    department: { id: 1, code: 'CSE' },
    designation: {
      name: 'Assistant Professor',
      workload: { minHours: 0, maxHours: 24 },
    },
    experienceYears: 5,
    timetable: [],
  };
  const overloaded = {
    ...recipient,
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    employeeCode: 'COV002',
    firstName: 'Overloaded',
    lastName: 'Faculty',
    designation: {
      name: 'Assistant Professor',
      workload: { minHours: 0, maxHours: 1 },
    },
  };
  const foreign = {
    ...leave,
    id: 'acacacac-acac-4cac-8cac-acacacacacac',
    employeeId: 'adadadad-adad-4dad-8dad-adadadadadad',
    employee: { ...faculty, id: 'adadadad-adad-4dad-8dad-adadadadadad' },
    department: { id: 2, code: 'ECE', name: 'Electronics' },
  };
  const foreignEntry = {
    ...entry,
    id: 'aeaeaeae-aeae-4eae-8eae-aeaeaeaeaeae',
    faculty: foreign.employee,
    facultyId: foreign.employeeId,
    department: foreign.department,
    departmentId: 2,
  };
  let rows = [];
  return {
    approvedLeave: async (where) =>
      [leave, foreign].filter((row) => row.endDate >= where.endDate.gte),
    findApprovedLeave: async (id) =>
      [leave, foreign].find((row) => row.id === id) ?? null,
    classesOf: async (ids) =>
      [entry, foreignEntry].filter((row) => ids.includes(row.facultyId)),
    periodStarts: async () =>
      new Map(schedulePeriods.map((p) => [p.number, p.startTime])),
    coverage: async (ids) =>
      rows.filter((row) => ids.includes(row.leaveRequestId)),
    teachingStaff: async () => [recipient, overloaded],
    onLeave: async () => new Set([faculty.id]),
    assignmentsBetween: async (from, to) =>
      rows.filter(
        (row) =>
          row.kind === 'SUBSTITUTE' && row.date >= from && row.date <= to,
      ),
    find: async (id) => rows.find((row) => row.id === id) ?? null,
    mine: async (id, from) =>
      rows.filter((row) => row.substituteId === id && row.date >= from),
    create: async (data) => {
      if (
        rows.some(
          (row) =>
            row.timetableEntryId === data.timetableEntryId &&
            row.date.getTime() === data.date.getTime(),
        )
      ) {
        const error = new Error('Already covered');
        error.code = 'P2002';
        throw error;
      }
      const row = {
        ...data,
        id: randomUUID(),
        createdAt: new Date(),
        substitute:
          data.substituteId === recipient.id
            ? recipient
            : data.substituteId === overloaded.id
              ? overloaded
              : null,
        timetableEntry: entry,
        leaveRequest: leave,
      };
      rows.push(row);
      return row;
    },
    remove: async (before) => {
      rows = rows.filter((row) => row.id !== before.id);
    },
  };
}
