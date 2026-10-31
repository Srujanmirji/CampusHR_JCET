# CampusHR platform UI/UX

The palette remains exactly that of **CampusHR: Academic Workforce Platform** (`12747977855754983799`). The source token file is unchanged by this pass. Contrast and source tests pin navy `#000B31`, hero `#051F5B`, orange `#B22C00`, canvas `#F8F9FF`, inset `#EFF4FF` and ink `#121C2A`.

## Reference ownership

| Reference | Application in CampusHR |
| --- | --- |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines), [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Native navigation and sheets, safe areas, scalable type, explicit labels, 48-point controls, supplementary feedback, reduced motion |
| [Material 3](https://m3.material.io/), [official Android guidance](https://developer.android.com/develop/ui/compose/designsystems/material3) | Semantic surfaces/content roles, state-driven controls, Android tonal selection and accessible status labels; no dynamic-colour override of CampusHR branding |
| [SF Symbols](https://developer.apple.com/sf-symbols/) | Native iOS symbol mappings; filled variants for supported active tabs, with icon plus text and selected accessibility state |
| [Material Symbols](https://fonts.google.com/icons), [official symbol guide](https://developers.google.com/fonts/docs/material_symbols) | Android/web symbol mappings through the existing expo-symbols integration; no extra icon pack |
| [SwiftUI microinteraction reference](https://github.com/iAmVishal16/swiftui-microinteractions) | Adapt physical feedback and interaction-phase principles to React Native; keep the existing stack and palette. Do not import its dark/glass visual style or install a skill/package |

## Implemented behaviour

- Shared buttons retain their labels, loading state and duplicate-action lock. Presses compress to 98% with a restrained spring and return on release/cancellation. Parameters live in theme.motion. Reanimated respects system Reduce Motion; no ambient animation or timer-driven feedback.
- Profile sections and Today/Week share one segmented control with explicit tab labels/selection state, 48-point targets, keyboard focus, a short selection transition and platform-specific selected fill. The callback and selection haptic run only for a changed value.
- Weekday selection uses the same change-only feedback. Confirmed mutations retain medium feedback; confirmed consequential rejections retain warning feedback. A hardware haptic failure cannot fail a saved action; web makes no haptic call.
- Active Home/Profile/Attendance/Workload iOS symbols use their filled counterpart. Material mappings remain platform-native. Decorative icons stay hidden from screen readers; controls carry names.
- Login supports username/current-password autofill and password keyboard submission through the original validated handler.
- Route titles expose header semantics. Leave and Approvals use contextual content headings instead of repeating the route title.
- Reason and decision-note fields are multiline with a visible 500-character allowance matching the API. Newlines stay in the field; they do not submit it.
- Form errors are linked to their field, announce through alert/live-region semantics, and retain a visible keyboard focus outline even when invalid. Disabled fields and visibility controls expose their state.
- Current/new password autofill roles are distinguished in the password-change flow.
- All real API, scope, secure-session, private-document and uncertain-write protections are retained.

This is a platform-quality refinement of the approved product UI. It does not claim full HIG/M3 certification or replace the UI with a generic Apple/Material hybrid. Missing backend capabilities described in STITCH.md remain explicit.

## Verification

Mobile TypeScript, lint and all 107 unit tests pass, including feedback failure handling and pinned palette/contrast checks. The disposable Faculty/HOD flow check passes, including keyboard Enter sign-in, both segmented controls, linked invalid-field descriptions and multiline reason entry. The final native iOS bundle returned HTTP 200 and the simulator login was visually inspected. The flow check runs with reduced motion, keyboard focus and 375/1280 widths; actual iOS bundling and simulator launch are separate checks. Physical haptic tuning, VoiceOver/TalkBack, Android hardware and native signed-in gesture/keyboard acceptance remain pending.
