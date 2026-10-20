# API Endpoints

Base path: `/api/v1`

## Auth

Implemented: login, refresh, logout, me, change own password. Forgot/reset
password by email waits for SMTP.

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
- `POST /auth/password` (Bearer, plus the refresh cookie) `{ currentPassword,
newPassword }` (12–72 bytes) → 204. Every other session of the user ends;
  the one whose cookie came with the request stays. Errors: 400
  `WRONG_PASSWORD`, `SAME_PASSWORD`, `VALIDATION_ERROR`; 429
  `TOO_MANY_ATTEMPTS` (5 wrong passwords per account per 15 minutes).
  Audit-logged without the hash.

Access tokens are HS256 JWTs valid for 15 minutes. `user` includes
`permissions`, the granted keys (e.g. `leave.approve.department`), so clients can
hide what the user cannot do.

## Logins

Implemented. All need `user.manage` (Super Admin, HR Admin). A login signs in
with the employee's college email or employee ID. Changes are audit-logged
(never with the password hash).

- `GET /users/roles` → `[{ id, name }]` the caller may give (HR Admin does not
  see Super Admin).
- `GET /users/employee/:employeeId` → the employee's login or `null`.
- `POST /users` `{ employeeId, roleId, password }` (password 12–72 bytes) →
  201 `{ id, email, status, employeeId, role: { id, name }, lastLoginAt,
createdAt }`. 409 if the employee already has a login; 400 for an archived
  employee.
- `PATCH /users/:id` `{ roleId?, status?: ACTIVE|INACTIVE, password? }` →
  the login. Turning it off or setting a new password signs the person out
  everywhere. Nobody changes their own role or status; only a Super Admin
  gives the Super Admin role or changes a Super Admin login (403). An
  archived employee's login cannot be turned back on.

Until password reset by email exists, HR sets a new password here and hands
it over in person.

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

Implemented. Role-scoped (Faculty/Staff see own, HOD sees department, HR/Super Admin see all).

- `POST /attendance/punch` (`attendance.check_in`) `{ source?: WEB|MOBILE|BIOMETRIC|MANUAL, notes? }` →
  records Check-in (first punch of the day, marked LATE if after work start + grace period) or Check-out (subsequent punch; marked HALF_DAY if worked hours < threshold).
- `GET /attendance/today` (`attendance.read`) → today's attendance record for the caller or `null`.
- `GET /attendance?date=&startDate=&endDate=&departmentId=&employeeId=&status=&page=&limit=` (`attendance.read`) →
  paged attendance records with employee and department details, scoped to caller.
- `POST /attendance/record` (`attendance.record`) `{ employeeId, date, checkIn?, checkOut?, status, notes? }` →
  201; manual attendance entry by HR Admin or Super Admin.
- `POST /attendance/corrections` (`attendance_correction.request`) `{ date, requestedCheckIn?, requestedCheckOut?, requestedStatus, reason }` →
  201; requests punch correction. Notifies the department HOD.
- `GET /attendance/corrections?status=&page=&limit=` (`attendance.read`) →
  paged correction requests, filtered by status and scoped by role.
- `PATCH /attendance/corrections/:id` (`attendance_correction.approve`) `{ status: APPROVED|REJECTED, reviewNote? }` →
  approves or rejects a correction request (HOD for their department, HR for all). If approved, automatically updates the daily attendance record. Notifies the employee.
- `GET /attendance/settings` (`attendance.read`) → `{ workDayStart, workDayEnd, gracePeriodMinutes, halfDayHours, fullDayHours }`.
- `PUT /attendance/settings` (`settings.manage`) → updates attendance policy settings.


## Leave

Implemented. Leave types, quotas, half days and carry-over are data HR
enters; nothing is seeded, so nobody can apply until HR adds a type.

- `GET /leave/types` (`leave.read`) → every type, including retired ones
  (`active: false`).
- `POST /leave/types` (`leave_type.manage`) `{ code, name, yearlyQuota (days
or null for no limit), allowHalfDay?, carryForwardMax?, active? }` → 201;
  409 if the code or name exists. `PATCH /leave/types/:id` takes any of
  those fields. Amounts are whole or half days. Audit-logged.
- `GET /leave/balances?employeeId&year` (`leave.read`) → per type `{ leaveType,
active, year, entitled, carriedIn, used, pending, remaining }`; `entitled` and
  `remaining` are null for a type without a limit. Defaults: the caller and
  this year. HODs see their department; faculty and staff themselves.
- `GET /leave/requests?status&employeeId&year&month&awaitingMe` (`leave.read`) →
  requests in the caller's scope, newest first (at most 500). With
  `awaitingMe=true`: pending requests waiting for the caller's decision.
  `month=YYYY-MM`: requests with a day in that month (the leave calendar).
