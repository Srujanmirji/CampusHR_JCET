# CampusHR staging and signed iPhone handoff

Prepared 25 October 2026. This is a staged rollout environment, separate from production.

## Current status — 1 November 2026

- **Staging is live:** <https://campushr-jcet-staging.up.railway.app>.
- [Deployment record and verification](DEPLOYMENT_2026-11-01.md) contains resource IDs,
  source revision, live smoke results and the post-redeploy session check.
- The earlier Railway trial block is cleared. A fresh database, private document volume,
  app service and HTTPS domain were created in a separate staging environment.
- Administrator `srujanmirji10@gmail.com` was initialized with a private generated password
  in ignored `.env.admin.local`. Temporary seed variables were removed from Railway.
- No signed iPhone build or TestFlight submission was performed. Expo ownership, Apple
  signing and device acceptance remain separate prerequisites below.

## What is prepared

- [Railway staging configuration](railway.json): build the API/web monorepo, start through
  the staging guard and normal migrations, use database readiness, one replica.
- [Variable template](.env.example): separate staging PostgreSQL, private document volume,
  production cookie security, same-origin web/API and push initially disabled.
- [Startup guard](../../scripts/staging/preflight.mjs): rejects the wrong Railway environment,
  insecure web configuration, missing storage mount configuration, and database target mismatch
  **before migrations**. It never prints variable values or credentials.
- [Read-only smoke check](../../scripts/staging/smoke.mjs): HTTPS/API readiness, login page,
  protected API access and private-file routing after deployment.
- [EAS profiles](../../mobile/eas.json): `staging` is an internal-distribution Release build
  with bundled JavaScript (no Metro dependency); `staging-simulator` is a separate unsigned
  simulator profile. OTA updates are disabled. Build numbers use EAS remote versioning.
- [Dynamic Expo configuration](../../mobile/app.config.ts): explicit staging owner/project,
  approved bundle ID and public HTTPS API required; local Expo Go remains unchanged.
- `.railwayignore` excludes env files, local databases, uploads, signing material, mobile,
  design captures and test fixtures from the API upload. Signing material is also Git-ignored.

## Account details needed

1. **Railway:** staging is provisioned in the selected existing workspace. CLI access is
   restored and linked to staging; use explicit selectors to keep production separate.
2. **Expo:** account/organization slug, existing CampusHR project UUID (or confirmation that
   a new project should be created under that owner), and sign in locally with
   `npx --yes eas-cli@25.3.0 login` from `mobile/`. EAS access must permit building for that owner.
3. **Apple:** approved Developer Team ID and whether paid membership is active. If several
   teams are available, identify the college-authorized team. Complete Apple sign-in/2FA
   directly in the EAS/Xcode flow; never send passwords, codes, private keys or certificates.
4. **App/device:** approved staging bundle identifier; then connect and trust the test iPhone,
   or register it through EAS's device flow. Internal iOS distribution requires a registered
   device and valid provisioning. Device identifiers need not be posted in chat.
5. **Staging administration:** the initial email/account is configured. Confirm the institutional
   support contact and pilot data before inviting faculty.

## Provision Railway after billing is active

Project ID: `0b628b3d-5ef8-4bb6-91cf-975c2f59a315`.

1. Inspect the target with `railway status --json` and `railway environment list --json`.
   Link this project and create/select an empty **staging** environment. Do not duplicate
   production variables or copy production data. If staging already exists, inspect it first.
2. In that environment create a new PostgreSQL service and a new CampusHR API service.
   Provision a separate private volume mounted at `/data` on the API service. Keep one API
   replica while uploads and sign-in limiting are local to that service.
3. Set the API service root to the repository root and its Railway Config File path to
   `/deploy/staging/railway.json`. Do not apply `.railway/railway.ts`, which describes the
   existing service separately. Use the fresh staging service's ID for every CLI mutation.
4. Generate a Railway HTTPS domain. Enter the variables from `.env.example` in the staging
   service. Generate a fresh JWT secret privately. `DATABASE_URL` must reference the newly
   created **same-environment** PostgreSQL service; do not use a production cross-reference.
5. Independently inspect that new DB service's host, port and database name. Record them in
   `STAGING_DATABASE_HOST`, `STAGING_DATABASE_PORT`, `STAGING_DATABASE_NAME`. These are
   operator-verified pins, not values copied automatically from an arbitrary DATABASE_URL.
   The guard compares the DSN to them and rejects target-changing query parameters; only
   `schema` and `sslmode` query keys are permitted. Pins alone cannot prove resource ownership:
   verify the provider service/environment and variable-reference provenance as well.
