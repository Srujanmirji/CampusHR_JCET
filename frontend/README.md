# CampusHR · Web app

The CampusHR web interface for JCET Hubballi, approved by the HOD. Sign-in uses
the API; the module screens still use built-in sample data until their API
endpoints exist.

```sh
npm install
npm run dev:web
```

Start the API too (`npm run dev:api`, see `SETUP.md`), then open
[the login screen](http://localhost:5173/login) and sign in with an account
created by `npm run db:seed`.

- The session lives in an HttpOnly cookie set by the API; nothing is stored in
  browser storage. On load the app restores it with `POST /auth/refresh`.
- **Remember me** keeps you signed in for 7 days; unticked, closing the browser
  ends the session (useful on shared office and lab PCs).
- Visiting a page while signed out returns you to it after signing in.
- `src/services/api.ts` is the shared API client (`VITE_API_URL`, credentials,
  error messages); `src/features/auth/` holds the session provider and calls.

## Modules

| Module             | What works today                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Dashboard          | Key metrics, charts, recent leave requests, quick actions, campus updates                                            |
| Employees          | **Live data.** Search, filters, pagination, profile; HR adds, edits and archives; staff update their own phone       |
| Departments        | **Live data.** Staff strength per department; HR adds departments and assigns HODs                                   |
| Attendance         | Daily metrics, monthly trend, department view, filterable log                                                        |
| Leave              | Searchable/filterable request table; review drawer with balance, history, academic impact; approve, reject with note |
| Smart Substitution | Ranked candidates per affected class, assignment, manual coverage, updated timetable                                 |
| Timetable          | Weekly grid with department, semester, section and faculty filters                                                   |
| Faculty Workload   | Weekly load table with status filters and per-faculty breakdown                                                      |
| Reports            | Report catalogue, charts and report previews                                                                         |
| Notifications      | Activity feed by category, mark all read                                                                             |
| Settings           | Institutional rules (saved for the session); reset workflow data                                                     |

Create, edit, export and print actions show "isn't available yet" until the API
supports them. Documents and Helpdesk pages are not built yet. Other modules
still show sample people until their APIs exist.

## Leave → substitution workflow

1. Dashboard → click **Prof. Asha Patil** in recent leave requests.
2. Review faculty details, leave balance/history and **Academic impact**.
3. **Approve Leave** → **Approve & Find Substitute**.
4. In each affected class, choose **Assign Faculty** → **Confirm Assignment**.
5. Complete both classes, then **View Updated Timetable**.

Candidates are ranked by a visible 35/25/15/15/10 rubric: subject, experience,
free slot, department and workload headroom (`src/lib/academic.ts`). Faculty who
are busy in that slot or would exceed their weekly limit cannot be assigned.
Assignments consume workload in the same Monday–Sunday week. A class can instead
be marked **No substitute required** with an academic arrangement.

Decisions are kept in `sessionStorage` under `campushr-academic-demo-v1`, so they
survive navigation and reload in the current tab. A malformed saved value falls
back to the starting data. **Settings → Reset data** restores the starting state.

The sample data uses 12 October 2026 as today. Portrait thumbnails are stock
photos of fictional faculty, not JCET staff.

## Verification

```sh
npm run build --workspace @campushr/web
npm run lint --workspace @campushr/web
npm run check:preview --workspace @campushr/web
npm run check:phase3 --workspace @campushr/web
```

The two checks need the running dev server and Playwright. They replace the
auth API with a fake one (`checks/mock-api.js`), so the backend need not run. Set
`PLAYWRIGHT_MODULE` to an installed Playwright module, and optionally
`CHROME_EXECUTABLE` and `PREVIEW_URL`. They cover form validation, keyboard login,
session persistence and logout, metrics, charts, search, every module route,
mobile navigation, responsive overflow, browser errors, local-only requests, and
the full leave → substitution workflow including rejection, cancellation, manual
coverage, reload persistence and malformed-storage recovery.

Reduced motion is respected. See [the visual plan](DESIGN.md) and
[asset provenance](public/assets/README.md).
