# Railway staging deployment — 1 November 2026

**Live:** <https://campushr-jcet-staging.up.railway.app>

The existing Railway workspace now hosts a separate CampusHR staging environment. The
web portal and API are deployed from committed source `257b1c05014bdcd0d9f5e46fef0d74c93dc33cfe` through
Railway CLI local upload. Existing production services/data were not redeployed or migrated.

## Provisioned resources

| Resource | Identity |
| --- | --- |
| Project | acceptable-presence · `0b628b3d-5ef8-4bb6-91cf-975c2f59a315` |
| Environment | staging · `714d634d-500c-4fe1-835e-eb81e65e6294` |
| App service | campushr-staging · `3871ec62-4521-4dc5-8914-677a9fddb5a3` |
| PostgreSQL | Postgres-kVlq · `e34e4f74-8320-4505-aa19-767148ddfcfe` |
| Private document volume | `d31c0262-4b40-4ce6-96e6-c754912f3441`, mounted at `/data` |
| Final healthy deployment | `3ebf3dce-1c23-4753-a8b4-ba7981f67951` |

The database is fresh and uses its private Railway address. Its provider service, host,
port, database name and same-environment reference were verified before deployment. A
separate JWT secret was generated privately. The app uses secure production cookies,
relative `/api/v1` web requests, `DOCUMENTS_DIR=/data/documents`, and one replica.
The database template and app each have their own volumes.

Reviewed build/deploy settings from `railway.json` were applied to this service through
Railway's environment JSON patch API. The API normalizes replicas into its regional config;
AMS has one replica. No production IaC apply or GitHub auto-deploy connection was changed.

## Administrator access

Login: **srujanmirji10@gmail.com** (the address supplied by the user).

The generated password is stored only in the private, ignored local file
`deploy/staging/.env.admin.local` (mode 0600). It is excluded from Git and Railway uploads.
Read it locally to sign in; do not commit it or copy it into shared deployment logs.

The existing reference-data/admin seed initialized the account during a temporary staging
bootstrap rollout. Both `SEED_ADMIN_*` variables were then removed from Railway and normal
`npm run staging:start` restored. The final deployment uses that normal startup. The account
and refresh session remained valid across the cleanup redeploy. No sample faculty accounts
or local demo records were copied to the cloud.

## Verification

- Railway reports the final deployment **SUCCESS**.
- All 11 migrations applied to the new staging database; the final restart found none pending.
- HTTPS liveness/readiness, served web login, authenticated API boundaries and private-file
  routing passed the deployed smoke script.
- Admin login, own identity, seeded department access and Secure/HttpOnly/SameSite=Strict
  refresh cookies passed against the public staging URL.
- The same account and existing access/refresh session survived redeployment. Refresh
  rotation, logout and refresh revocation passed. Verification sessions were signed out.
- Local workspace TypeScript/lint and production API/web build passed. Tests: 65 backend,
  122 mobile, 44 isolated database and 4 staging guard tests (235 total).
- Private document volume attachment and mount configuration were verified. Upload/preview
  and restoration of actual uploaded file bytes remain pilot acceptance checks.

[Machine-readable deployment evidence](deployment-2026-11-01.json) contains resource IDs
and sanitized verification results, without passwords, access tokens, cookies or database URLs.

Push remains disabled. Signed iPhone installation, APNs, physical-device QA, monitoring
alerts and backup/restore acceptance are separate remaining release checks. This deployment
is staging verification, not a production-use certification.

## Operate this environment

The local Railway CLI is linked to the staging app. Still use explicit selectors for mutations:

```sh
railway up --project 0b628b3d-5ef8-4bb6-91cf-975c2f59a315 --environment staging --service 3871ec62-4521-4dc5-8914-677a9fddb5a3 --detach
node scripts/staging/smoke.mjs https://campushr-jcet-staging.up.railway.app
```

Inspect deployment status/logs and verify health after every rollout. For a failed staging
rollout, redeploy a known-good compatible image/commit to this same staging service. Never
reset the database or delete employee records as a rollback. Keep database and document-volume
backups together; restore into a separate target when testing recovery.

[Original preparation and signed iPhone handoff](README.md).
