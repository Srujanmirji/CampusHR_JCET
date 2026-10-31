# Persistent local CampusHR demo

This launcher runs the actual backend services and Prisma repositories with an embedded
PostgreSQL database (PGlite) stored in `backend/.demo/pgdata`. API and SQL listeners bind
only to `127.0.0.1`; it does not use `backend/.env`'s database or any production records.

## Start

From the repository root:

```sh
VITE_API_URL=/api/v1 npm run build --workspace @campushr/web
npm run demo --workspace @campushr/api
```

The web build is optional for native-only testing. When built, the HR web app is available
at <http://127.0.0.1:4012>. Its build must use the relative `/api/v1` base above.

For the mobile app, set this in the ignored `mobile/.env` (configured on this machine):

```dotenv
EXPO_PUBLIC_API_URL=http://127.0.0.1:4012/api/v1
```

Start Metro in another terminal:

```sh
cd mobile
REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start --host lan --port 8081
```

Xcode 27 uses Device Hub. For this machine's existing iPhone 17 Pro:

```sh
open -a DeviceHub 'devices://device/open?id=3260A606-7A40-4817-81B5-7F7B9B01A7C5'
xcrun simctl openurl 3260A606-7A40-4817-81B5-7F7B9B01A7C5 exp://127.0.0.1:8081
```

The simulator must be booted; other machines should select an available UDID using
`xcrun simctl list devices available`. The loopback-only API is for local browsers and
the iOS simulator on this Mac.

## Accounts

All initial passwords are `home-check-only`. These are local demo identities with separate
employee records and the normal role permission matrix.

| Role | Login | Employee |
| --- | --- | --- |
| Faculty | faculty-check@jcet.test | Asha Patil · JCET-CSE-021 |
| HOD | home-check@jcet.test | Ramesh Kulkarni · JCET-CSE-001 |
| HR | hr-check@jcet.test | Maya Desai · JCET-HR-001 |
| Substitute | coverage-recipient@jcet.test | Priya Kulkarni · JCET-CSE-022 |

The mobile Faculty/HOD workflows are retained. HR final approval uses the existing web app.
CL/DL/RH/EL balances and Monday theory/laboratory classes are seeded for testing.
Annual CL is 15 days; EL includes 30 days plus 15 carried in, for 45 total.

## Persistence

Leave requests, approval decisions, coverage, attendance, notifications, audit records and
refresh sessions are stored in the database. The signing key is private and remains stable
in `backend/.demo/jwt-secret`, so restarts do not invalidate saved sessions.

Seed data runs only before the private `initialized.json` marker is written. Later launches
apply pending migrations and preserve edits, including changed employee codes and deleted
classes. An invalid marker fails visibly rather than silently reseeding. Keep the entire
ignored `backend/.demo/` directory together when preserving the demo.

This is a single local demo database; run one launcher instance. PGlite is an embedded
PostgreSQL engine used here for local persistence, not a hosted production database.

## Verification

```sh
node mobile/checks/leave-cycle.smoke.mjs
node mobile/checks/leave-cycle.smoke.mjs --verify-saved
```

The first command creates a new request on an unused future Monday. It checks Faculty
submission, approval ordering/permissions, HOD recommendation, HR final approval, balances,
two substitute assignments, duplicate prevention, dated duties and stored notifications.
It saves record IDs in `/tmp/campushr-leave-cycle.json`; `CYCLE_EVIDENCE` can choose another
file. After stopping and starting the launcher, the second command verifies the same records
and notices without creating another leave request. Demo database records are not reset.

Notifications are real in-app records with authenticated realtime updates. OS push delivery
is disabled in this local launcher and is not claimed by the assignment confirmation UI.

See the [approval-cycle evidence](../design/mobile-premium-2026-10-24/implementation/approval-cycle/README.md)
for the native and HR web verification of one shared request.
