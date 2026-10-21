# Team Plan

Two teams share one API and one database:

- **Website team** — Srujan Mirji (`srujanmirji`, lead) and Zeeshan Madras
  (`zeeshanmadras`): the web app and the API every module needs, including
  the endpoints the mobile app calls.
- **Mobile team** — Pranav Angadi (`pranavangadi`) and Arihant Hangal: the
  faculty and staff mobile app (`mobile/`).

Each person owns whole modules, so two people rarely edit the same files.
Task IDs refer to `BACKEND_TASKS.md`, `FRONTEND_TASKS.md` and
`MOBILE_TASKS.md`. iOS delivery is tracked in [`IOS_TASKS.md`](IOS_TASKS.md), with setup and acceptance guidance in the [iOS documentation](../mobile/ios-docs/README.md).

Already done: sign-in (email or employee ID), role permissions, employees,
departments, the web app shell and design system, and the mobile app
foundation with local notifications.

## Personal task lists

| Person         | Team    | Checklist                                          |
| -------------- | ------- | -------------------------------------------------- |
| Srujan Mirji   | Website | [`team/SRUJAN_MIRJI.md`](team/SRUJAN_MIRJI.md)     |
| Zeeshan Madras | Website | [`team/ZEESHAN_MADRAS.md`](team/ZEESHAN_MADRAS.md) |
| Pranav Angadi  | Mobile  | [`team/PRANAV_ANGADI.md`](team/PRANAV_ANGADI.md)   |
| Arihant Hangal | Mobile  | [`team/ARIHANT_HANGAL.md`](team/ARIHANT_HANGAL.md) |

## Website team

| Person         | Owns                                                           | Tasks                                  |
| -------------- | -------------------------------------------------------------- | -------------------------------------- |
| Srujan Mirji   | Leave, Timetable, Faculty Workload, Smart Substitution, logins | BE-002, BE-005–008, FE-008–011         |
| Zeeshan Madras | Attendance, Notifications, Documents, Reports                  | BE-004, BE-010–012, FE-007, FE-013–015 |

The academic chain (Timetable → Workload → Leave → Substitution) stays with
one person because each step builds on the last.

### Srujan Mirji (lead)

1. **Timetable** (BE-006, FE-009): subjects, rooms, timetable entries per
   department, clash detection (same faculty, room or class at once),
   faculty availability. Can start now.
2. **Faculty Workload** (BE-007, FE-010): weekly hours from the timetable,
   thresholds set by the Principal, workload chart.
3. **Leave** (BE-005, FE-008): leave types and quotas as HR-editable data,
   balances, apply / approve / reject / cancel, Faculty → HOD → HR.
   _Waits for JCET's leave rules._
4. **Smart Substitution** (BE-008, FE-011): move the existing ranking
   (`frontend/src/lib/academic.ts`) to the API, using real timetables.
5. **Logins for employees and password reset** (BE-002). _Needs an email
   (SMTP) provider._
6. Reviews and merges pull requests; deployment.

### Zeeshan Madras

1. **Notifications** (BE-011, FE-015): notification table and service,
   in-app notification centre with a live unread count (Socket.IO), email
   sending, and the push sender for the mobile app. Can start now.
2. **Attendance** (BE-004, FE-007): records, HR manual entry, corrections with
   approval, monthly view, attendance policy as settings.
   _Waits for JCET's capture method, hours and working days._
3. **Documents** (BE-010, FE-013): upload, verification queue, expiry
   reminders. _Needs Supabase Storage or Cloudinary chosen._
4. **Reports** (BE-012, FE-014): attendance, leave and workload reports with
   filters and CSV/PDF export, as those modules land.

## Mobile team

| Person         | Owns                                           | Tasks                          |
| -------------- | ---------------------------------------------- | ------------------------------ |
| Pranav Angadi  | App shell, login, home, profile, notifications | MB-002, MB-003, MB-007, MB-008 |
| Arihant Hangal | Timetable, attendance and leave screens        | MB-004, MB-005, MB-006         |

### Pranav Angadi

1. **App shell** first: bottom tabs (Home, Timetable, Attendance, Leave,
   Profile — `design/MOBILE_UX.md`) and an API client like
   `frontend/src/services/api.ts`. Arihant's screens plug into this.
2. **Login** (MB-002): sign in with the existing API, tokens in
   `expo-secure-store`, logout. Can start now.
3. **Home and Profile** (MB-003, MB-008): greeting, own record from
   `GET /employees/:id`, phone update. Can start now.
4. **Notifications** (MB-007): EAS project ID, register the device push token
   with the API, in-app list. Uses Zeeshan's Notifications API.

### Arihant Hangal

1. **Timetable** (MB-004): today's classes and the week. Uses Srujan's
   Timetable API.
2. **Leave** (MB-006): apply, status, cancel. Uses Srujan's Leave API.
3. **Attendance** (MB-005): today's status and history. Uses Zeeshan's
   Attendance API.

Screens can be built first against sample data and switched to the API when
each endpoint lands; agree the response shape with the website team first.

## Order and dependencies

```text
Now:  Timetable (Srujan)   Notifications (Zeeshan)
      Mobile shell + login + profile (Pranav)   Mobile timetable screens on sample data (Arihant)
After JCET rules:     Leave (Srujan)   Attendance (Zeeshan)
Then:                 Workload, Smart Substitution (Srujan)   Documents, Reports (Zeeshan)
                      Mobile leave / attendance on the real API (Arihant), push (Pranav)
```

## Working agreement

- One branch per task (`feature/timetable-entries`), a pull request into
  `main`, and a review from one other person before merging.
- A pull request merges only when `npm run typecheck`, `lint`, `test`,
  `build` and `format:check` pass.
- **Database changes** belong to the website team. Announce before adding a
  migration and pull `main` first; two migrations created in parallel conflict.
- **API shapes:** the mobile team asks for what a screen needs; the website
  team adds it to `backend/API_ENDPOINTS.md` before building it.
- New endpoints use `requirePermission` with keys from
  `product/USER_ROLES.md`; important changes are audit-logged
  (`backend/src/common/audit.ts`).
- Tick tasks in the task files in the pull request that finishes them.
