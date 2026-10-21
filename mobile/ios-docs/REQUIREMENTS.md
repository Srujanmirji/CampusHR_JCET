# iOS requirements

## Delivery scope

Use the current React Native/Expo app. Faculty, Staff and HOD use the same backend and permission matrix as the web app. Deliver iPhone first. The current configuration also declares iPad support; verify that layout before release or explicitly decide to change supported devices in IOS-001.

Keep the existing navy/orange light theme, Inter typography and five tabs: Home, Timetable, Attendance, Leave and Profile. Add notification and substitution flows within this navigation rather than creating a second app shell.

## Required behavior

| Surface           | Acceptance criteria                                                                                                                                                                                            | Tasks       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Login/session     | Employee ID or email; useful validation; restore a valid session after restart; expired/revoked sessions return to login; logout ends the server session and clears local credentials and cached personal data | IOS-002–003 |
| Home              | Own greeting and live summaries; no invented attendance, balances or workload; loading/error states and refresh; open the relevant screen from each summary                                                    | IOS-004     |
| Timetable         | Own daily/weekly schedule, correct periods, room, section and batch; dated substitute duties; Sunday/empty/error states; current status updates as time passes                                                 | IOS-005     |
| Attendance        | Own today/history and corrections; check-in/out only when permitted by policy and API permissions; no false success while offline                                                                              | IOS-006     |
| Leave             | Real balances, types, half days and date validation; apply, track next approver and cancel pending requests; HOD recommendations limited to department                                                         | IOS-007     |
| Substitution      | Show server-assigned duties on the correct date; authorized HODs view affected classes and eligible candidates, assign and undo through the API; never save real coverage only on the phone                    | IOS-008     |
| Notifications     | Own paged list, unread count, read/read-all; foreground refresh and safe navigation; permission refusal does not block the app; remote push added only with device registration and sender support             | IOS-009–010 |
| Profile/documents | Own employee record and permitted contact edits; supported document selection/upload, status and authenticated viewing; helpful file/size errors                                                               | IOS-011     |
| Password          | Use the existing password-change contract; preserve the intended current session and handle revocation on other devices                                                                                        | IOS-003     |

## Cross-cutting acceptance

- Enforce permissions on the API; hiding a button is not authorization. A missing employee link produces a useful state, not a department-wide personal schedule.
- Explicit demo sessions may use labelled sample data. Release users must never fall back to demo login, sample records or local assignment success.
- Do not queue punches, approvals or assignments offline. Preserve form input after a failed request and reconcile ambiguous writes before retrying.
- Handle keyboard, safe areas, back navigation and modal dismissal. Keep at least 44pt interactive targets, readable contrast, VoiceOver labels, visible focus and usable large text; respect Reduce Motion.
- No passwords, tokens or sensitive employee documents in logs, analytics, screenshots or public environment variables. Clear account-specific Query caches on logout/account switch.
- Use date-only leave/coverage values without UTC shifts; verify timestamps against the college timezone (Asia/Kolkata), including a phone set to another timezone.

## Out of scope for this milestone

A separate Swift app, offline write synchronization, payroll, biometric attendance capture, an admin desktop replacement and a new backend/database. SMTP password reset remains a separate backend dependency; do not present it as available.
