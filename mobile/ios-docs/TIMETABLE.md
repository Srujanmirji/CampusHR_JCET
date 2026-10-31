# IOS-005 — Own timetable and dated duties

Implemented on 21 October 2026 in the shared Expo app. Uses existing backend contracts; no migrations, endpoint changes or dependencies.

## Data and access

- Regular classes use `/timetable/entries?facultyId=<signed-in employee>` and `/timetable/periods`, with existing Zod validation and explicit employee ownership checks. Sunday has no regular timetable query.
- Own coverage uses `/substitution/mine` through the IOS-003 authenticated client, never the department assignment list. Duty payloads are validated for UUIDs, date, kind, original class, substitute identity and absent employee. Foreign substitute IDs and date/weekday mismatches fail closed.
- Exact calendar date is required when merging duties. A Wednesday assignment is not a repeating Wednesday timetable entry. Duplicate coverage IDs render once; regular data is not mutated. A refreshed response replaces removed assignments.
- Duty cards retain room, section, lab batch, full subject name, period span, covering-for name and arrangement note. Missing period definitions never get invented default timings.
- Missing employee links, missing permission, signed-out and demo sessions do not make personal requests. No local prototype assignments are read or merged into live schedules. Server-backed HOD management is documented in [IOS-008](SUBSTITUTION.md); the unused local prototype is removed.

## Calendar and refresh

Today follows campus time in `Asia/Kolkata`. Full Week shows actual Monday–Sunday dates and previous/next week navigation; the full selected date/year is visible. One-minute ticks and foreground/focus refresh update dates and class status. Only the exact current date can show Upcoming/In progress/Completed; another week’s weekday does not inherit today’s live status.

Regular classes and duties have separate queries. A coverage API/validation/timing failure shows a warning and Retry duties while preserving regular classes. A regular timetable failure shows Retry timetable, not an empty schedule or sample records. Pull-to-refresh and Refresh update both sources. Home shares the dated duty query and merge, so today’s coverage is included there too.

`/substitution/mine` returns assignments from the backend’s current day onward. The app does not claim historical coverage: past dates show the current regular weekday timetable with an explicit history limitation. This is not a historical timetable snapshot. The full list of permitted future duties is filtered locally by exact date.

## Verification

- All 41 mobile tests, mobile typecheck/lint, both UI smoke checks and iOS/Android/web exports pass.
- Nine new schedule tests cover owned reads, exact dates versus repeating weekdays, deduplication, lab ranges/batches/long names, removal after refresh, permission/employee/demo isolation, foreign/invalid records, independent failures, missing timings, Sunday, year/week rollover and live status boundaries.
- iPhone 17 Pro simulator, iOS 26.5, Expo Go: normal native login against the disposable API showed one regular class plus a multi-period lab duty on 21 October. Full Week → Next displayed the 28 October regular class with zero duties and no live status. Home counted both today’s slots and displayed the dated lab.
- Browser UI smoke at 375px and 1280px verifies lab content, next-week exclusion, independent duty failure and recovery, missing duty periods, undo followed by refresh, genuine empty state, regular-source failure, no horizontal overflow and keyboard-visible focus.
- The existing Home smoke verifies its summaries and missing-employee isolation after sharing coverage data. The app remains light-only and portrait.

Tests use authenticated fixtures with the real in-memory auth transport, not production HR data. Physical iPhone/iPad, VoiceOver, actual pull gesture and full-role/device acceptance remain IOS-013. HOD assignment/undo UI and realtime delivery remain later tasks.

## Reproduce

Follow the disposable API and Metro setup in [Home verification](HOME.md#reproduce-the-ui-check-without-a-database), then run:

```sh
npm test --workspace @campushr/mobile
node mobile/checks/schedule.smoke.mjs
node mobile/checks/home.smoke.mjs
```

The loopback preview server now includes dated schedule fixtures and independent failure/removal modes. It never connects to a database. Schedule screenshots are saved under `/tmp/campushr-ios005`. Stop the fixture API/Metro and restart Metro without the temporary API overrides afterward.
