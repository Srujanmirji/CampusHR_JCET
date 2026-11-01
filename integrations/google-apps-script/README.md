# CampusHR Google Apps Script OTP email relay

Updated 1 November 2026. The website and mobile Forgot password flows share the
CampusHR backend. It generates, hashes, expires, limits attempts and atomically
consumes OTPs before changing a password. This script sends the email only.
No passwords or user directory belong in this script or a Google Sheet.

## Deploy in your Google account

1. Open <https://script.google.com> while signed in to the Google account that
   should send CampusHR emails. Create a project named **CampusHR OTP Mailer**.
2. Replace `Code.gs` with [Code.gs](Code.gs). In Project Settings, enable **Show
   appsscript.json manifest file in editor**, then use [appsscript.json](appsscript.json).
3. Under **Project Settings → Script Properties**, add:

   | Property | Value |
   | --- | --- |
   | `CAMPUSHR_MAIL_SECRET` | The **value** from the private local `.env.local` file in this folder; omit `PASSWORD_RESET_SCRIPT_SECRET=` |
   | `CAMPUSHR_DAILY_LIMIT` | `80` initially |
   | `CAMPUSHR_ALLOWED_DOMAIN` | Optional exact recipient domain; leave unset for Gmail-based staging accounts |

   The private setup key was generated on this Mac, saved with mode 0600 and is
   Git-ignored. Do not put it into chat, source code, a URL or client-side variables.
   On another machine, generate a fresh 32-byte random secret with a password manager
   or Node crypto, and save it privately. Backend and script must use the same value.
4. Save. Select and run **authorizeMailService** in the editor and approve email
   sending for your chosen account. This authorization function does not send mail.
5. Choose **Deploy → New deployment → Web app**:
   - **Execute as:** Me.
   - **Who has access:** Anyone (the backend authenticates using the HMAC signature).
   - Click **Deploy**, finish Google's authorization prompts, and copy the URL ending
     in **`/exec`**. Do not use the editor-only `/dev` URL.

If a Workspace administrator disables public web-app deployments, request the approved
access policy from them; do not use a different personal sender to bypass that policy.

**Next:** share the `/exec` URL and sender account name. Keep the secret private. The
CampusHR backend/UI integration can then use this relay; simply deploying the script does
not enable password reset on the existing site.

After changing the script, deploy a new version under **Manage deployments → Edit**;
editing the source alone does not update an existing versioned web-app deployment.

## Backend request contract

Only a trusted backend that has looked up an active registered account should call this
endpoint. Generate a cryptographically random six-digit OTP there and store its keyed hash,
not the plaintext code. Use a new UUID v4 request ID for each new challenge.

The POST envelope is:

```json
{
  "payload": "<exact serialized JSON payload>",
  "signature": "<lowercase hexadecimal HMAC-SHA256>"
}
```

Payload fields: `action: "password-reset"`, `requestId` (UUID v4), `to` (registered
account email), `otp` (six-character digit string), `issuedAt` (Unix milliseconds),
`expiresAt` (Unix milliseconds, no more than ten minutes after issuance).

Sign **the exact payload string** with the private shared secret:

```js
import { createHmac } from 'node:crypto';
const signature = createHmac('sha256', process.env.PASSWORD_RESET_SCRIPT_SECRET)
  .update('campushr-mail-v1\n' + payload)
  .digest('hex');
```

The backend sends `{payload, signature}` as JSON over HTTPS with a bounded timeout.
Google ContentService redirects to a `script.googleusercontent.com` response URL;
allow the expected Google response redirect and reject non-JSON/login-page responses.
Apps Script TextOutput does not supply application-specific HTTP error status codes:
**inspect JSON `ok === true` and the matching `requestId`, not HTTP 200 alone.**
A successful result means MailApp accepted the send, not that a message reached an inbox.
Never return the OTP, signature, shared secret or provider response to the browser/app.

Backend-only environment settings:

- `PASSWORD_RESET_ENABLED=true` after the relay is configured and authorized.
- `PASSWORD_RESET_SCRIPT_URL`: the deployed `/exec` URL.
- `PASSWORD_RESET_SCRIPT_SECRET`: the same value as `CAMPUSHR_MAIL_SECRET`.
- `PASSWORD_RESET_DAILY_LIMIT=80`: rolling backend request budget.

Never use `VITE_*` or `EXPO_PUBLIC_*` for secrets. The mobile API URL must point to
this same staging backend to share account changes with the website.

The public API is `GET /api/v1/auth/password-reset/options`,
`POST /request` with `{email}`, and `POST /confirm` with
`{challengeId, code, newPassword}` under that prefix. Unknown/inactive accounts receive
the same request response. Codes expire in ten minutes, allow five guesses, and can
be requested once per minute, five times per hour per account. IP and global budgets
also apply. Successful confirmation updates the password and revokes existing HTTP,
refresh and socket sessions. Users then sign in normally on either client.

Delivery uses an encrypted durable database outbox with leased, bounded retries.
Only keyed OTP digests remain for verification. Unsent encrypted payloads are cleared
on success, consumption or expiry; old challenge/throttle rows are pruned. A password
change invalidates existing codes. Keep the mail secret stable while delivery is queued.

## Replay, quota and failure behavior

- Unsigned/tampered requests, stale timestamps, expired codes and multiple recipients
  fail before sending. Requests older/newer than two minutes are rejected.
- A script lock and durable request marker prevent duplicate sends. The marker stores
  only timestamp, state and a keyed payload digest—never email/OTP/message content.
- An identical retry of an acknowledged send returns its prior success; reusing the same
  ID with a different payload is rejected. Ambiguous sends return `DELIVERY_UNCONFIRMED`
  and are not resent automatically. The backend should let the user request a new,
  rate-limited challenge and invalidate the old one.
- The script's soft cap counts attempted emails per UTC calendar day; this is separate
  from Google's rolling service quota. Google remaining quota is checked before every send.
- No exception text or request content is logged or returned by this script.
- The CampusHR backend must additionally enforce per-account/IP resend and guessing
  limits, generic account-existence responses, one-use verification and refresh-session
  revocation. The relay does not enforce account ownership or reset a password.

Google currently lists MailApp recipient limits of 100/day for consumer accounts and
1,500/day for Workspace accounts, subject to change and account-specific restrictions.
Start with the script's limit80 and confirm the intended sender's available quota.
See [Google quotas](https://developers.google.com/apps-script/guides/services/quotas),
[MailApp](https://developers.google.com/apps-script/reference/mail/mail-app),
[web-app deployment](https://developers.google.com/apps-script/guides/web), and
[Utilities HMAC](https://developers.google.com/apps-script/reference/utilities/utilities).

## Verification

```sh
node --test integrations/google-apps-script/relay.test.mjs
```

Six local mocked tests cover signature validation, nonce binding/retries, expiry,
recipient validation, quota/domain policy, lock contention and ambiguous sending.
Local database tests and a rendered website test cover incorrect codes, one-use
consumption, concurrent attempts, password updates, session revocation and new-password
sign-in. No real account password is changed by those tests. Real inbox delivery
requires the deployed script properties and authorization; HTTP 200 alone is insufficient.

## Staging activation — 1 November 2026

Google Script Properties were configured and signature validation verified.
Recovery is enabled on Railway staging, deployment
`d1dca643-546a-4e41-841f-bfb1dc8c425e`. A real website request returned HTTP 202,
and a Gmail metadata search confirmed the reset email in the administrator inbox.
No real account password was changed and no OTP was exposed during verification.
Use the latest code from a new request in your own client to complete a reset.
