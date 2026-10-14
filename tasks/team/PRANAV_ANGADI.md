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
- [ ] API client in `mobile/lib/api.ts` like `frontend/src/services/api.ts`:
      base URL from `EXPO_PUBLIC_API_URL`, access token header, one retry after
      refreshing an expired token, readable error messages
- [ ] Loading, empty and error states shared by all screens
- [ ] 44pt tap targets, labels on every control, large text works

## 2. Login — MB-002 · start now

- [ ] Login screen: employee ID or email, password (`POST /auth/login`)
- [ ] Phones have no cookies: agree with Srujan how the app receives and
      sends the refresh token (e.g. in the response body for mobile)
- [ ] Store tokens in `expo-secure-store`, never AsyncStorage
- [ ] Restore the session on launch; logout clears tokens
- [ ] Signed-out users only see the login screen

## 3. Home and Profile — MB-003, MB-008 · start now

- [ ] Home: greeting, today's classes (from Arihant's timetable screen data),
      attendance and leave summaries, latest notifications
- [ ] Profile: own record from `GET /employees/:id` (the `employeeId` comes
      from sign-in); update own phone (`PATCH /employees/:id`)
- [ ] Profile: own documents (when Zeeshan's Documents API exists)

## 4. Notifications — MB-007

The test-notification code in `mobile/lib/notifications.ts` is the starting
point.

- [ ] EAS project ID (`npx eas init`) and a development build for Android
- [ ] Register the device push token with Zeeshan's API after login
- [ ] Open the right screen when a notification is tapped
- [ ] In-app notification list and unread badge
- [ ] Remove the test-notification button from Home

## Done means

`npm run typecheck` and `lint` pass for `mobile/`; `npx expo export` builds iOS
and Android bundles; tested on a simulator or phone; tasks ticked in
`MOBILE_TASKS.md`; reviewed by Arihant.
