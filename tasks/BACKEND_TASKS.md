# Backend Tasks

## BE-001 Project Setup

- [x] Node + Express + TypeScript
- [x] Prisma
- [x] PostgreSQL (Docker compose; no domain tables yet)
- [x] Environment validation
- [x] Error middleware

## BE-002 Auth

- [x] Users
- [x] Roles (seeded)
- [x] Permissions (approved matrix seeded; `requirePermission` checks; record-level scope with employees)
- [x] Login (email; employee ID once employees exist)
- [x] Refresh (rotation with replay detection)
- [x] Logout
- [x] Staff logins: HR creates a login for an employee, changes role, turns it off/on, sets a new password
- [x] Change own password (keeps this session, ends the others)
- [ ] Password reset (needs SMTP)

## BE-003 Employees

- [x] Employee schema
- [x] CRUD (archive instead of delete)
- [x] Search
- [x] Filters
- [x] Department assignment
- [x] Departments, designations and HOD assignment
- [x] Audit log for employee and department changes

## BE-004 Attendance

- [x] Attendance schema
- [x] Check-in/out
- [x] Manual records
- [x] Corrections
- [x] Reports (with BE-012 Reports)

## BE-005 Leave

- [x] Leave types (HR-editable: quota, half days, carry-over)
- [x] Balances (computed per year, with capped carry-over)
- [x] Requests (apply, cancel while pending)
- [x] Approval workflow (chain by role; audit-logged)
- [x] Validation (ranges, half days, overlap, balance)
- [x] Holiday calendar (`CAMPUS_HOLIDAYS` excluded alongside Sundays)

## BE-006 Timetable

- [x] Timetable schema (periods, subjects, rooms, entries)
- [x] CRUD
- [x] Conflict detection (faculty, room, section; lab batches)
- [x] Faculty availability (who is free in a slot — substitution candidates)

## BE-007 Workload

- [x] Workload calculation (weekly theory and lab hours from the timetable)
- [x] Threshold configuration (band per teaching designation, Principal)
- [x] Reports (workload report — with BE-012 Reports)

## BE-008 Smart Substitution

- [x] Detect impacted class (approved leave × timetable, half days)
- [x] Candidate query (free, not on leave, workload limit)
- [x] Ranking algorithm (35/25/15/15/10 rubric)
- [x] Assignment (substitute or no substitute needed; undo)
- [x] Notifications (with BE-011)

## BE-010 Documents

- [x] Upload metadata
- [x] Verification
- [ ] Expiry jobs

## BE-011 Notifications

- [x] Notification service
- [x] Socket.IO events
- [ ] Email integration (needs an SMTP provider)

## BE-012 Reports

- [x] Attendance reports
- [x] Leave reports
- [x] Workload reports

## BE-013 Security

- [x] Rate limiting
- [x] Audit logs
- [x] Secure headers
- [x] Permission tests
