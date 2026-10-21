# CampusHR iOS plan

Planning baseline: 21 October 2026. Build the iOS app in the existing `mobile/` Expo project; keep shared Android behavior working. This folder is documentation, not the generated native `mobile/ios/` directory (which Git ignores).

## Read in this order

| Document                              | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| [Requirements](REQUIREMENTS.md)       | Users, scope, screen behavior and acceptance criteria                      |
| [Development](DEVELOPMENT.md)         | Mac setup, simulator, iPhone and local API workflow                        |
| [API integration](API_INTEGRATION.md) | Existing contracts, native auth dependency and missing push infrastructure |
| [Testing](TESTING.md)                 | Automated checks and manual device test matrix                             |
| [Release](RELEASE.md)                 | Development builds, TestFlight and release gates                           |
| [iOS tasks](../../tasks/IOS_TASKS.md) | Ordered backlog, proposed owners and dependencies                          |

## What exists

- Expo, TypeScript, Router, Query client, a light theme and bottom tabs.
- Authenticated timetable queries and daily/weekly screens.
- Leave UI and API helpers; each flow still needs native verification.
- A local substitution demonstration, restricted to demo sessions.
- Local notification helpers. Remote push is not complete.
- Android, iOS and web bundle export passed during PR #10 integration. An export is not proof of a working signed build or a device test.

## What remains

Secure session persistence, native refresh/logout handling, live data across the remaining screens, server-backed mobile substitution, notifications and document integration, device accessibility testing, signing and distribution.

The first milestone is a local iPhone/simulator build with reliable login and live timetable data. TestFlight follows device QA. Hosting and production database changes are separate work; do not redeploy as part of this plan.

Reuse [mobile UX](../../design/MOBILE_UX.md), [theme tokens](../lib/theme.ts), [roles](../../product/USER_ROLES.md) and [API contracts](../../backend/API_ENDPOINTS.md). The [shared mobile tasks](../../tasks/MOBILE_TASKS.md) track implementation; iOS tasks track platform delivery and verification.
