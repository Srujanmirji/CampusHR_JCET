// Fake API for the browser checks, so they run without the backend.
// Mirrors backend/API_ENDPOINTS.md; the "signed in" user stands in for the cookie.
export const apiUrl = process.env.API_URL || 'http://localhost:4000/api/v1';

// Grants follow product/USER_ROLES.md (only what the web app checks).
const scoped = (scope, keys) => keys.map((key) => `${key}.${scope}`);
export const checkUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@jcethbl.edu.in',
  role: 'Super Admin',
  employeeId: null,
  departmentId: null,
  permissions: [
    ...scoped('all', [
      'employee.read',
      'employee.create',
      'employee.update',
      'employee.archive',
      'department.read',
      'department.manage',
      'attendance.read',
      'leave.read',
      'leave.approve',
      'timetable.read',
      'workload.read',
      'substitution.read',
      'substitution.assign',
      'report.read',
      'settings.manage',
    ]),
    'notification.read.own',
  ],
};
export const facultyUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'faculty.cse@jcethbl.edu.in',
  role: 'Faculty',
  employeeId: 'e0000000-0000-4000-8000-000000000002',
  departmentId: 1,
  permissions: [
    'department.read.all',
    ...scoped('own', [
      'employee.read',
      'employee.update',
      'attendance.read',
      'leave.read',
      'leave.apply',
      'timetable.read',
      'workload.read',
      'substitution.read',
      'notification.read',
    ]),
  ],
};
export const checkPassword = 'check-password-123';

const cse = { id: 1, code: 'CSE', name: 'Computer Science & Engineering' };
const admin = { id: 7, code: 'ADMIN', name: 'Administration' };
const employees = [
  {
    id: 'e0000000-0000-4000-8000-000000000001',
    employeeCode: 'JCET-CSE-001',
    firstName: 'Ramesh',
    lastName: 'Kulkarni',
    email: 'hod.cse@jcethbl.edu.in',
    phone: null,
    employmentType: 'PERMANENT',
    joiningDate: '2014-06-15',
    status: 'ACTIVE',
    qualification: 'Ph.D in Computer Science & Engineering',
    specialization: null,
    experienceYears: 18,
    department: cse,
    designation: { id: 1, name: 'Professor', category: 'TEACHING' },
    isHod: true,
  },
  {
    id: facultyUser.employeeId,
    employeeCode: 'JCET-CSE-021',
    firstName: 'Asha',
    lastName: 'Patil',
    email: facultyUser.email,
    phone: '+91 98450 11221',
    employmentType: 'PERMANENT',
    joiningDate: '2019-08-01',
    status: 'ACTIVE',
    qualification: null,
    specialization: null,
    experienceYears: 7,
    department: cse,
    designation: { id: 3, name: 'Assistant Professor', category: 'TEACHING' },
    isHod: false,
  },
];
const departments = [
  {
    ...cse,
    hod: {
      id: employees[0].id,
      employeeCode: 'JCET-CSE-001',
      name: 'Ramesh Kulkarni',
    },
    staff: { total: 2, teaching: 2, nonTeaching: 0 },
  },
  { ...admin, hod: null, staff: { total: 0, teaching: 0, nonTeaching: 0 } },
];
const designations = [
  { id: 1, name: 'Professor', category: 'TEACHING', level: 1 },
  { id: 3, name: 'Assistant Professor', category: 'TEACHING', level: 3 },
  { id: 9, name: 'Lab Instructor', category: 'NON_TEACHING', level: 5 },
];

