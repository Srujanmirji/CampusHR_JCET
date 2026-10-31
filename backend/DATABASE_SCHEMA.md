# Database Schema

## Core Tables

### users

- id
- email
- password_hash
- role_id
- employee_id
- status
- last_login_at
- created_at
- updated_at

### refresh_sessions

- id
- user_id
- token_hash (SHA-256 of the refresh token; the token itself is never stored)
- expires_at
- revoked_at
- user_agent
- ip
- created_at
- last_used_at

### roles

- id
- name

### permissions

- id
- key
- description

### role_permissions

- role_id
- permission_id

### employees

Implemented (`backend/src/database/schema.prisma`).

- id (uuid)
- employee_code (unique, uppercase, e.g. JCET-CSE-021)
- first_name
- last_name
- email (unique, lowercase)
- phone (optional)
- department_id → departments (restrict delete)
- designation_id → designations (restrict delete)
- joining_date (date)
- employment_type (PERMANENT, CONTRACT, PROBATIONARY, VISITING)
- status (ACTIVE, ARCHIVED; archived records are kept)
- qualification, specialization, experience_years (optional)
- created_at
- updated_at

Aadhaar and PAN are not stored here; they belong to the Documents module.

### departments

- id
- code (unique, fixed after creation; part of employee IDs)
- name (unique)
- hod_employee_id → employees (unique, cleared when the HOD is archived)
- created_at
- updated_at

### designations

- id
- name (unique)
- level (lower is more senior)
- category (TEACHING, NON_TEACHING)

### attendance

- id
- employee_id
- date
- check_in
- check_out
- status
- source

### leave_types

Implemented. JCET's rules are data HR enters (`leave_type.manage`).

- id, code (unique, uppercase, e.g. CL), name (unique)
- yearly_quota (days; null = no limit, e.g. loss of pay)
- allow_half_day
- carry_forward_max (most unused days moving into the next year; 0 = none)
- active (retired types keep their history but take no new requests)
- created_at, updated_at
- Check: quota and carry-over are whole or half days, not negative.

Balances are not stored: a year's balance is the quota plus days carried in
(capped, counted from the joining year), minus approved and pending days.

### leave_requests

Implemented.

- id (uuid)
- employee_id → employees; department_id (the applicant's, when applying)
- leave_type_id → leave_types
- start_date, end_date (inclusive, same calendar year); half_day (FIRST |
  SECOND, one date only)
- days (Monday–Saturday working days; 0.5 for a half day)
- reason
- status (PENDING | APPROVED | REJECTED | CANCELLED)
- approver_roles (the chain, fixed when applying); pending_role (who acts
  next; null once decided)
- created_at, updated_at

### leave_decisions

Implemented. One row per approval or rejection.

- id, request_id → leave_requests, step, role
- decider_user_id → users, approved, note, decided_at

### periods

Implemented. number (1–7), start_time, end_time ("HH:MM").

### subjects

- id
- code (unique VTU course code, uppercase)
- name
- department_id → departments
- semester (1–8)
- kind (THEORY, LAB)

### rooms

- id
- name (unique)
- kind (CLASSROOM, LAB)

### timetable_entries

Implemented.

- id (uuid)
- department_id, semester, section (e.g. A), batch (optional, e.g. A1)
- subject_id → subjects
- faculty_id → employees
- room_id → rooms
- day (MON–SAT)
- start_period, end_period (inclusive; a lab may span two)
- created_at, updated_at

### workload_thresholds

Implemented. Weekly hours themselves are not stored: they are summed from
`timetable_entries` (one period = one contact hour; theory vs lab by the
subject's kind).

- designation_id (primary key) → designations (teaching only)
- min_hours, max_hours (check: 0 ≤ min ≤ max); below min is underloaded,
  above max overloaded
- updated_at

Seeded: Professor 10–14, Associate Professor 12–16, Assistant Professor
14–18. The Principal changes them in the app.

### substitutions

Implemented. How each class missed through approved leave is covered.

- id (uuid)
- leave_request_id → leave_requests; timetable_entry_id → timetable_entries
  (deleting the class deletes its coverage)
- date; unique (timetable_entry_id, date)
- kind (SUBSTITUTE | NOT_NEEDED); substitute_id → employees (SUBSTITUTE only);
  note (the arrangement, required for NOT_NEEDED)
- assigned_by_user_id → users, created_at

### documents

- id
- employee_id
- type
- file_url
- verification_status
- expiry_date

### notifications

Implemented. Deleted with the user.

- id
- user_id
- kind (`leave.waiting`, `leave.approved`, `substitution.assigned`,
  `announcement`, …)
- title
- body
- link (web path to open, optional)
- read_at
- created_at

Indexed on (user_id, created_at) and (user_id, read_at).

### audit_logs

Implemented; written in the same transaction as each employee or department
change.

- id
- actor_user_id
- action
- resource
- resource_id
- before_json
- after_json
- created_at

## Remote push (IOS-010)

Migration `20261022120000_push_devices` adds:

- `push_devices`: UUID ID, unique Expo routing token, owned user ID, unique refresh
  session ID, approved Expo project UUID, `ios|android` platform, registration update timestamp. Deleting the
  user/session cascades; token rotation/account transfer updates ownership through
  the validated API. Tokens must never be returned in list APIs or logs.
- `push_deliveries`: UUID ID, notification/device foreign keys (cascade), unique
  notification/device pair, attempt count, next attempt/lease time, optional Expo
  ticket ID and creation time. Due-time indexing supports concurrent worker claims.

Logout/password changes remove devices for ended sessions. Refresh rotation moves
registrations to the replacement session while preserving queued jobs. The queue
never stores private message text separately. Applying this migration to a real
local/staging/production database remains an explicit deployment step.