- `GET /leave/requests/:id` → one request; 404 outside the caller's scope.
- `POST /leave/requests` (`leave.apply`) `{ leaveTypeId, startDate, endDate,
halfDay?: FIRST|SECOND, reason }` (dates `YYYY-MM-DD`) → 201 with `days`,
  `approverRoles` and `pendingRole`. Refused: last day before first, a half
  day over more than one date or on a type without half days, dates that
  cross 31 December, only Sundays (400); overlap with the applicant's
  pending or approved leave (409 `OVERLAP`); more days than remain (400
  `INSUFFICIENT_BALANCE`, pending days count as used).
- `PATCH /leave/requests/:id/approve` `{ note? }` and `/reject` `{ note }`
  (`leave.approve`) → the request. Only the role in `pendingRole` acts (an
  HOD only for their department), never on their own leave (403). Approving
  the last step makes it APPROVED. 409 `ALREADY_DECIDED` if it changed
  meanwhile. Audit-logged.
- `PATCH /leave/requests/:id/cancel` (`leave.cancel`) → the applicant cancels
  while PENDING; 409 `NOT_PENDING` otherwise.

Request: `{ id, employee: { id, employeeCode, name }, department, leaveType,
startDate, endDate, halfDay, days, reason, status, approverRoles, pendingRole,
decisions: [{ step, role, approved, note, decidedAt, decidedBy }], createdAt }`.

Approval chain by the applicant's role: Faculty → HOD → HR Admin;
Non-Teaching Staff → HR Admin; HOD → Principal; Principal → Super Admin;
HR Admin → Principal (not yet confirmed by JCET). Days count Monday–Saturday;
holidays are not subtracted yet.

## Timetable

Implemented. Reads need `timetable.read`, changes `timetable.manage`. HODs
manage their own department; faculty read only the classes they teach.

- `GET /timetable/periods` → the day's periods `{ number, startTime, endTime }`
  (seeded: seven periods, 09:00–17:00 with breaks).
- `GET /timetable/subjects?departmentId&semester`;
  `POST /timetable/subjects` `{ code, name, departmentId, semester, kind: THEORY|LAB }`
  → 201, 409 if the code exists. HODs add only their department's subjects.
- `GET /timetable/rooms`; `POST /timetable/rooms` `{ name, kind: CLASSROOM|LAB }`
  → 201, 409 if the name exists. Rooms are shared.
- `GET /timetable/entries?departmentId&semester&section&facultyId` → classes
  in the caller's scope, ordered by day and period. Faculty get their own
  classes; HODs their department's plus any they teach.
- `POST /timetable/entries` `{ departmentId, semester, section, batch?,
subjectId, facultyId, roomId, day: MON–SAT, startPeriod, endPeriod }` → 201.
- `PATCH /timetable/entries/:id` (same body, replaces the entry);
  `DELETE /timetable/entries/:id` → 204.

Rules: the subject must belong to the entry's department and semester; the
faculty member must be active and teaching; lab subjects need a lab room.
**Clashes answer 409 `CLASH`** with a plain sentence, e.g. "Asha Patil already
teaches BCS501 to CSE 5A on Monday, period 2." A clash is the same faculty
member, room or class section at overlapping periods on one day; two different
lab batches (A1, A2) of a section may run together. Changes are audit-logged.

## Workload

Implemented. Reads need `workload.read`, band changes `workload.configure`
(Super Admin, Principal). Hours are computed live from the timetable, so
there is nothing to recalculate. Only active teaching staff are listed.

- `GET /workload?departmentId` → one row per faculty member in the caller's
  scope (all; HOD: own department; faculty: themselves):
  `{ faculty: { id, employeeCode, name, department, designation },
theoryHours, labHours, totalHours, minHours, maxHours,
status: UNDERLOADED|NORMAL|OVERLOADED|null }`. One period counts as one
  hour; `status` is null when the designation has no band.
- `GET /workload/faculty/:id` → the same row plus `classes` (timetable
  entries, as in `GET /timetable/entries`). 404 outside the caller's scope.
- `GET /workload/thresholds` → `[{ designation: { id, name }, minHours,
maxHours, updatedAt }]` for every teaching designation.
- `PUT /workload/thresholds/:designationId` `{ minHours, maxHours }` (whole
  hours, 0–72, min ≤ max) → the saved band; 404 for a non-teaching
  designation. Audit-logged.

## Substitution

