# CampusHR premium mobile — implementation evidence

Last updated: 2026-10-24.

The approved premium direction is implemented in the existing Expo/React Native app.
Open the [native screen gallery](index.html), [Faculty overview](faculty-native-overview.png)
or [HOD overview](hod-native-overview.png) to inspect the running app. The 18 source images
are actual CoreSimulator captures using disposable local test accounts on iOS 26.5.
The overview PNGs arrange those native captures for review.

Design authority remains the [approved showcase](../README.md) and its four boards in
[`final/`](../final/). Runtime values live in [theme.ts](../../../mobile/lib/theme.ts):
System/SF typography, Royal Blue `#1D4ED8`, Canvas `#F7F8FC`, Ink `#111827`, violet leave/
coverage and mint attendance/success. The current app is configured for light appearance
and portrait orientation, with iPad support. The frozen Stitch/mobile-v2 artifacts remain
historical references. The separate desktop web app is outside this redesign task.

## Native capture matrix

Images 00–15 use iPhone 17 Pro at 1206 × 2622 pixels; 16–17 use iPad Pro 13-inch at
2064 × 2752 pixels. Both use iOS 26.5. The [machine-readable index](screens.json) also
provides the gallery titles and groups.

| Capture | Screen / state |
| --- | --- |
| [00](screens/00-login.png) | Login |
| [01](screens/01-password-help.png) | Password Help sheet |
| [02](screens/02-home.png) | Faculty Home |
| [03](screens/03-timetable-today.png) | Timetable Today |
| [04](screens/04-timetable-week.png) | Timetable Week |
| [05](screens/05-attendance.png) | Attendance after confirmed check-in |
| [06](screens/06-leave.png) | Leave balances and requests |
| [07](screens/07-apply-leave.png) | Apply Leave form |
| [08](screens/08-profile.png) | Profile |
| [09](screens/09-notifications.png) | Notifications with compact category filters |
| [10](screens/10-hod-home.png) | HOD Home |
| [11](screens/11-approvals.png) | HOD Approvals |
| [12](screens/12-leave-review.png) | Leave Review |
| [13](screens/13-smart-substitution.png) | Smart Substitution candidate selection |
| [14](screens/14-coverage-confirmation.png) | Confirmed coverage assignment; delivery unconfirmed |
| [15](screens/15-large-type-review.png) | Accessibility-medium Dynamic Type Leave Review with stacked actions |
| [16](screens/16-tablet-login.png) | iPad Login |
| [17](screens/17-tablet-home.png) | iPad Faculty Home |

All 13 requested screens are represented, plus HOD Home, coverage confirmation and device
checks. Native interaction runs exercised sign-in, Home, timetable navigation, attendance
check-in, leave forms, HOD review and an actual assignment against the local fixture API.
iPad evidence is limited to Login/Home; larger Dynamic Type evidence is limited to Leave
Review at accessibility-medium. Final native recaptures and targeted visual review confirm
the compact Notifications filter strip and readable full-width, stacked decision actions.
Both review actions passed Maestro visibility assertions. The iPad Home composition also
passed the bounded visual review.

## Verification recorded

- Mobile TypeScript and ESLint checks pass.
- All 118 mobile tests pass, including nine recovery regressions and two preview identity/approval-path checks.
- [premium.smoke.mjs](../../../mobile/checks/premium.smoke.mjs) passes the 13-screen flow
  at 375px and Faculty Home at 1280px, plus personal-information, Documents, Settings,
  password and HOD Workload routes. Assertions cover horizontal overflow, visible keyboard
  focus through Home, role navigation, input validation, attendance writes and coverage assignment.
- Native iPhone/iPad runs use the actual app through simctl and Maestro. Xcode 27.1 provides
  the interactive simulator window through Device Hub, which is installed and opens the demo
  iPhone. The earlier diagnosis of a missing GUI used the legacy Simulator.app path and was incorrect.

One Expo Go/XCTest accessibility crash occurred while switching simultaneous simulators.
Sequential native runs completed. The native XCTest trace does not establish an app root
cause. Physical devices, VoiceOver traversal, iOS hardware-keyboard navigation, performance,
signed release builds/distribution and production integration were not validated by this pass.
There is no blanket WCAG or release certification.

