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

## 1. Timetable — MB-004 · start now on sample data

API owner: Srujan (Timetable).

- [ ] Today: classes in order with time, subject, class section and room;
      current class highlighted
- [ ] Week: day-by-day view
- [ ] Substitute duties assigned to you, marked clearly
- [ ] Pull to refresh; works with no classes (holiday, weekend)
- [ ] Switch to the Timetable API when it lands

## 2. Leave — MB-006 · after JCET leave rules

API owner: Srujan (Leave).

- [ ] Balances by leave type
- [ ] Apply: type, dates (date pickers, minimal typing), half day if allowed,
      reason
- [ ] My requests with status and the next approver
- [ ] Cancel a pending request (with confirmation)

## 3. Attendance — MB-005 · after JCET attendance policy

API owner: Zeeshan (Attendance).

- [ ] Today's status (present, late, half day, absent, on leave)
- [ ] Monthly history and attendance percentage
- [ ] Check in and out from the app, if JCET chooses self check-in
- [ ] Request a correction for a day

## For every screen

- [ ] Loading, empty and error states
- [ ] 44pt tap targets, labels on every control, large text works
- [ ] Status shown in words, not colour alone

## Done means

`npm run typecheck` and `lint` pass for `mobile/`; `npx expo export` builds iOS
and Android bundles; tested on a simulator or phone; tasks ticked in
`MOBILE_TASKS.md`; reviewed by Pranav.
