# CampusHR mobile — premium UI showcase

Design pass: 24 October 2026. Institution: Jain College of Engineering & Technology, Hubballi.
This is a visual design/handoff set; it does not replace the existing Expo implementation,
API bindings, approved role policy, or the earlier frozen design artifacts.

## Deliverables and screen coverage

| Board | File | Screens |
| --- | --- | --- |
| Faculty / Daily rhythm | [01-daily-rhythm.png](final/01-daily-rhythm.png) | Login; Faculty Home; Timetable Today; Timetable Week |
| Faculty / Everyday essentials | [02-everyday-essentials.png](final/02-everyday-essentials.png) | Attendance; Leave; Apply Leave; Profile |
| HOD / Teaching continuity | [03-hod-teaching-continuity.png](final/03-hod-teaching-continuity.png) | Approvals; Leave Review; Smart Substitution; Coverage Confirmation |
| Support / Considered details | [04-support-and-states.png](final/04-support-and-states.png) | Notifications; Password Help; loading; connection recovery |

All 13 requested screens, plus confirmation and two operational states.
Use `final/` for the reviewed boards. Initial renders are retained at this folder's root.
The boards are raster visual mockups, not executable screens or editable Figma layers.
Final files retain the image tool's native resolution; no resolution claim depends on prompt text.

## Direction and composition

A calm, white institutional workspace organized around the next meaningful teaching task.
The distinctive element is an asymmetric blue next-class feature with a quiet time rail;
it leads the Home screen without turning every summary into a dashboard card.

- Base: Ink `#0F172A`, Canvas `#F7F8FC`, Surface `#FFFFFF`.
- Primary: Royal Blue `#1D4ED8`; supplementary timetable blue `#3B82F6`.
- Modules: Leave/Cover `#7C3AED`; Attendance/Success `#10B981`.
- Text: `#111827`; secondary `#667085`; divider `#E5E7EB`; secondary surface `#EEF2F7`.
- Alerts: Amber `#F59E0B`, Coral `#F97360`; sparse JCET accent `#F05023`.
- Readable semantic text: green `#047857`, amber `#92400E`, coral `#C2410C` on light tints.
  Bright semantic fills and orange are not default small-text foregrounds or white-text buttons.
- SF Pro Display for titles; SF Pro Text for body/controls on iOS. Use native system fallbacks
  rather than distributing Apple font files to other platforms.
- Type: display 34/40, greeting 28/34, section 22/28, body 17/24,
  supporting 15/21, metadata 13/18pt; weight 400/500/600, sparing 700.
- Space: 4/8/12/16/24/32pt; 24pt screen gutters; minimum 48pt interactive controls.
- Radius: 10pt controls, 16pt intentional surfaces, 24pt for a signature feature.
  Lists use spacing and dividers, with no large card around each row.
- Keep native safe areas. Tab labels fit on one line, including Attendance.
  Dynamic Type may reflow or scroll sections; do not shrink text to fit a static board.

```text
Date / page context                            Bell · Avatar
Greeting / title
Next task OR decision context
Timeline / native list / focused form
Role-specific roots OR sticky task actions
```

The supplied references guide branding and module coverage. New boards simplify their
repeated boxes and small text into open lists and a stronger hierarchy. Photographs,
avatars, academic records, quotas, match descriptions and counts are illustrative.

## Navigation and behavioral preservation

Faculty roots stay Home / Timetable / Attendance / Leave / Profile.
HOD roots stay Home / Approvals / Timetable / Workload / Profile.
Bell pushes Notifications. Profile contains Settings, support, account security and Sign out.
No product floating gear exists. The Expo Go developer overlay is not included in these mockups;
its absence from the showcase does not remove the overlay from Expo Go itself.

Pushed details and full-screen forms have native Back/Close and return to their invoking context.
Bottom sheets are content-sized; do not stack another modal over an active modal.
Keep existing role checks, authenticated query scope, secure storage, error propagation,
server-confirmed writes and route destinations.

## Screen-by-screen implementation intent

1. **Login:** small institutional identity, editorial campus visual, open labeled form,
   optional remember, secure password toggle, contextual help and one Sign in action.
   Keep SSO conditional on a configured provider; do not present an inert control as connected.
2. **Home:** warm greeting, date/bell/avatar, next class, confirmed attendance,
   compact leave/workload facts and a timeline. Sources remain independent during partial failure.
3. **Today:** time rail, subject code/title, section/room and dated substitute duties.
   Distinguish completed/current/upcoming with words as well as color.
4. **Week:** one selected date with previous/next week controls and the same schedule rows.
   The selected date, heading and fetched data must agree; derive them from one state value.
5. **Attendance:** one contextual punch action, monthly recorded-day distribution,
   accessible legend/counts, recent activity and retained correction/history flows.
   Preserve the current UTC attendance policy. The mockup's human-readable time formatting
   is not authorization to change that policy or calculate a false attendance percentage.
