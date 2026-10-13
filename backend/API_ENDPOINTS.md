# API Endpoints

Base path: `/api/v1`

## Auth

Implemented: login, refresh, logout, me. Forgot/reset password wait for SMTP.

- `POST /auth/login` `{ identifier, password, remember? }` — identifier is the
  college email or employee ID (case-insensitive) → `{ accessToken, expiresIn, user }`;
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

Access tokens are HS256 JWTs valid for 15 minutes. `user` includes
`permissions`, the granted keys (e.g. `leave.approve.department`), so clients can
hide what the user cannot do.

## Permissions

Protected routes use `requirePermission(auth, 'resource.action')`
(`src/middleware/auth.ts`). It re-reads the user from the database on every
request, so deactivation and role changes apply immediately, and responds 403
`FORBIDDEN` when the role lacks the permission. Handlers receive the widest
granted scope in `res.locals.scope` (`all`, `department` or `own`) and must limit
records to it. Grants: `product/USER_ROLES.md`.

- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/forgot-password
- POST /auth/reset-password
- GET /auth/me

## Employees

Implemented. Every route requires sign-in; results are limited to the caller's
scope (all, own department, or own record). Records outside it answer 404.

- `GET /employees?search&departmentId&category&status&page&pageSize` (`employee.read`)
  → `{ data, meta: { page, pageSize, total, teaching, nonTeaching } }`.
  `status` defaults to `ACTIVE`; `pageSize` is at most 100.
- `GET /employees/next-code?departmentId=` (`employee.create`) → next free
  `JCET-<DEPT>-<NNN>` ID. HR may use another (the college's existing ID).
- `POST /employees` (`employee.create`) → 201. 409 `ALREADY_EXISTS` for a
  taken employee ID or email.
- `GET /employees/:id` (`employee.read`)
- `PATCH /employees/:id` (`employee.update`). Own scope may change `phone`
  only; anything else answers 403.
- `DELETE /employees/:id` (`employee.archive`) archives: status `ARCHIVED`,
  their login is disabled at once, and any HOD post is cleared. Nothing is
  deleted.

Employee changes are written to `audit_logs` with before and after values.

## Departments

Implemented.

- `GET /departments` (`department.read`) → departments with `hod` and
  `staff: { total, teaching, nonTeaching }` (active employees).
- `POST /departments` (`department.manage`) `{ code, name }` → 201. The code
  (2–10 letters or digits) is fixed after creation; it is part of employee IDs.
- `GET /departments/:id` (`department.read`)
- `PATCH /departments/:id` (`department.manage`) `{ name?, hodEmployeeId? }`.
  The HOD must be an active employee of that department. Audit-logged.
- `GET /designations` (`department.read`) → reference list with
  `category` (`TEACHING` / `NON_TEACHING`).

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
