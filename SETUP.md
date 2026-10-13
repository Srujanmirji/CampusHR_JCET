# CampusHR setup

The project uses the documented stack: React + Vite for the web app, Express +
Prisma + PostgreSQL for the API, and Expo for the mobile app. Web and mobile share
one API and one database.

## Install

Use Node 24 and npm 11. Install all three workspaces from the project root:

```sh
nvm use
npm ci
cp -n .env.example .env
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env
cp -n mobile/.env.example mobile/.env
```

Real `.env` files are git-ignored; never commit them. In a new checkout:

- Set `POSTGRES_PASSWORD` in the root `.env` and use the same password in
  `backend/.env`'s `DATABASE_URL`.
- Generate the access-token secret (at least 32 characters) with
  `node -p "require('node:crypto').randomBytes(32).toString('hex')"` and set it
  as `JWT_ACCESS_SECRET` in `backend/.env`.

## Database

Start PostgreSQL with Docker (`npm run db:up`), or without Docker using Prisma's
local server: `npx prisma dev --name campushr -d` in `backend/`, then put the URL
it prints into `backend/.env` as `DATABASE_URL`.

Apply migrations and create the roles and first Super Admin:

```sh
npm run db:migrate                 # development: apply and create migrations
npm run db:deploy --workspace @campushr/api   # production: apply only
SEED_ADMIN_EMAIL=you@jcethbl.edu.in SEED_ADMIN_PASSWORD='12+ characters' \
  npm run db:seed --workspace @campushr/api
```

The seed is safe to rerun: it never changes an existing user's password.

## Run

In separate terminals:

```sh
npm run dev:api      # http://localhost:4000/api/v1/health
npm run dev:web      # http://localhost:5173
npm run dev:mobile   # Expo Go or a simulator/emulator
```

- **Web:** sign in with the account created by `npm run db:seed` (the API must be
  running). Module screens still use the sample data in
  `frontend/src/data/mock/`.
- **API:** sign-in endpoints are under `/api/v1/auth` (see
  `backend/API_ENDPOINTS.md`). The health endpoint reports process liveness,
  not database readiness.
- **Mobile on a physical phone:** replace `localhost` in `mobile/.env` with your
  computer's LAN IP.

## Mobile push notifications

Local notifications work in Expo Go. Remote push (sent from the API) needs:

1. An EAS project ID: run `npx eas init` in `mobile/`.
2. Android: a development build (`npx eas build --profile development --platform android`)
   and a Firebase project. Expo Go no longer supports remote push on Android.
3. iOS: an Apple Developer account for push credentials.

## Checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run db:validate
npm run format:check
```

Browser checks need the web dev server running and Playwright available
(`PLAYWRIGHT_MODULE` can point at an installed Playwright module):

```sh
npm run check:preview --workspace @campushr/web   # login, leave → substitution workflow
npm run check:phase3 --workspace @campushr/web    # dashboard, module pages, reset
```

Mobile bundles:

```sh
cd mobile
npx expo install --check
npx expo export --platform ios --platform android
```

## Known issues

- `npm audit` reports 39 advisories (28 high, 11 moderate) in Expo/Metro, the
  Prisma CLI and shadcn tooling. The fixes it proposes are incompatible SDK
  downgrades. Recheck before deployment.
- The web app's main bundle is 689 KB (201 KB gzipped); pages load as separate
  chunks.
- Native runtime testing has been done on the iOS simulator only.
- Auth follow-ups: deactivating a user or changing their role takes effect when
  their 15-minute access token expires (check the database once RBAC lands), and
  expired `refresh_sessions` rows need a periodic purge job.

## Decisions still required before connecting real data

- **Database:** the schema spec lists fields but not types, constraints or deletion
  policies. Timetable references subjects and rooms without defining those tables.
  Academic profiles, recruitment, helpdesk and attachment records also need
  models.
- **Routes:** Departments, Documents and Helpdesk are in the web sidebar spec but
  have no pages or routes yet.
- **Policies:** leave policies and approval chains, attendance policy and workload
  thresholds must be finalized before their services are built.
- **Storage:** choose Supabase Storage or Cloudinary before document uploads.
- **Auth:** the refresh cookie is `SameSite=Strict`, which assumes the web app and
  API share a site (e.g. `app.` and `api.jcethbl.edu.in`). Confirm the deployment
  domains. Choose an SMTP provider for password reset. The login rate limit is
  in memory, so it needs Redis if the API runs as several instances.

Sign-in is built. Next: connect the web and mobile apps to it, add permission
checks (RBAC), then employees and departments, as specified in `tasks/DELIVERY_PLAN.md` and `tasks/MASTER_TASKS.md`.
