// Fake auth API for the browser checks, so they run without the backend.
// Mirrors backend/API_ENDPOINTS.md; the "signed in" flag stands in for the cookie.
export const apiUrl = process.env.API_URL || 'http://localhost:4000/api/v1';
// Grants follow product/USER_ROLES.md (only what the web app checks).
const own = (keys) => keys.map((key) => `${key}.own`);
export const checkUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@jcethbl.edu.in',
  role: 'Super Admin',
  permissions: [
    ...[
      'employee.read',
      'attendance.read',
      'leave.read',
      'leave.approve',
      'timetable.read',
      'workload.read',
      'substitution.read',
      'substitution.assign',
      'report.read',
      'settings.manage',
    ].map((key) => `${key}.all`),
    'notification.read.own',
  ],
};
export const facultyUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'faculty.cse@jcethbl.edu.in',
  role: 'Faculty',
  permissions: own([
    'employee.read',
    'attendance.read',
    'leave.read',
    'leave.apply',
    'timetable.read',
    'workload.read',
    'substitution.read',
    'notification.read',
  ]),
};
export const checkPassword = 'check-password-123';

export async function mockAuthApi(page, webOrigin) {
  const state = { user: undefined, lastLogin: undefined };
  const cors = {
    'Access-Control-Allow-Origin': webOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  await page.route(`${apiUrl}/auth/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: cors });
    }
    const path = new URL(request.url()).pathname.split('/auth/')[1];
    if (path === 'login') {
      const body = request.postDataJSON();
      state.lastLogin = body;
      const user = [checkUser, facultyUser].find(
        (candidate) => candidate.email === body.email,
      );
      if (user && body.password === checkPassword) {
        state.user = user;
        return json(route, 200, session(user));
      }
      return json(route, 401, {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password.',
        },
      });
    }
    if (path === 'refresh') {
      return state.user
        ? json(route, 200, session(state.user))
        : json(route, 401, {
            error: {
              code: 'SESSION_EXPIRED',
              message: 'Your session has ended. Sign in again.',
            },
          });
    }
    if (path === 'logout') {
      state.user = undefined;
      return route.fulfill({ status: 204, headers: cors });
    }
    return route.abort();
  });
  return state;
}
