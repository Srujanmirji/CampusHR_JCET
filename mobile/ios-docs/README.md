# CampusHR iOS plan

**Current mobile implementation:** [Premium redesign](PREMIUM_REDESIGN.md), with the [native screen gallery](../../design/mobile-premium-2026-10-24/implementation/README.md). The earlier [Mobile Design V2](../../design/mobile-v2/DESIGN_SYSTEM.md) remains a historical reference.

**Try the persistent local demo:** [Startup and accounts](../../backend/LOCAL_DEMO.md), with [Faculty → HOD → HR → substitute verification](../../design/mobile-premium-2026-10-24/implementation/approval-cycle/README.md).

Planning baseline: 21 October 2026. Build the iOS app in the existing `mobile/` Expo project; keep shared Android behavior working. This folder is documentation, not the generated native `mobile/ios/` directory (which Git ignores).

**Staging and signed iPhone preparation:** [Configuration, verification and required accounts](../../deploy/staging/README.md). Hosting and signed installation remain pending.

## Read in this order

| Document                                 | Purpose                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| [Simulator baseline](BASELINE.md)        | IOS-001 setup evidence and outstanding acceptance                          |
| [Requirements](REQUIREMENTS.md)          | Users, scope, screen behavior and acceptance criteria                      |
| [Development](DEVELOPMENT.md)            | Mac setup, simulator, iPhone and local API workflow                        |
| [API integration](API_INTEGRATION.md)    | Existing contracts, native auth dependency and missing push infrastructure |
| [Native sessions](NATIVE_SESSION.md)     | IOS-002–003 contract, secure storage and restart evidence                  |
| [Home integration](HOME.md)              | IOS-004 data sources, scope and verification                               |
| [Dated timetable](TIMETABLE.md)          | IOS-005 own classes, dated duties and verification                         |
| [Attendance](ATTENDANCE.md)              | IOS-006 own records, safe writes and verification                          |
| [Leave](LEAVE.md)                        | IOS-007 own balances/requests, safe writes and HOD recommendations         |
| [Substitution](SUBSTITUTION.md)          | IOS-008 server candidates, assignment/undo and recipient verification      |
| [In-app notifications](NOTIFICATIONS.md) | IOS-009 own inbox, read state, live lifecycle and safe navigation          |
| [Profile and documents](PROFILE_AND_DOCUMENTS.md) | IOS-011 own employee/phone, password and protected files |
| [Testing](TESTING.md)                    | Automated checks and manual device test matrix                             |
| [Release](RELEASE.md)                    | Development builds, TestFlight and release gates                           |
| [iOS tasks](../../tasks/IOS_TASKS.md)    | Ordered backlog, proposed owners and dependencies                          |

## What exists

- Expo, TypeScript, Router, Query client, a light theme and bottom tabs.
- Native login, refresh-only secure storage, restart restoration and protected navigation.
- Authenticated own timetable, dated week navigation and server-assigned substitution duties, shared with Home.
- Home API summaries for own classes, attendance, casual leave, workload and notifications, with independent recovery.
- Own attendance status/history, explicit permitted punches and correction requests.
- Own leave balances/history, half-day applications, pending cancellation and scoped HOD recommendations, verified with the simulator against a disposable service.
- Server-backed coverage management with scores/eligibility, confirmed assignment/undo and dated recipient duties.
- Own paged notification inbox, shared unread count, read/read-all and authenticated live updates. Remote push is not complete.
- Own employee Profile, phone edits, password change and private document selection/upload/status/preview (IOS-011). Native picker/PDF acceptance remains open.
- Android, iOS and web bundle export passed during PR #10 integration. An export is not proof of a working signed build or a device test.

## What remains

Physical-device session verification, native document picker/PDF verification, real remote push delivery, device accessibility testing, signing and distribution.

The first milestone is a local iPhone/simulator build with reliable login and live timetable data. TestFlight follows device QA. Hosting and production database changes are separate work; do not redeploy as part of this plan.

Reuse [mobile UX](../../design/MOBILE_UX.md), [theme tokens](../lib/theme.ts), [roles](../../product/USER_ROLES.md) and [API contracts](../../backend/API_ENDPOINTS.md). The [shared mobile tasks](../../tasks/MOBILE_TASKS.md) track implementation; iOS tasks track platform delivery and verification.

Remote push implementation and its signing/device acceptance gate are documented in [IOS-010 Remote push](REMOTE_PUSH.md). Delivery is disabled until an approved project and signed build are configured.

## Mobile Design V2 adoption

[Implementation, routes, verification and remaining native acceptance](v2/IMPLEMENTATION.md). Frozen design tokens now drive the existing mobile runtime; the separate design preview is unchanged.
