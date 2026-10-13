# Backend Technical Specification

## Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod
- JWT
- bcrypt/argon2
- Socket.IO
- Redis optional
- Object storage for files

## Architecture

```text
src/
├── config/
├── middleware/
├── modules/
├── common/
├── jobs/
├── events/
├── sockets/
├── database/
└── server.ts
```

## Module Structure

```text
modules/employees/
├── employee.controller.ts
├── employee.service.ts
├── employee.repository.ts
├── employee.routes.ts
├── employee.schema.ts
└── employee.types.ts
```

## Rules
- Controllers stay thin.
- Business logic in services.
- DB access in repositories/Prisma layer.
- Validate all input.
- Permission checks server-side.
- Audit sensitive mutations.
