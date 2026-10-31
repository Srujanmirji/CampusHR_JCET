# IOS-006 — Attendance integration

Implemented on 21 October 2026. Uses existing models/permissions; no migrations or dependencies. The existing navy/white mobile design, Inter typography and shared form controls are retained.

## Read paths and ownership

Today uses `/attendance/today`; monthly history uses `/attendance?employeeId=…&startDate=…&endDate=…&page=1&limit=50`. A month has at most 31 unique employee/date rows. Correction history uses `/attendance/corrections?employeeId=…&page=…&limit=10`, including pending, approved/rejected and review notes. Policy comes from `/attendance/settings`.

Every payload is validated. Foreign employee records, wrong dates/months/pages and incomplete monthly responses are refused. Missing employee links, missing read permission, signed-out and demo sessions do not make personal requests. Today/history/policy/request errors are independent; null today or empty history is not converted into absence. Completed duration is calculated from recorded timestamps; missing check-out has no fabricated completed duration or attendance percentage.

The backend now accepts an optional employee filter for correction lists while retaining own/department/all scope. Missing scope identity returns empty lists. Invalid pagination/status/employee filters return validation errors. Home links to Attendance and refreshes its summary after writes.

## Dates and policy

The current backend uses UTC for attendance dates, policy start/end, grace and punch status calculations. The mobile screen and correction fields explicitly use UTC, independent of phone timezone. This task does not silently reinterpret institution policy as IST. Home’s attendance card uses the UTC attendance date/times while its timetable continues to use campus IST. Confirm the institution’s desired timezone separately before release.

## Punching

A punch requires an employee, `attendance.check_in`, a loaded current record and loaded policy. Buttons state Check in or Check out; a completed check-out directs the user to corrections. Requests send `source: MOBILE`, explicit `action: CHECK_IN|CHECK_OUT` and expected UTC `date`.

The backend adds conditional writes on existing employee/date uniqueness. Duplicate/concurrent explicit actions return 409 `PUNCH_CHANGED`; they do not toggle into the next action or overwrite timestamps. A changed attendance date returns `DATE_CHANGED`. Existing browser requests without action retain their toggle behavior.

A synchronous UI guard and shared in-flight write guard stop double taps; the write timeout covers the response body. The client does not automatically retry a failed POST. A success requires a validated server record. Unknown outcomes show an unconfirmed message, disable punching and require a fresh recorded-state check before another explicit action. A refresh error leaves the block in place.

## Corrections

The form validates a real past/current date, 24-hour UTC times, ordered times, requested status and a trimmed 3–500 character reason. It explains that blank times request removal and that the proposed times replace the day’s times when approved. Submitting is not approval and does not edit attendance immediately. Confirmation must match the employee, date, requested times/status/reason and return PENDING.

Definite server refusals preserve input and show the response. If a response is lost, times out or is invalid, submission stays blocked for this screen and input is retained. The request list refreshes so the user can check for receipt, or contact HR. There is no automatic resend and no false success. Corrections have no server idempotency key; do not bypass this recovery by blindly submitting again after restarting the app.

## Verification and limits

- All 140 automated tests pass (50 backend unit, 39 PostgreSQL integration, 51 mobile), along with workspace typecheck/lint, backend/web build and iOS/Android/web exports.
- Ten mobile tests cover owned filters, no-employee/demo/permission isolation, invalid/foreign responses, empty results, explicit MOBILE action/date, duplicate in-flight writes, correction field conversion/validation/confirmation, uncertain outcomes and UTC calendar/duration handling.
- Four PostgreSQL integration tests cover concurrent check-in/out (one success plus one conflict), stale date/invalid action/forbidden role, legacy web payloads, correction employee filters and role caps, validated pagination, and missing employee/department scope. Tests clean up their fixture employees to avoid affecting other shared-database suites.
- The browser smoke uses real auth and attendance services with a disposable in-memory repository. It exercises 375/1280px layouts, keyboard focus, refused punches, committed writes with lost responses, reconciliation, check-out, retained correction input, pending submissions, request blocking, history error/retry/month changes and no-employee isolation.
- iPhone 17 Pro simulator (iOS 26.5, Expo Go): the native flow displayed an empty day, then actual test-service check-in/out, HALF DAY status and the matching monthly record/duration. No production database/account or real attendance was changed.

Physical iPhone/iPad, VoiceOver, software-keyboard avoidance and the complete role/device matrix remain IOS-013. No GPS/biometric enforcement, attendance percentage or review/approval UI was added. Review remains in the existing web workflow.

## Reproduce safely

Use the disposable preview API and Metro commands in [Home verification](HOME.md#reproduce-the-ui-check-without-a-database). The preview now mounts the actual attendance router/service with `backend/test/attendance-memory.ts`, never a database. Then run:

```sh
node mobile/checks/attendance.smoke.mjs
npm test --workspace @campushr/mobile
npm test
# Unset TEST_DATABASE_URL to use temporary in-memory PostgreSQL.
env -u TEST_DATABASE_URL npm run test:db --workspace @campushr/api
```

The smoke uses fixture-only credentials, resets the disposable attendance repository and injects failures after commits to verify unknown outcomes. Screenshots go to `/tmp/campushr-ios006`. Stop the test API/Metro and restart Metro without fixture overrides afterward.
