# Srujan Mirji — Website (lead)

GitHub: `srujanmirji` · Team: Website · Plan: [`../TEAM_PLAN.md`](../TEAM_PLAN.md)

You own the academic chain — **Timetable → Faculty Workload → Leave → Smart
Substitution** — plus staff logins, reviews and deployment. Each module is
built end to end: Prisma model and migration, API module, web screen, tests.

Code goes in `backend/src/modules/<module>/` (routes, controller, service,
repository, schema — copy `employees/`) and
`frontend/src/features/<module>/` (api, components, pages).

## 1. Timetable — BE-006, FE-009 · done

- [x] Data model in `backend/DATABASE_SCHEMA.md`: periods, subjects, rooms,
      timetable entries (with lab batches)
- [x] Migration `timetable`
- [x] API: periods, subjects and rooms (list, create), entries by class or
      faculty, create / update / delete — `timetable.read`, `timetable.manage`
- [x] Clash detection: same faculty, room or class section at overlapping
      periods is refused with a clear message
- [ ] Faculty availability (who is free in a slot) — build with Substitution
- [x] Web: `/timetable` on API data; HOD adds, edits and removes classes;
      clashes shown in the dialog; faculty see "My timetable"
- [x] Tests: clash rules (unit), endpoints (`test/db`, in-memory PostgreSQL)
- [x] Endpoints documented in `backend/API_ENDPOINTS.md` for Arihant

## 2. Faculty Workload — BE-007, FE-010 · done

- [x] Weekly hours per faculty from timetable entries (theory, lab)
- [x] Thresholds (underloaded / normal / overloaded) as settings the
      Principal edits (`workload.configure`)
- [x] API: workload list (scoped) and one faculty's breakdown
- [x] Web: `/workload` on real data, plus the workload chart
- [x] Tests for the calculation (unit) and endpoints (`test/db`)

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
