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

- [ ] Attendance schema
- [ ] Check-in/out
- [ ] Manual records
- [ ] Corrections
- [ ] Reports

## BE-005 Leave

- [ ] Leave types
- [ ] Balances
- [ ] Requests
- [ ] Approval workflow
- [ ] Validation

## BE-006 Timetable

- [x] Timetable schema (periods, subjects, rooms, entries)
- [x] CRUD
- [x] Conflict detection (faculty, room, section; lab batches)
- [ ] Faculty availability (who is free in a slot — with Smart Substitution)

## BE-007 Workload

- [x] Workload calculation (weekly theory and lab hours from the timetable)
- [x] Threshold configuration (band per teaching designation, Principal)
- [ ] Reports (workload report — with BE-012 Reports)

## BE-008 Smart Substitution

- [ ] Detect impacted class
- [ ] Candidate query
- [ ] Ranking algorithm
- [ ] Assignment
- [ ] Notifications

## BE-010 Documents

- [ ] Upload metadata
- [ ] Verification
- [ ] Expiry jobs

## BE-011 Notifications

- [ ] Notification service
- [ ] Socket.IO events
- [ ] Email integration

## BE-012 Reports

- [ ] Attendance reports
- [ ] Leave reports
- [ ] Workload reports

## BE-013 Security

- [ ] Rate limiting
- [ ] Audit logs
- [ ] Secure headers
- [ ] Permission tests
