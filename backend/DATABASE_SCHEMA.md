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

- id
- employee_code
- first_name
- last_name
- email
- phone
- department_id
- designation_id
- joining_date
- employment_type
- status
- created_at
- updated_at

### departments

- id
- name
- code
- hod_employee_id

### designations

- id
- name
- level

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

### timetable_entries

- id
- department_id
- faculty_id
- subject_id
- room_id
- day_of_week
- start_time
- end_time
- class_section

### workload_entries

- id
- faculty_id
- type
- hours
- week_start

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

- id
- actor_user_id
- action
- resource
- resource_id
- before_json
- after_json
- created_at
