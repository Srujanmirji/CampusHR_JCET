# IOS-008 — Server-backed substitution management

Implemented on 21 October 2026. Leave now offers **Class coverage** to accounts with substitution read and department/all assignment permission. Department-scoped managers need a department; faculty, signed-out and demo sessions cannot open this management flow. Personal dated duties remain in Home and Timetable (IOS-005).

## Server data and decisions

The client uses `/substitution/leave?from=YYYY-MM-DD`, `/leave/:id`, `/leave/:id/candidates?entryId=…&date=…` and `/rubric` under `/substitution`. Approved leave, affected dates, full class periods, room/batch and coverage come from the server. The mobile app does not derive affected classes or rank a sample faculty roster. DTOs are validated; foreign department classes, mismatched leave IDs, absent faculty, dates/weekday and invalid period/hour spans are refused.

The list follows campus IST's current calendar date. A class is identified by both date and timetable-entry ID. Server scores, five point components and rubric maxima are displayed along with weekly hours after assignment, maximum hours and eligibility/reason. Ineligible candidates cannot be selected. A candidate invalidated by a refresh cannot be submitted; the backend also rechecks availability when assigning. The existing limits are 25 ranked candidates and up to 300 source leave records, without server paging.

The manager selects a candidate, optionally adds a note and explicitly confirms the dated class. Alternatively **No substitute needed** requires a trimmed 3–500 character arrangement note. POST `/substitution/assignments` is accepted only with a validated coverage response matching the selected recipient/kind/note. There is no optimistic success or local assignment persistence. The obsolete local store and demonstration modal were deleted after their callers were replaced.

Recorded coverage has **Undo coverage**, followed by an explicit confirmation. DELETE `/substitution/assignments/:id` must return 204 before success is reported. The screen refreshes coverage/list/candidates and invalidates this client's Home, dated duties, timetable and notification queries. Another account/device receives the changed duties from `/substitution/mine` on refresh, focus or foreground; automatic cross-device socket refresh remains IOS-009.

## Errors and recovery

Reads have loading/error/empty states and explicit refresh; pull-to-refresh on Leave also refreshes coverage. Mutation requests have a shared synchronous in-flight guard and 15-second timeout covering the response body. Writes are not automatically retried. Server denials or stale-candidate conflicts remain errors, retain the note and refresh server state. No sample data replaces a failed read or write.

A lost/invalid/timeout write response blocks another management action and retains form state. **Check recorded coverage** fetches the selected leave's classes again. It shows the recorded recipient/arrangement or that the class is uncovered, clears the selection and refreshes candidates before another assignment. It does not claim the previous operation succeeded. If checking fails or the class disappeared, the guard stays in place. Server uniqueness protects the dated class; add server idempotency keys before automatic retries.

## Verification

- All 65 mobile unit tests passed, including six new coverage tests for permission gates, exact date/entry filters, validated scope/counts, server eligibility/scores, note rules, recipient confirmation, serialized writes and required undo acknowledgement.
- `mobile/checks/coverage.smoke.mjs` uses separate HOD and Faculty browser sessions against the actual substitution router/service backed by a disposable repository. It verifies scoped affected classes, an unavailable candidate, refused/stale selection, assignment appearing on the recipient's dated lab timetable, undo removing it after refresh, NOT_NEEDED coverage, and lost POST/DELETE responses with recorded-state recovery.
- 375px and 1280px layouts, long lab names, keyboard focus and labelled shared controls were checked. The existing light navy/white/Inter system is retained. Screenshots: `/tmp/campushr-ios008`.
- iPhone 17 Pro simulator (iOS 26.5, Expo Go): viewed the actual test-service lab/candidate scores, selected an eligible candidate, entered a note with the software keyboard, confirmed server coverage (1/1), then confirmed undo (0/1). The overloaded candidate was disabled.
- Home, Timetable, Attendance and Leave browser regression checks, workspace typecheck/lint and iOS/Android/web bundle exports passed.

Reproduce with the disposable API and Metro commands in [Home verification](HOME.md#reproduce-the-ui-check-without-a-database), then run `node mobile/checks/coverage.smoke.mjs`. Fixture accounts, notifications and assignments use memory only. Stop preview services and restart normal Metro afterward. No dependencies, backend contracts, migrations or production data changed for IOS-008.

Physical cross-device tests, VoiceOver, iPad and complete role/device acceptance remain IOS-013. Remote notifications and live socket delivery are separate tasks.
