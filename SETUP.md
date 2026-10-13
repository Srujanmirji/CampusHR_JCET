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
- Generate two independent JWT secrets (at least 32 characters each) with
  `node -p "require('node:crypto').randomBytes(32).toString('hex')"`.

## Run

In separate terminals:

```sh
npm run db:up        # PostgreSQL via Docker, bound to 127.0.0.1 only
npm run dev:api      # http://localhost:4000/api/v1/health
npm run dev:web      # http://localhost:5173
npm run dev:mobile   # Expo Go or a simulator/emulator
```

- **Web:** sign in with the prefilled demo credentials. All screens use the
  sample data in `frontend/src/data/mock/` until the API is connected.
- **API:** the health endpoint reports process liveness, not database readiness.
  No database is needed yet.
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

## Decisions still required before connecting real data

- **Database:** the schema spec lists fields but not types, constraints or deletion
  policies. Timetable references subjects and rooms without defining those tables.
  Refresh sessions, academic profiles, recruitment, helpdesk and attachment
  records also need models.
- **Routes:** Departments, Documents and Helpdesk are in the web sidebar spec but
  have no pages or routes yet.
- **Policies:** leave policies and approval chains, attendance policy and workload
  thresholds must be finalized before their services are built.
- **Storage:** choose Supabase Storage or Cloudinary before document uploads.
- **Auth:** confirm cookie settings against the deployment domains.

The next delivery phase is authentication and RBAC, then employees and
departments, as specified in `tasks/DELIVERY_PLAN.md` and `tasks/MASTER_TASKS.md`.
