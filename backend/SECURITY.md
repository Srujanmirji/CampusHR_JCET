# Backend Security

## Authentication

- Password hashing with Argon2 or bcrypt
- Short-lived access tokens
- Refresh token rotation
- Logout token revocation strategy

## Browser and native sessions

Browser auth keeps refresh tokens in HttpOnly SameSite=Strict cookies. Native auth uses explicit `/auth/native/*` routes with refresh credentials in JSON; it rejects `Origin` and `Cookie` headers, sets `Cache-Control: no-store` and emits no cookies. This is transport separation, not device attestation.

Both reuse the same hashed session store, rotation/replay protection, revocation and login/password-attempt limits. Never log or include refresh credentials in URLs. Native secure-storage and restart requirements are documented in [NATIVE_SESSION.md](../mobile/ios-docs/NATIVE_SESSION.md); the native provider now uses this contract with refresh-only device-local secure storage and single-flight renewal.

## Authorization

- RBAC middleware
- Resource ownership checks
- Department-scope checks

## API Security

- Rate limiting
- CORS policy
- Helmet
- Payload size limits
- Input validation
- SQL injection protection via ORM
- Secure file upload validation

## Sensitive Data

Protect:

- Aadhaar
- PAN

## Audit

Mandatory audit logs for:

- Permission changes
- Employee changes
- Approvals

## Mobile attendance

IOS-006 adds optional explicit punch actions and a UTC date expectation. Conditional database writes prevent duplicate/concurrent explicit check-ins from turning into check-outs or overwriting recorded timestamps. Existing web toggle payloads remain supported. Own attendance/correction lists fail closed when the caller lacks an employee link; department lists fail closed without a department. An optional correction employee filter is combined with role scope, never used to bypass it. No migration or new permission is required.

## Remote push

Expo tokens are confidential routing credentials stored only in `push_devices`;
there is no token-list endpoint or token logging. Registration combines Bearer
permissions with the caller's current refresh-session ownership and approved
project validation. Bodies cannot set a user/session ID. Deregistration remains
available after notification permission loss. Revoked/expired/inactive sessions
and role permissions are checked before provider sends; refresh rotation transfers
registrations, and confirmed logout/password revocation removes them.

`push_deliveries` holds a notification/device association, attempts, lease and Expo
ticket ID, not a copy of private notification text. Lock-screen text is generic;
only opaque notification/recipient IDs leave the server. The app authenticates,
checks recipient ownership and fetches the owned notification before navigating.
Already accepted provider deliveries cannot be recalled, and offline logout cannot
confirm revocation. Document these limits and Expo/APNs data processing before
release. `PUSH_ENABLED` defaults off; enhanced Expo push security uses a server-only
`EXPO_ACCESS_TOKEN`. Never include it in mobile public configuration.

## Private document access (IOS-011)

Document bytes require Bearer authentication and the record-level `document.read` scope at `/api/v1/documents/:id/content` (GET/HEAD). The former public uploads prefix returns 404. File locators must stay inside the document upload directory; symlinks/non-files, unsupported signatures and oversized files are refused. Responses disable caching and MIME sniffing. Uploads validate metadata, calendar dates, size, signature and extension, and remove rejected copies. Uncertain database outcomes retain private bytes for reconciliation, preventing deletion of a possibly committed document. Own-scope list/count cannot fall back to all employees when an account lacks an employee link.

Web previews fetch authenticated blobs and release object URLs; an account change invalidates an in-flight download. Native previews disable WebView cache/cookies/JavaScript and external navigation. Native picker copies are cleaned before session restoration/login and on form/account lifecycle changes. Device-level verification remains IOS-012/013; server disk persistence, backup and malware scanning remain deployment concerns. No IOS-011 schema migration is needed.
