# Mobile App Specification

## Stack

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- React Hook Form
- Zod
- Expo Notifications

## Primary Users

- Faculty
- Staff
- HOD

## Screens

- Splash
- Login
- Home
- Timetable
- Attendance
- Leave
- Leave Request
- Notifications
- Documents
- Profile
- Settings

## Mobile Folder Structure

```text
app/
├── (auth)/
├── (tabs)/
├── leave/
├── documents/
└── profile/
```

## Current integration limits

Daily and weekly timetable screens load authenticated API data. Failed requests show an error; sample classes are restricted to explicit demo sessions.

Smart substitution on mobile is a local demo, available only in demo sessions. Real accounts must use the web substitution page; local assignments are never merged into their schedules. Native push delivery, secure session persistence, and the remaining mobile modules are still unfinished.

Run `npm run test --workspace @campushr/mobile` for timetable API regression checks.

## iOS delivery

Use the same Expo app for iPhone. Start with the [iOS documentation](ios-docs/README.md) and [IOS-001–014 tasks](../tasks/IOS_TASKS.md). These track native setup, secure sessions, live integrations, device QA and TestFlight; they do not mark the app as released.