6. Verify the private document volume is attached and `DOCUMENTS_DIR=/data/documents`.
   Railway supplies `RAILWAY_VOLUME_MOUNT_PATH=/data`; do not spoof a mount by setting the
   variable manually. The configuration guard does not test volume durability.
7. Deploy the reviewed working tree to that exact staging service/environment. The service
   applies migrations once at startup; it does not run the local demo seed. Do not upload
   ignored credentials or local `.demo` records. Keep the production service unchanged.
8. Wait for healthy deployment and run:

   ```sh
   node scripts/staging/smoke.mjs https://ACTUAL-STAGING-HOST
   ```

9. Initialize the approved staging administrator with the existing reference-data/admin seed,
   targeting only the verified staging database. Supply credentials through private environment
   variables, never command arguments, Git or a shared log. Remove temporary seed secrets.
10. Test login/refresh/logout, own and forbidden data access, leave approval/coverage and upload/
    private preview. Redeploy/restart and confirm records and document bytes remain available.
    Configure database **and volume** backups and perform a restore into a separate disposable
    target before inviting real users. Database backups alone do not contain uploaded files.

Railway authentication does not establish monitoring, backups or restore acceptance. Record
actual service IDs, domain, backup policy and smoke/restore evidence here once provisioning succeeds.

## Build the signed iPhone app after staging is healthy

From `mobile/`:

```sh
cp .env.staging.example .env.staging.local
```

Fill the public account identifiers and actual staging HTTPS `/api/v1` URL. Confirm/create
an Expo project under the approved owner in the Expo dashboard first; copy its UUID.
Use a unique, approved staging bundle identifier so it can coexist with a future production app.

Load those public build settings explicitly (Expo does not automatically select this filename):

```sh
set -a
source .env.staging.local
set +a
npx --yes eas-cli@25.3.0 login
npx --yes eas-cli@25.3.0 whoami
npx expo config --type public
npx --yes eas-cli@25.3.0 env:push --environment preview --path .env.staging.local
npx --yes eas-cli@25.3.0 config --platform ios --profile staging
npx --yes eas-cli@25.3.0 device:create
npx --yes eas-cli@25.3.0 build --platform ios --profile staging
```

Inspect the selected Expo owner, project, Apple team and device before completing EAS prompts.
Do not select an unrelated personal team merely because its certificate is already installed.
The `preview` EAS environment must contain the same values as local config resolution; these
identifiers/API addresses are public, not secret build variables. No server secret belongs in
`EXPO_PUBLIC_*`. Push credentials are managed through the approved EAS/Apple account flow.

Install the resulting signed internal build on the registered iPhone. Verify it launches with
Metro stopped and uses the staging API. Test sessions, file picker/private previews, slow/offline
networks, large text and VoiceOver. Enable and test APNs only after matching Expo project and
Apple credentials are configured on client/server; record observed delivery separately from
provider acceptance. See [remote push acceptance](../../mobile/ios-docs/REMOTE_PUSH.md).

No TestFlight upload or App Store publication is configured or performed by these profiles.
Those follow device acceptance and the [release checklist](../../mobile/ios-docs/RELEASE.md).

## Local verification

```sh
npm run staging:check
npm run typecheck
npm run lint
npm test
npm run test --workspace @campushr/mobile
TEST_DATABASE_URL= npm run test:db --workspace @campushr/api
VITE_API_URL=/api/v1 npm run build
```

Use the repository's Node 24/npm 11 environment. The explicit empty `TEST_DATABASE_URL=` prevents dotenv from loading an external test
database from a local env file, so these database tests use isolated throwaway PGlite.
Never point destructive database tests at staging or production. The new guard tests cover wrong
environments, unpinned/overridden database targets and temporary document directories.
Readiness tests cover available, failed and hung databases without exposing errors.

References: [Railway environment isolation](https://docs.railway.com/environments),
[Railway config](https://docs.railway.com/config-as-code/reference),
[Expo build profiles](https://docs.expo.dev/build/eas-json/),
[Expo variants](https://docs.expo.dev/build-reference/variants/),
[Expo environment variables](https://docs.expo.dev/eas/environment-variables/).
