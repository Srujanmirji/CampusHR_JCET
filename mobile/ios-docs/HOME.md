# IOS-004 — Home integration

Implemented on 21 October 2026 in the existing shared Expo app. No new backend endpoint, migration or dependency is needed.

## Sources and scope

| Home content                  | Existing API                                                                 | Scope                                                              |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Regular classes and timings   | `/timetable/entries?facultyId=…`, `/timetable/periods`, `/substitution/mine` | Explicit signed-in employee; filter current campus weekday         |
| Attendance status and punches | `/attendance/today`                                                          | Caller only; reject a foreign employee or mismatched returned date |
| Casual leave                  | `/leave/balances?employeeId=…&year=…`                                        | Explicit signed-in employee and campus year; active CL only        |
| Weekly workload               | `/workload/faculty/:employeeId`                                              | Explicit signed-in employee; never the department list             |
| Latest three notifications    | `/notifications?limit=3`                                                     | Current user                                                       |
| Unread count                  | `/notifications/unread-count`                                                | Current user; independent of preview length                        |

`mobile/lib/home-api.ts` validates response shapes through Zod and uses the IOS-003 authenticated client. Missing employee links prevent all personal requests, including for administrators/HODs. Missing permission prevents the corresponding query. Notifications can still load for a user without an employee link. Signed-out and demo sessions cannot fetch Home summaries; the screen explains that a real account is needed instead of showing invented punches, hours or balances.

A null Attendance record means no record, not absent. Missing CL is not configured; null remaining is no limit; zero stays zero. Other leave categories are not added into a misleading total. Workload bands may be absent. Errors replace the affected summary with a Retry action while successful sources remain visible.

## Refresh and navigation

Home uses separate Query entries per account/source, with date/year keys where applicable. Pull-to-refresh and the Refresh button invalidate Home queries; entering Home or returning to the foreground refreshes them too. A one-minute clock updates the campus date and class status in IST, including midnight/year rollover. The existing auth provider clears caches on account/permission changes. No data is persisted by Home.

Timetable and Leave buttons open existing mobile screens. Only permitted `/leave`, `/attendance`, `/timetable` and `/substitution` (dated Timetable) notification destinations are mapped; arbitrary/external URLs and unsupported destinations are not opened. A related-screen link does not mark a notification read. IOS-006 now links to the live mobile Attendance tab for history, permitted punches and correction requests. Attendance dates/policy and punch times now use explicitly labelled UTC; the rest of Home retains campus IST. The preview remains the latest three; [IOS-009](NOTIFICATIONS.md) adds the full inbox, read actions and authenticated live updates with a shared unread query. IOS-005 now adds exact-date server duties to Home using the same merge logic as Timetable; duties failures show a separate warning and leave regular classes usable.

The Attendance API defines its current day in UTC; IOS-006 now keys the Home Attendance summary by UTC date and validates returned dates against it. No backend attendance-timezone policy was changed.

## Verification

- Nine Home API tests cover own-HOD scope, no-employee administrators, non-teaching permissions, missing access, invalid payloads, foreign records, date/year validation, Sunday/IST rollover, null/empty results, independent failures and safe notification links.
- All 32 mobile unit tests pass, including earlier session/timetable/leave regressions. Mobile typecheck/lint and iOS/Android/web Expo exports pass.
- Browser smoke checks use the normal web login and Home UI at 375px and 1280px: populated/empty/unlimited states, partial failure and Retry, visible keyboard focus, no horizontal overflow, related-screen navigation and no-employee request isolation.
- iPhone 17 Pro simulator, iOS 26.5, Expo Go: normal native login against a disposable loopback API displayed the expected class count, 09:02 check-in, 6.5 casual-leave days, 12 workload hours and two unread notifications. An injected Attendance error left other sources intact; Retry recovered only that source. The Refresh button refreshed all sources.
- Visual polish preserved the existing navy/white theme, Inter typography and campus image; controls use the shared 48pt button and semantic tokens. The app remains light-only and portrait.

These are authenticated fixture checks, not an audit of production HR records or a physical-device test. Pull gesture behavior, VoiceOver, iPad and signed physical-device QA remain in IOS-013.

### Reproduce the UI check without a database

From the repository root, run these in separate terminals:

```sh
node --import tsx mobile/checks/home-preview.mjs
EXPO_PUBLIC_API_URL='http://[::1]:4011/api/v1' EXPO_PUBLIC_SOCKET_URL='http://[::1]:4011' npm run start --workspace @campushr/mobile -- --lan --port 8081
node mobile/checks/home.smoke.mjs
```

The preview server binds only IPv6 loopback and uses the in-memory auth repository plus `home-fixtures.mjs`. It never connects to a database. `home.smoke.mjs` requires Playwright and Chrome (the same local runtime used by the web smoke checks); screenshots go to `/tmp/campushr-ios004`. For a simulator check, open the Metro URL and use test ID `IOS004` with disposable password `home-check-only`; these are fixture-only credentials, not a real account. Do not enable Remember me for this throwaway check.

Stop both servers afterward and restart Metro without the temporary environment overrides. Never deploy this preview server or use a production login in the smoke script.
