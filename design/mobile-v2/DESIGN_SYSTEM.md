# CampusHR Mobile Design System V2

**Academic Clarity · Version 2.0 · 23 October 2026**  
CampusHR — Faculty & Academic Workforce Operations  
Jain College of Engineering & Technology, Hubballi

## Authority and scope

This is the canonical design authority for **future CampusHR faculty and HOD mobile work**. Its companion [tokens](tokens.json) encode the values below; [component specimens](COMPONENT_SPECIMENS.pdf) illustrate isolated components. This document wins if a specimen is ambiguous; update all three together when changing the system.

This is a design specification, not implemented app screens. It supersedes the visual guidance in [Mobile UX](../MOBILE_UX.md) and [the earlier design system](../DESIGN_SYSTEM.md) for mobile only. It does not change web styling, API permissions, leave approval authority, data contracts or the existing app theme. Adopting these decisions in code is a later task.

The supplied faculty/HOD images are contextual references: retain academic specificity, clear class times, human names and institutional confidence. Do not copy their phone compositions, gradients, tiny metadata, repeated cards, floating gear, decorative success confetti or dense badge stacks. The screenshots are not an authority for navigation or approval permissions.

## Design language — Academic Clarity

**The idea:** a well-edited academic agenda, made interactive. Faculty should recognize the next class, their attendance state or a decision that needs attention before noticing the interface.

- **Palette:** Canvas `#F7F8FC`, Surface `#FFFFFF`, Ink `#111827`, Deep Blue `#1E3A8A`, Action Blue `#2563EB`, institutional accent `#F05023`. Domain color is a supporting annotation, not wallpaper.
- **Type:** SF Pro through the iOS system font; Inter on Android and in design specimens. One family per platform, regular/medium/semibold; no ornamental display face. Display hierarchy comes from size, alignment and spacing.
- **Layout:** open, aligned sections and continuous lists; time, person and decision context occupy predictable columns. Quiet canvas separates sections, not stacks of bordered containers.
- **Signature:** the **academic context rail**—a narrow, consistent time/date or person-alignment column beside a clear subject/action title. Schedule timelines may use a 2-point blue rail; ordinary lists do not acquire a decorative stripe.
- **Expression:** spend visual emphasis on one focal element per view: its next academic commitment, current attendance state or active decision. All other elements remain quieter. Vivid blue means an action is available; color does not imply urgency by itself.

Component anatomy, not a screen wireframe:

```text
SECTION TITLE                         optional text action

context rail    Primary label                       status
09:00–10:00     Computer Networks
                CSE 5A · Room 204
                Supporting context only when necessary
                ──────────────────────────────────────────
                Next row, aligned to the same text edge
```

Use native platform behavior for gestures, text selection, pickers, sheets, keyboard and accessibility. Do not place Material-styled containers inside Apple-styled chrome, or imitate either platform's entire aesthetic. The shared identity is typography, rhythm, semantic color and content hierarchy; presentation adapts to the OS. Apple’s [HIG](https://developer.apple.com/design/human-interface-guidelines) informs platform behavior; Material 3’s [foundations](https://m3.material.io/foundations/) inform scalable roles and state discipline. The concrete values here are CampusHR decisions.

## 1. Color system

### Neutral, brand and action roles

All values are opaque sRGB. Avoid foreground opacity as a substitute for a tested color. White text is reserved for sufficiently dark fills.

| Token | Value | Role and restrictions |
| --- | --- | --- |
| `color.canvas` | `#F7F8FC` | Main light canvas; no decorative gradient |
| `color.surface` | `#FFFFFF` | Lists, fields, sheets and actual grouped objects |
| `color.surfaceSecondary` | `#F1F5F9` | Search, secondary actions and inset supporting regions |
| `color.ink` | `#111827` | Primary text and numerals |
| `color.textSecondary` | `#667085` | Supporting text; approved on the three neutral surfaces |
| `color.textTertiary` | `#98A2B3` | Decorative/inactive marks only; **not** readable metadata or placeholder text |
| `color.divider` | `#E5E7EB` | Quiet section/row separators; never the only control boundary |
| `color.controlStroke` | `#7A8699` | Thin field/checkbox boundary on neutral surfaces; 3:1 minimum |
| `color.brandDeep` | `#1E3A8A` | Institutional headings or exceptional brand emphasis |
| `color.action` | `#2563EB` | Primary fill, selected text, links and focus |
| `color.actionPressed` | `#1D4ED8` | Primary pressed fill |
| `color.interactiveAccent` | `#3B82F6` | Context rail, non-text emphasis; never white small labels |
| `color.onAction` | `#FFFFFF` | Text/icons on action and pressed fills |
| `color.brandAccent` | `#F05023` | Small JCET identity detail, not the main application/action color |
| `color.brandAccentInk` | `#B9330F` | Orange-toned text when institutional text genuinely needs emphasis |
| `color.focus` | `#2563EB` | External 2-point focus ring with 2-point offset |

