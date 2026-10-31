# iOS delivery tasks

Baseline: 21 October 2026. All tasks below are open until their acceptance evidence exists. Existing shared code is a starting point, not a second app to rewrite.

Read the [iOS plan](../mobile/ios-docs/README.md). Owners follow the current [team split](TEAM_PLAN.md); confirm individual pickup in the task PR. IDs IOS-001–014 are stable. Keep shared feature implementation status in [MOBILE_TASKS.md](MOBILE_TASKS.md).

## Order and ownership

| ID      | Task                                   | Proposed owner                   | Depends on       | Shared tasks   |
| ------- | -------------------------------------- | -------------------------------- | ---------------- | -------------- |
| IOS-001 | Local iOS baseline and device scope    | Pranav                           | None             | MB-001         |
| IOS-002 | Agree and test native session contract | Srujan + Pranav                  | IOS-001          | MB-002         |
| IOS-003 | Secure sessions and request client     | Pranav                           | IOS-002          | MB-002         |
| IOS-004 | Live home summaries                    | Pranav                           | IOS-003          | MB-003         |
| IOS-005 | Timetable and date-correct duties      | Arihant                          | IOS-003          | MB-004, MB-009 |
| IOS-006 | Attendance integration                 | Arihant; Zeeshan reviews API     | IOS-003          | MB-005         |
| IOS-007 | Leave integration and HOD flow         | Arihant; Srujan reviews API      | IOS-003          | MB-006         |
| IOS-008 | Server-backed mobile substitution      | Arihant; Srujan reviews API      | IOS-005, IOS-007 | MB-009         |
| IOS-009 | In-app notifications and links         | Pranav                           | IOS-003          | MB-007         |
| IOS-010 | Device registration and remote push    | Pranav + Zeeshan                 | IOS-009, IOS-012 | MB-007         |
| IOS-011 | Profile, password and documents        | Pranav; API owners review        | IOS-003          | MB-008         |
| IOS-012 | Signed iPhone development build        | Pranav; Srujan approves accounts | IOS-001          | MB-001         |
| IOS-013 | iOS QA and Android regression          | Pranav + Arihant                 | IOS-004–012      | All mobile     |
| IOS-014 | TestFlight and release readiness       | Srujan + Pranav                  | IOS-013          | All mobile     |

IOS-004–009 and IOS-011 can proceed in parallel after session foundations. Start IOS-012 early enough to unblock physical-device push tests. Do not assign dates before account access and device availability are known.

## IOS-001 — Local baseline

In progress: [simulator baseline and reproduction notes](../mobile/ios-docs/BASELINE.md).

- [x] Record Xcode, simulator, Expo/Node versions and a reproducible local setup.
- [x] Launch existing app on an iPhone simulator; check safe areas, hardware text entry and all five tabs.
- [ ] Verify software keyboard presentation and form avoidance.
- [ ] Decide supported iPhone/iOS versions and verify or explicitly revise declared iPad support.
- [x] Record baseline export/typecheck/lint results and dependency warnings separately from new work.

Done: a teammate reproduces the local launch using [DEVELOPMENT.md](../mobile/ios-docs/DEVELOPMENT.md).

## IOS-002 — Native session contract

Backend contract and native HTTP verification ready: [decision and evidence](../mobile/ios-docs/NATIVE_SESSION.md). Mobile Keychain/restart integration is IOS-003.

- [x] Document cookie versus native token handling with refresh, rotation, logout and password change semantics.
- [x] Verify cookie-free native HTTP login/rotation/logout/password change and a fresh client presenting a saved credential; retain browser origin/cookie protections.
- [x] Verify actual persisted app restart with IOS-003; simulator cold restart restored the remembered session.
- [x] Add required backend contract and permission/security tests; document endpoint changes before mobile use.

Done: agreed transport works on native and existing browser session tests pass. No assumption that Bearer-only logout revokes the refresh session.

## IOS-003 — Secure client and session lifecycle

Implemented with [session verification evidence](../mobile/ios-docs/NATIVE_SESSION.md).

- [x] Implement secure persistence using the agreed contract; keep secrets out of ordinary storage/logs.
- [x] Restore session, serialize refresh, retry once, handle revocation and show useful errors.
- [x] Guard protected navigation; clear credentials and account-specific caches on logout/switch. Authenticated sockets are added in IOS-009.
- [x] Ensure release sessions cannot enter demo mode after authentication or API failure.

Verified: simulator cold restart, remembered/unremembered login, logout, account switching and protected deep links. Automated tests cover expiry, parallel 401, storage errors and races; IOS-002 verifies native password-change session isolation. Physical-device and full-role acceptance remains IOS-012–013; mobile password UI is IOS-011.

## IOS-004 — Home

Implemented: [Home integration and verification](../mobile/ios-docs/HOME.md).

- [x] Replace placeholder summaries with permitted live data; label unavailable values honestly.
- [x] Add refresh, independent loading/error/empty states and links to implemented source screens.
- [x] Verify no employee record does not become a department-wide personal dashboard.

Verified with disposable authenticated API fixtures in the iPhone simulator and the web build at 375/1280px. Read-only Home values match fixture responses; partial Attendance failure/retry leaves other summaries usable. No production HR records were accessed. Full role/device acceptance remains IOS-013. Dated duties were added in IOS-005. Attendance history/punches and the full notification inbox remain IOS-006 and IOS-009.

## IOS-005 — Timetable

Implemented: [dated timetable integration and evidence](../mobile/ios-docs/TIMETABLE.md).

