# IOS-009 — In-app notifications

Implemented on 21 October 2026 with the existing light navy/white theme, Inter typography and shared 48-point controls. Open **Notifications → Open inbox** from Home. The protected `/notifications` screen is separate from the five bottom tabs.

## Data and read state

The inbox uses the existing own-user `/notifications?limit=20&after=…` cursor API and `/notifications/unread-count`. It validates notification UUIDs, kind, title/body, nullable link/read time and timestamps, plus the `{data, hasMore}` envelope. Empty continuations, repeated cursors, duplicate IDs within a page and oversized pages are refused. Loaded rows are deduplicated across pages. An employee link is not required for an own inbox; a real authenticated session with `notification.read` is required.

**Mark read** and **Mark all read** PATCH the existing routes and require 204 before reporting success. A synchronous guard prevents overlapping button actions; mutations have a 15-second timeout and do not automatically retry. The server owns all read state; nothing is persisted as a local notification ledger or optimistically marked read. Errors remain visible, previously fetched data remains available and reads refresh after an unconfirmed write to show the server's recorded state. These read operations are idempotent, so an explicit later retry is safe.

Home's latest three and unread count share the notification query prefix, so confirmed reads and live events refresh them as well. Home preview links remain navigation shortcuts; reading/marking happens in the inbox. Read-all applies to the entire own inbox, including unloaded pages. Loading, empty, source error, failed writes, pagination and retry controls are explicit.

## Authenticated live connection

`socket.io-client` 4.8.4 reuses the backend's existing Socket.IO protocol at the resolved API origin, path `/api/v1/socket.io`, authenticated with the in-memory access token. Native development uses the already-resolved API LAN host; this flow's socket and HTTP API share an origin.

One provider subscribes to session changes. Token renewal replaces the socket with the new token; permission loss, logout and account switch close the old connection. A local expiry check runs once a minute while foregrounded and calls the existing refresh helper only when a token is expired. Backgrounding closes the socket; foregrounding renews if necessary, reconnects and refetches. Transport reconnects refetch on `connect`. A namespace authentication rejection can request one bounded renewal per minute, preventing an authentication retry loop.

`notifications:changed` contains no notification body. It invalidates current-user queries and fetches content through the permission-checked API. Old socket callbacks cannot affect another account. Connection state is visible in the inbox; if live delivery is unavailable, explicit refresh still works. Home, dated duties and coverage are also invalidated for the current user when a notification arrives. An undo that emits no notification still needs refresh/focus/foreground to update another client's timetable.

## Links and permissions

Only exact paths for existing protected screens are allowed: `/leave`, `/attendance`, `/timetable`, `/substitution` (the recipient's dated Timetable view), and `/documents` (own Profile documents, IOS-011). The employee link and destination permission are checked again against the current account. Query strings are ignored; opening Leave shows the permitted Leave screen, without promising automatic selection of a particular request. External/protocol-relative URLs, unknown paths and unsupported destinations have no navigation button. Their content can still be read/marked read.

An inbox **Open related screen** action first confirms marking the notification read, then dismisses to the native destination. A denial/unconfirmed read never silently navigates or claims success. No server URL is sent to an external browser or blindly passed to the router.

## Verification

- All 74 mobile tests passed. New checks cover pagination/validation, ownership-safe request paths, confirmed read status, safe links, no-employee access, token replacement, background/foreground, logout/account switch, stale events, bounded auth renewal and foreground expiry checks.
- `mobile/checks/notifications.smoke.mjs` uses the actual notification router/service and real Socket.IO with a disposable own-user repository. It checks 23-row pagination, read/read-all and browser-restart persistence, server denial/lost-response handling, safe destination routing, private feeds for separate accounts, forged foreign-ID rejection, live counts and missed-event recovery after transport disconnect. An administrator without an employee link can read their own feed.
- Browser layouts at 375px/1280px and keyboard focus were checked. Home, Timetable, Attendance, Leave and Coverage regressions passed. Workspace typecheck/lint and iOS/Android/web exports passed. Screenshots: `/tmp/campushr-ios009`.
- iPhone 17 Pro simulator, iOS 26.5/Expo Go: connected to the actual test service; paged through the inbox, marked one notification read (23 → 22), marked all read (0), and received a new server event with count 1 without manual refresh.

Use the disposable API and Metro commands in [Home verification](HOME.md#reproduce-the-ui-check-without-a-database), then run `node mobile/checks/notifications.smoke.mjs`. The preview now attaches the real Socket.IO server and exposes loopback-only fixture event/disconnect controls. Stop the preview and restart normal Metro afterward. No backend production contracts, migrations, accounts or data were changed.

Physical iPhone/iPad, VoiceOver, release signing and the complete device matrix remain IOS-013. Remote push registration, lock-screen delivery, background/cold-start taps and OS permission flows remain IOS-010; this task does not request push permission or claim remote push is complete.
