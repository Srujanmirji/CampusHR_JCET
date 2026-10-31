# Platform adaptations and developer handoff

Product design V2 is frozen for development. These are separate iOS and Android review packages; browser previews communicate visual treatment and content, not working native widgets. The original faculty package remains unchanged. All sample identities, leave requests, metrics, matches, notifications and assignment results are synthetic.

## iOS package

Twelve exported views: Login, Home, Timetable (Today with Week access), Attendance, Leave, Apply Leave, Notifications, Profile, HOD Approvals, Leave Review, Smart Coverage, Settings.

Use system SF Pro, with V2's named hierarchy as the baseline. Map titles to largeTitle/title2/headline, body to body, secondary to subheadline and caption to a readable footnote. Use scaled metrics for custom sizes; no maximum Dynamic Type cap or minimumScaleFactor to squeeze labels. The browser uses the Apple system font on macOS as a specimen, not proof of Dynamic Type support.

Use NavigationStack for push destinations and TabView for root destinations. Preserve independent tab stacks; native leading back button and edge-swipe return to the previous view. Hide bottom tabs for the full-screen Apply Leave flow. Root tabs remain Faculty Home/Timetable/Attendance/Leave/Profile; HOD Home/Approvals/Timetable/Workload/Profile. Bell is top-right, Settings is inside Profile. Do not add Notifications as an HOD root tab.

SF Symbols are the only product glyph family. Specimen PNGs are exported using AppKit system symbols on this Mac; native iOS implementation uses Image(systemName:) with OS availability fallbacks. Do not ship raster exports or assume macOS availability proves the oldest supported iOS version. See ICONS.md.

Use native segmented Picker, DatePicker, sheet, alert and contextMenu. Password Help uses a content-sized sheet with safe-area-aware bottom action. Apply Leave remains a full-screen form; do not put a long form into a cramped half sheet. Confirm rejection with reason; context menus may expose existing actions, never silently commit decisions. Swipe actions have accessible button equivalents.

SafeAreaInset for sticky decision actions; scroll content gets matching bottom padding. Respect the home indicator, navigation bar and keyboard insets, including landscape. Keyboard Next moves through form fields; Done dismisses where appropriate. Scroll invalid field into view and keep its real label and error visible. On cancel/back with edits, show native discard confirmation and preserve the draft if cancelled. iPad uses bounded readable content, not stretched phone rows.

## Android package

Same twelve content destinations and role permissions. Inter remains the frozen V2 body/display family with system sp scaling. Do not force fontScale=1 or cap scaling; reflow rows and action groups when space is insufficient.

Use Material 3 Scaffold with a NavigationBar, selected icon indicator and Material state layers. Top app bar uses Android's back arrow; Android back first dismisses the keyboard, then sheet/dialog, then the current pushed destination. At a root destination follow platform app-exit expectations; do not cycle tabs as a fake history. Support predictive back through the navigation framework. Gesture and three-button navigation insets must both work.

Use Material Symbols Outlined consistently. Selected state is indicated by the container and label, never color alone. Browser font is the same licensed Google symbol subset used by the frozen faculty specimen. Do not mix SF exports into Android.

Use Material DatePickerDialog, ModalBottomSheet and AlertDialog. Native Material text fields own focus/error/supporting-text states; the specimen's tinted field is visual intent only. V2 color roles map to primary/action, onPrimary/onAction, surface/surface, surfaceContainer/surfaceSecondary, onSurface/ink, onSurfaceVariant/textSecondary, outline/controlStroke, error/coralInk. Success mintInk and warning amberInk remain explicit product roles. Component shape remains restrained by V2 instead of applying giant rounded containers everywhere.

Dynamic color may affect neutral app-adjacent surfaces only after every text pair is validated. Keep action blue, leave violet, attendance mint, warning amber, destructive coral and the small JCET orange accent stable. Brand assets and semantic status roles never change with wallpaper. No dynamic color implementation or new dark palette is part of this design freeze.

Keep all targets >=48 dp, even if a visual icon is 24 dp. Use WindowInsets.safeDrawing and IME padding; no buttons behind keyboard or system navigation. At large text, allow stacked action rows and vertically expanded navigation labels instead of ellipsis for critical meaning.

## Backend truth and capability boundaries

The requested “Approve & Find Cover” label is retained as a design fixture with an explicit “HOD recommendation · Final approval is still required” qualifier. Production must use “Recommend approval” for a nonfinal HOD actor, show the actual approval chain, and only enter assignment after final approval permits it. This is a capability binding, not a permission change. Reject follows server authority as well. The prototype never unlocks final approval when its HOD action is tapped; Smart Coverage is a separate already-approved fixture.

Revalidate assignment availability and workload on commit. Never compute match scores in the client, or infer that 94% is a validated recommendation model. Workload thresholds, attendance percentages and academic-continuity definitions come from the backend and institutional policy. No new metric formula is approved here.

Institutional SSO, location attestation, lunch tracking, support addresses and full profile subfeatures are design entry points, not claims of implemented integrations. Do not make fake API data appear live. Use confirmed API capabilities and explicit unavailable states until integrations exist. Confirmed notification delivery is separate from assignment creation.

## Sources

[Apple HIG](https://developer.apple.com/design/human-interface-guidelines), [SF Symbols](https://developer.apple.com/sf-symbols/), [Material Symbols](https://developers.google.com/fonts/docs/material_symbols), [Material navigation behavior](https://developer.android.com/develop/ui/compose/components/navigation-bar), [Android scalable content and semantics](https://developer.android.com/develop/ui/compose/accessibility).
