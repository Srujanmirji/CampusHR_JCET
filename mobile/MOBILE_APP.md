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

Today and dated week views load the signed-in employee’s regular classes plus exact-date server substitution duties. Refresh, foreground return and a minute clock keep coverage/date/status current. Missing employee links or teaching permissions prevent requests. The Timetable screen requires a real account; failed live requests never become sample classes. See [dated timetable evidence](ios-docs/TIMETABLE.md).

Leave → Class coverage now uses server-approved leave, affected classes, candidate scores and eligibility. Authorized managers can confirm assignment, document no substitute needed and undo coverage. Recipient duties refresh from the server; the old local assignment store/modal are removed. See [substitution verification](ios-docs/SUBSTITUTION.md). Native session persistence and restart restoration are implemented; see [session evidence](ios-docs/NATIVE_SESSION.md). Attendance now loads own records/history and supports permitted explicit punches and correction requests. Its UTC policy and write-recovery limits are described in [attendance verification](ios-docs/ATTENDANCE.md). Native push implementation is ready; approved signing and actual iPhone delivery acceptance remain pending, alongside the remaining mobile modules.

Home summaries use authenticated APIs for own regular classes, attendance, casual leave, workload and latest notifications. Accounts without an employee link never request personal employee summaries. Home has no demo-data fallback; see [Home verification and limits](ios-docs/HOME.md).

Run `npm run test --workspace @campushr/mobile` for session, schedule, attendance, leave, coverage, notification API and live-lifecycle regression checks.

The protected notification inbox now provides own pagination, confirmed read/read-all, a shared Home unread count and current-token Socket.IO refresh. Safe links open permitted native screens. No employee link is needed for notifications. See [in-app notification verification](ios-docs/NOTIFICATIONS.md); see [IOS-010 remote push implementation and device gate](ios-docs/REMOTE_PUSH.md).

## iOS delivery

Use the same Expo app for iPhone. Start with the [iOS documentation](ios-docs/README.md) and [IOS-001–014 tasks](../tasks/IOS_TASKS.md). These track native setup, secure sessions, live integrations, device QA and TestFlight; they do not mark the app as released.
