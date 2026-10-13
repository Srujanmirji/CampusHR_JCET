# CampusHR foundation

## Documentation review

Read all 44 original Markdown files before creating source files: the README and
file inventory, product requirements and roles, architecture/environment/testing
guides, backend and frontend specifications, all 18 feature documents, all three
design specifications, the mobile specification, and all five task documents.

The project uses the explicitly documented stack, rather than the global Next.js
default. Web and mobile share one Express API and PostgreSQL source of truth.
The existing documentation stays in place alongside each application's source.

## Installed structure

```text
frontend/                   React + Vite + TypeScript
  src/app/                  Query provider and application entry
  src/components/ui/        shadcn component destination
  src/features/             Documented feature folders and their seven layers
  src/layouts/
  src/lib/
  src/routes/               Router bootstrap only
  src/services/
  src/stores/
  src/types/
  src/utils/
backend/                    Express + TypeScript + Prisma
  src/config/               Zod environment validation
  src/middleware/           Central HTTP error handler
  src/modules/              Domain modules will be implemented here
  src/common/
  src/jobs/
  src/events/
  src/sockets/
  src/database/             PostgreSQL schema configuration; no domain models yet
  src/server.ts
  test/                     One runnable foundation check
mobile/                     React Native + Expo + TypeScript
  app/(auth)/
  app/(tabs)/               Boot screen only
  app/leave/
  app/payslips/
  app/documents/
  app/profile/
  lib/                      Base theme tokens
```

Empty folders are intentional destinations from the specifications, not working
features. Authentication, dashboards, domain API endpoints, Socket.IO events,
storage integrations, and push notification registration are not implemented.
Dependencies for the documented stack are installed; optional Redis is deferred.

## Local development

Use Node 24 and npm 11. Install all three workspaces from the project root:

```sh
nvm use
npm ci
cp -n .env.example .env
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env
cp -n mobile/.env.example mobile/.env
```

The initial setup creates ignored local environment files with random database
and JWT secrets. Keep those files if they already exist. When configuring a new
checkout, set `POSTGRES_PASSWORD` in the root `.env`, use the same password in
`backend/.env`'s `DATABASE_URL`, and generate independent JWT secrets with
`node -p "require('node:crypto').randomBytes(32).toString('hex')"`.

In separate terminals:

```sh
npm run db:up        # Requires Docker; PostgreSQL is bound to loopback only
npm run dev:api     # http://localhost:4000/api/v1/health
npm run dev:web     # http://localhost:5173
npm run dev:mobile  # Expo Go or a configured simulator/emulator
```

For a physical phone, replace `localhost` in `mobile/.env` with your computer's
LAN IP. The API health endpoint reports process liveness, not database readiness.
No database connection is required for the boot screens or health check.

The web theme uses the documented navy, orange, red, light gray, dark text, and
status colors, with Inter and semantic Tailwind/shadcn variables. The boot screens
are setup placeholders, not the web app shell or mobile navigation.

## Checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run db:validate
npm run format:check
cd mobile
npx expo install --check
npx expo export --platform ios --platform android
```

`npm run build` builds the web app and API. Expo export verifies mobile bundles;
native installation and runtime testing require a simulator or physical device.

Prisma uses the stable v7 release, with its URL in `prisma.config.ts`. Run
`db:generate` and `db:migrate` after finalizing and adding domain models. The
initial schema deliberately has no domain tables and no migration.

## Initial verification

- All three workspaces pass TypeScript and ESLint checks; formatting passes.
- Web and API production builds pass; the backend foundation test passes.
- Prisma validates the empty PostgreSQL schema without needing a database server.
- Expo's SDK dependency check passes; iOS and Android bundles export successfully.
- The web boot screen was inspected at 375px and 1280px: no horizontal overflow or
  browser errors, Inter loads, and text contrast is at least 7.06:1. It has no
  interactive controls yet. The design detector reports no findings.
- `npm ci --dry-run --ignore-scripts` validates the workspace lockfile.
- All 44 original Markdown files remain byte-for-byte unchanged.

PostgreSQL was not started because Docker and PostgreSQL are unavailable on this
machine. Native device/simulator runtime testing has not been performed.

The dependency audit is **not clean**: `npm audit` reports 39 affected packages
(28 high, 11 moderate), propagated from Expo/Metro, Prisma CLI, and shadcn tooling
dependencies. Its proposed fixes include incompatible SDK changes and major
downgrades; the ordinary `npm audit fix` attempt fails dependency resolution.
No forced downgrade or unsupported native dependency override was applied.
Recheck advisories before deployment; this is a development foundation.

## Decisions still required before domain implementation

- The database specification lists fields but leaves types, constraints, deletion
  policies, and several relationships unspecified. Timetable references subjects
  and rooms without defining those tables. Refresh sessions, academic profiles,
  salary structures, recruitment, helpdesk, and attachment records also need models.
- Department management, notifications, and helpdesk appear in the web sidebar but
  are absent from the route map. Their routes should be agreed when those modules begin.
- Finalize leave policies and approval chains, attendance policy, workload thresholds,
  and payroll adjustment rules before implementing their services.
- Choose Supabase Storage or Cloudinary before implementing document uploads.
- Confirm cookie settings against the deployment domains before implementing auth.
- Phase 0 finalization checkboxes remain open: reading a draft does not finalize it.

The next delivery phase is authentication and RBAC, followed by employees and
departments, as specified in `tasks/DELIVERY_PLAN.md` and `tasks/MASTER_TASKS.md`.

Setup follows the official [shadcn Vite instructions](https://ui.shadcn.com/docs/installation/vite),
[Expo Router installation](https://docs.expo.dev/router/installation/), and
[Prisma v7 configuration](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7).
