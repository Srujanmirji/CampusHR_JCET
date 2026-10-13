# API Endpoints

Base path: `/api/v1`

## Auth

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
