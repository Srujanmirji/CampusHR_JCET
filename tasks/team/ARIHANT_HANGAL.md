# Arihant Hangal — Mobile app

GitHub: _to confirm_ · Team: Mobile · Plan: [`../TEAM_PLAN.md`](../TEAM_PLAN.md)

You own the **Timetable, Leave and Attendance screens** of the faculty and
staff app in `mobile/` (React Native, Expo, Expo Router, TanStack Query).
Pranav builds the tabs and API client your screens use.

Read first: `mobile/MOBILE_APP.md`, `design/MOBILE_UX.md`,
`design/DESIGN_SYSTEM.md`, `mobile/lib/theme.ts`,
`backend/API_ENDPOINTS.md`. Run with `npm run dev:mobile`.

Each API comes from the website team. Until it exists, build the screen on
sample data in `mobile/lib/sample/`, then switch to the API. Agree the data
shape with the owner first, so the switch is small.

## 1. Timetable — MB-004 · live reads implemented

API owner: Srujan (Timetable).

- [x] Today: classes in order with time, subject, class section and room;
      current class highlighted
- [x] Week: day-by-day view
- [x] Server-assigned substitute duties on their exact dates, shared with Home (IOS-005); assignment/undo UI remains IOS-008
- [x] Pull to refresh; works with no classes (holiday, weekend)
- [x] Switch to the Timetable API when it lands

## 2. Leave — MB-006 · after JCET leave rules

API owner: Srujan (Leave).

- [x] Balances by leave type
- [x] Apply: type, validated date entry with Today/Tomorrow shortcuts, half day if allowed,
      reason
- [x] My requests with status and the next approver
- [x] Cancel a pending request (with confirmation)
- [x] Department-scoped HOD recommendations and rejection notes (IOS-007); [simulator evidence](../../mobile/ios-docs/LEAVE.md)

## 3. Attendance — MB-005 · after JCET attendance policy

API owner: Zeeshan (Attendance).

- [x] Today's status (present, late, half day, absent, on leave)
- [x] Own monthly history (IOS-006)
- [ ] Attendance percentage needs an approved expected-working-days denominator; missing rows are not automatically absences
- [x] Explicit MOBILE check-in/out where the account has permission; current UTC policy is labelled
- [x] Request a correction and view own request/review status (IOS-006)

## Substitution — MB-009 / IOS-008

- [x] Server-approved leave/classes, candidate scores and eligibility
- [x] Confirm assignment, no-substitute arrangements and undo through the API
- [x] Preserve failed notes and reconcile unknown outcomes
- [x] Simulator management and separate recipient-account timetable verification; [evidence](../../mobile/ios-docs/SUBSTITUTION.md)

## For every screen

- [ ] Loading, empty and error states
- [ ] 44pt tap targets, labels on every control, large text works
- [ ] Status shown in words, not colour alone

## Done means

`npm run typecheck` and `lint` pass for `mobile/`; `npx expo export` builds iOS
and Android bundles; tested on a simulator or phone; tasks ticked in
`MOBILE_TASKS.md`; reviewed by Pranav.

## iOS delivery

Follow [IOS_TASKS.md](../IOS_TASKS.md): IOS-005–008 (timetable/attendance/leave/substitution), then joint device and accessibility QA (IOS-013). Start after the native session contract/client (IOS-002–003), using [the iOS guide](../../mobile/ios-docs/README.md).
