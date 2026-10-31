# Pranav Angadi — Mobile app

GitHub: `pranavangadi` · Team: Mobile · Plan: [`../TEAM_PLAN.md`](../TEAM_PLAN.md)

You own the **app shell, login, home, profile and notifications** of the
faculty and staff app in `mobile/` (React Native, Expo, Expo Router,
TanStack Query). Arihant's screens plug into your shell, so build it first.

Read first: `mobile/MOBILE_APP.md`, `design/MOBILE_UX.md`,
`design/DESIGN_SYSTEM.md`, `mobile/lib/theme.ts`,
`backend/API_ENDPOINTS.md`. Run with `npm run dev:mobile`.

## 1. App shell · start now

- [ ] Bottom tabs: Home, Timetable, Attendance, Leave, Profile
      (`mobile/app/(tabs)/`); Arihant fills Timetable, Attendance and Leave
- [x] API client in `mobile/lib/session.ts`:
      base URL from `EXPO_PUBLIC_API_URL`, access token header, one retry after
      refreshing an expired token, readable error messages
- [ ] Loading, empty and error states shared by all screens
- [ ] 44pt tap targets, labels on every control, large text works

## 2. Login — MB-002 · start now

- [x] Login screen: employee ID or email, password (`POST /auth/native/login`)
- [x] Native JSON-token contract verified (IOS-002); browser HttpOnly cookies preserved
- [x] Store only remembered refresh tokens in `expo-secure-store`; access tokens stay in memory
- [x] Restore the session on launch; logout clears tokens and Query caches
- [x] Signed-out users only see the login screen

## 3. Home and Profile — MB-003, MB-008 · start now

- [x] Home: greeting, own regular classes, read-only attendance, casual leave, workload and latest notifications (IOS-004); physical-device QA remains open
- [x] Profile: own record from `GET /employees/:id` (the `employeeId` comes
      from sign-in); update own phone (`PATCH /employees/:id`)
- [x] Profile: own documents, native picker/upload, status and permission-checked preview (IOS-011)
- [x] Profile: session-aware password change and private temporary-file cleanup (IOS-011)

[Profile verification](../../mobile/ios-docs/PROFILE_AND_DOCUMENTS.md); native picker/PDF and physical-device acceptance remain IOS-012/013.

## 4. Notifications — MB-007

In-app server integration is complete for IOS-009; [evidence and limits](../../mobile/ios-docs/NOTIFICATIONS.md). IOS-010 implementation is ready; [remote push setup and outstanding device acceptance](../../mobile/ios-docs/REMOTE_PUSH.md). Local previews/simulated delivery helpers were removed.

- [ ] EAS project ID (`npx eas init`) and a development build for Android
- [x] Register the device push token with the session-owned API; renewal/logout and account-transfer cleanup implemented
- [x] Allowlisted, permission-checked in-app notification navigation (IOS-009)
- [x] Guard remote taps with restored auth, recipient ownership and server-fetched links (IOS-010)
- [ ] Verify real foreground/background/cold-start delivery on a signed iPhone (IOS-010/012)
- [x] Paged own inbox, unread count, read/read-all and authenticated realtime refresh (IOS-009)
- [x] Home links to the real inbox; no local test-notification button

## Done means

`npm run typecheck` and `lint` pass for `mobile/`; `npx expo export` builds iOS
and Android bundles; tested on a simulator or phone; tasks ticked in
`MOBILE_TASKS.md`; reviewed by Arihant.

## iOS delivery

Follow [IOS_TASKS.md](../IOS_TASKS.md): IOS-001–004 (setup/session/home), IOS-009–012 (notifications/profile/build), joint QA (IOS-013), and release with Srujan (IOS-014). Start with [the iOS guide](../../mobile/ios-docs/README.md). Keep Android working while changing shared code.
