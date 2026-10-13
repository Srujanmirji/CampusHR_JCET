# API Endpoints

Base path: `/api/v1`

## Auth

Implemented: login, refresh, logout, me. Forgot/reset password wait for SMTP.

- `POST /auth/login` `{ email, password }` → `{ accessToken, expiresIn, user }`;
  sets the HttpOnly `campushr_refresh` cookie (path `/api/v1/auth`, 7 days).
  Errors: 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 429
  `TOO_MANY_ATTEMPTS` (5 attempts per account and client, 100 per IP, per 15
  minutes).
- `POST /auth/refresh` (cookie) → same body and a rotated cookie.
  Errors: 401 `SESSION_EXPIRED`; 409 `REFRESH_IN_PROGRESS` when the same token
  was just used by another tab (retry; the cookie is kept). Reusing an old
  rotated token after 10 seconds ends every session for that user.
- `POST /auth/logout` (cookie) → 204; ends the session and clears the cookie.
- Refresh and logout reject browser requests from origins other than
  `CORS_ORIGIN` with 403 `FORBIDDEN_ORIGIN`.
- `GET /auth/me` (`Authorization: Bearer <accessToken>`) → `{ user }`.
  Error: 401 `UNAUTHENTICATED`.

Access tokens are HS256 JWTs valid for 15 minutes.

- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/forgot-password
- POST /auth/reset-password
- GET /auth/me

## Employees

- GET /employees
- POST /employees
- GET /employees/:id
- PATCH /employees/:id
- DELETE /employees/:id

## Departments

- GET /departments
- POST /departments
- GET /departments/:id
- PATCH /departments/:id

## Attendance

- GET /attendance
- POST /attendance/check-in
- POST /attendance/check-out
- POST /attendance/manual
- POST /attendance/corrections
- PATCH /attendance/corrections/:id

## Leave

- GET /leave/requests
- POST /leave/requests
- GET /leave/requests/:id
- PATCH /leave/requests/:id/approve
- PATCH /leave/requests/:id/reject
- PATCH /leave/requests/:id/cancel
- GET /leave/balances

## Timetable

- GET /timetable/faculty/:facultyId
- GET /timetable/department/:departmentId
- POST /timetable/entries
- PATCH /timetable/entries/:id
- DELETE /timetable/entries/:id

## Workload

- GET /workload
- GET /workload/faculty/:facultyId
- POST /workload/recalculate

## Substitution

- POST /substitution/recommend
- GET /substitution/:id/candidates
- PATCH /substitution/:id/assign

## Documents

- POST /documents
- GET /documents
- PATCH /documents/:id/verify
- PATCH /documents/:id/reject

## Notifications

- GET /notifications
- PATCH /notifications/:id/read

## Reports

- GET /reports/attendance
- GET /reports/leave
- GET /reports/workload