## Reproduce the automated checks

From the repository root with dependencies installed, using the repository's Node 24/npm 11
environment:

```sh
npm run typecheck --workspace @campushr/mobile
npm run lint --workspace @campushr/mobile
npm run test --workspace @campushr/mobile
```

The browser smoke uses Google Chrome at its standard macOS installation path and Playwright
from the Codex runtime, or a module path provided through `PLAYWRIGHT_MODULE`. Start the
disposable loopback API in one terminal:

```sh
PREVIEW_MODE=interactive PREVIEW_HOST=127.0.0.1 PREVIEW_ORIGIN=http://127.0.0.1:8081 node --import tsx mobile/checks/home-preview.mjs
```

Start Metro in another terminal:

```sh
EXPO_PUBLIC_API_URL=http://127.0.0.1:4011/api/v1 npm run web --workspace @campushr/mobile -- --localhost --port 8081
```

Then run:

```sh
node mobile/checks/premium.smoke.mjs
```

The smoke sets fixture modes through the local API and writes browser screenshots to
`/tmp/campushr-premium-web` by default. `PREMIUM_WEB_URL` changes the browser URL and
`PREMIUM_SCREENSHOTS` changes the screenshot directory; the fixture API remains on port 4011.
The fixture service uses disposable in-memory records and temporary document files.
No production employee records were changed for this evidence.

For hands-on demos, `PREVIEW_MODE=interactive` keeps Attendance, Leave, notifications and
coverage reads on their writable in-memory repositories. Other modes intentionally substitute
isolated summaries or failures for regression checks. The faculty account is
`faculty-check@jcet.test` / `home-check-only`.

The additional API regression below resets disposable attendance/leave records and verifies
check-in/out, readback/history, duplicate guards, leave validation/submission and pending balances:

```sh
node mobile/checks/faculty-demo.smoke.mjs
```

See [Faculty functional verification](functional-checks/README.md) for the check-in/out and
native leave submission captures, saved-record readback, fixes and validation limits.

For native reproduction, follow the [development setup](../../../mobile/ios-docs/DEVELOPMENT.md),
use the same API environment and Metro port, and select an available iOS 26.5 device with
`xcrun simctl list devices available`. Run one simulator interaction sequence at a time.
The one-off Maestro capture flows and logs were local run artifacts; the durable handoff
here contains the captures, manifest and gallery, rather than a committed native test suite.

## Workflow boundaries and source guide

- Existing authenticated query scope, secure sessions, permissions and safe notification routes remain.
- Attendance uses UTC; its calendar displays recorded statuses without inferred absences
  or a fabricated attendance percentage.
- HOD recommends leave; HR gives final approval. Coverage follows final approval.
  Preapproval impact and leave attachments are not invented; supporting records use Documents.
- Candidate fit uses recorded eligibility, experience and workload. Assignment success requires
  a confirmed response; notification delivery remains explicitly unconfirmed.
- Uncertain leave/correction writes retain an intent fingerprint. Explicit history checks show
  exact matches as existing records, without claiming a new successful write. Discard permits
  different intents; the same ambiguous payload remains blocked for the mounted screen's lifetime.
  This guard does not provide persistent server idempotency across app restarts.

See the [mobile design authority](../../../mobile/DESIGN.md) for the built system,
[implementation notes and screen routes](../../../mobile/ios-docs/PREMIUM_REDESIGN.md) for
the source map, and the [iOS documentation index](../../../mobile/ios-docs/README.md) for
module contracts and earlier baselines. Earlier baseline limitations describe their original
scope; use this matrix for the premium redesign's recorded device coverage.

## Persistent approval-cycle demo

The current hands-on app uses the actual backend and an on-disk local database on port 4012.
See [complete approval-cycle verification](approval-cycle/README.md) for native Faculty/HOD/
substitute screens, HR web approval, recipient updates and restart evidence.
[Startup and demo accounts](../../../backend/LOCAL_DEMO.md) explain how to run it.
The port 4011 instructions above reproduce the earlier disposable visual checks.
