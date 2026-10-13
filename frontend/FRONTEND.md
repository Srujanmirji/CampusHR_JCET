# Frontend Technical Specification

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod
- Recharts
- Socket.IO Client

## Architecture

```text
src/
├── app/
├── components/
├── features/
├── layouts/
├── lib/
├── routes/
├── services/
├── stores/
├── types/
└── utils/
```

## Feature-First Structure

```text
features/
├── auth/
├── employees/
├── attendance/
├── leave/
├── timetable/
├── workload/
├── substitution/
├── payroll/
├── documents/
├── reports/
└── notifications/
```

Each feature should contain:

```text
feature/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
└── utils/
```

## Frontend Rules

- No direct DB access.
- All server data through API service layer.
- Use TanStack Query for server state.
- Use Zod for form validation.
- Keep role checks centralized.
- Reusable tables and filters.