// Leave: Super Admin decides the Principal's leave; Asha's waits for her HOD.
const casualLeave = { id: 1, code: 'CL', name: 'Casual Leave' };
const leaveTypes = [
  {
    ...casualLeave,
    yearlyQuota: 12,
    allowHalfDay: true,
    carryForwardMax: 0,
    active: true,
  },
];
const principal = {
  id: 'e0000000-0000-4000-8000-000000000009',
  employeeCode: 'JCET-ADM-001',
  name: 'Dr. Suresh Patil',
};
const leaveRequest = (id, employee, department, dates, roles, reason) => ({
  id,
  employee,
  department,
  leaveType: casualLeave,
  startDate: dates[0],
  endDate: dates[1],
  halfDay: null,
  days: dates[2],
  reason,
  status: 'PENDING',
  approverRoles: roles,
  pendingRole: roles[0],
  decisions: [],
  createdAt: '2026-10-14T09:00:00.000Z',
});
const initialLeave = () => [
  leaveRequest(
    'a0000000-0000-4000-8000-000000000001',
    principal,
    admin,
    ['2026-11-05', '2026-11-05', 1],
    ['Super Admin'],
    'AICTE regional meeting in Bengaluru.',
  ),
  leaveRequest(
    'a0000000-0000-4000-8000-000000000002',
    {
      id: facultyUser.employeeId,
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    cse,
    ['2026-11-02', '2026-11-03', 2],
    ['HOD', 'HR Admin'],
    'A family commitment in Dharwad.',
  ),
  leaveRequest(
    'a0000000-0000-4000-8000-000000000003',
    principal,
    admin,
    ['2026-11-20', '2026-11-20', 1],
    ['Super Admin'],
    'Personal work.',
  ),
];
// Asha teaches on the Monday and Tuesday of her leave.
const ashaClasses = [
  [
    'MON',
    2,
    2,
    {
      id: 11,
      code: 'BCS501',
      name: 'Database Management Systems',
      kind: 'THEORY',
    },
    { id: 1, name: 'LH-203', kind: 'CLASSROOM' },
    null,
  ],
  [
    'TUE',
    5,
    7,
    { id: 12, code: 'BCSL504', name: 'DBMS Lab', kind: 'LAB' },
    { id: 2, name: 'CS Lab 1', kind: 'LAB' },
    'A1',
  ],
].map(([day, startPeriod, endPeriod, subject, room, batch], index) => ({
  id: `c0000000-0000-4000-8000-00000000000${index + 1}`,
  department: cse,
  semester: 5,
  section: 'A',
  batch,
  subject,
  faculty: {
    id: facultyUser.employeeId,
    employeeCode: 'JCET-CSE-021',
    name: 'Prof. Asha Patil',
  },
  room,
  day,
  startPeriod,
  endPeriod,
}));

// Substitution: two approved leaves with two classes each on 12 Oct 2026.
const me = { id: 3, code: 'ME', name: 'Mechanical Engineering' };
const cover = (
  id,
  department,
  subject,
  kind,
  room,
  startPeriod,
  endPeriod,
) => ({
  id,
  department,
  semester: 5,
  section: 'A',
  batch: kind === 'LAB' ? 'A1' : null,
  subject: {
    id: Number(id.at(-1)),
    code: subject.slice(0, 6),
    name: subject,
    kind,
  },
  faculty: { id: 'x', employeeCode: 'x', name: 'x' },
  room: { id: 1, name: room, kind: kind === 'LAB' ? 'LAB' : 'CLASSROOM' },
  day: 'MON',
  startPeriod,
  endPeriod,
});
const approvedLeave = (id, employee, department) => ({
  id,
  employee,
  department,
  leaveType: casualLeave,
  startDate: '2026-10-12',
  endDate: '2026-10-12',
  halfDay: null,
  days: 1,
});
const substitutionLeave = [
  {
    leave: approvedLeave(
      'b0000000-0000-4000-8000-000000000001',
      {
        id: facultyUser.employeeId,
        employeeCode: 'JCET-CSE-021',
        name: 'Prof. Asha Patil',
      },
      cse,
    ),
    classes: [
      cover(
        'd0000000-0000-4000-8000-000000000001',
        cse,
        'Database Management Systems',
        'THEORY',
        'LH-203',
        1,
        1,
      ),
      cover(
        'd0000000-0000-4000-8000-000000000002',
        cse,
        'DBMS Lab',
        'LAB',
        'CS Lab 1',
        2,
        2,
      ),
    ],
  },
  {
    leave: approvedLeave(
      'b0000000-0000-4000-8000-000000000002',
      {
        id: 'e0000000-0000-4000-8000-000000000008',
        employeeCode: 'JCET-ME-008',
        name: 'Dr. Mahesh B',
      },
      me,
    ),
    classes: [
      cover(
        'd0000000-0000-4000-8000-000000000003',
        me,
        'Heat Transfer',
        'THEORY',
        'ME-101',
        1,
        1,
      ),
      cover(
        'd0000000-0000-4000-8000-000000000004',
        me,
        'Applied Thermodynamics',
        'THEORY',
        'ME-102',
        2,
        2,
      ),
    ],
  },
];
const candidate = (id, name, score, eligible) => ({
  faculty: {
    id,
    employeeCode: `JCET-CSE-0${id.at(-1)}`,
    name,
    department: { id: 1, code: 'CSE' },
    designation: 'Assistant Professor',
  },
  score,
  points: {
    subject: 35,
    availability: 25,
    department: 15,
    workload: score - 85,
    experience: 10,
  },
  hoursAfter: eligible ? 15 : 19,
  maxHours: 18,
  eligible,
  reason: eligible
    ? null
    : 'Would teach 19 hours that week, over the 18-hour maximum.',
});
const candidatesFor = (entryId) => [
  candidate(
    'f0000000-0000-4000-8000-000000000001',
    'Prof. Priya Kulkarni',
    94,
    true,
  ),
  candidate(
    'f0000000-0000-4000-8000-000000000002',
    'Prof. Ravi Hegde',
    86,
    true,
  ),
  candidate(
    'f0000000-0000-4000-8000-000000000003',
    'Dr. Rahul Deshpande',
    74,
    !entryId.endsWith('2'),
  ),
];

export async function mockAuthApi(page, webOrigin) {
  const state = {
    user: undefined,
    lastLogin: undefined,
    leave: initialLeave(),
    // Substitution coverage by timetable entry id.
    coverage: {},
  };
  const cors = {
    'Access-Control-Allow-Origin': webOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };
  const json = (route, status, body) =>
    route.fulfill({
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const session = (user) => ({
    accessToken: 'check-token',
    expiresIn: 900,
    user,
  });
  const visible = () =>
    state.user?.employeeId
      ? employees.filter((employee) => employee.id === state.user.employeeId)
      : employees;

  await page.route(`${apiUrl}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: cors });
    }
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1\//, '');

    if (path === 'auth/login') {
      const body = request.postDataJSON();
      state.lastLogin = body;
      const id = String(body.identifier).toLowerCase();
      const user = [checkUser, facultyUser].find(
        (candidate) => candidate.email === id,
      );
      if (user && body.password === checkPassword) {
        state.user = user;
        return json(route, 200, session(user));
      }
      return json(route, 401, {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect employee ID, email or password.',
        },
      });
    }
    if (path === 'auth/refresh') {
      return state.user
        ? json(route, 200, session(state.user))
        : json(route, 401, {
            error: {
              code: 'SESSION_EXPIRED',
              message: 'Your session has ended. Sign in again.',
            },
          });
    }
    if (path === 'auth/logout') {
      state.user = undefined;
      return route.fulfill({ status: 204, headers: cors });
    }
    if (!state.user) {
      return json(route, 401, {
        error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' },
      });
    }
    if (path === 'employees/next-code') {
      return json(route, 200, { data: { employeeCode: 'JCET-CSE-022' } });
    }
    if (path === 'employees') {
      const data = visible();
      const teaching = data.filter(
        (employee) => employee.designation.category === 'TEACHING',
      ).length;
      return json(route, 200, {
        data,
        meta: {
          page: 1,
          pageSize: 25,
          total: data.length,
          teaching,
          nonTeaching: data.length - teaching,
        },
      });
    }
    if (path === 'departments') return json(route, 200, { data: departments });
    if (path === 'timetable/periods') {
      return json(route, 200, {
        data: [
          { number: 1, startTime: '09:00', endTime: '10:00' },
          { number: 2, startTime: '10:00', endTime: '10:50' },
        ],
      });
    }
    if (path === 'timetable/entries') {
      const facultyId = new URL(request.url()).searchParams.get('facultyId');
      return json(route, 200, {
        data: facultyId === facultyUser.employeeId ? ashaClasses : [],
      });
    }
    if (path === 'substitution/leave') {
      return json(route, 200, {
        data: substitutionLeave.map(({ leave, classes }) => ({
          leave,
          classes: classes.length,
          covered: classes.filter((entry) => state.coverage[entry.id]).length,
        })),
      });
    }
    const subMatch = path.match(
      /^substitution\/leave\/([^/]+)(\/candidates)?$/,
    );
    if (subMatch) {
      const found = substitutionLeave.find(
        (item) => item.leave.id === subMatch[1],
      );
      if (!found) {
        return json(route, 404, {
          error: { code: 'NOT_FOUND', message: 'Approved leave not found.' },
        });
      }
      if (subMatch[2]) {
        const entryId = new URL(request.url()).searchParams.get('entryId');
        return json(route, 200, { data: candidatesFor(entryId) });
      }
      return json(route, 200, {
        data: {
          leave: found.leave,
          classes: found.classes.map((entry) => ({
            date: '2026-10-12',
            hours: 1,
            entry,
            coverage: state.coverage[entry.id] ?? null,
          })),
        },
      });
    }
    if (path === 'substitution/assignments') {
      const body = request.postDataJSON();
      if (state.coverage[body.timetableEntryId]) {
        return json(route, 409, {
          error: {
            code: 'ALREADY_COVERED',
            message: 'This class is already covered.',
          },
        });
      }
      const pick = candidatesFor(body.timetableEntryId).find(
        (item) => item.faculty.id === body.substituteId,
      );
      state.coverage[body.timetableEntryId] = {
        id: `cov-${body.timetableEntryId}`,
        kind: pick ? 'SUBSTITUTE' : 'NOT_NEEDED',
        substitute: pick
          ? {
              id: pick.faculty.id,
              employeeCode: pick.faculty.employeeCode,
              name: pick.faculty.name,
            }
          : null,
        note: body.note ?? null,
        assignedAt: '2026-10-15T10:00:00.000Z',
      };
      return json(route, 201, { data: state.coverage[body.timetableEntryId] });
    }
    if (path.startsWith('substitution/assignments/')) {
      const entryId = path.replace('substitution/assignments/cov-', '');
      delete state.coverage[entryId];
      return route.fulfill({ status: 204, headers: cors });
    }
    if (path === 'substitution/mine') return json(route, 200, { data: [] });
    if (path === 'leave/types') return json(route, 200, { data: leaveTypes });
    if (path === 'leave/balances') {
      const pending = state.leave
        .filter(
          (leave) =>
            leave.employee.id === state.user.employeeId &&
            leave.status === 'PENDING',
        )
        .reduce((sum, leave) => sum + leave.days, 0);
      return json(route, 200, {
        data: [
          {
            leaveType: casualLeave,
            active: true,
            year: 2026,
            entitled: 12,
            carriedIn: 0,
            used: 0,
            pending,
            remaining: 12 - pending,
          },
        ],
      });
    }
    if (path === 'leave/requests' && request.method() === 'GET') {
      const query = new URL(request.url()).searchParams;
      const user = state.user;
      const data = state.leave.filter(
        (leave) =>
          (!user.employeeId || leave.employee.id === user.employeeId) &&
          (query.get('awaitingMe') !== 'true' ||
            (leave.status === 'PENDING' &&
              leave.pendingRole === user.role &&
              leave.employee.id !== user.employeeId)) &&
          (!query.get('status') || leave.status === query.get('status')) &&
          (!query.get('employeeId') ||
            leave.employee.id === query.get('employeeId')),
      );
      return json(route, 200, { data });
    }
    const leaveMatch = path.match(
      /^leave\/requests\/([^/]+)(?:\/(approve|reject|cancel))?$/,
    );
    if (leaveMatch) {
      const leave = state.leave.find((item) => item.id === leaveMatch[1]);
      if (!leave) {
        return json(route, 404, {
          error: { code: 'NOT_FOUND', message: 'Leave request not found.' },
        });
      }
      const action = leaveMatch[2];
      if (action) {
        const note = request.postDataJSON()?.note ?? null;
        if (action === 'cancel') {
          Object.assign(leave, { status: 'CANCELLED', pendingRole: null });
        } else {
          leave.decisions.push({
            step: leave.decisions.length,
            role: leave.pendingRole,
            approved: action === 'approve',
            note,
            decidedAt: '2026-10-15T10:00:00.000Z',
            decidedBy: state.user.email,
          });
          const next =
            action === 'approve'
              ? (leave.approverRoles[leave.decisions.length] ?? null)
              : null;
          Object.assign(leave, {
            pendingRole: next,
            status:
              action === 'reject' ? 'REJECTED' : next ? 'PENDING' : 'APPROVED',
          });
        }
      }
      return json(route, 200, { data: leave });
    }
    if (path === 'timetable/subjects' || path === 'timetable/rooms') {
      return json(route, 200, { data: [] });
    }
    if (path === 'workload') {
      return json(route, 200, {
        data: [
          {
            faculty: {
              id: employees[1].id,
              employeeCode: employees[1].employeeCode,
              name: `${employees[1].firstName} ${employees[1].lastName}`,
              department: cse,
              designation: { id: 3, name: 'Assistant Professor' },
            },
            theoryHours: 12,
            labHours: 6,
            totalHours: 18,
            minHours: 14,
            maxHours: 18,
            status: 'NORMAL',
          },
        ],
      });
    }
    if (path === 'designations') {
      return json(route, 200, { data: designations });
    }
    return route.abort();
  });
  return state;
}