Use JCET orange for a small wordmark detail or a brief institutional rule, never an entire navigation bar, everyday button family or status. Preserve an approved crest asset; do not redraw the supplied logo from a screenshot. Full crests belong in identity/onboarding contexts, not every list header.

### Domain and feedback roles

| Domain | Accent | Readable ink | Container | Meaning |
| --- | --- | --- | --- | --- |
| Timetable / neutral information | `#2563EB` | `#2563EB` | `#EFF6FF` | Academic time, location and information |
| Attendance / success | `#10B981` | `#047857` | `#ECFDF5` | Attendance domain; a check plus words conveys confirmed success |
| Leave | `#7C3AED` | `#7C3AED` | `#F5F3FF` | Leave domain, balances and request context |
| Substitution | Blue + Violet | `#2563EB` / `#7C3AED` | Blue or violet container, never a gradient | Blue identifies the class; violet identifies the covering faculty/context |
| Warning / pending attention | `#F59E0B` | `#92400E` | `#FFFBEB` | Action or review is required; never imply failure |
| Destructive / error | `#F97360` | `#B42318` | `#FFF1EE` | Destructive intent or confirmed error, distinguished by label |

A domain is not a status. A pending leave uses a violet domain marker and, if necessary, an amber **Pending** status; approval remains mint. A substitution is not shown as complete until the server confirms it. Never turn every domain/status into another badge.

### Approved contrast pairs

Calculated from WCAG relative sRGB luminance, rounded to two decimals. These are token-pair checks, not a claim that an unbuilt interface is accessible.

| Foreground / background | Ratio |
| --- | --- |
| Ink / White | 17.74:1 |
| Secondary text / White | 4.97:1 |
| Secondary text / Canvas | 4.69:1 |
| Secondary text / Secondary Surface | 4.54:1 |
| White / Action Blue | 5.17:1 |
| Action Blue / Blue Container | 4.75:1 |
| Violet / Violet Container | 5.20:1 |
| Mint Ink / Mint Container | 5.21:1 |
| Amber Ink / Amber Container | 6.84:1 |
| Coral Ink / Coral Container | 5.97:1 |
| Control Stroke / Secondary Surface | 3.36:1 |

Meet **4.5:1 for all readable text**, including captions and placeholders, and **3:1 for meaningful control boundaries, icons and focus indicators** against their actual surrounding colors. The supplied tertiary gray, mint, amber and coral accents are not text colors on white. White on Interactive Blue is only 3.68:1; use Action Blue for filled buttons. White on Mint is only 2.54:1; use Mint Ink for a solid success icon container, or a mint-tinted container with dark ink. No color-only meaning.

States: selected = blue ink plus check/indicator and accessible selected state; pressed = explicit pressed fill; focus = external ring; invalid = coral ink, error symbol and explanatory text; disabled = `surfaceSecondary` fill plus `textSecondary` label, inactive semantics and no press effect. Do not dim entire components with arbitrary opacity. Decorative dividers do not need to carry interactive meaning.

## 2. Typography

Use iOS system text styles with Dynamic Type; do not bundle SF Pro as an Android font. Android uses Inter with system font scaling; system fallback must preserve meaning if the font is unavailable. Specimens use Inter so both platforms share one measurable reference. Weight 400 = regular, 500 = medium, 600 = semibold; 700 is reserved for occasional large titles, not a sea of bold labels.

| Role | Reference size / line height | Weight | Intended use |
| --- | --- | --- | --- |
| Large page title | 32 / 38 | 600 | First-level destination heading; once per view |
| Navigation title | 18 / 24 | 600 | Compact navigation and detail title |
| Greeting title | 26 / 32 | 600 | A faculty greeting, one or two natural lines |
| Section title | 20 / 26 | 600 | Meaningful section boundary |
| Body | 17 / 26 | 400 | Main content, instructions and form values |
| Secondary body | 15 / 22 | 400 | Department, room, date and supporting context |
| Caption | 14 / 20 | 400 | Brief supplementary information; never core task content |
| Button | 16 / 22 | 600 | Action labels |
| Tab label | 14 / 20 | 500; selected 600 | Always-visible destination label |
| Metric value | 28 / 34 | 600 | One factual value with its label/unit; not a dashboard scoreboard |

