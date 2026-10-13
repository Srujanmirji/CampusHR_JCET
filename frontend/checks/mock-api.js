// Fake auth API for the browser checks, so they run without the backend.
// Mirrors backend/API_ENDPOINTS.md; the "signed in" flag stands in for the cookie.
export const apiUrl = process.env.API_URL || 'http://localhost:4000/api/v1';
export const checkUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'hod.cse@jcethbl.edu.in',
  role: 'HOD',
};
export const checkPassword = 'check-password-123';

export async function mockAuthApi(page, webOrigin) {
  const state = { signedIn: false, lastLogin: undefined };
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
  const session = {
    accessToken: 'check-token',
    expiresIn: 900,
    user: checkUser,
  };

  await page.route(`${apiUrl}/auth/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: cors });
    }
    const path = new URL(request.url()).pathname.split('/auth/')[1];
    if (path === 'login') {
      const body = request.postDataJSON();
      state.lastLogin = body;
      if (body.email === checkUser.email && body.password === checkPassword) {
        state.signedIn = true;
        return json(route, 200, session);
      }
      return json(route, 401, {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password.',
        },
      });
    }
    if (path === 'refresh') {
      return state.signedIn
        ? json(route, 200, session)
        : json(route, 401, {
            error: {
              code: 'SESSION_EXPIRED',
              message: 'Your session has ended. Sign in again.',
            },
          });
    }
    if (path === 'logout') {
      state.signedIn = false;
      return route.fulfill({ status: 204, headers: cors });
    }
    return route.abort();
  });
  return state;
}
