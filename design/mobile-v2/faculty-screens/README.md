# CampusHR V2 — Faculty screens

Design-only deliverable for the two supplied prompts, using the approved [CampusHR Mobile Design System V2](../DESIGN_SYSTEM.md). The canonical system and runtime app are unchanged. There are exactly **12 screen designs**, grouped into the five core screens and seven secondary screens; no HOD screens, additional detail destinations or redesign of the system.

## View

- [Open the interactive preview](index.html) in a browser, or serve this directory as shown below.
- [Core screen PDF](CORE_SCREENS.pdf): Login, Faculty Home, Timetable Today, Timetable Week, Attendance.
- [Secondary screen PDF](SECONDARY_SCREENS.pdf): Leave Management, Apply Leave, Leave Detail, Notifications, Faculty Profile, Settings, Password Help.
- [Core overview](core-overview.png), [Leave/notifications overview](secondary-1-overview.png), [Profile/support overview](secondary-2-overview.png).
- Individual full-scroll, retina PNGs are in [screenshots](screenshots/manifest.json). The interactive preview keeps navigation and form actions attached to the viewport; the exported images show each screen's complete scrollable content.

```sh
python3 -m http.server 4182 --bind 127.0.0.1 --directory design/mobile-v2/faculty-screens
# Open http://127.0.0.1:4182/?screen=home
node design/mobile-v2/faculty-screens/check.mjs
```

No external fonts, analytics, sign-in requests or API writes occur in the preview. Fonts and the existing institutional identity asset are local; see [asset sources and licenses](assets/SOURCES.md). UI glyphs use the actual Material Symbols Outlined family for this browser/Android specimen. A later iOS implementation must use the approved SF Symbols mappings; this browser preview does not pretend to render native iOS widgets.

## Design decisions

- Login is open on the canvas, with the existing JCET/JGI identity asset and no giant form card. Institutional SSO and centrally managed Password Help are visible as requested. Campus photography is omitted because it does not improve this daily utility flow.
- Home gives the next class one intentional summary surface. Three unboxed values share a typographic line; workload is a separate horizontal fact, avoiding four identical dashboard cards. The academic time rail continues through Today's Schedule.
- Timetable uses Today/Week scope selection, then a real six-day selector and readable daily details. Thursday and Saturday update the sample rows; a desktop timetable matrix is not squeezed into a phone.
- Attendance pairs the current check-in state and contextual Check Out with a quiet segmented distribution, readable counts and dated recent activity. The completed monthly sample is **September**, so the supplied 22-present count does not claim to have happened by 21 October. Yesterday's lunch/check-out events are separated from today's 09:15 check-in.
- Leave balances are a continuous list, not a tile grid. Four request-status filters use text/underline tabs rather than violating V2's two/three-option segmented-control rule.
- Apply Leave is a full-screen form, with native browser date entry, an optional half-day scope, reason and attachment selection. Academic impact derives from the sample week and selected range/half-day; it starts with BCS501 at 11:15 and BCS508 at 16:00. Draft text remains in memory across preview navigation and is cleared by preview Sign Out.
- Leave Detail shows actual sample status, submitted/recommended/final stages, reason, academic impact and coverage. A pending recommendation is never labeled final approval. The approved Duty Leave sample shows covered classes; pending and rejected requests show the corresponding coverage state.
- Notifications use one continuous feed; unread entries get a light blue tint, readable title and dot. Category filters and Mark all read change only sample state.
- Profile uses an editorial initials avatar, full identity and readable compact statistics. It includes the supplied grouped destinations, with Settings reachable as a Profile row. Undefined profile detail pages remain outside this delivery.
- Settings groups account, preferences, accessibility, notifications, privacy/security, support and About. Toggles illustrate selection state; they do not claim to configure native OS behavior.
- Password Help is a modal sheet with the supplied explanation, HR Desk, Email Support and Done. Focus is trapped while open and restored to the invoking link when dismissed; keyboard Escape works.

## Sample data and capability boundaries

The supplied Prof. Asha Patil persona, employee code, course information, balances and statistics are **design sample data**, not real JCET records. The snapshot is Wednesday, 21 October 2026 at 10:33 AM; the next 11:15 AM class starts in 42 minutes. Weekly schedules, request histories and approval/coverage examples are illustrative. The 96.4% monthly percentage is supplied design content, not a percentage recomputed from the three displayed day-count categories; production definitions must come from the agreed attendance API.

The preview deliberately does not claim a successful sign-in, SSO connection, attendance punch, leave submission, document upload, password reset or support contact. Sign in moves through the design without retaining credentials; password inputs are never saved to storage or transmitted. Submit Request validates the draft and reports **preview only**, without claiming it was sent. Attachment handling checks type/size, retains its name for the preview, and never reads or sends the bytes.

Institutional SSO provider/client details, location verification, lunch-event tracking, support email/telephone, Research & Publications, Performance and Service History require product/API confirmation before native implementation. No addresses, telephone numbers, live metrics or permissions are fabricated to make those features appear connected. HR Desk and Email Support intentionally do not initiate a call/email to an invented contact.

## Verification

- Twelve screens checked at 375px and 1280px; no horizontal page overflow.
- All preview action targets meet the V2 48-point floor. Labels use the approved type roles; the 14-point tab labels are preserved.
- Week/day updates, request/category filters, read-all, half-day impact, reason escaping and form validation exercised.
- Password visibility, modal keyboard focus cycling, focus return and keyboard traversal of all 12 screens exercised, including keyboard-scrollable content.
- No console errors, external runtime requests, network writes or localStorage persistence in the checks.
- All screen exports reviewed together; V2 token validation remains unchanged and passes. The two PDFs contain only the requested five/seven screens, without extra cover screens.

This is a visual/interaction prototype, not a production React Native migration. Device text scaling, VoiceOver/TalkBack, native gestures, haptics, real auth/API integration and the production security contract remain implementation acceptance work. No app deployment, database changes or Git commit is included.

The optional Impeccable detector ran in its regex fallback mode (parser packages unavailable). Its only findings were the deliberately retained, V2-approved Inter family. The screen renders, token contrast check and interaction tests provide the relevant evidence; the fallback scan is not a computed accessibility audit.
