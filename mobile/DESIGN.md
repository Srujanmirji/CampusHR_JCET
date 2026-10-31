# CampusHR mobile visual authority

Last updated: 2026-10-24.

The native app implements the **approved premium CampusHR direction** from 24 October 2026.
[Approved showcase and workflow constraints](../design/mobile-premium-2026-10-24/README.md)
· [Runtime implementation and verification](ios-docs/PREMIUM_REDESIGN.md).

The canonical runtime system is [lib/theme.ts](lib/theme.ts). Older Stitch and mobile-v2
artifacts remain historical design references; their frozen palettes are not the current
runtime color authority. The separate web application retains its own design authority.

## Built system

- Calm canvas `#F7F8FC`, white surfaces, ink `#111827`, secondary text `#667085`.
- Royal Blue `#1D4ED8` for actions and the next-class feature; violet `#7C3AED` for leave
  and coverage; mint `#10B981` with readable `#047857` for attendance/success.
- SF Pro through the native System family on iOS; platform sans on Android/web.
  Type scale: 34 display, 28 greeting/metric, 22 section, 17 body/button, 15 supporting,
  13 metadata, 11 native tab labels. Text scales with device settings.
- Spacing 4/8/12/16/20/24/32/40/48; 24-point phone gutters; centered 680-point content cap.
- Controls have 48-point minimum targets. Radii: 10 controls, 12 fields, 16 grouped
  surfaces, 24 signature feature/sheets. Lists use separators and whitespace.
- Signature: one blue next-class feature followed by an open time rail. Summary facts,
  timelines, grouped account rows and focused forms have different compositions.
- SF Symbols through the shared Icon component. Native date pickers, switches, sheets,
  stack transitions and haptics; spring and selection animations respect Reduce Motion.

Faculty roots: Home / Timetable / Attendance / Leave / Profile.
HOD roots: Home / Approvals / Timetable / Workload / Profile.
Notifications open from the bell. Settings and account support live in Profile.
There is no product floating settings button. Expo Go's developer overlay is external
and is disabled in the demonstration simulator's preferences.

## Behavior is part of the system

Keep all role/session/API boundaries intact. Attendance uses the existing UTC policy.
HOD recommends leave; HR provides final approval. Pending impact, attachments and delivery
receipts must not be invented. Candidate recommendations show factual expertise, eligibility
and workload rather than points or a fabricated confidence percentage.

Data sections keep independent loading, empty, error, permission and refresh states.
Show source timestamps when presenting cached Home data. Retain drafts after errors.
After an uncertain write, check existing history; show exact matches as already recorded.
Discard allows a different request while the same ambiguous intent remains guarded.
These guards last for the mounted screen's lifetime; they do not provide persistent
server idempotency across an app restart.

Full-screen native forms host their own safe-area provider. Labels stay visible, controls
wrap at larger text sizes, and keyboard focus is visible on the web companion.
The product currently supports a light appearance; do not claim an implemented dark theme.
The [native gallery and verification matrix](../design/mobile-premium-2026-10-24/implementation/README.md)
record the inspected devices and the limits of this implementation pass.
