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

| Module             | What works today                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard          | Key metrics, charts, recent leave requests, quick actions, campus updates                                                                            |
| Employees          | **Live data.** Search, filters, pagination, profile; HR adds, edits and archives; staff update their own phone                                       |
| Departments        | **Live data.** Staff strength per department; HR adds departments and assigns HODs                                                                   |
| Attendance         | Daily metrics, monthly trend, department view, filterable log                                                                                        |
| Leave              | API data: my balances and requests, apply, approvals waiting for me, approval steps and timetable impact, month calendar, leave types for HR         |
| Smart Substitution | API data: classes affected by approved leave, ranked free faculty, assign or no-substitute, undo; faculty see classes they cover                     |
| Timetable          | **Live data.** Weekly grid by department, semester and section; HODs add, edit and remove classes with clash checks; faculty see their own timetable |
| Faculty Workload   | API data: weekly theory/lab hours, status against each designation's band, hours chart, per-faculty classes; Principal edits bands                   |
| Reports            | Report catalogue, charts and report previews                                                                                                         |
| Notifications      | Activity feed by category, mark all read                                                                                                             |
| Settings           | Institutional rules (saved for the session); reset workflow data                                                                                     |

Create, edit, export and print actions show "isn't available yet" until the API
supports them. Documents and Helpdesk pages are not built yet. Other modules
still show sample people until their APIs exist.

## Smart Substitution

Open **Smart Substitution** as an HOD (or Super Admin) after leave is approved.

1. Pick the approved leave; each class it affects is listed.
2. In each class, choose **Assign Faculty** → **Confirm Assignment**, or
   **No substitute required** with the academic arrangement.
3. **Undo** puts a class back in need of cover.

The API ranks faculty who are free in the slot and not on leave, out of 100:
subject 35, availability 25, department 15, workload headroom 15, experience 10. Anyone the class would push over their weekly maximum is shown with the
reason and cannot be chosen. Faculty see the classes they cover.

Notifications are still demo data in `sessionStorage`
(`campushr-academic-demo-v1`) until the Notifications service exists;
**Settings → Reset data** restores them.

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
