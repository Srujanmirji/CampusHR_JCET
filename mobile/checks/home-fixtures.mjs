export const employeeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const homeUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'home-check@jcet.test',
  name: 'Home Test',
  role: 'HOD',
  employeeId,
  departmentId: 1,
  permissions: [
    'timetable.read.department',
    'attendance.read.department',
    'leave.read.department',
    'workload.read.department',
    'notification.read.own',
  ],
};
export function homeFixtures(date = '2026-10-21', day = 'WED') {
  return {
    '/attendance/today': {
      data: {
        employeeId,
        date: `${date}T00:00:00.000Z`,
        checkIn: `${date}T03:32:00.000Z`,
        checkOut: null,
        status: 'PRESENT',
      },
    },
    '/leave/balances': {
      data: [
        {
          leaveType: { id: 1, code: 'CL', name: 'Casual Leave' },
          active: true,
          year: Number(date.slice(0, 4)),
          remaining: 6.5,
          pending: 1,
        },
        {
          leaveType: { id: 2, code: 'DL', name: 'Duty Leave' },
          active: true,
          year: Number(date.slice(0, 4)),
          remaining: null,
          pending: 0,
        },
      ],
    },
    [`/workload/faculty/${employeeId}`]: {
      data: {
        faculty: { id: employeeId },
        totalHours: 12,
        minHours: 14,
        maxHours: 18,
        status: 'UNDERLOADED',
      },
    },
    '/notifications/unread-count': { data: { count: 2 } },
    '/notifications': {
      data: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          kind: 'leave.approved',
          title: 'Leave request updated',
          body: 'Your leave request has been approved.',
          link: '/leave?tab=mine&request=test',
          readAt: null,
          createdAt: `${date}T04:00:00.000Z`,
        },
      ],
      hasMore: false,
    },
    '/timetable/periods': {
      data: [{ number: 1, startTime: '09:00', endTime: '10:00' }],
    },
    '/timetable/entries': {
      data: [
        {
          id: 'home-class',
          department: { id: 1, code: 'CSE', name: 'Computer Science' },
          semester: 5,
          section: 'A',
          batch: null,
          subject: {
            id: 1,
            code: 'BCS501',
            name: 'Database Management Systems',
            kind: 'THEORY',
          },
          faculty: {
            id: employeeId,
            employeeCode: 'IOS004',
            name: 'Home Test',
          },
          room: { id: 1, name: 'Room 302', kind: 'CLASSROOM' },
          day,
          startPeriod: 1,
          endPeriod: 1,
        },
      ],
    },
  };
}
