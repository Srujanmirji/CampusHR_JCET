# Zeeshan Madras — Website

GitHub: `zeeshanmadras` · Team: Website · Plan: [`../TEAM_PLAN.md`](../TEAM_PLAN.md)

You own **Notifications, Attendance, Documents and Reports**, each end to end:
Prisma model and migration, API module, web screen, tests.

Code goes in `backend/src/modules/<module>/` (routes, controller, service,
repository, schema — copy `employees/`) and
`frontend/src/features/<module>/` (api, components, pages). Read
`product/USER_ROLES.md` for who may do what.

## 1. Notifications — BE-011, FE-015 · start now

Other modules (Leave, Substitution, Documents) call your service, so build it
first and keep its interface small: `notify(userIds, { type, title, body, link })`.

- [x] `notifications` table (user, type, title, body, link, read_at) and
      migration (announce first; only one migration at a time)
- [x] Notification service used by other modules
- [x] API: my notifications (paged), mark one / all read
      (`notification.read`)
- [x] Live unread count over Socket.IO (authenticate the socket with the
      access token)
- [ ] Email sending behind the same service. _Needs an SMTP provider._
- [ ] Push sender: store device push tokens and send through the Expo push
      service (Pranav registers tokens from the app)
- [x] Web: `/notifications` and the bell in the top bar on real data
- [x] Announcements (`announcement.send`: HR/Principal to all, HOD to
      department)
- [x] Tests

## 2. Attendance — BE-004, FE-007 · waits for JCET attendance policy

Needed from JCET: how attendance is recorded (biometric export, register, or
check-in), working hours and late rule, working days and holidays.

- [x] `attendance` (one row per employee per date: check-in, check-out,
      status, source) and `attendance_corrections`
- [x] Policy as settings: hours, grace minutes, half-day rule, working days,
      holidays
- [x] Capture per JCET's method (import file, HR entry, or self check-in)
- [x] Corrections: request (own), approve (HOD department / HR all)
- [x] API: daily and monthly views, scoped by role
- [x] Web: `/attendance` on real data, corrections queue
- [x] API for Arihant's mobile attendance screens

## 3. Documents — BE-010, FE-013

- [x] Upload with file type and size checks; store metadata (type, file URL,
      verification status, expiry)
- [x] Verification queue for HR (`document.verify`); HODs never see documents
- [x] Expiry reminders through Notifications
- [x] Decide with Srujan how Aadhaar and PAN are stored (UIDAI rules)
- [x] Web: upload, preview, verification queue

## 4. Reports — BE-012, FE-014

- [x] Attendance, leave and workload reports with filters, scoped by role
      (`report.read`)
- [x] CSV export first, then PDF
- [x] Web: `/reports` filters and export buttons on real data

## Done means

Typecheck, lint, tests, build and formatting pass; endpoints documented in
`backend/API_ENDPOINTS.md`; tasks ticked in `BACKEND_TASKS.md` /
`FRONTEND_TASKS.md`; reviewed by Srujan.
