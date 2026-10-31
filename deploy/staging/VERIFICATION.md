# Staging preparation verification

Recorded 25 October 2026. This verifies local preparation, not a hosted deployment or signed IPA.

| Check | Result |
| --- | --- |
| Root workspace TypeScript checks | Passed: web, backend, mobile |
| Root workspace lint | Passed: web, backend, mobile |
| Explicit lint on mobile app.config.ts and staging scripts | Passed |
| Backend unit tests | 65 passed |
| Mobile tests | 122 passed |
| Isolated database integration tests | 44 passed |
| Staging startup configuration tests | 4 passed |
| API/web production build | Passed with VITE_API_URL=/api/v1 |
| Staging iOS JavaScript/Hermes export | Passed with validation-only owner/project/API fixtures |
| EAS25.3.0 build-profile schema/inheritance | Passed: standalone Release staging and simulator profiles |
| Local Expo Go public config resolution | Passed; existing local identity preserved |
| Executable startup with production target | Refused before migration, as intended |
| Changed code formatting and whitespace | Passed |
| Scoped code review | Approved after DB pinning/query-override and runbook fixes |

235 tests in total. The database run used `TEST_DATABASE_URL=` explicitly, keeping dotenv
from selecting an external database. Its log confirms an in-memory loopback PostgreSQL.

The export is an unsigned JS bundle with synthetic configuration fixtures under `/tmp/`;
it is not installable signed iPhone evidence and must not be distributed. The build does
not establish APNs delivery, actual device behavior, backups, monitoring or cloud health.
The web build retains an existing large-chunk size warning.

The TypeScript reviewer's broad repository-wide ESLint scan also found 162 errors in
preexisting `design/mobile-v2` artifacts, outside the application workspace lint targets.
That broad scan remains failing; no archived design files were changed. The scoped code
review subsequently approved the staging implementation and runbook.

## External gates

- Railway sign-in restored; only the existing production environment is listed.
- Creating staging failed because the workspace trial expired. No new services, database,
  volume, domain, migration or deployment were created; production was unchanged by this task.
- Expo browser login was initiated; owner/project confirmation is still required.
- No Apple team or bundle ID was selected, signing resources provisioned, or iPhone build queued.
- No physical iPhone is connected. Installation and device acceptance remain pending.

[Account requirements and next commands](README.md).
