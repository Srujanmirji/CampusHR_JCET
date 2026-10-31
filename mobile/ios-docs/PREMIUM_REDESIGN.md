# Premium native redesign — 24 October 2026

Last updated: 2026-10-25.

The approved design is implemented in the existing Expo/React Native app. This pass changes
presentation and improves uncertain-write recovery; backend/API contracts and the separate
web app are unchanged by this redesign task.

## Screen map

| Requested screen | Implementation |
| --- | --- |
| Login | `app/(auth)/login.tsx` |
| Faculty Home | `app/(tabs)/index.tsx` |
| Timetable Today / Week | `app/(tabs)/timetable.tsx` |
| Attendance | `app/(tabs)/attendance.tsx`, `components/attendance/AttendanceMonth.tsx` |
| Leave / HOD Approvals | `app/(tabs)/leave.tsx`, `app/(tabs)/approvals.tsx` |
| Apply Leave | `components/leave/LeaveApplyModal.tsx` |
| Profile | `app/(tabs)/profile.tsx`, `app/profile/*`, `components/profile/*` |
| Notifications | `app/notifications.tsx` |
| Password Help | `components/profile/AccountSupportSheet.tsx` |
| Leave Review | `components/leave/LeaveDecisionModal.tsx`, `app/leave/[id].tsx` |
| Smart Substitution / Confirmation | `app/leave/coverage.tsx`, `components/substitution/CoveragePanel.tsx` |

`lib/theme.ts` owns runtime colors, typography, geometry and motion. Shared controls remain
native components. AttendanceMonth plots recorded statuses only, without inferring absences
or inventing an attendance percentage. Existing corrections/history/pagination remain available.
Personal details, password updates, Documents, push preferences and HOD Workload remain reachable.

## Preserved capability boundaries

- Existing authenticated query scope, secure session storage, role checks and safe notification routes.
- The current UTC attendance day and dated timetable/substitution reconciliation.
- HOD recommendation followed by HR final approval; class cover follows final approval.
- No authoritative impact promise before final approval and no new leave-attachment contract.
  Apply for Leave omits the Supporting document section; Documents remain available in Profile.
- Qualitative candidate fit based on factual eligibility, experience and workload.
- Only confirmed assignment responses show success. Notification delivery stays unconfirmed.
- Research/performance availability and institutional SSO remain truthful to existing capabilities.

## Uncertain-write recovery

Leave submission and attendance corrections retain a normalized intent fingerprint after an
unknown outcome. An explicit history check matches employee, date/range, type/status, times,
reason and other submitted fields as applicable. Recorded matches are shown as existing
requests, without claiming a new successful write or emitting a success haptic.

If no match is found, the draft and ambiguous-intent guard remain. Explicit discard lets the
user start a different intent; the same ambiguous payload cannot be silently resubmitted during
that screen's lifetime. Nine behavioral regression tests cover these helpers.
The guards are held in the mounted screen; they do not establish persistent server
idempotency across an app restart. Leave history reads are limited to the newest 500
matching records; a missing match never authorizes replay of the ambiguous payload.

## Verification

- Mobile TypeScript and ESLint checks pass.
- 118 mobile tests pass, including nine recovery regressions and two preview identity/approval-path checks.
- `checks/premium.smoke.mjs` passes all 13 requested screens and related profile/document/
  password routes against the disposable loopback API at 375px, plus Faculty Home at 1280px.
  It checks horizontal overflow, Home keyboard focus, validation, role navigation,
  attendance write and coverage assignment.
- Native iPhone and iPad screenshots from simctl/Maestro runs are saved in the
  [implementation gallery](../../design/mobile-premium-2026-10-24/implementation/README.md).
  The 18-image matrix includes iPad Login/Home and an accessibility-medium Dynamic Type
  review view. Targeted native review confirms the compact Notifications filter strip and
  readable stacked decision actions; both review actions passed Maestro visibility assertions.

The original visual regression captures use disposable fixture services on port 4011.
The current hands-on demo uses the actual backend with persistent local data on port 4012;
see [startup and accounts](../../backend/LOCAL_DEMO.md) and the
[complete approval-cycle evidence](../../design/mobile-premium-2026-10-24/implementation/approval-cycle/README.md).
No production records are changed. Metro uses port 8081. Development-only built-in demo accounts remain
available, but their incomplete personal-data capabilities are not represented as live records.
Use `PREVIEW_MODE=interactive` for hands-on demos so reads and writes share stateful repositories.
The [Faculty functional verification](../../design/mobile-premium-2026-10-24/implementation/functional-checks/README.md)
records native check-in/out, leave submission and refresh/readback evidence, plus the fixes to
the preview routing and Faculty employee mapping.

Not certified by this pass: physical-device performance, VoiceOver traversal, hardware-keyboard
navigation on iOS, release signing/build distribution or production backend deployment.
This is bounded implementation verification, with no blanket WCAG or release certification.
Xcode 27.1 uses Device Hub for the interactive simulator window. The native evidence was
captured through simctl and Maestro; Device Hub is installed and opens the same running app.
To bring the demo iPhone forward, run:

```sh
open -a DeviceHub 'devices://device/open?id=3260A606-7A40-4817-81B5-7F7B9B01A7C5'
xcrun simctl openurl 3260A606-7A40-4817-81B5-7F7B9B01A7C5 exp://127.0.0.1:8081
```

The earlier missing-GUI diagnosis looked for the legacy Simulator.app path and was incorrect.
One Expo Go/XCTest accessibility crash occurred while switching simultaneous simulators.
Sequential native runs completed; the native XCTest trace does not establish an app root cause.
