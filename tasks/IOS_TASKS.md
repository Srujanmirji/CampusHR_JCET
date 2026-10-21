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

- [ ] Record Xcode, simulator, Expo/Node versions and a reproducible local setup.
- [ ] Launch existing app on an iPhone simulator; test safe areas, keyboard and tabs.
- [ ] Decide supported iPhone/iOS versions and verify or explicitly revise declared iPad support.
- [ ] Record baseline export/typecheck/lint failures separately from new work.

Done: a teammate reproduces the local launch using [DEVELOPMENT.md](../mobile/ios-docs/DEVELOPMENT.md).

## IOS-002 — Native session contract

- [ ] Document cookie versus native token handling with refresh, rotation, logout and password change semantics.
- [ ] Test persistence/restart and native HTTP behavior; retain browser origin/cookie protections.
- [ ] Add any required backend contract and permission/security tests; document endpoint changes before mobile use.

Done: agreed transport works on native and existing browser session tests pass. No assumption that Bearer-only logout revokes the refresh session.

## IOS-003 — Secure client and session lifecycle

- [ ] Implement secure persistence using the agreed contract; keep secrets out of ordinary storage/logs.
- [ ] Restore session, serialize refresh, retry once, handle revocation and show useful errors.
- [ ] Guard protected navigation; clear credentials, sockets and account-specific caches on logout/switch.
- [ ] Ensure release sessions cannot enter demo mode after authentication or API failure.

Done: restart, expiry, parallel 401, password change, logout and account-switch tests pass on native.

## IOS-004 — Home

- [ ] Replace placeholder summaries with permitted live data; label unavailable values honestly.
- [ ] Add refresh, independent loading/error/empty states and links to each source screen.
- [ ] Verify no employee record does not become a department-wide personal dashboard.

Done: displayed values agree with the test account's backend records; no fake punch or balance appears offline.

## IOS-005 — Timetable

- [ ] Verify daily/week data and periods on iPhone with refresh/error recovery.
- [ ] Render dated server duties; check timezone, midnight/week rollover and live class status updates.
- [ ] Test empty/Sunday, long names and lab batches; keep demo assignments out of real sessions.

Done: own schedule agrees with the web/API and coverage never repeats on unrelated dates.

## IOS-006 — Attendance

- [ ] Integrate today, monthly history and correction requests.
- [ ] Enable mobile punch only for permitted users/policy; guard duplicate taps and ambiguous failures.
- [ ] Show server validation/permission errors without inventing a successful punch.

Done: permitted writes and rejected/offline cases agree with API records and policy.

## IOS-007 — Leave

- [ ] Verify current DTOs, real balances/types, half days, date entry and request history.
- [ ] Integrate apply/cancel and department-scoped HOD recommendations; preserve form input on failure.
- [ ] Remove demo fallback from every live leave read/write path.

Done: apply → recommendation/status → cancel/rejection paths work on native with correct API state.

## IOS-008 — Substitution

- [ ] Use affected-class/candidate endpoints and server eligibility scores, not the demo roster.
- [ ] Assign/undo using the API; refresh coverage, timetable and recipient duties after confirmed writes.
- [ ] Handle stale candidate conflicts and denial; do not report local-only real assignment success.

Done: an authorized HOD's assignment appears on another account/device and undo removes it. Keep the local prototype demo-only until then.

## IOS-009 — In-app notifications

- [ ] Implement paginated own list, unread count, read/read-all and foreground/reconnect refresh.
- [ ] Authenticate sockets with the current token; tear down on logout.
- [ ] Map allowed server links to native routes with auth/permission checks.

Done: changes persist across sessions and another user's notifications cannot be read.

## IOS-010 — Remote push

- [ ] Backend: define/register/remove owned device tokens; implement sender and invalid-token cleanup.
- [ ] Configure the approved project/signing capabilities and handle permission refusal or later changes.
- [ ] Test foreground/background/cold start, tap navigation, logout and account-switch cleanup on an iPhone.
- [ ] Remove release-facing test-notification controls; keep sensitive details out of lock-screen payloads.

Done: a real server event reaches the correct signed-in device; a local preview does not count.

## IOS-011 — Profile and documents

- [ ] Load own employee record and allowed contact edits; verify password change using the session contract.
- [ ] Integrate native document selection/upload/status and protected preview with server type/size limits.
- [ ] Handle cancellation, offline upload and expired/forbidden sessions without exposing cached files.

Done: own-record access/edit tests pass and restricted documents stay private after account changes.

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
