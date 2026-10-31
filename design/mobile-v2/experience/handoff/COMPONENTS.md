# Component inventory and token freeze

The canonical source is ../../DESIGN_SYSTEM.md and ../../tokens.json. The local tokens.json is a byte-identical handoff snapshot, not a second authority. Run the check to detect drift. No new color, typography, spacing or radius scale was introduced.

| Canonical component | Behavior / development acceptance |
|---|---|
| navigationBar | Role-correct title/back/bell; safe area; no floating settings. |
| bottomTabBar | Faculty and HOD root sets stay distinct; selection icon + label; independent stacks. |
| button | 48 minimum target; semantic fill; retained label while busy; duplicate submission prevented. |
| secondaryButton | Secondary semantic fill and ink; same target/loading rules as primary. |
| textButton | Text appearance with a 48 target; explicit accessible action. |
| textInput | Persistent label, autofill intent, inline error; no placeholder-only labeling. |
| passwordInput | Secure entry, show/hide with spoken state, never persist password. |
| search | Search icon, real label, clear action and empty result message. |
| segmentedControl | Selected state and content stay synchronized; native semantics. |
| dateSelector | Native picker, visible committed date, cancel preserves value. |
| toggle | Exposes checked state and real label; native feedback. |
| checkbox | Full label is a 48 target; exposes checked state. |
| avatar | Initials fallback, decorative when adjacent identity is already spoken. |
| statusLabel | Readable semantic ink plus icon and text; no color-only meaning. |
| listRow | Minimum 56; expands for content; no enclosing card per item. |
| scheduleRow | Time rail, period/code/subject/section/room/type; no desktop matrix. |
| timelineItem | Accessible chronological order with status text. |
| metric | Factual server value, label and period; never gamified. |
| progress | Text numerator/denominator or percentage; native progress semantics. |
| emptyState | After successful empty fetch; contextual explanation and existing recovery. |
| errorState | Name failed task and recovery; preserve draft and cached content. |
| skeleton | Layout-matched static placeholders; hidden decorative blocks; busy region. |
| bottomSheet | Native focus containment, close/cancel, safe areas, optional drag handle. |
| confirmationSheet | Identify exact action/subject; explicit cancel; no implicit commit on dismissal. |
| alert | Only consequential or blocking information; native accessibility semantics. |
| toast | Nonessential transient confirmation only; critical errors remain inline. |
| notificationRow | Subtle unread surface, semantic icon, title/body/time; destination and read behavior. |
| profileRow | Icon, label, optional supporting text, chevron; 48 minimum. |
| leaveBalanceRow | Leave type + available/total; truthful period; no invented balance math. |
| facultyRecommendationRow | Identity, role, availability, workload, reasons, quiet supplied match; disabled Assign explains why. |

## Units and status

Baseline sizes are logical iOS points, Android dp for layout and sp for text. 48 is the shared minimum target; 14 is the minimum metadata size. Body 17, secondary 15, navigation 18, section 20, greeting 26, large title 32. Space 4/8/12/16/20/24/32/40/48. Radius 8 controls,10 buttons,12 fields,14 appropriate cards,24 sheet top. No elevation by default.

Pending uses clock + label, approved uses check + label, rejected uses close + label, unavailable uses explanatory text with disabled control. Domain accent is not status: a violet leave icon does not mean approved. The supplied mint/amber/coral accents are not normal text colors: use their darker ink roles.
