# CampusHR · Frontend prototype (Phases 1 & 2)

JCET Hubballi UI/UX prototype for HOD review. The full project documentation was
read before implementation; this phase extends its React/Vite architecture and
navy/orange design system.

From the repository root:

```sh
npm install
npm run dev:web
```

Open [the login screen](http://localhost:5173/login). The sample credentials are
prefilled; click **Login**. Any nonempty ID and password work for the preview.
Forgot password opens a preview help dialog. Remember me stores only an `active`
UI flag; otherwise the flag stays in session storage. Logout clears both. No
credentials are stored, and these route redirects provide no authentication.

The existing login, dashboard, shell and design system are retained. Phase 2 adds
leave review, timetable impact, and smart faculty substitution. Other modules
remain placeholders; `/timetable` is not a timetable editor.
No backend process, database, API connection or real authentication is needed.

## Phase 2 demo

1. Login → Dashboard → click **Prof. Asha Patil** in recent leave requests.
2. Review faculty details, leave balance/history and **Academic impact**.
3. **Approve Leave** → **Approve & Find Substitute**.
4. In each affected class, choose **Assign Faculty** → **Confirm Assignment**.
5. Complete both classes, then **View Updated Timetable**.

Initial recommendation scores are Priya 94%, Rahul 86%, Sneha 74%. The visible
35/25/15/15/10 rubric uses mock subject/experience grades, available slots,
department match and workload headroom. Candidates remain sorted by score; an
ineligible assignment is disabled. Existing mock assignments consume workload in
the same Monday–Sunday week and block overlapping classes on the same day.

A class can instead be marked **No substitute required**, with an academic
arrangement recorded. Approval alone does not complete coverage. The success
state distinguishes substitute assignments from manual coverage decisions.
**Approve Without Substitute**, rejection with a decision note, and cancel all
work. Filters support status, department and faculty/ID/leave-type search.

Approvals, rejection notes, selected leave and coverage decisions live in
`sessionStorage` under `campushr-academic-demo-v1`; navigation and reload preserve
them for the current tab session. A malformed saved value recovers to the sample
state. If storage is blocked, the interface explains that changes last while the
page remains open. For a fresh demonstration, close the tab or remove that key in
browser developer tools and reload.

October 12, 2026 is the clearly labelled demo date; the original dashboard charts
remain Phase 1 sample analytics. The dashboard's recent leave rows open Phase 2
requests and its pending count follows review decisions. Stock portrait thumbnails
represent fictional sample faculty, rather than actual JCET employee records.

## Verification

```sh
npm run build --workspace @campushr/web
npm run lint --workspace @campushr/web
npm run check:preview --workspace @campushr/web
```

The last command needs the running frontend and Playwright's browser library. In
Codex it uses the already bundled Playwright runtime and installed Chrome. Outside
Codex, point `PLAYWRIGHT_MODULE` at an installed Playwright module; optionally set
`CHROME_EXECUTABLE` and `PREVIEW_URL`. This is one Node assertion check, with no test
framework or added test dependencies.

The check covers form validation, keyboard login, mock session persistence/logout,
metrics, charts, leave empty/reset state, toast, search, all placeholder routes,
mobile navigation, responsive overflow, browser errors, and local-only requests.
It also runs the full Phase 2 workflow, multi-class completion, assignment
cancellation, workload eligibility, manual coverage, rejection, filters, reload
persistence and malformed-storage recovery.

The prototype has one light workspace theme and a navy sidebar. Reduced motion is
respected. The leave table scrolls horizontally on smaller screens.
See [the visual plan](DESIGN.md) and [asset provenance](public/assets/README.md).
