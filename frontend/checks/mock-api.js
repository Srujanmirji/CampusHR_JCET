// Fake API for the browser checks, so they run without the backend.
// Mirrors backend/API_ENDPOINTS.md; the "signed in" user stands in for the cookie.
export const apiUrl = process.env.API_URL || 'http://localhost:4000/api/v1';

// Grants follow product/USER_ROLES.md (only what the web app checks).
const scoped = (scope, keys) => keys.map((key) => `${key}.${scope}`);
export const checkUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@jcethbl.edu.in',
  role: 'Super Admin',
  employeeId: 'e0000000-0000-4000-8000-000000000001',
  departmentId: 1,
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
      'leave.apply',
      'leave.approve',
      'leave_type.manage',
      'timetable.read',
      'workload.read',
      'substitution.read',
      'substitution.assign',
      'report.read',
      'settings.manage',
      'announcement.send',
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

// Leave: 7 JCET categories with configurable policies
const casualLeave = { id: 1, code: 'CL', name: 'Casual Leave' };
const earnedLeave = { id: 2, code: 'EL', name: 'Earned Leave' };
const specialMedicalLeave = { id: 3, code: 'SPL_ML', name: 'Special Leave / Medical Leave' };
const officialDuty = { id: 4, code: 'OOD', name: 'On Official Duty' };
const examDuty = { id: 5, code: 'ODE', name: 'Official Duty / Examination Duty' };
const restrictedHoliday = { id: 6, code: 'RH', name: 'Restricted Holiday' };
const vacationLeave = { id: 7, code: 'VL', name: 'Vacation Leave' };

