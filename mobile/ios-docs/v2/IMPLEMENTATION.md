# Mobile V2 implementation

Implemented on 23 October 2026 against the frozen Academic Clarity specification in design/mobile-v2/. This changes the existing React Native / Expo application; it does not embed the HTML design preview or replace working API services with sample data.

## Adopted system

`mobile/lib/theme.ts` imports canonical tokens.json. Existing color and typography property names remain aliases for compatibility with the API-driven screens. iOS uses the system font, Android/web use bundled Inter; text scaling is enabled. Metadata is at least 14, body 17, buttons 16, and touch targets at least 48. Cards default to flat divided sections; a next-class hero and daily attendance summary explicitly opt into appropriate surfaces. No decorative shadows, scale-on-press effects or gradients.

SF Symbols on iOS and corresponding Material Symbols on Android/web use expo-symbols. Buttons retain labels while busy and block duplicate presses. Fields have persistent labels, password visibility and readable errors. Date fields use the native date picker on iOS/Android and retain the editable date interface for browser checks. Half-day uses Switch. Apply Leave is full-screen and accommodates the keyboard; date fields stack at expanded text sizes. Rejection/recommendation uses a native sheet with fixed bottom actions. Reduce Motion suppresses authored modal slide transitions; committed writes may play a supplementary haptic, which never determines whether an operation succeeded.

## Routes and capabilities

| V2 area | Runtime destination / implementation |
|---|---|
| Login and Password Help | `(auth)/login`: open institutional form, remember option, secure entry, native assistance sheet |
| Faculty Home | `(tabs)/index`: next scheduled class/duty, live summary values, compact workload, schedule rail, notification preview |
| HOD Home | Same root chooses HOD view: scoped pending requests, coverage counts, workload and reporting values |
| Timetable Today / Week | `(tabs)/timetable`: dated duties retained, selected-day schedule with time rail |
| Attendance | `(tabs)/attendance`: confirmed punch status, contextual action, distribution of recorded days, history and existing correction workflows |
| Leave | `(tabs)/leave`: flat balance/request lists, filtering, cancellation safeguards, full-screen application |
| Leave Detail | `leave/[id]`: API-validated request, reason, actual approval timeline and coverage readiness |
| HOD Approvals / Leave Review | `(tabs)/approvals`: role-gated queue, one Review action, employee balance/history and consequence-aware recommendation/rejection |
| Academic Impact / Smart Coverage | `leave/coverage`: approved leave → dated affected classes → eligible faculty |
| Assignment Confirmation | Native confirmation alert names the actual faculty, dated class, periods and room before the existing assignment API runs |
| Coverage Success | Shown only after a verified server response; progress and the next class use actual recorded coverage |
| Notifications | `notifications`: paged API feed, category filters, subtle unread tint, mark/read/open behavior, live connection retained |
| Profile | `(tabs)/profile`: actual identity, compact available statistics and grouped destinations |
| Personal / Academic details | `profile/details`: existing employee record and permitted phone update |
| Documents | `documents`: existing private upload/download/preview/delete flows retained |
| Password | `profile/password`: existing password-change and session-revocation behavior retained |
| Settings | `profile/settings`: account, device-managed accessibility, push permissions, privacy/security and support |

Faculty roots remain Home / Timetable / Attendance / Leave / Profile. HOD roots are Home / Approvals / Timetable / Workload / Profile. HOD personal leave and attendance push from Profile to profile/leave and profile/attendance with native back navigation. Bell is in the top bar; the product has no floating settings button. Expo Go may display its own floating developer-menu control; it is not CampusHR navigation or a shipped product setting.

## Truthful capability bindings

- HOD commits a recommendation, not final approval. Coverage remains an approved-leave workflow. The implementation uses “Recommend approval”, following the handoff's role-binding requirement.
- Recommendation points are no longer exposed as a game or incorrectly converted into percentages. The existing server ranking remains intact; the UI shows eligibility, workload and factual experience reasons.
- Assignment success does not assert notification delivery. The assignment API has no delivery receipt, so the app says delivery has not been confirmed.
- Pending leave has no authoritative dated-impact API and the leave submission contract has no attachment field. These limitations are explicit in the form/review; no synthetic class count or fake upload is added. Existing document management remains available.
- Home uses confirmed daily attendance rather than inventing the specimen's 96.4%. The attendance distribution is labeled recorded days; missing days are not counted as absence. UTC attendance policy is preserved.
- Department reports use a department-scoped grant. A global-only summary is not presented as departmental; workload responses are checked against the selected department.
- SSO and verified support contacts are not configured. The visible entry points explain this rather than invoking a fabricated identity provider or address. Research and performance destinations explain their current mobile availability.

## Verification

- `npm run typecheck --workspace @campushr/mobile`
- `npm run lint --workspace @campushr/mobile`
- `npm run test --workspace @campushr/mobile`: 104 passing API/session/privacy and department-scope tests.
- `node design/mobile-v2/validate.mjs`: canonical token/contrast/component validation.
- `mobile/checks/v2.smoke.mjs`: disposable actual service fixtures; Faculty/HOD navigation, form validation, profile/settings/documents entry points, notifications, recommendation/rejection, department workload, eligible/disabled candidates, confirmed assignment and lost-response reconciliation. Includes keyboard focus and 375/1280 screenshots. No real accounts or database writes.
- iPhone 17 Pro, iOS 26.5: actual iOS bundle compiled and launched in Expo Go; uncropped simulator evidence in screenshots/iphone-17-pro-login.png. Signed-in flow evidence is from the browser regression, not a claimed native walkthrough.

Normal development Metro is on 8081 with the existing mobile/.env unchanged. The independent browser verification Metro is on 8082 and only it points at the disposable API on 4011. The fixture uses in-memory repositories and notification stubs. It cannot touch Railway. To reproduce:

```sh
PREVIEW_ORIGIN=http://127.0.0.1:8082 PREVIEW_HOST=127.0.0.1 node --import tsx mobile/checks/home-preview.mjs
```

Then, from mobile/ in a separate terminal:

```sh
NODE_OPTIONS=--dns-result-order=ipv4first EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:4011/api/v1 EXPO_PUBLIC_SOCKET_URL=http://127.0.0.1:4011 npx expo start --localhost --port 8082
```

Run the V2 smoke script from the repository root. To run the app with its existing API configuration, start Expo from mobile/ with `NODE_OPTIONS=--dns-result-order=ipv4first npx expo start --localhost --port 8081` and open `exp://127.0.0.1:8081` in the simulator. The IPv4 option avoids Metro listening only on ::1 while Expo Go requests 127.0.0.1. It does not change the API configuration.

## Acceptance still required

Real-device haptic calibration, VoiceOver/TalkBack, native signed-in keyboard/picker/gesture paths, Android emulator/device testing and real institution-account sign-in are not certified by these checks. The iPad mini launch reached Expo Go’s first-launch “Open in Expo Go?” prompt; simulator UI controls were unavailable to complete that prompt, so no iPad app acceptance is claimed. The test iPad was shut down afterward. Expanded Dynamic Type was checked on the iPhone login and restored to the original Large setting; signed-in text/keyboard paths remain native acceptance work. V2 is explicitly light-only; no dark palette is fabricated. The local API was not running on loopback port 4000 during this task; production-database-backed sign-in and integration were not exercised. Native simulator evidence must not be described as a release IPA or an App Store build. Existing repository-wide npm advisories remain outside this design migration; no broad dependency upgrades or audit fix were performed.
