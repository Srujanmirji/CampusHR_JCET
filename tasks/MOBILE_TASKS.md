# Mobile Tasks

Shared Android/iOS implementation checklist. Existing checkmarks do not imply native-device acceptance. Follow the [iOS delivery backlog](IOS_TASKS.md) for platform verification and release gates.

## MB-001 Setup

- [x] Expo
- [x] TypeScript
- [x] Router
- [x] Query client

## MB-002 Authentication

- [x] Login
- [x] Secure token storage
- [x] Logout

IOS-003 simulator restart and automated session evidence: [Native sessions](../mobile/ios-docs/NATIVE_SESSION.md). Physical-device QA remains open.

## MB-003 Home

- [x] Today’s regular classes (own employee only)
- [x] Attendance summary (read-only)
- [x] Casual leave balance and link to full balances
- [x] Latest notification preview and unread count

IOS-004 uses existing APIs with independent failure/empty/loading states and refresh. [Home evidence and remaining limits](../mobile/ios-docs/HOME.md).

## MB-004 Timetable

- [x] Daily own timetable with server period timings
- [x] Dated week navigation and exact-date substitution duties

[IOS-005 verification and limits](../mobile/ios-docs/TIMETABLE.md).

## MB-005 Attendance

- [x] Own today status, punches and recorded duration
- [x] Own monthly attendance history
- [x] Permission-gated explicit check-in/out
- [x] Submit and track correction requests

[IOS-006 evidence, UTC policy and ambiguous-write limits](../mobile/ios-docs/ATTENDANCE.md).

## MB-006 Leave

IOS-007 connects validated own/year-scoped records and HOD recommendations to the API. Simulator and disposable-service checks are recorded in [Leave integration](../mobile/ios-docs/LEAVE.md).

- [x] Apply
- [x] View status
- [x] Cancel

## MB-007 Notifications

- [x] Remote push implementation: private session-owned registration, durable sender/receipts, permission UI and safe taps (IOS-010)
- [ ] Remote push acceptance on an approved signed iPhone build; actual APNs delivery remains unverified (IOS-010/012)
- [x] In-app: paged own inbox, shared unread count, confirmed read/read-all, authenticated live refresh and safe links (IOS-009)

See [notification verification](../mobile/ios-docs/NOTIFICATIONS.md).

## MB-008 Profile

- [x] Own employee record and allowed phone edit; session-aware password change (IOS-011)
- [x] Own documents, native selection/transport, review status and protected preview (IOS-011); native iOS PDF/picker acceptance remains IOS-012/013

See [Profile evidence and limits](../mobile/ios-docs/PROFILE_AND_DOCUMENTS.md).

## MB-009 Substitution

- [x] Replace the local assignment demonstration with server-backed coverage (IOS-008)
- [x] Read own dated duties from the server (Home and Timetable; IOS-005)
- [x] HOD candidate selection, assignment and undo through the API
- [x] Verify cross-account updates and conflict/unknown-outcome handling (IOS-008); physical cross-device testing remains IOS-013

See [substitution integration](../mobile/ios-docs/SUBSTITUTION.md) for verification and remaining limits.