const leaveTypes = [
  {
    ...casualLeave,
    yearlyQuota: 12,
    allowHalfDay: true,
    carryForwardMax: 0,
    active: true,
    colorToken: 'blue',
    attendanceStatus: 'Leave',
    affectsTimetable: true,
    requiresCoverage: true,
    description: 'Personal casual leave entitlement (12 days/year)',
  },
  {
    ...earnedLeave,
    yearlyQuota: 10,
    allowHalfDay: true,
    carryForwardMax: 30,
    active: true,
    colorToken: 'violet',
    attendanceStatus: 'Leave',
    affectsTimetable: true,
    requiresCoverage: true,
    description: 'Earned leave entitlement (10 days/year)',
  },
  {
    ...specialMedicalLeave,
    yearlyQuota: null,
    allowHalfDay: false,
    carryForwardMax: 0,
    active: true,
    colorToken: 'rose',
    attendanceStatus: 'Medical / Special Leave',
    attachmentRequired: true,
    affectsTimetable: true,
    requiresCoverage: true,
    description: 'Medical and institutional special leave as per policy',
  },
  {
    ...officialDuty,
    yearlyQuota: 12,
    allowHalfDay: true,
    carryForwardMax: 0,
    active: true,
    colorToken: 'teal',
    attendanceStatus: 'Official Duty',
    affectsTimetable: true,
    requiresCoverage: true,
    description: 'Deputation for VTU meetings, academic conferences, university events',
  },
  {
    ...examDuty,
    yearlyQuota: 12,
    allowHalfDay: true,
    carryForwardMax: 0,
    active: true,
    colorToken: 'cyan',
    attendanceStatus: 'Official / Examination Duty',
    affectsTimetable: true,
    requiresCoverage: true,
    description: 'VTU examination valuation, invigilation, squad, flying squad',
  },
  {
    ...restrictedHoliday,
    yearlyQuota: null,
    allowHalfDay: false,
    carryForwardMax: 0,
    active: true,
    colorToken: 'amber',
    attendanceStatus: 'Restricted Holiday',
    affectsTimetable: true,
    requiresCoverage: false,
    description: 'Restricted holiday as per JCET institutional calendar',
  },
  {
    ...vacationLeave,
    yearlyQuota: null,
    allowHalfDay: false,
    carryForwardMax: 0,
    active: true,
    colorToken: 'sky',
    attendanceStatus: 'Vacation Leave',
    affectsTimetable: true,
    requiresCoverage: true,
    description: 'Institutional semester-break vacation leave',
  },
];
const principal = {
  id: 'e0000000-0000-4000-8000-000000000009',
  employeeCode: 'JCET-ADM-001',
  name: 'Dr. Suresh Patil',
};
const leaveRequest = (id, employee, department, leaveType, dates, roles, reason, extra = {}) => ({
  id,
  employee,
  department,
  leaveType,
  startDate: dates[0],
  endDate: dates[1],
  halfDay: null,
  days: dates[2],
  reason,
  status: extra.status || 'PENDING',
  approverRoles: roles,
  pendingRole: extra.status === 'APPROVED' ? null : roles[0],
  decisions: extra.decisions || [],
  dutyType: extra.dutyType ?? null,
  organisation: extra.organisation ?? null,
  location: extra.location ?? null,
  referenceNumber: extra.referenceNumber ?? null,
  attachmentName: extra.attachmentName ?? null,
  attachmentUrl: extra.attachmentUrl ?? null,
  restrictedHolidayId: extra.restrictedHolidayId ?? null,
  vacationPeriodId: extra.vacationPeriodId ?? null,
  coverageRequired: extra.coverageRequired ?? true,
  createdAt: '2026-10-14T09:00:00.000Z',
});
const initialLeave = () => [
  leaveRequest(
    'a0000000-0000-4000-8000-000000000001',
    principal,
    admin,
    officialDuty,
    ['2026-11-05', '2026-11-05', 1],
    ['Super Admin'],
    'AICTE Regional Committee Meeting at Bengaluru Headquarters.',
    {
      dutyType: 'Official meeting',
      organisation: 'AICTE Regional Office',
      location: 'Bengaluru',
      referenceNumber: 'AICTE/SWRO/2026/412',
      attachmentName: 'AICTE_Meeting_Deputation_Order.pdf',
    },
  ),
  leaveRequest(
    'a0000000-0000-4000-8000-000000000002',
    {
      id: facultyUser.employeeId,
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    cse,
    casualLeave,
    ['2026-11-02', '2026-11-03', 2],
    ['HOD', 'HR Admin'],
    'Family commitment in Dharwad; arranged peer support for morning lab session.',
    {
      coverageRequired: true,
    },
  ),
  leaveRequest(
    'a0000000-0000-4000-8000-000000000003',
    {
      id: facultyUser.employeeId,
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    cse,
    examDuty,
    ['2026-11-12', '2026-11-13', 2],
    ['HOD', 'HR Admin'],
    'VTU Central Evaluation Center duty for 5th semester DBMS theory scripts.',
    {
      dutyType: 'Evaluation',
      organisation: 'Visvesvaraya Technological University',
      location: 'Valuation Center, Hubballi',
      referenceNumber: 'VTU/VAL/CSE/2026/781',
      attachmentName: 'VTU_Chief_Valuer_Appointment_Order.pdf',
    },
  ),
  leaveRequest(
    'a0000000-0000-4000-8000-000000000004',
    {
      id: facultyUser.employeeId,
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    cse,
    officialDuty,
    ['2026-10-18', '2026-10-19', 2],
    ['HOD', 'HR Admin'],
    'Representing JCET as External Academic Audit Member at GIT Belagavi.',
    {
      status: 'APPROVED',
      dutyType: 'Academic committee duty',
      organisation: 'KLS Gogte Institute of Technology',
      location: 'Belagavi',
      referenceNumber: 'GIT/AAA/2026/044',
      attachmentName: 'GIT_External_Audit_Order.pdf',
      decisions: [
        {
          step: 0,
          role: 'HOD',
          approved: true,
          note: 'Approved. Relieved for academic committee duty.',
          decidedAt: '2026-10-15T11:00:00.000Z',
          decidedBy: 'hod.cse@jcethbl.edu.in',
        },
        {
          step: 1,
          role: 'HR Admin',
          approved: true,
          note: 'OOD recorded. Official Duty attendance credited.',
          decidedAt: '2026-10-15T14:30:00.000Z',
          decidedBy: 'hr@jcethbl.edu.in',
        },
      ],
    },
  ),
  leaveRequest(
    'a0000000-0000-4000-8000-000000000005',
    {
      id: facultyUser.employeeId,
      employeeCode: 'JCET-CSE-021',
      name: 'Prof. Asha Patil',
    },
    cse,
    specialMedicalLeave,
    ['2026-09-10', '2026-09-12', 3],
    ['HOD', 'HR Admin'],
    'Severe viral gastroenteritis; medical rest advised by physician.',
    {
      status: 'APPROVED',
      attachmentName: 'KIMS_Medical_Certificate_AshaPatil.pdf',
      decisions: [
        {
          step: 0,
          role: 'HOD',
          approved: true,
          note: 'Medical certificate verified. Recommended.',
          decidedAt: '2026-09-13T09:30:00.000Z',
          decidedBy: 'hod.cse@jcethbl.edu.in',
        },
        {
          step: 1,
          role: 'HR Admin',
          approved: true,
          note: 'Special/Medical leave approved as per policy.',
          decidedAt: '2026-09-13T16:00:00.000Z',
          decidedBy: 'hr@jcethbl.edu.in',
        },
      ],
    },
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

const minutesAgo = (minutes) =>
  new Date(Date.now() - minutes * 60_000).toISOString();
const initialNotifications = () => [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    kind: 'leave.waiting',
    title: 'Leave request from Prof. Asha Patil',
    body: 'Casual Leave, 2 days from 20 Oct. Waiting for your decision.',
    link: '/leave?tab=requests',
    readAt: null,
    createdAt: minutesAgo(10),
  },
  {
    id: 'a0000000-0000-4000-8000-000000000002',
    kind: 'substitution.assigned',
    title: 'You are covering Data Structures',
    body: 'CSE 3A · 21 Oct · period 2 · Room 204 · for Prof. Ravi Hegde',
    link: '/substitution',
    readAt: null,
    createdAt: minutesAgo(45),
  },
  {
    id: 'a0000000-0000-4000-8000-000000000003',
    kind: 'announcement',
    title: 'Timetable revised',
    body: 'The odd-semester timetable was revised for CSE.',
    link: null,
    readAt: minutesAgo(60),
    createdAt: minutesAgo(180),
  },
];

export async function mockAuthApi(page, webOrigin) {
  const state = {
    user: undefined,
    lastLogin: undefined,
    leave: initialLeave(),
    // Substitution coverage by timetable entry id.
    coverage: {},
    notifications: initialNotifications(),
    announcements: [],
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
    if (path === 'auth/password') {
      const body = request.postDataJSON();
      if (body.currentPassword !== checkPassword) {
        return json(route, 400, {
          error: {
            code: 'WRONG_PASSWORD',
            message: 'Your current password is not right.',
          },
        });
      }
      state.passwordChanged = true;
      return route.fulfill({ status: 204, headers: cors });
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
      const getPending = (code) =>
        state.leave
          .filter(
            (leave) =>
              leave.employee.id === state.user.employeeId &&
              leave.status === 'PENDING' &&
              leave.leaveType.code === code,
          )
          .reduce((sum, leave) => sum + leave.days, 0);

      const balances = leaveTypes.map((lt) => {
        const pending = getPending(lt.code);
        if (lt.yearlyQuota === null) {
          return {
            leaveType: lt,
            active: true,
            year: 2026,
            entitled: null,
            carriedIn: 0,
            used: lt.code === 'RH' ? 1 : 0,
            pending,
            remaining: null,
          };
        }
        const used = lt.code === 'CL' ? 3 : lt.code === 'EL' ? 2 : lt.code === 'OOD' ? 2 : lt.code === 'ODE' ? 1 : 0;
        const remaining = Math.max(0, lt.yearlyQuota - used - pending);
        return {
          leaveType: lt,
          active: true,
          year: 2026,
          entitled: lt.yearlyQuota,
          carriedIn: 0,
          used,
          pending,
          remaining,
        };
      });

      return json(route, 200, { data: balances });
    }
    if (path === 'leave/requests' && request.method() === 'POST') {
      const body = request.postDataJSON();
      const selectedType = leaveTypes.find((lt) => lt.id === body.leaveTypeId) || casualLeave;
      const newLeave = leaveRequest(
        `a0000000-0000-4000-8000-${String(state.leave.length + 1).padStart(12, '0')}`,
        {
          id: state.user.employeeId || employees[1].id,
          employeeCode: employees[1].employeeCode,
          name: `${employees[1].firstName} ${employees[1].lastName}`,
        },
        cse,
        selectedType,
        [body.startDate, body.endDate, body.halfDay ? 0.5 : 1],
        ['HOD', 'HR Admin'],
        body.reason,
        {
          dutyType: body.dutyType,
          organisation: body.organisation,
          location: body.location,
          referenceNumber: body.referenceNumber,
          attachmentName: body.attachmentName,
          attachmentUrl: body.attachmentUrl,
          restrictedHolidayId: body.restrictedHolidayId,
          vacationPeriodId: body.vacationPeriodId,
          coverageRequired: body.coverageRequired ?? true,
        },
      );
      state.leave.unshift(newLeave);
      return json(route, 201, { data: newLeave });
    }
    if (path === 'leave/requests' && request.method() === 'GET') {
      const query = new URL(request.url()).searchParams;
      const user = state.user;
      const canSeeAll =
        user.role === 'Super Admin' ||
        user.permissions?.some(
          (p) => p.startsWith('leave.read.all') || p.startsWith('leave.approve.all'),
        );
      const data = state.leave.filter(
        (leave) =>
          (canSeeAll || !user.employeeId || leave.employee.id === user.employeeId) &&
          (query.get('awaitingMe') !== 'true' ||
            (leave.status === 'PENDING' &&
              (leave.pendingRole === user.role || user.role === 'Super Admin') &&
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
    if (path === 'notifications') {
      const query = new URL(request.url()).searchParams;
      const limit = Number(query.get('limit') ?? 20);
      const from = query.get('after')
        ? state.notifications.findIndex(
            (item) => item.id === query.get('after'),
          ) + 1
        : 0;
      return json(route, 200, {
        data: state.notifications.slice(from, from + limit),
        hasMore: state.notifications.length > from + limit,
      });
    }
    if (path === 'notifications/unread-count') {
      return json(route, 200, {
        data: {
          count: state.notifications.filter((item) => !item.readAt).length,
        },
      });
    }
    if (path === 'notifications/read-all' || path.endsWith('/read')) {
      const id = path.split('/')[1];
      state.notifications = state.notifications.map((item) =>
        id === 'read-all' || item.id === id
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item,
      );
      return route.fulfill({ status: 204, headers: cors });
    }
    if (path === 'notifications/announcements') {
      state.announcements.push(request.postDataJSON());
      return json(route, 201, { data: { recipients: 42 } });
    }
    if (path === 'designations') {
      return json(route, 200, { data: designations });
    }
    if (path === 'documents/pending-count') {
      return json(route, 200, { data: { count: 1 } });
    }
    if (path.startsWith('documents')) {
      return json(route, 200, {
        data: [
          {
            id: 'doc-0001',
            employeeId: 'e0000000-0000-4000-8000-000000000001',
            title: 'Ph.D Degree Certificate',
            category: 'EDUCATION',
            fileName: 'phd_ramesh_kulkarni.pdf',
            fileSize: 2450000,
            mimeType: 'application/pdf',
            status: 'VERIFIED',
            verifiedAt: '2026-08-15T10:00:00.000Z',
            verifiedBy: 'Super Admin',
            createdAt: '2026-08-01T09:00:00.000Z',
            employee: {
              id: 'e0000000-0000-4000-8000-000000000001',
              employeeCode: 'JCET-CSE-001',
              firstName: 'Ramesh',
              lastName: 'Kulkarni',
              department: cse,
            },
          },
          {
            id: 'doc-0002',
            employeeId: facultyUser.employeeId,
            title: 'Aadhaar Card',
            category: 'IDENTITY',
            fileName: 'aadhaar_asha_patil.pdf',
            fileSize: 1200000,
            mimeType: 'application/pdf',
            status: 'PENDING',
            createdAt: '2026-10-20T14:30:00.000Z',
            employee: {
              id: facultyUser.employeeId,
              employeeCode: 'JCET-CSE-021',
              firstName: 'Asha',
              lastName: 'Patil',
              department: cse,
            },
          },
        ],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });
    }
    if (path === 'attendance/today') {
      return json(route, 200, {
        data: {
          id: 'att-today',
          employeeId: employees[0].id,
          date: '2026-11-02',
          checkIn: '2026-11-02T08:24:00.000Z',
          checkOut: null,
          status: 'PRESENT',
          source: 'BIOMETRIC',
          notes: 'Biometric terminal Gate 1',
          createdAt: '2026-11-02T08:24:00.000Z',
          updatedAt: '2026-11-02T08:24:00.000Z',
          employee: {
            id: employees[0].id,
            employeeCode: employees[0].employeeCode,
            firstName: employees[0].firstName,
            lastName: employees[0].lastName,
            departmentId: 1,
            department: cse,
          },
        },
      });
    }
    if (path.startsWith('attendance/corrections')) {
      return json(route, 200, {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    }
    if (path.startsWith('attendance')) {
      return json(route, 200, {
        data: [
          {
            id: 'att-1',
            employeeId: employees[0].id,
            date: '2026-11-02',
            checkIn: '2026-11-02T08:24:00.000Z',
            checkOut: '2026-11-02T16:55:00.000Z',
            status: 'PRESENT',
            source: 'BIOMETRIC',
            notes: 'Biometric Terminal 1',
            createdAt: '2026-11-02T08:24:00.000Z',
            updatedAt: '2026-11-02T16:55:00.000Z',
            employee: {
              id: employees[0].id,
              employeeCode: employees[0].employeeCode,
              firstName: employees[0].firstName,
              lastName: employees[0].lastName,
              departmentId: 1,
              department: cse,
            },
          },
          {
            id: 'att-2',
            employeeId: facultyUser.employeeId,
            date: '2026-11-02',
            checkIn: null,
            checkOut: null,
            status: 'ON_LEAVE',
            source: 'MANUAL',
            notes: 'Approved Casual Leave',
            createdAt: '2026-11-02T08:00:00.000Z',
            updatedAt: '2026-11-02T08:00:00.000Z',
            employee: {
              id: facultyUser.employeeId,
              employeeCode: 'JCET-CSE-021',
              firstName: 'Asha',
              lastName: 'Patil',
              departmentId: 1,
              department: cse,
            },
          },
        ],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });
    }
    if (path.startsWith('reports/summary')) {
      return json(route, 200, {
        data: {
          headcount: {
            total: 186,
            teaching: 132,
            nonTeaching: 54,
            doctorates: 48,
            cadre: {
              professors: 18,
              associateProfessors: 34,
              assistantProfessors: 80,
              others: 54,
            },
          },
          attendance: {
            todayRate: 94.2,
            present: 162,
            absent: 8,
            late: 5,
            onLeave: 11,
            totalToday: 186,
            departmentAverages: [
              { department: 'CSE', rate: 96 },
              { department: 'ECE', rate: 94 },
              { department: 'ME', rate: 91 },
              { department: 'CE', rate: 93 },
            ],
          },
          leave: {
            monthlyLeaveDays: 42,
            activeLeavesToday: 11,
            monthlyTrends: [
              { month: 'Jul', days: 28 },
              { month: 'Aug', days: 35 },
              { month: 'Sep', days: 40 },
              { month: 'Oct', days: 42 },
            ],
          },
          continuity: {
            affectedClasses: 14,
            classesCovered: 13,
            coverageRate: 92.8,
            uncoveredClasses: 1,
          },
          workload: { normalLoadPercentage: 88.5, totalAudited: 132 },
        },
      });
    }
    if (path.startsWith('reports/attendance')) {
      return json(route, 200, {
        data: {
          summary: { overallRate: 94.2, totalPresent: 162, totalAbsent: 8, totalLate: 5, totalLeave: 11 },
          records: [
            {
              employeeId: employees[0].id,
              employeeCode: employees[0].employeeCode,
              name: 'Dr. Ramesh Kulkarni',
              department: 'CSE',
              designation: 'Professor & HOD',
              daysPresent: 24,
              daysAbsent: 0,
              daysLate: 1,
              daysOnLeave: 0,
              totalRecorded: 25,
              attendanceRate: 96,
            },
            {
              employeeId: facultyUser.employeeId,
              employeeCode: 'JCET-CSE-021',
              name: 'Prof. Asha Patil',
              department: 'CSE',
              designation: 'Assistant Professor',
              daysPresent: 22,
              daysAbsent: 1,
              daysLate: 0,
              daysOnLeave: 2,
              totalRecorded: 25,
              attendanceRate: 88,
            },
          ],
        },
      });
    }
    if (path.startsWith('reports/leave')) {
      return json(route, 200, {
        data: {
          summary: { totalDays: 42, totalRequests: 28 },
          byType: [
            { type: 'Casual Leave', days: 26 },
            { type: 'Earned Leave', days: 10 },
            { type: 'Medical Leave', days: 6 },
          ],
          records: [
            {
              employeeId: facultyUser.employeeId,
              employeeCode: 'JCET-CSE-021',
              name: 'Prof. Asha Patil',
              department: 'CSE',
              designation: 'Assistant Professor',
              totalRequests: 2,
              totalApprovedDays: 3,
              clDays: 3,
              mlDays: 0,
              elDays: 0,
              otherDays: 0,
            },
          ],
        },
      });
    }
    if (path.startsWith('reports/workload')) {
      return json(route, 200, {
        data: {
          summary: { normal: 118, overload: 8, underload: 6 },
          records: [
            {
              facultyId: employees[0].id,
              employeeCode: employees[0].employeeCode,
              name: 'Dr. Ramesh Kulkarni',
              department: 'CSE',
              designation: 'Professor & HOD',
              theoryHours: 8,
              labHours: 4,
              totalHours: 12,
              minThreshold: 10,
              maxThreshold: 14,
              status: 'NORMAL',
            },
            {
              facultyId: facultyUser.employeeId,
              employeeCode: 'JCET-CSE-021',
              name: 'Prof. Asha Patil',
              department: 'CSE',
              designation: 'Assistant Professor',
              theoryHours: 12,
              labHours: 6,
              totalHours: 18,
              minThreshold: 14,
              maxThreshold: 18,
              status: 'NORMAL',
            },
          ],
        },
      });
    }
    if (path.startsWith('reports/continuity')) {
      return json(route, 200, {
        data: {
          summary: { totalImpacted: 14, covered: 13, uncovered: 1, coverageRate: 92.8 },
          records: [
            {
              id: 'cont-1',
              date: '2026-11-02',
              originalFaculty: 'Prof. Asha Patil',
              department: 'CSE',
              subject: 'Database Management Systems',
              period: '09:00 - 10:00',
              kind: 'THEORY',
              substituteFaculty: 'Prof. Priya Kulkarni',
              status: 'COVERED',
            },
          ],
        },
      });
    }
    return route.abort();
  });
  return state;
}
