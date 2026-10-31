# IOS-011 — Profile, password and documents

Implemented 22 October 2026 in the existing light navy/white Inter theme. Open **Profile** from the bottom tabs. The account card describes the signed-in session; **My employee record** reads the linked employee from the API.

## Own profile and password

- `GET /employees/:employeeId` validates the employee DTO and rejects a returned ID belonging to somebody else. A real session, linked employee and `employee.read` permission are required even for an administrator's personal Profile. Missing records, denied access, loading and retry states stay explicit.
- `PATCH /employees/:employeeId` sends only `{phone}` when `employee.update` is allowed. Blank clears it; the server's phone validation is mirrored locally. Only a matching confirmed response reports success. Failed updates retain the draft and refresh the server value.
- Password changes go through `session.changeOwnPassword`, never the generic API helper. Native uses `POST /auth/native/password` with Bearer access and the private current refresh credential; web uses `POST /auth/password` with its HttpOnly cookie. A 401 may renew once and rebuild the native credential. Only 204 confirms success. The current session remains valid; other refresh sessions are revoked by the existing backend contract.
- New passwords require at least 12 JavaScript characters and at most 72 UTF-8 bytes, matching the backend/bcrypt limit. Passwords stay in component memory and are cleared on success, failure, background, blur or account change. Ambiguous responses block another submission until explicitly cleared after checking sign-in. No passwords are logged or stored by these forms.

## Documents

- The list explicitly requests the linked employee's `/documents?employeeId=…&page=…&limit=20`. It validates ownership, UUIDs, metadata and page shape, deduplicates loaded rows, and supports loading more. Pending, verified and rejected status, HR review notes and expiry dates are shown. Document notifications route to Profile only with a linked employee and `document.read` permission.
- Expo DocumentPicker selects one PDF, JPEG, PNG or WEBP up to 10 MiB with `copyToCacheDirectory: true`. Native files must be copies in the app's DocumentPicker cache. Replacing/removing a selection, closing the tab, backgrounding or signing out removes that copy; startup and login clear residual picker copies before allowing a session. Cleanup failure blocks restoration/login until retry. Provider originals are never deleted. Web picker object URLs are revoked too.
- Upload uses the existing multipart `POST /documents` and `document.upload` grant. The server chooses the employee; the client never sends an employee override or a manual multipart Content-Type. Metadata, actual type signatures, extensions and size are checked. Invalid metadata/content remove temporary uploads; uncertain persistence retains private bytes to avoid deleting a file whose database write may have committed. Orphan reconciliation remains a storage-maintenance limit. Only a matching 201 confirms an upload. Network interruption, timeout or lost response requires refresh/checking the list before a new draft; there is no automatic write retry except an authentication replay refused before upload handling.
- Protected preview first checks the permission-guarded `HEAD /documents/:id/content`, then opens the same Bearer-authenticated endpoint. Native uses an incognito, uncached WebView with JavaScript, local-file access, cookies and external navigation disabled. It is closed on blur/background/logout. Web uses an authenticated, type-checked blob and revokes its object URL on close/account change. PDFs use the built-in browser viewer without an iframe sandbox, which can block PDF rendering ([MDN embedding guidance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/General_embedding_technologies)); HTML content is never accepted for preview. No private document is sent to an external viewer.
- **Android limit:** images preview in-app; Android PDFs require the authenticated web Documents screen. Native iOS PDF rendering and Files/iCloud picker behavior require device acceptance; exports and web checks do not prove those interactions.

## Backend/web compatibility

`/uploads/documents/:filename` now returns 404. Stored `fileUrl` values remain internal locators. `GET`/`HEAD /api/v1/documents/:id/content` require `document.read` and the same record scope as document details, reject traversal/symlink/unsupported files, and send canonical Content-Type, `nosniff`, and `Cache-Control: private, no-store`. Own-scope accounts without employee links cannot list or count other employees' documents. The web preview and download callers use this endpoint; an in-flight download is discarded after account changes. No schema migration is required for IOS-011.

Storage still uses the existing server upload directory. Signature checks identify supported file containers; they are not full document decoding or malware scanning. Production storage/backup policy remains a deployment task.

## Verification and reproduction

Verified: 98 mobile tests, 61 backend tests and 44 throwaway PostgreSQL tests; workspace typecheck/lint/build, formatting, browser regression flows and iOS/Android/web exports pass. Only synthetic records and files are used. No real account, Railway database or deployment is changed.

```sh
npm run typecheck
npm run lint
npm test
npm run test --workspace @campushr/mobile
env -u TEST_DATABASE_URL npm run test:db --workspace @campushr/api
```

The focused HTTP test checks upload, byte content/HEAD headers, authentication, foreign-owner denial, old public-path rejection, malformed content/date cleanup, safe uncertain-persistence retention and list isolation. Mobile tests cover profile paths/payloads, DTO ownership, page validation, file/MIME/size rules, picker cancellation/private-copy cleanup, password/native credential rotation, UTF-8 limits and web cookie compatibility.

For the UI checks start the disposable API and fixture Metro as described in [HOME.md](HOME.md#reproduce-the-ui-check-without-a-database), then run:

```sh
node mobile/checks/profile.smoke.mjs
node frontend/checks/documents.smoke.js
```

The Profile smoke uses real auth/employee/document services backed by disposable repositories and a temporary upload directory. It verifies phone persistence, protected preview and URL revocation, upload/review status, forbidden and committed-but-unconfirmed uploads, no-employee/account isolation, password rejection/change/relogin, 375px/1280px layout and keyboard traversal. Its password changes affect only the disposable `home-check` fixture, so restart that API before running other checks. Web document checks verify authenticated preview/download, denial/retry, preview revocation and discarding downloads completed after logout. Sanitized screenshots are in `/tmp/campushr-ios011`.

The iPhone 17 Pro simulator launches the native bundle to login. Simulator interaction was unavailable through the enabled UI-control surface, so native Files/iCloud selection, iOS PDF/WebView behavior, background/resume, VoiceOver, large text and physical-device cache cleanup remain in IOS-012/013. Do not count browser tests as native acceptance. Stop the fixture API/Metro and restart normal Metro afterward.
