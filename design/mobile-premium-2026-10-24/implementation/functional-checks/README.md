# Faculty demo functional verification

Verified on 24 October 2026 using the signed-in `faculty-check@jcet.test` account,
the iPhone 17 Pro/iOS 26.5 simulator, and the disposable loopback API. No production
records were used. The app remains signed in with the saved demo test records.

## Findings fixed

1. Attendance Today was intercepted by an incomplete, static Home summary while punches
   and monthly history used the stateful attendance service. The screen correctly rejected
   the incomplete response. Interactive preview mode now routes reads and writes through
   the same in-memory repositories, including leave balances, notifications and coverage.
2. Leave submission rejected the Faculty preview login as unlinked: the leave fixture only
   recognized the HOD login. Auth and leave now share the configured preview users, including
   their actual roles and employee links. Faculty requests follow HOD → HR; the HOD fixture
   keeps its Principal approval path. Unknown and unlinked users still cannot apply.

The fixes are confined to preview/check files; production API validation and access rules
were not relaxed.

## Native results

| Check | Result / evidence |
| --- | --- |
| Check in | Server-confirmed MOBILE punch; [capture](faculty-check-in-confirmed.png) |
| Check out | Same record retained both timestamps; [capture](faculty-check-out-confirmed.png) |
| Refresh Attendance | Completed state remained; [capture](faculty-attendance-refreshed.png) |
| Empty leave reason | Native form rejected it with a field error |
| Native date selection | Start/end set to 26 October 2026; full-day Casual Leave |
| Submit leave | Confirmation and Pending HOD state; [capture](faculty-leave-submitted.png) |
| History after refresh | Exactly one matching native submission remained; [capture](faculty-leave-refreshed.png) |
| Direct API readback | Today matched history; leave dates/owner/status and CL pending balance matched; [JSON](server-readback.json) |

The short punch test recorded 11:14:14–11:14:16 UTC; the existing attendance service classified
the test as HALF_DAY. The native request reason is “Faculty demo test - personal appointment”.
The demo's CL balance is 12 remaining / 3 pending: one seeded request, one API regression
request and one native request. These in-memory records last until the preview server restarts.

## Regression checks

- 118 mobile tests pass, including two service-level preview identity/approval-path regressions.
- Mobile TypeScript and ESLint pass; both scoped code reviews approved the fixes.
- `node mobile/checks/faculty-demo.smoke.mjs` passed check-in/out, matching readback/history,
  duplicate checkout rejection, invalid leave rejection, successful submission, overlap rejection,
  single-record persistence and pending/remaining balance updates. Its original run failed on
  the static attendance response; after routing was fixed it exposed the unlinked Faculty account.
- A root ESLint invocation also reported 162 pre-existing errors in `design/mobile-v2` artifacts.
  Those unrelated generated design files were not changed by this functional test task.

Start the preview API from the repository root with:

```sh
PREVIEW_MODE=interactive PREVIEW_HOST=127.0.0.1 PREVIEW_ORIGIN=http://127.0.0.1:8081 node --import tsx mobile/checks/home-preview.mjs
```

The API smoke resets its disposable attendance/leave records, so run it before a hands-on
session. Existing single-module modes remain available for failure-injection checks.

One Expo Go crash occurred while XCTest initialized its accessibility automation session
(`XCTAutomationSession` in the native crash trace). Sequential reruns completed both flows.
That trace does not establish an app-code cause. This pass covers the local simulator/demo
service, not physical-device or production integration certification.
