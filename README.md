# CampusHR — JCET Hubballi

CampusHR is the HR and faculty management system for Jain College of Engineering
and Technology, Hubballi. The project has been approved by the HOD and is moving
from its approved interface toward a production system.

## Current status

| Part                   | State                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app (`frontend/`)  | Full interface for every sidebar module. Sign-in, Employees and Departments use the API; other screens use built-in sample data.                          |
| API (`backend/`)       | Sign-in (email or employee ID), role permissions, employees, departments and designations, with an audit log. Other modules' endpoints are not built yet. |
| Mobile app (`mobile/`) | Foundation screen with local notifications. Remote push needs an EAS project ID.                                                                          |

Module sample data stays in place until each module's API endpoints exist.
Payroll is out of scope and is not part of this product.

## Product surfaces

- **Web app:** Admin, HR, Principal, HOD
- **Mobile app:** Faculty, Staff, HOD
- **Shared backend:** Node.js + Express + PostgreSQL (Prisma)
- **Realtime:** Socket.IO
- **Authentication:** JWT + RBAC
- **File storage:** Supabase Storage or Cloudinary (to be chosen)

## Quick start

Requires Node 24 and npm 11.

```sh
nvm use
npm ci
npm run dev:web     # http://localhost:5173 — needs the API for sign-in
```

Full setup, environment files, the API, the database and the mobile app:
see [SETUP.md](SETUP.md).

## Repository layout

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md). Specifications live in `product/`,
`design/`, `features/`, `shared/`, `backend/`, `frontend/`, `mobile/` and `tasks/`.

## College context

- Institution: Jain College of Engineering and Technology, Hubballi
- Established: 2017
- CET Code: E265
- PGCET Code: B036
- Address: 404/4/5, Hebballi Road, Sai Nagar, Unkal, Hubballi - 580031
- Phone: 0836-2002117
- Email: contactus@jcethbl.edu.in

## Core product goal

One unified HR platform for employee records, attendance, leave, timetable,
faculty workload, smart substitution, documents, reporting, notifications, and
college-specific academic HR workflows.
