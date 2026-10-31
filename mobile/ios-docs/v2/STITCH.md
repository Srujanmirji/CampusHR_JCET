# CampusHR: Academic Workforce Platform — mobile adoption

The active visual source is **CampusHR: Academic Workforce Platform**, Stitch project `12747977855754983799`, selected by the user on 24 October 2026. It replaces the earlier `CampusHR Mobile Design System` project as the mobile implementation's visual authority. [stitch-tokens.json](../../lib/stitch-tokens.json) records the source project, palette and 14 mobile source screens (including the project's alternate versions).

## Visual direction

- Navy primary `#000B31`, greeting panel `#051F5B`, orange action/active navigation ink `#B22C00`.
- Canvas `#F8F9FF`, white grouped sections, inset blue surface `#EFF4FF`, ink `#121C2A`, supporting text `#444650`.
- Bundled Inter regular/semibold, 28-point page titles, 22-point greetings, 20-point section headings, 16-point body and buttons, 14-point supporting text. Tiny prototype labels are enlarged for daily use and Dynamic Type.
- Signature composition: navy greeting and compact workload/attendance summary, followed by administrative actions and detailed white/inset-blue operational sections. Orange identifies action and active navigation.
- Mobile geometry uses 16-point grouped surfaces, 10-point controls and 12-point inputs. Native sheets, platform icons and 48-point targets remain.

## Native screen mapping

| Project screen | Mobile implementation |
| --- | --- |
| Faculty Mobile Home | Navy greeting + actual daily load/workload/attendance, assigned-duty notice, quick routes, time-block schedule, punch status, leave ledger and actual inbox updates |
| Faculty Timetable & Schedule | Today/Week and weekday selector, course/period/room context, orange substitution context and actual dated duties |
| Faculty Attendance & Biometrics | Navy daily record, contextual orange punch action, recorded-day distribution, inset history and existing correction workflow; biometric hardware is not fabricated |
| Faculty Leave Management | Two-column wrapping balance ledger, orange apply action, filterable grouped request history and native details |
| Faculty Apply Leave & Academic Impact | Existing validated full-screen date/type/half-day/reason form, current capability explanation and guarded submission |
| Faculty Substitute Assignment | Real dated duty context through timetable and notifications; no invented acknowledgement endpoint |
| Faculty Profile & Notification Settings | White identity panel, inset experience/workload strip, real official contact, academic portfolio routes, notifications/security and account support |
| Push Notification Center (Faculty & HOD) | Category filters, inset unread feed with orange indicator, live read state/paging and actual supported destinations |
| HOD Mobile Dashboard | Navy department greeting, coverage/decision context, actual department summaries, pending faculty request excerpts and workload links |
| HOD Leave Approval & Academic Impact Review | Department queue, request identity/history/balance, actual approval-chain authority and native decision confirmation |
| HOD Smart Faculty Substitution | Real candidate eligibility and workload, orange selected candidate, guarded native confirmation, verified assignment and uncertain-response reconciliation |

HOD workload, personal documents, password/settings and login receive the same project palette and grouped surfaces; no separate mobile source screens for these are supplied by this project. The project also contains desktop registry, dossier, matrix and executive screens. These are reference context, not an instruction to turn the phone into a desktop matrix or modify the web application.

## Product truth and deliberate adaptations

This is native React Native UI, not HTML in a WebView. Existing API authorization, private document access, secure session storage, validation and unknown-write handling remain in place. Data comes from existing validated APIs. Do not ship the prototype's fake faculty identities, institutional compliance statements, AI model metrics, student rosters, GPS/biometric claims, SMS receipts, portal synchronization, calendar holidays, payroll or made-up institutional notices.

Use the existing institutional asset and real initials when no verified faculty image is available. Do not impersonate sample faculty using generated portraits. HOD recommends approval in the actual chain; final approval still precedes assignment. SSO, pending-leave dated impact and leave attachments are not added by this UI change. UTC attendance and IST timetable boundaries remain explicit.

The existing mobile API configuration is preserved. The simulator's Expo Go blue gear is a development-menu overlay, not CampusHR navigation. The original V2 design-preview artifacts remain unchanged.

## Verification and limits

TypeScript, ESLint and all 106 mobile tests pass. The disposable Faculty/HOD browser flow regression passes, including Academic/Notifications/Security profile tabs, read-all, leave review, assignment confirmation and uncertain-response reconciliation. Contrast tests check actual imported foreground/background pairs. Browser captures cover 375/1280 widths and keyboard focus; fixtures never access Railway. Native launch evidence is recorded separately from signed-in browser screenshots.

Live institutional account testing, native signed-in keyboard/picker paths, physical haptics, VoiceOver, Android and iPad acceptance remain separate checks. This is an Expo Go development build, not a signed release IPA.

Native iOS bundle returned HTTP 200 and the updated app launched on the iPhone 17 Pro simulator via Expo Go. [Native login evidence](screenshots/platform-iphone-17-pro-login.png) · [Implemented screen overview — browser with synthetic fixtures](screenshots/platform-web-overview.png).
