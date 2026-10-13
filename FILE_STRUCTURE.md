# Repository Structure

```text
CampusHR_JCET/
├── README.md               Project overview and status
├── SETUP.md                Setup, checks and open decisions
├── FILE_STRUCTURE.md       This file
├── package.json            npm workspaces: frontend, backend, mobile
├── compose.yaml            Local PostgreSQL (Docker)
│
├── product/                PRD.md, SCOPE.md, USER_ROLES.md
├── design/                 DESIGN_SYSTEM.md, WEB_UX.md, MOBILE_UX.md
├── features/               One spec per module (README.md is the index)
├── shared/                 ARCHITECTURE.md, ENVIRONMENT.md, TESTING.md
├── tasks/                  MASTER, BACKEND, FRONTEND, MOBILE tasks, DELIVERY_PLAN
│
├── frontend/               Web app — React + Vite + TypeScript + Tailwind + shadcn/ui
│   ├── README.md           What the web app does and how to verify it
│   ├── DESIGN.md           Approved visual direction
│   ├── FRONTEND.md, ROUTES.md, COMPONENTS.md, STATE_AND_API.md   Specs
│   ├── checks/             Browser smoke checks (Playwright)
│   ├── public/assets/      JCET logo, campus visual, sample portraits
│   └── src/
│       ├── app/            Entry, providers, lazy-loaded router
│       ├── layouts/        AppShell (sidebar + topbar)
│       ├── components/     ui/ (shadcn), layout/, shared/
│       ├── features/       auth, dashboard, employees, attendance, leave,
│       │                   timetable, workload, substitution, reports,
│       │                   notifications, settings, documents (empty)
│       ├── data/mock/      Sample data used until the API is connected
│       ├── lib/            Substitution ranking, motion, utilities
│       └── types/
│
├── backend/                API — Express + TypeScript + Prisma
│   ├── BACKEND.md, API_ENDPOINTS.md, DATABASE_SCHEMA.md,
│   │   BUSINESS_RULES.md, SECURITY.md                                Specs
│   ├── src/
│   │   ├── server.ts       Startup, env validation, graceful shutdown
│   │   ├── app.ts          Helmet, CORS, JSON limit, health route, 404
│   │   ├── config/env.ts   Zod environment schema
│   │   ├── middleware/     Central error handler
│   │   ├── database/       schema.prisma (no domain models yet)
│   │   └── modules/ jobs/ events/ sockets/ common/   Reserved
│   └── test/               Foundation test
│
└── mobile/                 Mobile app — React Native + Expo + Expo Router
    ├── MOBILE_APP.md       Spec
    ├── app/                _layout.tsx, (tabs)/index.tsx, (auth)/, leave/,
    │                       documents/, profile/
    └── lib/                theme.ts, notifications.ts
```