- [x] Verify daily/week data and periods on iPhone simulator with refresh/error recovery.
- [x] Render dated server duties; test IST midnight/year/week rollover and live class status boundaries.
- [x] Test empty/Sunday, long names and lab batches; keep local demo assignments out of real sessions.

Simulator and authenticated fixture checks confirm an assigned lab appears only on its exact date, not the following week. Home uses the same dated duties. Regular classes remain available when coverage fails; removed duties disappear after refresh. Physical iPhone, iPad, VoiceOver and the broader role/device matrix remain IOS-013. `/substitution/mine` supplies current/future duties only; historical coverage is explicitly unavailable.

## IOS-006 — Attendance

Implemented: [attendance integration and verification](../mobile/ios-docs/ATTENDANCE.md).

- [x] Integrate own today record, monthly history and paged correction requests.
- [x] Enable explicit MOBILE punch actions only with permission and loaded policy/state; guard duplicate taps and ambiguous failures.
- [x] Show server validation/permission errors without inventing a successful punch or approved correction.

Browser and iPhone-simulator checks use disposable accounts and the actual attendance service with an in-memory repository. PostgreSQL tests verify atomic concurrent punches, scope, filtering and retained web behavior. Attendance policy/date semantics remain UTC and are labelled. Unknown correction outcomes require checking requests/HR; there is no automatic resend. Physical-device and full-role acceptance remains IOS-013.

## IOS-007 — Leave

- [x] Verify current DTOs, real balances/types, half days, date entry and request history.
- [x] Integrate apply/cancel and department-scoped HOD recommendations; preserve form input on failure.
- [x] Remove demo fallback from every live leave read/write path.

Verified: apply → recommendation/status → cancel/rejection paths work on the iPhone simulator against the actual leave service and a disposable repository. See [evidence and limits](../mobile/ios-docs/LEAVE.md). Physical-device acceptance remains IOS-013.

## IOS-008 — Substitution

- [x] Use affected-class/candidate endpoints and server eligibility scores, not the demo roster.
- [x] Assign/undo using the API; refresh coverage, timetable and recipient duties after confirmed writes.
- [x] Handle stale candidate conflicts and denial; do not report local-only real assignment success.

Verified with two separate HOD/Faculty sessions: assignment appears on the recipient's dated timetable and undo removes it after refresh. Native HOD assignment/undo passed on the simulator. The unused local prototype was removed. See [evidence and limits](../mobile/ios-docs/SUBSTITUTION.md); physical cross-device acceptance remains IOS-013.

## IOS-009 — In-app notifications

- [x] Implement paginated own list, unread count, read/read-all and foreground/reconnect refresh.
- [x] Authenticate sockets with the current token; tear down on logout.
- [x] Map allowed server links to native routes with auth/permission checks.

Verified: server read state survives a client restart, foreign IDs are rejected, live feeds/counts stay scoped across two accounts, and reconnect refetches missed changes. Native inbox/read/read-all/live delivery passed on the simulator. See [verification and limits](../mobile/ios-docs/NOTIFICATIONS.md). Physical-device acceptance remains IOS-013.

## IOS-010 — Remote push

Implementation ready: [session ownership, delivery worker and verification](../mobile/ios-docs/REMOTE_PUSH.md). Not complete: approved IOS-012 signing/project and real iPhone/APNs acceptance are still pending.

- [x] Backend: define/register/remove owned device tokens; implement sender and invalid-token cleanup.
- [x] Implement explicit permission controls, refusal/Settings recovery and foreground rechecks.
- [ ] Configure the approved project/signing capabilities (IOS-012).
- [ ] Test foreground/background/cold start, tap navigation, logout and account-switch cleanup on an iPhone.
- [x] Remove release-facing test-notification controls; keep sensitive details out of lock-screen payloads.

Done: a real server event reaches the correct signed-in device; a local preview does not count.

## IOS-011 — Profile and documents

- [x] Load own employee record and allowed contact edits; verify password change using the session contract.
- [x] Integrate native document selection/upload/status and protected preview with server type/size limits.
- [x] Handle cancellation, offline upload and expired/forbidden sessions without exposing cached files.

Implementation and automated/browser acceptance complete: own-record edits, password/session checks and document isolation pass. Native picker/PDF, VoiceOver and physical-device acceptance remain IOS-012/013; see [evidence and limits](../mobile/ios-docs/PROFILE_AND_DOCUMENTS.md).

## IOS-012 — Development build

- [ ] Record institution-owned signing/project access and chosen bundle identifier.
- [ ] Add reviewed build configuration and install a signed development build on an iPhone.
- [ ] Verify permission descriptions, API environment, launch and upgrade behavior.

Done: a physical device runs the recorded build; follow [RELEASE.md](../mobile/ios-docs/RELEASE.md).

## IOS-013 — QA gate

- [ ] Complete the [test matrix](../mobile/ios-docs/TESTING.md) with Faculty, Staff and HOD accounts.
- [ ] Check VoiceOver, large text, 44pt targets, contrast, keyboard focus and Reduce Motion.
- [ ] Run required automated checks, iOS/Android exports and shared Android smoke tests.
- [ ] Attach sanitized evidence and resolve release-blocking defects.

Done: no session/data isolation, false-success or broken primary-flow blockers remain; physical-device results are recorded.

## IOS-014 — TestFlight and release

- [ ] Confirm institution-approved distribution, privacy disclosures and reviewer/test account setup.
- [ ] Build/upload and verify installation/update in TestFlight against the approved API environment.
- [ ] Record build/API versions, known issues, support owner and recovery plan.
- [ ] Obtain release approval before wider distribution; deployment is a separate decision.

Done: approved signed build passes internal testing and [release gates](../mobile/ios-docs/RELEASE.md), with no credentials committed.
