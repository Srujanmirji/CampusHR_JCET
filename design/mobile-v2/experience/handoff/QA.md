# Final product design QA and freeze

23 October 2026. Design freeze covers the existing V2 standard, 12 Faculty views, 8 HOD views and the 12-view iOS / 12-view Android adaptations. Product functionality and IA are unchanged. This is a design handoff, not production or native-device acceptance.

## Evidence and disposition

| Area | Design decision / review outcome | Verification boundary |
|---|---|---|
| Visual consistency | Existing V2 CSS and tokens reused, no replacement visual language; list-first HOD and recommendation rows | Browser renders reviewed; frozen files hash-checked |
| Typography | V2 hierarchy and >=14 metadata; Inter for generic/Android, system face for iOS | Real rendered fonts checked; native Dynamic Type pending |
| Spacing / radius | Existing 4–48 spacing and 8–24 contextual radii; no nested summary cards or new shadow scale | Render and CSS review |
| Semantic colors | Readable ink variants; blue timetable, mint attendance/success, violet leave, amber warning, coral rejection | Canonical validator measures designated pairs; arbitrary wallpaper colors not approved |
| Navigation | Faculty/HOD five-root sets; bell entry; Settings in Profile; review pushes into decision/coverage | Prototype flows plus screen contracts; native stacks/back pending |
| Icon consistency | Material only on generic/Android; SF only on iOS; no emoji action icons | Local icon assets loaded in previews; iOS OS-version fallback pending |
| Touch targets | Shared >=48 layout minimum, including disabled controls and full row labels | Automated rendered checks at 375/430/1280 |
| Focus | Visible 2px outline for actions/fields and keyboard scroll areas; rejection sheet trap/Escape/return | Browser keyboard traversal; VoiceOver/TalkBack pending |
| Status | Icon + text, no color-only meaning; recommendation distinct from final approval | HOD flow assertion; delivery status requires backend evidence |
| Forms | Persistent labels, secure password, visible visibility state, date/half-day validation, attachment boundary | Frozen faculty checks plus HOD rejection reason test; native IME pending |
| Sheets | Short support/confirmation content only; Apply Leave full-screen; cancel safe | Focus trap tested on rejection; native sheets/pickers specified separately |
| Loading | Static skeleton structure with busy semantics; preserve cached context | Specification complete; all API states require runtime integration |
| Empty | Contextual category/status message and existing recovery action | HOD Approved empty filter exercised; other cases specified |
| Error | Inline actionable errors; preserve reason/dates; revalidate conflicts | Rejection validation exercised; network conflicts specified |
| Offline | Explicit offline label + last sync; no writes; keep draft; reconcile unknown writes | Specified, not a claim of working offline persistence |
| Long names / departments | Wrap rather than ellipsize identity; time rail retains context; stacked actions at expanded text | 375px injected long names and 200% CSS text stress; native font scaling pending |
| Small / large phones | Continuous scrolling instead of compressed desktop matrix; fixed decisions outside scroll content | 375px and 430px preview bounds; landscape/native pending |
| Desktop review | Preview framing only, not a new desktop product design | 1280px preview checked |
| Safe areas | Platform inset contract separates content, fixed actions and system navigation | Specimen visual allowances; actual cutouts/insets pending |
| Keyboard overlap | IME inset, invalid-field scroll and focus-return contract | Browser keyboard traversal; actual iOS/Android soft keyboard pending |
| Bottom navigation | Selected root has label and icon; HOD Approvals/Workload retained | Rendered view checks; scaled native tab layout pending |
| Dark readiness | Semantic roles and no component-local hex make a later theme possible | Dark palette/screens are not designed, tested or approved; ship V2 light only |
| Reduced motion | No decorative motion; browser reduced-motion override; native equivalents per interaction | Browser reduce setting used; device-level setting pending |

## Inconsistencies identified and resolved in new artifacts

- HOD approval segments now use three columns; workload summary inherits no unrelated faculty flex layout.
- New HOD Review and Assign controls initially lacked the shared button base. Added the existing button primitive, restoring the 48 minimum and the same disabled/focus semantics.
- HOD stub destination buttons initially inherited browser button borders. Removed those borders in the HOD specimen so root navigation follows V2.
- A direct translation of the supplied approval CTA would misrepresent current HOD authority. Added a visible final-approval qualifier and separated the approved coverage fixture; the production role binding is mandatory in PLATFORMS.md.
- Visual review caught a relative URL that prevented SF masks from loading; corrected the asset base and added HTTP-failure assertions to the check.
- SF Symbols and Material Symbols cannot share a renderer on iOS. Added separate system-symbol review exports and a native-image handoff requirement; Android uses only Material.
- The provided institutional logo asset is a JGI mark, not a verified official JCET crest. Preserve it as supplied for continuity; obtain approved institutional artwork before release. Do not fabricate a crest.

The requested Faculty screens were not changed to fix these new-preview issues. No new features, metric formula, role permission or dark palette is introduced.

## State acceptance for every data screen

Initial load: stable title/navigation with matching static skeleton. Populated: current server data and period. Empty: successful zero result with contextual message. Recoverable error: retry the failed read, keep useful cached context. Offline: explicitly stale read-only context and preserved draft. Permission loss: explain unavailability and remove unauthorized action. Write pending: block duplicate commit. Write failure: preserve input. Uncertain outcome: reconcile before retry. Success: confirmed response only. Screen-specific variants are listed in SCREENS.md; none can be omitted merely because the happy-path PDF is complete.

## Remaining native acceptance before release

Run actual iOS and Android builds on the smallest supported phones and a large device; test landscape, 200% and accessibility text sizes, long identities, native date picker, keyboard Next/Done, interactive sheet dismissal, predictive/edge back, safe areas, gesture/three-button navigation, VoiceOver/TalkBack order and announcements, assistive alternative to swipe, reduced motion, disabled haptics, slow/offline reconnect, expired session, assignment conflict and lost write response. Confirm SF availability on the minimum iOS version and check real fonts after fallback. These are acceptance gates, not passed results.

Freeze source: ../../DESIGN_SYSTEM.md and ../../tokens.json. Final inventory COMPONENTS.md; platform bindings PLATFORMS.md; icons ICONS.md; motion INTERACTIONS.md; every screen SCREENS.md and screens.json; executed browser evidence check-results.json.
