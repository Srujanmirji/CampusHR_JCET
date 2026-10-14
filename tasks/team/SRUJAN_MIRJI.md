# Srujan Mirji — Website (lead)

GitHub: `srujanmirji` · Team: Website · Plan: [`../TEAM_PLAN.md`](../TEAM_PLAN.md)

You own the academic chain — **Timetable → Faculty Workload → Leave → Smart
Substitution** — plus staff logins, reviews and deployment. Each module is
built end to end: Prisma model and migration, API module, web screen, tests.

Code goes in `backend/src/modules/<module>/` (routes, controller, service,
repository, schema — copy `employees/`) and
`frontend/src/features/<module>/` (api, components, pages).

## 1. Timetable — BE-006, FE-009 · start now

- [ ] Agree the data model with the team; add to `backend/DATABASE_SCHEMA.md`:
      `subjects` (code, name, department, semester), `rooms` (name, type:
      classroom / lab), `timetable_entries` (department, semester, section,
      subject, faculty, room, day, start, end)
- [ ] Migration (announce first; only one migration at a time)
- [ ] API: subjects and rooms (list, create), timetable by department / faculty,
      create / update / delete entry — permissions `timetable.read`,
      `timetable.manage` (HOD: own department)
- [ ] Clash detection: same faculty, room or class section at overlapping
      times is refused with a clear message
- [ ] Faculty availability: free slots for a faculty member on a day
- [ ] Web: replace the sample grid on `/timetable` with API data; HOD adds and
      edits entries; clashes shown inline
- [ ] Tests: clash rules (unit), endpoints (`test/db`)
- [ ] Document endpoints in `backend/API_ENDPOINTS.md` (Arihant's mobile
      timetable uses them)

## 2. Faculty Workload — BE-007, FE-010

- [ ] Weekly hours per faculty from timetable entries (theory, lab)
- [ ] Thresholds (underloaded / normal / overloaded) as settings the
      Principal edits (`workload.configure`)
- [ ] API: workload list (scoped) and one faculty's breakdown
- [ ] Web: `/workload` on real data, plus the workload chart
- [ ] Tests for the calculation

## 3. Leave — BE-005, FE-008 · waits for JCET leave rules

Decided: calendar leave year; Faculty → HOD → HR, staff → HR, HOD →
Principal (`features/LEAVE_MANAGEMENT.md`).

- [ ] Leave types and yearly quotas as HR-editable data (`leave_type.manage`)
- [ ] Balances per employee per year; carry-over per JCET rules
- [ ] Apply (date range, half day if allowed, reason), cancel while pending
- [ ] Approval steps with the next approver shown; reject with a note
- [ ] Validation: no overlapping requests, no negative balance, valid ranges
- [ ] Audit-log every approval (`backend/src/common/audit.ts`)
- [ ] Web: apply form, approval list and drawer on real data, leave calendar
- [ ] API for Arihant's mobile leave screens

## 4. Smart Substitution — BE-008, FE-011

- [ ] Find classes affected by an approved leave (from the timetable)
- [ ] Candidates: free in that slot, under workload threshold; rank with the
      rubric in `frontend/src/lib/academic.ts` (move it to the API)
- [ ] HOD assigns; substitute is notified (Zeeshan's Notifications service)
- [ ] Web: `/substitution` on real data

## 5. Logins and password reset — BE-002

- [ ] Create a CampusHR login for an employee (`user.manage`), choose role
- [ ] Password reset by email. _Needs an SMTP provider._

## Lead duties

- [ ] Review and merge pull requests (checks must pass)
- [ ] Keep `TEAM_PLAN.md` and the task files current
- [ ] Deployment: hosting for web, API and PostgreSQL; production `.env`
- [ ] Decide file storage (Supabase Storage or Cloudinary) for Documents

## Done means

Typecheck, lint, tests, build and formatting pass; endpoints documented;
tasks ticked in `BACKEND_TASKS.md` / `FRONTEND_TASKS.md`; reviewed by Zeeshan.
