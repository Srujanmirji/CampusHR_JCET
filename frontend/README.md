# CampusHR · Web app

The CampusHR web interface for JCET Hubballi, approved by the HOD. It runs on
built-in sample data with demo sign-in until the API serves real data.

```sh
npm install
npm run dev:web
```

Open [the login screen](http://localhost:5173/login). The demo credentials are
prefilled; click **Login**. Sign-in is not yet checked against a server: any
nonempty ID and password work, and the route guard is a UI convenience, not
security. **Remember me** keeps the session flag in local storage; otherwise it
lives in session storage. Logout clears both.

## Modules

| Module             | What works today                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Dashboard          | Key metrics, charts, recent leave requests, quick actions, campus updates                                            |
| Employees          | Directory with search and filters, profile drawer                                                                    |
| Attendance         | Daily metrics, monthly trend, department view, filterable log                                                        |
| Leave              | Searchable/filterable request table; review drawer with balance, history, academic impact; approve, reject with note |
| Smart Substitution | Ranked candidates per affected class, assignment, manual coverage, updated timetable                                 |
| Timetable          | Weekly grid with department, semester, section and faculty filters                                                   |
| Faculty Workload   | Weekly load table with status filters and per-faculty breakdown                                                      |
| Reports            | Report catalogue, charts and report previews                                                                         |
| Notifications      | Activity feed by category, mark all read                                                                             |
| Settings           | Institutional rules (saved for the session); reset workflow data                                                     |

Create, edit, export and print actions show "isn't available yet" until the API
supports them. Departments, Documents and Helpdesk pages are not built yet.

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

The two checks need the running dev server and Playwright. Set
`PLAYWRIGHT_MODULE` to an installed Playwright module, and optionally
`CHROME_EXECUTABLE` and `PREVIEW_URL`. They cover form validation, keyboard login,
session persistence and logout, metrics, charts, search, every module route,
mobile navigation, responsive overflow, browser errors, local-only requests, and
the full leave → substitution workflow including rejection, cancellation, manual
coverage, reload persistence and malformed-storage recovery.

Reduced motion is respected. See [the visual plan](DESIGN.md) and
[asset provenance](public/assets/README.md).