Implemented. Reads need `substitution.read`, assigning `substitution.assign`
(Super Admin; HODs for their department's classes). A class is affected
when its teacher has approved leave on that date (Sundays skipped; a half
day covers morning classes for FIRST, afternoon ones for SECOND).

- `GET /substitution/rubric` → the score parts and their maximums.
- `GET /substitution/leave?from=YYYY-MM-DD` → approved leave ending on or after
  `from` (default today) that affects classes in the caller's scope:
  `[{ leave: { id, employee, department, leaveType, startDate, endDate,
halfDay, days }, classes, covered }]`. Faculty get an empty list.
- `GET /substitution/leave/:leaveId` → `{ leave, classes: [{ date, hours, entry,
coverage: null | { id, kind: SUBSTITUTE|NOT_NEEDED, substitute, note,
assignedAt } }] }`; 404 when nothing is in scope.
- `GET /substitution/leave/:leaveId/candidates?entryId&date`
  (`substitution.assign`) → up to 25 faculty, best first:
  `{ faculty: { id, employeeCode, name, department, designation }, score,
points: { subject, availability, department, workload, experience },
hoursAfter, maxHours, eligible, reason }`. Leaves out the absent teacher,
  anyone on approved leave that day and anyone teaching or substituting in an
  overlapping period. Someone the class would push over their weekly maximum
  is listed last with `eligible: false` and a `reason`.
- `POST /substitution/assignments` `{ leaveRequestId, timetableEntryId, date,
substituteId (or null), note? }` → 201 coverage. With `substituteId: null`
  the class runs without a substitute and `note` (the arrangement) is
  required. 400 `NOT_AVAILABLE` for a substitute who is not free or would go
  over their maximum; 409 `ALREADY_COVERED`. Audit-logged.
- `DELETE /substitution/assignments/:id` → 204 (undo). Audit-logged.
- `GET /substitution/mine` → classes the caller covers from today, each with
  `date`, `entry` and `coveringFor`.

Score out of 100: subject 35 (teaches this subject; 15 for another subject
of the same kind in the department), availability 25 (12 if the class is
back to back with one of theirs), department 15 (5 for another department),
workload 15 (in proportion to hours left under the weekly maximum; 7 with no
band), experience 10 (years of teaching, up to 10). The substitute gets a
notification when assigned.

## Documents

Implemented (`document.upload`, `document.read`, `document.verify`). Supports PDF, JPEG, PNG, WEBP files up to 10MB.
Physical files are served statically from `/uploads/documents/<filename>`.

- `POST /documents` (`document.upload`, multipart/form-data)
  - Fields: `category` (IDENTITY | ACADEMIC | EMPLOYMENT | CERTIFICATION | OTHER), `documentType` (e.g. 'Aadhaar Card', 'Ph.D. Degree'), `title`, `expiryDate?` (YYYY-MM-DD), `file`
  - Uploads document, sets status to `PENDING`, and triggers in-app notification to HR Admin.
  - Returns: 201 `{ data: Document }`
- `GET /documents?category=&status=&search=&page=&limit=` (`document.read`)
  - Scope `own` (Faculty/Staff): returns own documents.
  - Scope `all` (HR Admin/Super Admin): returns all documents across college with uploader details.
  - Returns: `{ data: Document[], total, page, totalPages }`
- `GET /documents/pending-count` (`document.read`) → `{ data: { count } }`
- `GET /documents/:id` (`document.read`) → `{ data: Document }`
- `PUT /documents/:id/verify` (`document.verify`, HR Admin / Super Admin)
  - Body: `{ status: 'VERIFIED' | 'REJECTED', reviewNote?: string }`
  - Updates verification status and dispatches in-app notification to the employee.
  - Returns: 200 `{ data: Document }`
- `DELETE /documents/:id` (`document.upload`)
  - Deletes document and cleans up disk file. Verified documents cannot be deleted by faculty.
  - Returns: 200 `{ data: { success: true } }`

## Notifications

Implemented. Each person sees only their own (`notification.read`, own).

- `GET /notifications?after=&limit=` → newest first, `{ data, hasMore }`;
  `limit` 1–50 (default 20), `after` is the last id of the previous page.
  Each has `id`, `kind`, `title`, `body`, `link`, `readAt`, `createdAt`.
- `GET /notifications/unread-count` → `{ data: { count } }`
- `PATCH /notifications/:id/read` → 204; 404 for someone else's
- `PATCH /notifications/read-all` → 204
- `POST /notifications/announcements` (`announcement.send`) with
  `{ title, body, departmentId? }` → 201 `{ data: { recipients } }`. Scope
  all sends to everyone or one department; a HOD's always go to their own
  department. The sender is left out; audited as `announcement.send`.

Sent automatically: leave waiting for your step (`leave.waiting`), your leave
moved on, approved or rejected (`leave.progress|approved|rejected`), and a
class you cover (`substitution.assigned`).

Live: Socket.IO at path `/api/v1/socket.io` on the API's origin, with
`auth: { token: <access token> }`; refused without a valid token. The server
emits `notifications:changed` to the user whenever theirs change; refetch.

## Reports

- GET /reports/attendance
- GET /reports/leave
- GET /reports/workload
