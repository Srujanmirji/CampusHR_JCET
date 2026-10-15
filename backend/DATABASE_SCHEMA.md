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

- id
- name
- annual_limit

### leave_balances

- id
- employee_id
- leave_type_id
- year
- allocated
- used
- remaining

### leave_requests

- id
- employee_id
- leave_type_id
- from_date
- to_date
- reason
- status
- current_approver_id

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

- id
- original_faculty_id
- substitute_faculty_id
- timetable_entry_id
- date
- status

### documents

- id
- employee_id
- type
- file_url
- verification_status
- expiry_date

### notifications

- id
- user_id
- type
- title
- body
- read_at

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
