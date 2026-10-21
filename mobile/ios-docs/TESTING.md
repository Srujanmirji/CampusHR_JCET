# iOS testing and acceptance

A checked task needs evidence from its acceptance criteria. Existing mobile task checkmarks describe implementation history, not proof of iPhone verification.

## Automated checks

Run from the repository root:

```sh
npm run typecheck
npm run lint
npm test
npm run test --workspace @campushr/mobile
npm run test:db --workspace @campushr/api
npm run build
npm run format:check
```

The root `npm test` runs backend unit tests; it does not run mobile tests. Database integration tests use temporary in-memory PostgreSQL. Check output for the intended test database; never point a test at production.

From `mobile/`, verify bundle compilation independently of device QA:

```sh
npx expo export --platform ios --output-dir /tmp/campushr-ios-export
```

Also export Android when changing shared code. Starting Expo regenerates typed routes when needed. Report pre-existing check failures separately; never mark a failing check as passed.

## Manual test matrix

Use sanitized test accounts and record device, iOS version, app build, API environment, role, expected/actual result and evidence for each run.

| Area              | Required cases                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Devices           | Small and large iPhone simulator layouts; a physical iPhone development build; iPad while `supportsTablet` remains enabled                          |
| Roles             | Faculty, Staff, HOD; missing employee link; forbidden department; deactivated user                                                                  |
| Sessions          | Correct/wrong credentials, restart, background/resume, expiry, concurrent 401s, revoked refresh, password change, logout and account switch         |
| Timetable         | Daily/week, no classes, Sunday, multi-period lab/batch, dated coverage, day/time rollover, device timezone differing from college                   |
| Attendance        | Today/history, permitted punch, duplicate tap, correction and API policy rejection; failed writes show no false success                             |
| Leave             | Balances, allowed half day, overlap, insufficient balance, pending approver, HOD decision, cancel confirmation and failure preservation             |
| Substitution      | Real eligible candidates, server conflict after candidate selection, successful assignment/undo, recipient view, no prototype data in real sessions |
| Notifications     | Paged list, unread/read-all, reconnect; push allowed/denied; foreground/background/cold start; sign-in required before protected navigation         |
| Profile/documents | Own data/edit restrictions, supported and rejected files, upload interruption, private preview and logout cleanup                                   |
| Network           | Offline startup, slow API, 401/403/409/429/500, timeout after write, reconnect and refresh                                                          |
| Accessibility     | VoiceOver names/order, large text, 44pt targets, measured contrast, hardware keyboard focus, Reduce Motion and modal focus/dismissal                |
| Shared app        | Android smoke test after session, navigation, storage, notification or networking changes                                                           |

The current app is light-only and portrait; verify that supported configuration. Any new dark theme or orientation expands this matrix.

## Release evidence

- Attach passing command summaries and sanitized simulator/device evidence to the PR.
- Link each task ID to its implementation PR and device acceptance result.
- Confirm release builds disable demo entry and local-only substitution writes.
- List open defects by severity; session leaks, unauthorized data access, invented real-user data and false write success block release.
- Bundle export passed in PR #10, but physical iPhone, native push and signed distribution remain unverified at this planning baseline.
