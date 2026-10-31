# Native sessions — IOS-002 and IOS-003

Implemented and checked on 21 October 2026. The native provider uses the JSON-token contract, secure persistence and restart restoration. Browser sessions retain their cookie transport.

## Decision and boundary

Use the explicit JSON-token routes under `/api/v1/auth/native`; retain cookie-based browser routes. Both transports share password checks, session hashes, rotation/replay detection, revocation, permissions and failed-attempt budgets. See the [endpoint reference](../../backend/API_ENDPOINTS.md) for exact request/response shapes and errors.

A native client sends `Content-Type: application/json`, `credentials: omit` and no `Origin` or `Cookie`. Requests with either header are rejected. This guard is not a native-device authenticator: credentials remain bearer secrets. The API does not accept a client header or platform string as permission to access another user's records.

Refresh and logout require `{ refreshToken }` in the JSON body. Password change requires both its Bearer access token and a body refresh token. `/auth/me` remains the shared Bearer-authenticated user endpoint. The browser must continue using its current cookie client; never copy this native transport into the web app or expose browser refresh cookies to JavaScript.

## Session lifecycle

1. Keep access tokens in memory. Persist the refresh credential only when Remember me was selected, using `expo-secure-store` and an appropriate device-local Keychain policy. Do not store passwords, credentials in AsyncStorage/localStorage, or full employee/document data in the session record. The app uses `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; the saved record contains only the refresh token and API URL.
2. At launch, restore the saved credential and call native refresh to receive the current user, permissions and rotated credentials. Show a loading state until resolved. Remember me off means no restored login after process restart; it does not shorten the server's existing session TTL.
3. Serialize refresh requests within the app and persist the replacement before exposing successful renewal. If secure storage fails, do not continue indefinitely using a credential that was already rotated; require a recoverable reauthentication flow.
4. Replay a protected request at most once after a successful refresh. A 403 is a permission error, not a reason to refresh repeatedly. Keep logout/login/refresh outside automatic refresh loops.
5. A 409 `REFRESH_IN_PROGRESS` does not contain the winning replacement token. Reuse the winning in-flight operation or reread storage only if a newer credential exists. If it cannot be recovered, require sign-in. Do not repeatedly resend the old credential: after the grace period, replay detection ends the user's other sessions too.
6. On logout, send the current refresh credential, then remove local credentials, user-specific Query caches and sockets. If offline, local sign-out can finish but server revocation is unconfirmed; do not claim the remote session ended. Do not retain a cleartext token for a background retry.
7. For password change, send the current session's refresh credential alongside the Bearer token so that session survives while the user's others end. Clear local state if the session no longer exists.
8. Verify account switching, deactivation, app relaunch, rotation persistence and error recovery on native. Use TLS for deployed environments; keep all tokens out of logs, screenshots, notification payloads and public Expo variables.

The session client lives in `mobile/lib/session.ts`; `session-storage.ts` serializes Keychain reads/writes/deletes. The provider clears Query caches when the user or permissions change. Protected routes remain unavailable until restoration resolves. Timetable and leave helpers share the client; live failures never fall back to demonstration records. No authenticated mobile sockets exist yet; their lifecycle belongs to IOS-009. Password-change UI remains IOS-011.

## Evidence

Seven new API regression cases cover JSON versus browser cookie transport, cookie-free renewal and revocation, browser-header rejection, strict body validation, shared login limits, password-change session isolation and shared password-attempt limits. Existing browser tests still assert that JSON never contains a refresh token and refresh/logout preserve origin protection.

A temporary loopback-only API using the in-memory auth repository was exercised from React Native `fetch` inside Expo Go on the iPhone 17 Pro simulator (iOS 26.5). The native probe confirmed:

- Login returned native JSON credentials without requiring a browser cookie.
- Refresh rotated the credential; reuse of the previous credential returned 409.
- Password change succeeded and revoked a second session.
- Logout returned 204; refresh of the ended session returned 401.

The probe used a disposable test-only account. Its temporary app import, source files and server were removed afterward. No Railway connection, real account, production credential, migration or deployment was used. The sanitized result was saved locally at `/tmp/campushr-ios-002-native-result.json`; it contains pass/fail checks, not tokens.

## IOS-003 verification

The normal login UI was exercised in Expo Go on the iPhone 17 Pro simulator (iOS 26.5), against a temporary loopback-only API with disposable in-memory accounts:

- Remembered login survived terminating and reopening Expo Go; exactly one native refresh restored the current user without another login.
- Logout revoked the server session; another cold restart stayed signed out without refreshing.
- A second account with Remember me off did not restore after restart or show the first account.
- A signed-out Profile deep link remained at login.

The temporary API was stopped and removed; normal Metro configuration was restored. No production account, database, deployment or credentials were used.

Twenty-three mobile tests cover saved-record minimization, rotation and expiry, parallel 401 coalescing, one retry, revoked/invalid/offline sessions, Keychain failures and delete retry, logout races, account isolation, browser cookies, release demo refusal and live API failure propagation. All 50 backend unit and 35 temporary PostgreSQL tests pass. Workspace typecheck/lint, the backend/web production build and iOS/Android/web Expo exports pass. The final normal simulator bundle renders login without the earlier route declaration warning.

A failed or ambiguous refresh clears the local credential and requires sign-in; the client does not repeatedly replay an old rotated token. If Keychain deletion fails, login shows a **Clear saved session** recovery action; remote logout failure is reported separately. Physical-device Keychain behavior, signed-build/reinstall behavior and the full role/device matrix remain IOS-012–013 acceptance work.