Sizes are logical points on iOS and scalable text units on Android; board pixels are reference measurements, not physical pixels. Use the closest native text style and let it scale. Body and all content labels must expand with system settings. Do not use a maximum font multiplier to force a layout to fit. Avoid fixed-height text containers, manual line breaks in names and all-caps metadata. Use normal tracking; tabular numerals only for aligned times, balances and durations.

At larger sizes: move trailing status/time below the main label, stack action pairs, grow rows and sheets, and wrap names/subjects. Essential request reasons, validation, eligibility and class details must never ellipsize. At 200% and accessibility text sizes, preserve the reading order rather than shrinking type. Tab overflow has a separate policy in section 9. [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility) is the platform baseline; these reference sizes are not hard-coded native limits.

## 3. Spacing and layout

An 8-point-influenced system with deliberate half steps:

| Token | Value | Use |
| --- | --- | --- |
| `space.4` | 4 | Label-to-detail, icon/text micro-spacing |
| `space.8` | 8 | Within a tightly related group; between adjacent touch targets |
| `space.12` | 12 | Row content gap and vertical row inset |
| `space.16` | 16 | Standard phone edge inset, field/control gap |
| `space.20` | 20 | Supporting grouped content inset when 16 is too tight |
| `space.24` | 24 | Section-to-section rhythm |
| `space.32` | 32 | Major task separation and spacious sheet content |
| `space.40` | 40 | Rare title/identity breathing room |
| `space.48` | 48 | Minimum shared interactive target; never blanket container padding |

Default phone edge inset 16; use 20 on wider phones when it improves line length. At 375, keep a 343-point content width. At 1280, do not stretch prose or rows edge-to-edge: center a 680-point readable column or use a 320-point list beside a 600-point detail region with a 24-point gutter. These are composition constraints, not screen designs.

Align section titles, row primary labels and dividers to a consistent content edge. Use a 64-point schedule time column where it fits; move time above the subject when it does not. Safe areas and keyboard insets are additional system-owned space, never guessed 24/34-point constants. Landscape and larger text may need a different composition.

**List first:** normal rows share one section surface and inset dividers. Prefer no enclosing border. Reserve a card for hero content, one important summary, a decision context or a distinct grouped object. No card inside a card. A summary is not a justification for a four-card metric grid.

## 4. Radius, lines and elevation

| Role | Radius | Rule |
| --- | --- | --- |
| Small control | 8 | Compact segment/checkbox visual treatment; target remains 48 |
| Button | 10 | Primary, secondary and destructive action family |
| Text/search field | 12 | One quiet boundary, not a heavy frame |
| Genuine card/group | 14 | Allowed range 12–16; not applied to ordinary rows |
| Sheet top corners | 24 | Native system shape may override; bottom follows safe area |
| Avatar | Circle | Avatar only, not a license for pill containers everywhere |
| Status container | 8 | Only when background improves recognition |

Dividers: 1 logical point. Field/control boundary: 1 point, increasing contrast rather than thickness; focused boundary 2 points plus accessible focus indication. No shadows on lists, fields, buttons, segments or bottom tabs. Sheets use platform elevation over a dimmed scrim. Reference scrim: Ink at 32% over canvas, verify readability and separation on the rendered result; it is a backdrop, not a text surface. Avoid blur/glass and card shadows. Recreate neither floating iOS glass chrome nor a full Material elevation stack.

## 5. Icon guidance

Use a **semantic icon key** and native-family mapping. iOS uses SF Symbols through an appropriate native adapter; Android uses Material Symbols Outlined, typically weight 400, grade 0 and optical size 24, with fill 1 for a selected destination when useful. Do not mix SF, Material, Lucide, Feather, emoji and custom line icons within one platform. A generic icon pack is not an acceptable stand-in in the later implementation.

Default glyph box 24; secondary inline glyph 20; important standalone feedback glyph 32. The touch target is 48, even when the glyph is 20 or 24. Match visual weight with adjacent type; use monochrome by default, not multicolor/stickers. Directional glyphs follow reading direction; clocks, institution marks and numeric content are not blindly mirrored.

