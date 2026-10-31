# IOS-010 — Remote push (implementation ready; device acceptance pending)

22 October 2026. The application now has session-owned Expo device registration,
a durable server queue, receipt processing, Profile permission controls and guarded
foreground/background/cold-start response handling. **No APNs/iPhone delivery has
been verified.** IOS-012's approved Expo project, Apple signing, bundle identifier
and installed development build remain prerequisites. Push is disabled by default.

## Privacy and account ownership

The lock-screen payload is always **CampusHR — You have a new update. Open
CampusHR to view it.** It includes only opaque `notificationId` and `recipientId`
metadata. Employee names, leave reasons, classes, documents, URLs and message
bodies stay in the authenticated inbox. Expo/APNs still receive a device token
and these identifiers; include this processing in the release privacy review.

The mobile session module privately supplies its current native refresh credential
alongside Bearer authentication. It is never returned from public session state or
stored with ordinary preferences. A retry after access-token renewal rebuilds the
request body using the replacement refresh credential.

A device token belongs to one user and one live refresh session. Each session has
one current token. Registration is idempotent; a new token replaces the old one.
An account transfer clears that device's old-account queued messages. Another
account cannot unregister a device using a foreign refresh credential. Refresh
rotation transfers the device and queued jobs to the replacement session. Logout,
password changes that revoke other sessions, expiration and inactive accounts stop
future sends. Direct account switching first revokes the previous native login.
The server also rechecks notification permission and the configured Expo project before sending.

Already accepted provider messages cannot be recalled. Offline logout cannot
confirm server revocation; the app shows that warning, clears the local tray, and
blocks private content/taps from another account. Generic delayed alerts may still
arrive until the server session expires. Device tokens are confidential routing
credentials: never log them or include them in support screenshots.

## Client behavior

Profile → **Remote notifications** offers explicit enable, turn off, retry and
system Settings navigation when denied. The existing navy/white Inter interface
and 48-point shared buttons are retained. The device preference uses SecureStore;
it is not a second notification ledger. Enabling asks the OS only on that explicit
action. Returning from Settings rechecks authorization; revocation unregisters the
current login. Token changes and renewed/restored sessions re-register as needed.
Native token retrieval and HTTP writes have bounded timeouts.

Web and Expo Go never import/evaluate remote-push registration and show an honest
unsupported message. There are no local test-notification buttons, simulated
success messages or substitution preview sends. In-app notifications still work.

A foreground delivery refreshes the current user's queries. Only correctly shaped,
own-recipient payloads can display a foreground alert. Taps wait for session
restoration/sign-in, fetch `GET /notifications/:id` through the owned API, validate
the response, then use the existing permission-aware native route map. Unsupported
links open the protected inbox. A push URL is never passed to the router. Duplicate
responses, signed-out/foreign accounts, teardown and late account changes cannot
navigate using old data. Tapping does not fabricate a server read confirmation.

## Server delivery and operational limits

Notifications and device-specific outbox entries are written in one transaction.
Leave, substitution and announcement events reuse the existing notifier. A push
failure never rolls back a business operation or removes its in-app notification.

The API process starts the worker only when `PUSH_ENABLED=true`. Workers claim up
to ten due jobs with a PostgreSQL row lock and two-minute lease, so separate API
processes do not intentionally send the same claimed job. Requests are sequential,
with five-second provider timeouts. Transient failures use bounded exponential
backoff (up to eight attempts, no more than 24 hours). Crashed leased jobs become
available again; delivery is best effort and can duplicate after an ambiguous
provider response. Unsent jobs are skipped after an in-app read; already-issued tickets still have their receipts checked.

A successful Expo ticket is acceptance, not phone delivery. Receipts are first
checked after 15 minutes. `DeviceNotRegistered` from either a ticket or receipt
removes the unchanged token and its jobs. Cleanup compares the token's registration
version, protecting a newer registration from an old receipt. Invalid credentials
and permanent provider rejections require operator review; logs contain fixed
messages, never provider payloads, tokens or employee text. Process logs should be
monitored before release. Disabling push stops dispatch; expired/revoked sessions
and inactive users are pruned when the worker runs. No delivery SLA is claimed.

## Configuration — do not substitute a personal/unapproved project

1. Complete IOS-012: record the institution-owned Expo project UUID, Apple team,
   bundle identifier and APNs credentials; install its signed development build.
   `expo-notifications` is already listed in `app.json` plugins. This task has not
   created a project, changed signing accounts or provisioned credentials.
2. Set **public** `EXPO_PUBLIC_EXPO_PROJECT_ID` for that mobile build (or use the
   approved EAS project's `extra.eas.projectId`/EAS configuration). Rebuild after
   native capability/signing changes. Keep API/Expo environments aligned.
3. Apply migration `20261022120000_push_devices` to the chosen **local/staging**
   database using the normal migration deployment workflow. Tests already apply
   it to disposable PGlite; the existing Railway database has not been changed.
4. On that API set `EXPO_PROJECT_ID` to the same UUID and then `PUSH_ENABLED=true`.
   If enhanced Expo push security is enabled, set server-only `EXPO_ACCESS_TOKEN`.
   Never put this secret in `EXPO_PUBLIC_*`, Git or chat. Defaults/examples leave
   delivery off. Configuration cannot enable push without a project UUID.
5. With two real test accounts/devices, trigger a real permitted leave,
   substitution or announcement event. Record receipt/provider status separately
   from the observed phone delivery.

See [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/),
[notification responses](https://docs.expo.dev/versions/latest/sdk/notifications/)
and [Expo sending/receipts](https://docs.expo.dev/push-notifications/sending-notifications/).

## Verification and outstanding acceptance

Automated coverage uses fake provider HTTP responses; it never contacts Expo or
sends alerts to people. PostgreSQL tests exercise the actual routes, migration,
repositories, queue leases, refresh/logout/password changes, ownership and receipt
cleanup. Mobile tests exercise permission changes, explicit opt-in, registration,
refresh replay, pending/duplicate/foreign taps, safe routing, account switches,
late callbacks and unsupported runtimes. `mobile/checks/push.smoke.mjs` verifies the
Profile guard/layout and logout at 375/1280px against the disposable preview API.
Home/inbox regressions and native/web exports must remain passing.

Still required on a signed iPhone: first approval/refusal, later Settings changes,
foreground banner, background delivery, force-quit/cold-start tap, disabled
permission, two-account transfer/logout, offline behavior, real APNs receipt and
observed delivery. Check Android's channel/permission behavior in its development
build separately. Simulator/browser exports and mocked tests do not complete these
acceptance checks or mark IOS-010 done.
