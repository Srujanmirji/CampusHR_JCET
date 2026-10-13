# CampusHR Phase 1 visual plan

Extend the established JCET brand and token system in `design/DESIGN_SYSTEM.md`.
This phase is an HOD review prototype: local data and a mock login only.

- Navy `#051F5B`: navigation, headings, institutional identity.
- Orange `#F05023`: primary action and active navigation, used sparingly.
- Warm red `#D32F2F`: rejected/absent states.
- Light gray `#F5F7FA`: workspace background.
- Ink `#1F2937`: readable body text.
- White `#FFFFFF`: cards, form, topbar.

Inter is the display and body family, following the documented one-family rule.
Scale: 12 / 14 / 16 / 20 / 24 / 32px, with tabular numerals for metrics.
Controls use 10px radius; cards 14px; overlays 16px. All colors, typography,
dimensions and motion durations resolve through shared tokens. Orange controls
use deep navy `#02143E` text for contrast (5.01:1 default, 4.57:1 hover).

The desktop composition is a narrow navy sidebar and white topbar beside a compact
workspace with a campus banner, six modest metrics, two charts, and a table/actions
section; mobile uses a navigation sheet and stacks content.

```text
LOGIN                            DASHBOARD
┌──────────────┬───────────┐     ┌─────┬─────────────────────────────┐
│ JCET logo    │ CampusHR  │     │ JCET│ Search   Bell   Profile     │
│ Campus image │ Login    │     │ Nav ├─────────────────────────────┤
│ Institutional│ form     │     │     │ Page heading + campus banner│
│ identity     │          │     │     │ Six compact metrics         │
│              │          │     │     │ Department + attendance     │
└──────────────┴───────────┘     │     │ Leave table + quick actions │
                               └─────┴─────────────────────────────┘
```

Signature: the JCET campus architectural visual, cropped into a calm institutional
masthead and reused on login. This grounds the proposal in the college rather
than a generic dashboard. Chart/table hierarchy stays quiet around it.

No decorative gradients, glow, glass, oversized typography, or fictional live
statistics. The screen identifies its mock data as a prototype. Motion communicates
navigation, loading, and disclosure, with reduced-motion support.

Brand assets are sourced from the official JCET and campus-event websites because no supplied logo
or campus images existed in the project. Provenance is recorded beside the assets.

## Phase 2 extension

Retain the approved palette, Inter scale, tokens and shell. Leave review uses four
compact summaries, a searchable/filterable table and a right-hand review drawer.
Academic impact is the decision point; ranked candidates provide the signature
comparison in the substitution page. Navy marks the best match, orange marks
the next action, and existing positive tokens mark recorded coverage.

```text
LEAVE REVIEW                     SUBSTITUTION
┌─────────────────────┬────────┐ ┌─────────────────────────────────┐
│ Four summaries      │ Faculty│ │ Approved leave + coverage count │
│ Search / filters    │ Leave  │ ├─────────────────────────────────┤
│ Faculty table       │ Impact │ │ Affected class / original faculty│
│                     │ Balance│ │ Ranked candidates + match rubric│
│                     │ Approve│ ├─────────────────────────────────┤
└─────────────────────┴────────┘ │ Next class → completion → preview│
                                └─────────────────────────────────┘
```

Mobile stacks candidates and uses a full-width review drawer. Motion reuses the
existing Framer Motion primitives for disclosure, assignments and completion.
No new aesthetic, decorative effects, or full timetable editor are introduced.