6. **Leave:** configurable leave types and balances, apply action, compact filters and
   native request rows. CL/DL/RH/EL and their shown quotas are examples, not confirmed JCET policy.
   Preserve the existing cancellation filter/action even when a specimen only shows four filters.
7. **Apply:** keyboard-safe full-screen form, labeled dates/type/reason, half-day switch,
   supporting-document entry, honest impact state, and persistent Submit request.
   Preserve drafts on errors and prevent duplicate submissions.
8. **Profile:** unboxed identity header, available statistics and grouped destinations.
   Research/performance/service-history availability remains truthful where native modules
   are not implemented. Place notification preferences, Settings, support and Sign out here.
9. **Notifications:** native grouped list, category filtering, explicit unread status,
   mark-all/read behavior and safe links to permitted native destinations. No card spam.
10. **Password Help:** one native sheet, plain instructions, general-office contact rows,
    Done/Close and restored focus on dismissal.
11. **HOD Approvals:** role-gated queue with status segment, concise applicant metadata,
    and one Review action per request. Retain search/filter scope.
12. **Review:** applicant, reason, actual balance/history, approval path, impact availability,
    sticky decision actions and rejection reason validation. Respect changed/conflicting requests.
13. **Smart Substitution:** approved class/date/room context; factual expertise,
    availability and workload; qualified recommendation copy; clear Assign action.
    Disabled candidates explain why. No point leaderboard or invented confidence percentage.
14. **Confirmation:** show success only after verified assignment response, actual remaining
    coverage count, next-class action and honest notification status.

## Capability boundaries retained from the current product

- Faculty leave goes through HOD recommendation, then HR final approval. For that reason,
  the pending review mockup says **Recommend approval**, and Find cover is gated until final
  approval. The requested Approve / Approve & Find Cover labels must not silently change authority.
- Pending leave has no authoritative dated-impact endpoint. Its preview explains when coverage
  becomes available, instead of claiming verified affected classes before approval.
- The submission contract has no leave attachment field. The supporting-document row routes
  toward existing Documents until a separately scoped contract change supports leave attachments.
- Existing rule-based substitute ranking stays intact. “Strong subject fit” is qualitative
  presentation of factual reasons, not a calibrated AI confidence value.
- Assignment success is not a notification-delivery receipt. Show unconfirmed/pending delivery
  honestly and retain refresh/reconciliation for uncertain responses.
- An HR-specific helpdesk address is not configured. The showcase uses general college contacts
  and identifies them as such.

## Verified support contact

General JCET office: **0836-2002117**; **contactus@jcethbl.edu.in**.
Verified against the [official college contact page](https://www.jcethbl.edu.in/contact.php)
on 24 October 2026. These are not represented as a dedicated HR account-recovery service.
Connect call/email actions only after an intentional user tap.

## Interaction and accessibility handoff

- Native date picker and half-day switch; persistent labels and linked inline errors.
- Segmented selection: 160–200ms opacity/position feedback; preserve selection and scroll.
- Press feedback: short opacity/tint response; optional success haptic after confirmed write.
- Sheet presentation: native platform animation; restore invoking focus after dismissal.
- Skeletons retain layout; pull-to-refresh leaves existing content visible.
- Reduced Motion removes translation and shimmer; use static placeholders/crossfade.
- Focus is visible for hardware keyboards, dialogs trap/restore focus, VoiceOver announces
  headings, selected tabs, loading completion and confirmed success.
- Do not use color alone. Keep text contrast at least 4.5:1 and meaningful boundaries/focus
  at least 3:1 against actual rendered backgrounds. Measure implementation, not sampled mockup pixels.
- Planned token contrast checks passed: body 16.72:1; secondary on canvas 4.69:1;
  white on primary blue 6.70:1; white on violet 5.70:1; success text 5.21:1;
  amber text 6.84:1; coral text 4.70:1. These are token checks, not raster or runtime certification.
- Empty states explain the next action; error states preserve input and offer one actionable retry.
  Cached data carries its timestamp and cannot be presented as fresh.

## Acceptance before implementation is called complete

These are design artifacts. Native interaction, Dynamic Type, screen-reader navigation,
exact layout measurements, runtime contrast, offline behavior and server integration need
implementation-stage verification. No production-ready runtime claim follows from a static image.

The next implementation task should apply this system to the existing Expo components and
screen routes in a bounded sequence, preserving all API/session/permission behavior.
Get the required visual-direction confirmation before substantial frontend implementation.

## Generation and provenance

Created with the built-in image_gen tool using the user's two attached reference boards.
[Exact prompt set](PROMPTS.md). Existing mobile-v2 artifacts and app sources remain unchanged.
The user's [Faculty reference](references/faculty-direction.png) and
[HOD reference](references/hod-direction.png) are preserved for the development handoff.
Support contact sourcing is documented above. Generated campus imagery is illustrative and
must be replaced with verified/licensed institutional photography for a shipped product.