| Concept | iOS symbol candidate | Android symbol candidate |
| --- | --- | --- |
| Home | `house` / `house.fill` | `home` |
| Timetable | `calendar` | `calendar_month` |
| Attendance | `checkmark.circle` | `event_available` |
| Leave | `calendar.badge.clock` | `event_busy` |
| Approvals | `checklist` | `fact_check` |
| Workload | `chart.bar` | `bar_chart` |
| Profile | `person.crop.circle` | `account_circle` |
| Notifications | `bell` | `notifications` |
| Settings | `gearshape` | `settings` |
| Substitution | `arrow.left.arrow.right` | `swap_horiz` |
| Document | `doc.text` | `description` |
| Search | `magnifyingglass` | `search` |
| Navigate to detail | `chevron.right` | `chevron_right` |
| Success | `checkmark.circle` | `check_circle` |
| Pending | `clock` | `schedule` |
| Error/rejected | `xmark.circle` | `cancel` |
| Warning | `exclamationmark.triangle` | `warning` |
| Password visibility | `eye` / `eye.slash` | `visibility` / `visibility_off` |

These are conceptual mappings; verify names, OS availability, licensing and native adapter support during adoption. Keep a same-family fallback for older OS versions. Do not ship Apple glyph artwork on Android. [SF Symbols](https://developer.apple.com/sf-symbols/) supplies platform-aligned weight/scale guidance; [Material Symbols](https://developers.google.com/fonts/docs/material_symbols) supplies the Android family and axis definitions. Neither source implies that the other platform should imitate its visual chrome.

Icon-only actions require a clear accessible label: “Notifications, 3 unread”, “Next week”, “Show password”. Decorative icons inside an already named control are hidden from assistive technology. Do not use a gear as a floating global control.

## 6. Buttons and selection controls

Default action target: **48 high, 48 minimum wide**, horizontal inset 16, radius 10, 8-point leading icon gap. Height is a minimum; wrap long labels at large text sizes. One primary action per task region. Do not make every action full width, but do use full width for the main action in a narrow form or sheet.

| Variant | Rest | Pressed | Usage |
| --- | --- | --- | --- |
| Primary | Action Blue + white label | `actionPressed` + white | Apply for leave, save an edit, assign permitted cover |
| Secondary | Secondary Surface + Deep Blue label, no border | Divider fill + Deep Blue | View details, non-primary alternative |
| Text | Transparent + Action Blue, no border | Blue Container + Action Blue | Cancel, contextual navigation or refresh |
| Destructive | Coral Ink + white for final commit | `#912018` + white | Final, explicit destructive confirmation only |
| Destructive text | Transparent + Coral Ink | Coral Container + Coral Ink | Entry into a confirmation, not a hidden immediate delete |
| Disabled | Secondary Surface + Secondary Text | None | Inactive semantics; tell the user why if it is not obvious |

Focused controls use the shared ring; color-changing focus alone is insufficient. Loading retains the label (“Submitting…”), adds a progress indicator, marks the control busy and prevents duplicates. Do not replace all text with an unexplained spinner. Submission success requires a confirmed server result; a timeout gets “Couldn’t confirm the update. Refresh before trying again.” Do not show a success animation or haptic for an uncertain result.

Labels are verbs with objects when ambiguity exists: “Save phone number”, “Assign faculty”, “Cancel request”. HOD wording respects actual authority: **“Recommend approval”** when HOD forwards a recommendation; **“Approve”** only when this actor can make the final decision. Never silently bundle approval and substitution into one irreversible action.

**Toggle:** native switch, label and optional supporting text in a 56-minimum row. Use for immediately reversible settings, not submitting leave. Show on/off through position, semantic state and label context. Native thumb/track metrics are platform-owned; reserve at least a 48-point action area without overlapping the label target.

**Checkbox:** 20–24 visual box inside a 48 target, 1-point Control Stroke; selected Action Blue with a white check; indeterminate uses a minus and mixed semantics. Label toggles the same control once. An error adds a readable message. Avoid checkbox-like icons for actions that do not maintain selection.

## 7. Fields, password and search

Field anatomy: persistent label above, 8-point gap, 52-minimum control, 12–16 horizontal inset, Body value, 8-point supporting/error gap. A placeholder is an example, never the label. Surface fill and Control Stroke boundary. Use a proper programmatic label and correct keyboard/content type. Required status is explained consistently; do not scatter unexplained asterisks.

| State | Treatment |
| --- | --- |
| Rest | White surface, Control Stroke, Ink input |
| Focus | Blue 2-point boundary; visible focus independent of caret |
| Filled | Same field; no extra confirmation icon per keystroke |
| Disabled | Secondary Surface, Secondary Text, disabled semantics; no opacity wash |
| Read-only | Labeled value; prefer a Profile row rather than a disabled-looking field |
| Error | Coral Ink boundary, error symbol and specific text below; retain valid input |
| Validating | Short adjacent text/progress only when latency is meaningful |

Password: separate, labeled Current/New/Confirm fields where needed; native secure entry and correct password-autofill semantics. Show/Hide is an accessible 48-point button with stateful naming, not a tiny eye target. Do not disable paste or password managers. Never reveal on focus. Clear sensitive drafts on departure/background/account change according to the session contract. Explain password rules before submit and keep errors specific without exposing credentials.

Search: 48-minimum Secondary Surface field, Search glyph, visible accessible label, descriptive placeholder (“Search faculty”), separate 48-point clear action when filled. Show results, no results, loading and error as distinct states. Keyboard Search commits when appropriate; do not fabricate matches or permanently obscure results with a spinner.

**Segmented control:** two or three mutually exclusive scopes, not nested navigation. Example “Today / Week”; 48-minimum control, 4 inset, radius 10 outer / 8 selection, white selected surface, no shadow, selected blue text and accessible selected state. Four statuses should use a filter sheet rather than microscopic segments. Grow/stack or use an accessible selection list when labels do not fit.

**Date selector:** a 48-target previous action, centered full date/week label and next action, each labeled. Tapping the label opens the native date picker/calendar sheet. Today is a text action, not a permanently competing primary button. Selected dates use Blue plus a shape/check; “Today” and “Selected” remain distinct. Use readable local dates (“Wed, 21 Oct 2026”) and unambiguous date ranges; academic operations show institution time when it may differ from the device zone.

## 8. List rows and academic components

Shared row: no outer card, 16 horizontal inset, 12 vertical inset, 12 content gap; 56 minimum for one line, 76 for two lines, 96 when more context is necessary. These are minimums, never clipping heights. Optional leading icon 24 or avatar 40; text consumes remaining width; optional trailing affordance/status. One accessible row activation opens details. A separate secondary action gets its own 48 target and is not nested inside an interactive row.

Inset dividers start at the text column and end at the section edge. The complete row is the target, not only a tiny chevron. Pressed fill is Secondary Surface; keyboard focus surrounds the row. Move trailing content below the label when space or font size demands it.

| Component | Required anatomy and behavior |
| --- | --- |
| **List row** | Primary label; one relevant detail; optional trailing value or chevron. Remove decorative category icons when they repeat without helping scanning. |
| **Schedule row** | Time rail, full subject, class/section, room and explicit duty type if substituted. Blue time/marker; current class includes “Now”, upcoming includes its time, canceled includes words. Keep subject names readable. A violet covering-faculty annotation supplements blue class context, never a blended gradient. |
| **Timeline item** | 2-point rail and a small marker, title, time and relevant event detail. Status uses icon/words; the rail alone does not communicate completion. No color cycling by row index. |
| **Notification row** | Event glyph, title, concise body and relative time; full date in details. Unread uses a small blue dot plus semibold title and announced “Unread”. Read does not reduce body contrast. Opening a link respects current account/permission; sensitive previews do not leak on logout. |
| **Profile row** | Label, readable value and chevron only for something actionable. Wrap email/department; do not show a disabled edit affordance for an HR-controlled field. |
| **Leave balance row** | Leave type and full name, remaining days with unit, allocation/used/pending context if available. “Unlimited” stays a word; never convert it into 0 or an invented denominator. Rejected/canceled requests do not consume a displayed pending balance. |
| **Faculty recommendation row** | Avatar/name, designation/department, eligibility label, actual availability and workload, up to two factual reasons, then Assign only when permitted/eligible. Put longer explanation in detail. Prefer “Available · 14 of 18 hours” over a giant score badge. Never fabricate match percentages or hide ineligibility behind color. |

**Avatar:** 32 compact / 40 row / 64 profile identity. Use an approved photo or neutral initials; no stock people impersonating staff. White/Secondary Surface with Deep Blue initials, no colored ring for rank or status. Names remain visible next to avatars; decorative avatars are not separately announced.

**Metric:** a value with a clear label and unit; one quiet inline region or summary, never a colorful tile collection. Example “12 hours · Assigned this week”. Supply the period and denominator where meaningful. Use no trend arrow without a real comparison, no leaderboard, and no animated counting.

**Progress:** 4-point inline track or native determinate progress with a numeric/text equivalent (“1 of 2 classes covered”). Use blue for workflow progress, mint only for completion; never progress-color a person's performance. Unknown total = indeterminate + task label, not a fake percentage. Leave use/remaining may use violet with a real denominator and explicit wording. No giant circular rings.

**Empty:** concise title, explanation and one permitted next step; simple native-family glyph only if useful. “No classes scheduled for this date” is not an error. **Error:** error symbol, clear problem, retained prior context when safe and an explicit Retry/Refresh. Distinguish forbidden, offline, unavailable and uncertain submission; never substitute sample data.

**Skeleton:** static low-contrast row geometry matching the actual content; no fake numbers, no shimmer required. Announce “Loading timetable” once, hide each placeholder from accessibility, and never make placeholders focusable. Prefer a labeled native progress indicator for a single small load.

## 9. Tabs and segmented views

Bottom tabs represent destinations; segments change scope inside one destination. Do not style them as the same control. The bottom tab bar is attached to the viewport, opaque Surface with a 1-point Divider above, no shadow, floating pill, raised center action or glass effect.

Reference phone tab content area: 64 minimum plus the system bottom safe area, 24 glyph, 4 icon/label gap, 14 label, each target at least 48 high. Use equal-width destinations, blue selected icon/text, Secondary Text unselected labels and semantic selected state. A filled native glyph can reinforce selection; a giant colored capsule is unnecessary. Never use domain colors for different destinations in the same bar.

Always show destination names; no icon-only tab bar. At default phone sizes test the longest label, Attendance, at 375 points without shrinking below 14. With large text, grow the bar and allow labels to wrap where meaningful. If full labels still cannot fit, expose an equivalent accessible destination presentation (native large-content viewer on iOS; a full-name destination sheet from a labeled “Sections” control on Android). Preserve every destination, order, current context and screen-reader name; no horizontal tab scrolling or unexplained ellipsis. This accessibility adaptation must be verified on-device before adoption, rather than assumed from a specimen. Tablet layouts may adapt destinations to a native sidebar/rail while keeping their semantics.

Counts are exceptional: an unread bell count or actionable Approvals count is allowed; avoid badge values on every tab. A number is never an urgency ranking or performance score. Visually cap very large counts with “99+”, announce the full count, and show a plain unread dot only where a count would add clutter.

## 10. Sheets, confirmations and transient feedback

**Bottom sheet:** Surface, native 24-reference top corner radius and drag indicator when resizable; 16–24 horizontal inset; title Navigation Title, optional explanation Body, natural-height content and a stable action region above safe area/keyboard. Use native detents based on content, not hard-coded screen percentages. Long forms become a near-full-height sheet; full-screen reading/navigation is a separate destination, not an infinite stack of sheets.

Present one modal layer at a time. Enter with a restrained system spring; do not bounce form fields separately. Close/Cancel targets are at least 48. Focus moves to the sheet's heading/first meaningful control and returns to the invoker after dismissal. Trap keyboard/screen-reader navigation inside the modal while it is open. Android Back and iOS swipe-to-dismiss respect the same draft rules. A meaningful unsaved draft gets “Discard changes?”; a pending irreversible request cannot be dismissed into a false success. Keep the keyboard from covering validation or the primary action.

**Confirmation sheet:** state action, named object/person, date/class and consequence. The safer action is easy to find. Destructive commit uses Coral Ink fill; cancellation is Secondary/Text. Avoid the vague “Are you sure?” and avoid requiring confirmation for every harmless choice. Example: “Cancel this leave request?” followed by the actual date range and the cancellation consequence. Do not promise reversibility the API does not provide.

**Alert:** a native interruptive dialog only for an important blocking condition or destructive decision. Maximum two clear actions unless a real platform convention requires otherwise. In-content errors belong inline. No stacked alerts.

**Toast:** brief, non-blocking confirmation or connectivity note above the tab bar/safe area. Surface with Ink text and one semantic symbol; no extra shadow if separation is already clear. Short confirmations target 4 seconds, longer actionable messages 6 seconds, honoring platform accessibility timeout settings; pause dismissal when focused. Important failures persist inline or in a banner until resolved. Do not put the only explanation or the only Undo path in an ephemeral toast. Announce politely once; do not steal focus. Haptics and color are supplementary.

## 11. Navigation architecture

| Faculty | HOD |
| --- | --- |
| Home | Home |
| Timetable | Approvals |
| Attendance | Timetable |
| Leave | Workload |
| Profile | Profile |

This table fixes **destination order**. It supersedes both the existing all-role mobile tabs and the supplied HOD reference image, which put Notifications in the bottom bar. Role changes update the navigation model only after authoritative session/permission restoration, never midway through a gesture.

- Notifications: top-right bell in root navigation bars, 48 target, full accessible unread label; opens a protected inbox with Back. It is not a sixth tab or HOD bottom destination.
- Settings: a labeled Profile row. No floating gear, persistent global gear or competing top-right settings button.
- Navigation bar: reference 56-minimum content height plus top safe area; Back/start side, compact title, bell/context action end side. Root views may use the Large Page Title below this bar; do not repeat the same title in both slots. Use one consistent pattern per destination level.
- Preserve each tab's navigation stack, selected date/filter and scroll position when switching. Tapping the active root tab may return to its top; do not discard a draft. Back resolves the current stack or dismisses a sheet before leaving the destination.
- HOD's own leave, attendance and documents stay reachable as clearly labeled **My leave**, **My attendance**, **My documents** entries in Profile; no hidden assumption that HOD stops being an employee. HOD Approvals is a distinct scoped workflow. Faculty Workload may be reached through an appropriate Profile/Home detail, without adding a tab.
- Deep links restore auth and permissions first, then show the permitted destination. If forbidden/unavailable, explain what happened and offer a safe return; do not route to another employee's content. Modal flows should not strand people on an empty root after dismissal.

## 12. Status and feedback system

Default status presentation is an icon plus readable words in a quiet row; a tinted 8-radius container is optional for a decision summary, not mandatory for every item. Status labels use at least 14, medium weight and tested dark ink. Keep one primary status per object; secondary facts become text, not more chips.

| Meaning | Words | Glyph concept | Ink / container |
| --- | --- | --- | --- |
| Awaiting action | Pending / Awaiting HOD review | Clock | Amber |
| Positive, confirmed | Approved / Checked in / Verified / Covered | Check circle | Mint |
| Confirmed rejection/error | Rejected / Failed | X circle | Coral |
| Neutral ended state | Canceled | Slash/minus with explicit label | Secondary Text / Secondary Surface |
| Not applicable | Cover not needed / Not scheduled | Minus/info | Secondary Text / Secondary Surface |
| Selected context | Selected / Today, with distinct labels | Check / calendar | Blue |
| Unconfirmed write | Update not confirmed | Warning | Amber; persistent explanation |
| Unavailable candidate | Not available, followed by reason | Warning or blocked | Secondary/Amber, not merely disabled opacity |

Distinguish **declared intent**, **in progress**, **confirmed outcome** and **unknown outcome**. Do not use success styling for tapping a button. “Recommendation sent” does not mean “Leave approved”; “Faculty assigned” does not mean every class is covered. Keep the next required step visible and factual.

Use plain language: “Waiting for HR review”, “Try again”, “Refresh documents”, “No classes scheduled”. Avoid “mutation”, “payload”, “permission scope”, “sync pipeline”, error codes and infrastructure names in the product. Diagnostics belong in developer tooling, not the faculty flow.

## 13. Motion and haptics

Motion exists only to explain input, selection, relationship, progress or confirmed outcome. No animated page entrances, floating objects, confetti, decorative gradients, pulsing badges, automatic count-ups or celebratory gamification. Native transitions win over custom choreography. These are design ranges, not animation implementation code or copied SwiftUI spring constants.

| Interaction | Design guidance | Haptic | Reduced motion |
| --- | --- | --- | --- |
| Tap/press | Visible feedback within 80–120 ms; fill/ink changes, no scaling text | None for routine navigation | Immediate state change |
| Scope/date selection | 120–180 ms, short position/color transition; retain label readability | Light selection feedback on a meaningful discrete change | Instant selection or brief opacity change |
| Sheet presentation | Native spring, roughly 280–360 ms perceived settle; controlled, no elastic overshoot | None just for opening | Native reduced-motion transition; no custom travel/bounce |
| Sheet/threshold drag | Follow the finger; dismissal threshold uses native behavior and cancellation restores position | One light feedback at a meaningful threshold, not every pixel | Preserve direct manipulation; remove autonomous spring flourish |
| Confirmed save/assignment | 160–220 ms localized icon/text transition, no full-screen celebration | Medium confirmation once after authoritative success | Static success symbol and text |
| Destructive commit | Clear pressed/confirmation state; no shake | Strong/warning feedback only for an important destructive commit; use native semantic feedback where available | Same semantic warning, no displacement |
| Swipe action | Reveal one contextual action, reversible where possible; destructive actions require explicit safe confirmation | Light threshold feedback at most once | Direct manipulation without rebound flourish |
| Pull to refresh | Native threshold and refresh indicator; retain prior content when safe | Optional light threshold; no loop haptics | Native refresh feedback, no custom oscillation |
| Error | Local explanatory message; do not shake the whole form | Optional native error feedback for a committed failure, not validation per keystroke | Immediate message |
| Progress/skeleton | Real progress only; static row skeleton by default | None | No shimmer; labeled native indeterminate indicator if needed |

Honor system Reduce Motion, haptic settings, battery/performance constraints and hardware support. Android should use equivalent semantic feedback, not attempt to replicate an iPhone motor profile. A strong haptic never replaces confirmation or an accessible warning. Apple’s [motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) guidance informs restraint and consistency, not a requirement to animate every control.

## Accessibility and adoption acceptance

- Shared target floor: 48×48 logical units, exceeding the 44-point iOS target baseline; keep adjacent targets separate, typically with 8 spacing. Native component visuals may be smaller; touch regions must not overlap. See [Android target guidance](https://support.google.com/accessibility/android/answer/7101858?hl=en).
- Test real contrast against the rendered surface. Focus rings must survive selected, disabled-adjacent, error and sheet states; never apply a low-opacity parent to readable text.
- Verify 375-point phone and 1280-point adaptive layout, compact height/landscape and 200% text plus largest platform accessibility settings. Expand and reorder; never squeeze essential information into fixed boxes. Sheet actions and navigation must remain reachable with keyboard open.
- VoiceOver/TalkBack: proper button, switch, checkbox, selected, busy and disabled semantics; sensible heading and traversal order; visible labels agree with accessible names; errors are associated with fields; announcements are brief and not duplicated.
- External keyboard/Switch Control: visible focus at every stop, no drag/swipe-only actions, no hover-only controls; return focus after dismissal. Use native date selection and text entry affordances.
- Dates, full names, longer subject labels, decimal/half-day balances and translated text must fit. Use real units, explain time zones where relevant and expose exact timestamps in details.
- Reduced motion must preserve every outcome; haptics are never the only feedback. Rendering tests cannot substitute for physical-device touch, text scaling, assistive technology or haptic checks.

### Required component state coverage

| Family | States that must exist before implementation is accepted |
| --- | --- |
| Navigation/tabs/segments | Rest, selected, pressed, keyboard focus, unread/count where justified, long labels, large text |
| Buttons/toggle/checkbox | Rest, pressed, focus, selected/on/mixed when applicable, disabled, busy, denied action explanation |
| Fields/password/search | Empty, focused, filled, read-only, disabled, invalid, loading/results/no results, keyboard/large text |
| Rows/academic objects | Loaded, pressed/focused, empty, loading, failure, unavailable/forbidden, long content, role variants |
| Sheets/confirmation/alert | Open, focused, scrolled, keyboard visible, cancel, draft dismissal, submitting, confirmed and uncertain outcome |
| Toast/progress/skeleton | Accessible announcement, safe-area placement, reduced motion, true completion, timeout/persistence policy |

### Adoption boundary

Freeze V2 as this specification and its tokens/specimens. Later screen work must map existing components to these roles, validate native symbol availability and font metrics, then prove Faculty/HOD behavior separately. Existing functionality must be retained. Approval workflows and private-document/session behavior remain governed by actual API contracts. Do not use a visual redesign to silently add permissions, invented metrics or unsupported actions.

**Stop point:** no full application screens, screen routes, production components or animations are generated as part of V2. Component geometry is specified; native/device acceptance remains future implementation work.

### Reference validation

Run `node design/mobile-v2/validate.mjs` from the repository root. It checks 29 color roles, 15 approved contrast pairs, button fill/label pairs, spacing, minimum reference type/target sizes, the 30-component inventory and the Faculty/HOD destination order. The six PDF sheets were rendered and visually reviewed. These checks validate design data and specimens; they do not claim rendered-app, Dynamic Type, assistive-technology or physical-device acceptance.
