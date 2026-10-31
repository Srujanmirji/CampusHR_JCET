# CampusHR V2 interaction specification

Frozen product behavior, 23 October 2026. No new screens, policies or actions. Timing below is a CampusHR tuning target, not a claim that Apple or Google prescribes these exact numbers. No separate SwiftUI reference file was provided: this specification applies the microinteraction principles in the brief. Final spring and haptic feel requires device calibration.

## Shared rules

Acknowledge a touch within one display frame where possible, budget <100 ms. Never delay a network request to finish motion. Keep the original action label during loading, add a busy indicator, prevent duplicate writes. Only confirmed server results may produce a success label, success symbol, haptic or notification-delivered claim. Preserve inputs and context on failure. Announce status once through the platform accessibility API; do not repeatedly announce progress.

Respect the OS Reduce Motion setting before any in-app preference. Reduced motion uses immediate state updates or a <=100 ms crossfade, without translation, bounce, symbol morphing or shimmer. Haptics obey device and user settings independently; visual and spoken feedback always remain sufficient. No background animation. No motion on ordinary read-only metrics.

| Interaction | Immediate feedback and duration | Spring / entry / exit | Haptic | Reduced motion |
|---|---|---|---|---|
| Button press | Pressed semantic fill on touch-down; release in 100 ms | No scaling required; release/cancel restores original state | None for routine taps | Immediate fill change |
| Bottom tab | Selection and label change in 160 ms; preserve each stack and scroll position | Short ease-out; no cross-screen lateral travel | None | Immediate selection |
| Segmented control | Selected background moves in 160 ms; content changes once | Critically damped feel, no overshoot; keep focus on selected item | Light selection if enabled | Immediate fill and content |
| Bottom sheet | System presentation, target 300–400 ms | Native spring, subtle settling, reverse dismissal; interactive drag follows finger | None on open; no threshold buzz during ordinary drag | Native accessibility-reduced transition |
| Date selection | Native picker feedback; commit on Done/OK, Cancel keeps original | System picker transition; 160 ms label update after commit | Light selection, once per committed value | Immediate label update |
| Swipe action | Follow finger; reveal action; cancel returns row | Native threshold and resistance; 200 ms settling | Light once when a meaningful threshold is crossed; never repeatedly | Native reduced motion; retain explicit accessible action |
| Pull-to-refresh | Native indicator immediately after threshold; retain existing rows | Native indicator, release spring; stop when fetch settles | Light threshold feedback once, optional | Static busy indicator; no content slide where avoidable |
| Check-in success | Busy button, then confirmed time/location or response text | Checkmark draw/replace 180–220 ms, no confetti; keep stable layout | Medium only after server confirms | Static check and announcement |
| Leave submission | Validate locally, then busy label; on success show request detail | 200 ms confirmation transition after response | Medium on confirmed request creation | Immediate detail navigation |
| HOD recommendation / final approval | Exact role-aware outcome; never promote recommendation to final status | Confirmation step then 180–220 ms state replacement | Medium after confirmed decision | Static updated status |
| Rejection | Confirmation with required reason; cancel safe; pending write blocks repeats | Native alert/sheet; 180 ms row/status replacement after success | One stronger warning feedback on confirmed consequential rejection; never on opening sheet | Static status and spoken outcome |
| Substitute assignment | Confirm identity/class/time/room; server revalidates capacity and availability | Native confirmation; 200 ms result change after response | Medium on assignment saved | Static check; no symbol bounce |
| Notification opening | Tap tint immediately; open destination; mark read through API | Standard push transition; destination loading if needed | None | Native reduced push; status text preserved |
| Loading | Show layout-matched skeleton after 200 ms if needed; retain cached rows when available | No authored shimmer; native progress for indeterminate work | None | Static skeleton and busy semantics |
| Error | Inline field message or in-context recovery; request fails without erasing input | 100–160 ms appearance; never shake fields | None; native error feedback optional only for committed failure | Immediate message |
| Empty | Show after successful empty response; clear reason and relevant existing action | No entrance animation or illustration loop | None | Identical static layout |
| Offline | Persistent in-context banner; label cache time; disable writes and preserve draft | <=100 ms appearance; hide only after successful reconnect fetch | None | Static banner |

## Springs and interruption

Use the platform system spring for sheets, swipe cancellation, picker and navigation. For a custom selection indicator only, an initial tuning target is response 0.25 s, damping fraction 0.9 with zero intentional overshoot; Android equivalent is a highly damped spring. These are not cross-platform physics guarantees. Stop or retarget in-flight selection motion on new input. Never queue haptics. No authored spring on chart values, list entrance, or routine data refresh.

## Platform implementation

**iOS:** NavigationStack, TabView, sheet with detents appropriate to content, native confirmationDialog/alert, swipeActions, refreshable, Picker and DatePicker. Image(systemName:) for symbols; SF Symbol effects only for a meaningful changed state and availability-gated. UISelectionFeedbackGenerator for committed selection; UIImpactFeedbackGenerator medium for committed actions. Accessibility Reduce Motion controls authored motion; do not override the native system's adaptation.

**Android:** NavigationBar and NavigationBarItem, ModalBottomSheet, AlertDialog, DatePickerDialog, exposed semantics for all actions, and platform back handling. Use Material state layers, never a second custom ripple. HapticFeedback constants chosen for semantic action and device capability; Android should not mechanically mimic iPhone amplitudes. Cancel predictive-back returns the user to the same draft and scroll position.

## Data and failure boundaries

- Lost response after submission: display “Checking your request…” and reconcile with the server before allowing a retry that could duplicate the write. Do not claim the operation failed or succeeded without evidence.
- Assignment conflict: stay at confirmation, explain that availability changed, return to refreshed recommendations. No success haptic.
- Expired session: preserve nonsensitive draft fields as appropriate, ask to sign in; do not cache passwords or attachments.
- Notifications permission denied or delivery pending: assignment may succeed independently. Say “Assignment saved” and “Notification pending” unless delivery evidence supports “Notification sent”.
- Recommendation match percentages are supplied sample values, not a client-computed or approved scoring algorithm. Explain subject fit, capacity and availability; do not add points or rankings.

References: [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Apple sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), [Android accessibility](https://developer.android.com/develop/ui/compose/accessibility), [Material navigation](https://developer.android.com/develop/ui/compose/components/navigation-bar). Platform behavior is native; CampusHR timing is a tuning proposal.
