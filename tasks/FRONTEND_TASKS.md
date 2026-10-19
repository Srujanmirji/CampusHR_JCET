# Frontend Tasks

The approved interface is built for every sidebar module except Departments,
Documents and Helpdesk. All screens use sample data; ticked items work against
that data. Items that need the API (create, edit, export, real sign-in) stay open.
Verification and launch steps: `frontend/README.md`.

## FE-001 Project Setup

- [x] Vite + React + TypeScript
- [x] Tailwind
- [x] shadcn/ui
- [x] Router (pages lazy-loaded as separate chunks)
- [x] TanStack Query
- [x] ESLint + Prettier

## FE-002 Design System

- [x] Colors
- [x] Typography
- [x] Buttons
- [x] Inputs
- [x] Cards
- [x] Tables
- [x] Modals
- [x] Badges (all nine status variants)
- [x] Search, select, avatar, metric, tabs, dropdown, tooltip, drawer, toast, skeleton, empty state, page/section headers

## FE-003 App Shell

- [x] Sidebar
- [x] Topbar
- [x] Responsive layout
- [x] Signed-in route guard backed by the auth API
- [x] Sidebar, search and routes follow the user's permissions

## FE-004 Login UI

- [x] Login
- [x] Forgot password help dialog (no recovery service yet)
- [x] Remember me and logout
- [x] Sign-in against the auth API (session restore, return to requested page)
- [x] Change password from the profile menu

## FE-005 Dashboard

- [x] KPI cards
- [x] Charts
- [x] Recent leave
- [x] Quick actions (Approve Leave opens review; others report unavailable)
- [x] Campus updates
- [x] Keyboard and 375/768/1280/1440px responsive verification

## FE-006 Employees

- [x] Employee list (API data, paginated)
- [x] Filters
- [x] Create employee (suggested employee ID)
- [x] Profile
- [x] Edit employee; own phone update; archive
- [x] Departments page: staff strength, add, rename, assign HOD
- [x] CampusHR login on the profile (HR): create with role, change role, turn off/on, set new password

## FE-007 Attendance

- [x] Daily view
- [x] Monthly view
- [x] Corrections


## FE-008 Leave

- [x] Apply (API data: balances, half days, working-day preview)
- [x] Approval list (API data: waiting for me, status filters, search)
- [x] Approval drawer (approval steps, timetable impact, approve/reject with note, cancel own)
- [x] Leave types for HR (quota, half days, carry-over, retire)
- [x] Calendar (month grid on desktop, day list on phones; approved and pending)

## FE-009 Timetable

- [x] Grid
- [x] Faculty filter
- [x] Department filter
- [x] Conflict display (clash message in the add/edit dialog)
- [x] API data; HOD adds, edits and removes classes; subjects and rooms
- [ ] Substitute assignments shown in the grid (with Smart Substitution)

## FE-010 Workload

- [x] Faculty workload table (on API data)
- [x] Workload chart
- [x] Status badges
- [x] Per-faculty breakdown; "My workload" for faculty; bands dialog for the Principal

## FE-011 Substitution

- [x] Affected class list (API data: approved leave × timetable)
- [x] Candidate ranking (API rubric with per-part points; workload limit shown in words)
- [x] Assignment action (confirmation, coverage progress, completion, undo)
- [x] Manual no-substitute decision with academic arrangement
- [x] "Classes you are covering" for faculty
- [ ] Updated timetable view with substitutes

## FE-013 Documents

- [ ] Upload
- [ ] Verification queue
- [ ] Preview

## FE-014 Reports

- [ ] Filters
- [x] Charts
- [ ] Export actions

## FE-015 Notifications

- [x] Notification center
- [x] Realtime unread count
