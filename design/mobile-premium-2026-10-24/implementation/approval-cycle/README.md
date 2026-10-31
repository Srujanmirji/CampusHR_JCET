# Complete approval cycle with persistent local data

Native workflow captured 24 October 2026; saved records verified again after restart on
25 October 2026. This uses the actual backend services and Prisma repositories with an
on-disk local PGlite database, not the earlier in-memory preview.

## One request across four separate accounts

Asha Patil submitted casual leave for **26 October 2026**, reason
“Native approval cycle - academic workshop”. Ramesh Kulkarni recommended it as HOD;
Maya Desai gave final HR approval in the web app. The HOD assigned Priya Kulkarni to
both affected classes. Priya saw the notifications and both duties in her native timetable.
Asha saw the approved request, opened its notification and inspected the recorded approval path.

Request ID: `24d52787-f1a2-4cf2-80f5-48256f3fe3e3`.

| Evidence | Interface / result |
| --- | --- |
| [01 · Submitted](01-faculty-pending.png) | Native Faculty: pending request |
| [02 · Review](02-hod-review.png) | Native HOD: leave review |
| [03 · Recommended](03-hod-recommended.png) | Native HOD: recommendation recorded, awaiting HR |
| [04 · HR review](04-hr-review.png) | Web HR: same request and approval chain |
| [05 · Approved](05-hr-approved.png) | Web HR: final approval |
| [06 · Affected classes](06-affected-classes.png) | Native HOD: two classes for 26 October |
| [07 · Candidate](07-substitute-selection.png) | Native HOD: eligible substitute |
| [08 · Assigned](08-first-assignment.png) | Native HOD: first class covered |
| [09 · Coverage complete](09-all-classes-covered.png) | Native HOD: both classes covered |
| [10 · Substitute inbox](10-substitute-notifications.png) | Native substitute: assignment notices |
| [11 · Substitute timetable](11-substitute-timetable.png) | Native substitute: two duties on 26 October |
| [12 · Faculty update](12-faculty-approved.png) | Native Faculty: Approved status |
| [13 · Approval notification](13-faculty-notification.png) | Native Faculty: stored approval notice |
| [14 · Notification destination](14-notification-destination.png) | Native Faculty: protected Leave list |
| [15 · Leave details](15-faculty-request-detail.png) | Native Faculty: HOD and HR decisions |
| [16 · Restored Home](16-restored-faculty-home.png) | Native Faculty: remembered session after database/API and simulator restart |

[Native record readback](native-readback.json) contains request, decisions, assignments,
duties, balances and notifications. Notification navigation intentionally opens the protected
Leave list; View details opens the request. Its read timestamp persisted across restart.
[API cycle evidence](api-cycle-readback.json) records a separate automated full-cycle request.
[Restart readback](restart-readback.json) confirms the native request and notification read state.

## Validation

- 118 mobile tests, 63 backend unit tests and 44 database tests passed.
- Backend/mobile TypeScript and lint passed; the HR web production build passed.
- The API cycle checks approval order and permissions, balance changes, both assignments,
  duplicate prevention, recipient duties and stored notifications.
- Saved-record checks passed for both requests after restarting the persistent launcher.
- A fresh simulator boot restored the remembered faculty session; Maestro verified Home and CampusHR without another sign-in.
- Code review found repeat seeding could recreate edited/deleted demo data; initialization
  now uses a private versioned marker. Two regression tests cover restart and invalid-marker behavior.

In-app notifications and read state are verified. OS push delivery is disabled in this local
launcher; the native assignment UI correctly retains “Delivery not confirmed”. This is local
simulator/web verification, not production deployment or physical-device certification.

## Try it

See [local demo startup and accounts](../../../../backend/LOCAL_DEMO.md). The faculty account
is `faculty-check@jcet.test`, initial password `home-check-only`. HR uses
<http://127.0.0.1:4012> with `hr-check@jcet.test` and the same initial password.

All data lives in ignored `backend/.demo/`. Preserve that directory to retain the demo.
The old port 4011 fixture remains available for isolated visual regression checks; the current
hands-on app uses the persistent API on port 4012 and Metro on port 8081.
