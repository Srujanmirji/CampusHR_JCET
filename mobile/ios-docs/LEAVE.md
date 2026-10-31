# IOS-007 — Leave and HOD recommendations

Implemented on 21 October 2026 with the existing navy/white theme, Inter typography and shared controls. No new dependency, database migration or backend contract is required.

## Records and scope

The Leave tab reads validated DTOs from `/leave/types`, `/leave/balances?employeeId=…&year=…` and `/leave/requests?employeeId=…&year=…`. Personal history always filters by the linked employee, including for HOD/admin accounts. Returned foreign employee records and wrong years are refused. Missing employee links, missing permission, demo and signed-out sessions cannot fetch personal leave records or apply.

HOD accounts with `leave.approve` and a department use a separate `/leave/requests?awaitingMe=true` query. Every returned row must be pending at the HOD step, in that department and belong to another employee. Personal balance/type failures cannot hide this queue. Other roles continue to use the existing web approval workflow.

Queries refresh on focus, foreground, pull-to-refresh and the labelled refresh button. Confirmed writes invalidate Leave, Home and notification summaries. Loading/error/empty states are separate for balances, types and request lists. Personal history offers year and status selection, including cancelled records. The existing API caps lists at the newest 500 matching requests; reaching that cap is disclosed. Server pagination remains a backend follow-up.

## Applying and tracking

Only active leave types can be selected. Quotas preserve zero and unlimited values, used/pending days and carry-in. Inactive historical balances remain labelled. Form dates are explicit YYYY-MM-DD calendar dates; Today/Tomorrow use campus IST. Validation checks real dates, order, one calendar year, single-date half days, non-Sunday dates and a trimmed 3–500 character reason. Half-day controls only appear for a type allowing them and reset when changing to a type without halves. The backend remains authoritative for Sunday exclusions, overlap, quota and approval chain.

A successful application requires the server's pending request to match the employee, type, dates, half-day session and reason. History displays the actual next approver and recorded decisions/notes. A HOD recommendation may return PENDING with HR next; it is never labelled final approval. Rejection requires a reason and a confirmed rejected request. Cancellation requires explicit confirmation and a confirmed cancelled response, and is available only for pending personal requests.

## Failure handling

Synchronous guards prevent double taps; shared writes serialize and use a 15-second timeout covering the response body. Network/server/invalid-response outcomes are not automatically retried. Definite denials/conflicts retain inputs and show the server error. Unknown outcomes retain form/note data, show an unconfirmed message and block another submission in that form. Close and refresh history/queue to check receipt; do not bypass the guard by reopening/restarting and resend without checking. Cancellation additionally offers a fresh request-status check before another attempt. There is no server idempotency key.

Forms scroll above the native keyboard, keep drafts on failed writes and disable editing/closing during submission. Controls have accessible labels/roles and minimum 48-point actions. Explicit demo API fixtures remain for existing isolated checks; the live Leave screen offers no demo write path or sample fallback. The former local substitution controls are not presented as real assignments; server-backed HOD assignment is IOS-008.

## Verification

All 59 mobile unit tests, four browser smoke scripts (Home, Timetable, Attendance, Leave), workspace typecheck/lint, and iOS/Android/web exports passed. No new backend code was needed for IOS-007.

- `mobile/checks/leave.test.mjs` covers scoped/year-filtered reads, malformed data, quotas, date rules, confirmed writes, intermediate approval states, duplicate suppression and unknown errors. Backend decision steps begin at zero; the response parser accepts this actual contract.
- `mobile/checks/leave.smoke.mjs` mounts the actual leave router/service against a disposable in-memory repository in `home-preview.mjs`. It checks department/self/next-step isolation, recommendation to HR, rejection, cancellation, half-day submission, refused writes retaining inputs, a committed submission with a lost response, independent balance errors and missing employee links. Browser layouts at 375/1280px and keyboard focus are checked. Screenshots: `/tmp/campushr-ios007`.
- iPhone 17 Pro simulator, iOS 26.5/Expo Go: verified real test-service balances, HOD recommendation advancing to HR, rejection, pending cancellation restoring the balance and a native first-half application appearing as 0.5 pending days with Principal next. The software keyboard and scroll-to-submit path were exercised.

Reproduce with the disposable API/Metro commands in [Home verification](HOME.md#reproduce-the-ui-check-without-a-database), then `node mobile/checks/leave.smoke.mjs`. Fixture-only accounts and records never access a database. Stop the fixture API/Metro and restart normal Metro after verification.

Physical-device, VoiceOver, iPad, cross-device and complete role acceptance remain IOS-013. Production HR data and Railway were not changed.
