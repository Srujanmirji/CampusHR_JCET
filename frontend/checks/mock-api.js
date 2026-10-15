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

export async function mockAuthApi(page, webOrigin) {
  const state = { user: undefined, lastLogin: undefined };
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
    if (path === 'timetable/entries') return json(route, 200, { data: [] });
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
