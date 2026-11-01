# Shared website and mobile password recovery

Implemented 1 November 2026. Website and mobile Forgot password flows use the
same API and PostgreSQL user records. A completed reset changes the password for
both clients and revokes existing access, refresh and socket sessions. Clients
return to sign-in; no automatic login occurs after recovery.

## Deployment

Railway project `0b628b3d-5ef8-4bb6-91cf-975c2f59a315`, **staging** environment
`714d634d-500c-4fe1-835e-eb81e65e6294`, app service
`3871ec62-4521-4dc5-8914-677a9fddb5a3`. Production is unchanged.

Initial recovery deployment `1d003469-48fc-49d0-a69c-d3ef693b601e` succeeded;
readiness and reset-options returned HTTP 200. Recovery remains disabled because
the deployed Google relay returned `NOT_CONFIGURED`, including after the user
reported setting its property. Final accessibility polish deployment
`3c37fdcf-1808-4ba0-86e9-e587bc0acc5d` also succeeded; readiness and
reset-options returned HTTP 200. The live website correctly renders the temporary
unavailability message while Google remains unconfigured.

Staging holds the backend-only URL and shared secret. Never copy them into frontend
or Expo public variables. The ignored mobile `.env` points to this staging API;
installed release builds require rebuilding to include the updated mobile UI.
No signed iPhone build or TestFlight release was produced by this change.

Enable recovery only after the deployed Apps Script accepts the shared secret:
`CAMPUSHR_MAIL_SECRET` in Google Script Properties equals the private backend
`PASSWORD_RESET_SCRIPT_SECRET` value. An expired signed probe can verify the key
without sending mail. Do not request or paste OTPs or secrets into chat.

## Verification

- Backend: 68 tests passed.
- Isolated PostgreSQL-compatible PGlite database: 49 tests passed, including
  concurrent reset consumption, wrong-code limits, session revocation and old
  credential races. Tests explicitly disable external TEST_DATABASE_URL.
- Mobile: 123 tests passed, including public transport and explicit confirmation.
- Google relay: six mocked tests passed.
- Workspace lint, typecheck, web/API production build passed.
- iOS and Android Expo bundle exports passed with staging API configuration.
- Rendered website test used a disposable database, fake mail sender and fake
  account only. Incorrect code rejected; correct code updated password; login with
  the new password reached the dashboard. No real user's password changed.
- Checked 375px and 1280px, keyboard navigation, focus restoration, 44px recovery
  controls, constrained desktop dialog and light/dark rendering. Runtime browser
  plugin was unavailable; local Playwright/Chrome was used.
- A further repeated test hit the expected per-account request budget. No bypass
  of rate limits was introduced.

## Activation and real delivery verification

The Google Script Property was corrected after the initial deployments. An expired
signed probe passed signature validation and returned the expected INVALID_REQUEST,
without sending email. Staging PASSWORD_RESET_ENABLED was then set to true.
Activation deployment `d1dca643-546a-4e41-841f-bfb1dc8c425e` succeeded.
Readiness returned HTTP 200 and reset-options returned `{"enabled":true}`.

A live browser request for the staging administrator returned HTTP 202 and showed
the code/new-password form. Gmail metadata search confirmed that the resulting
"Your CampusHR password reset code" message arrived in the recipient inbox.
No OTP was read, copied into chat or used to change the real account password.
Request a new code through the user's own client before completing a reset because
challenges are bound to each request. Normal resend and account limits still apply.

Website and mobile use the same enabled staging API. Native bundle exports passed;
this activation does not distribute a new signed iPhone binary.

See `integrations/google-apps-script/README.md` for relay setup, API contracts,
expiry, retry and request-budget details.

## Password validation clarity

Deployment `5acf535d-4c88-48d8-aa3e-e9fd174d970c` fixes the misleading repeated
Update password interaction for passwords shorter than the existing 12-character
minimum. Web and mobile now show remaining-character guidance and repeat-password
matching feedback; confirmation is enabled when the code and existing client
password rules are satisfied. Web descriptions and keyboard focus stay accessible.
No password policy or backend authentication behavior changed.

Workspace lint/typecheck, production web/API build, 123 mobile tests, iOS/Android
exports and scoped reviews passed. The new `frontend/checks/password-reset.smoke.js`
regression first failed against the old UI and passed after the fix at 375/1280px.
The API in this regression is mocked: short/mismatched passwords produce no confirm
request, and valid matching input reaches success exactly once. Checked constrained
viewport scrolling and dark-mode rendering. Live site validation was checked with
only the request endpoint mocked, without sending email or changing a real password.

## Password composition policy

User-requested composition rules deployed in staging deployment
`392758ef-af80-434f-a825-414f07d7247c` (successful): every new password needs
lowercase, uppercase, a digit and punctuation/symbol, plus the existing 12-character
minimum and 72 UTF-8 byte limit. The API, website and mobile consume one canonical
workspace package, `@campushr/password-policy`. Web and mobile display a live
requirement checklist. HR generation guarantees compliant random passwords using
unbiased cryptographic sampling. Existing sign-in passwords are unchanged.

Validation: 71 backend tests, 50 isolated database tests, 123 mobile tests, workspace
lint/typecheck, production web/API build and iOS/Android exports passed. Recovery
smoke tests pass at 375/1280px; broader website smoke passes including password
change. Checked dark mode, constrained-height scrolling and keyboard focus.
Scoped React, JavaScript/types and security reviews have no remaining blockers.

Live API checks reject all four missing-character-category cases before OTP
verification. Live website checklist and disabled/enabled behavior passed with
only the request endpoint mocked. No email was sent or real password changed by
these policy checks. Readiness and recovery availability remain HTTP 200/enabled.
