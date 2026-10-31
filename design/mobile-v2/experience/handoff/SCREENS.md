# Screen contracts

All 20 unique frozen Faculty/HOD screens. The iOS and Android packages each adapt the same 12 requested destinations; they inherit the contracts below. Prototype links may expose a supporting confirmation/detail view without expanding the exported screen set. Native navigation and availability bindings are in PLATFORMS.md.

## Login

- **Purpose:** Access the institutional account
- **Primary action:** Sign in
- **Secondary actions:** Remember me; password visibility; Forgot password; Institutional SSO
- **Components:** Identity header, labeled login/password fields, checkbox, buttons, help sheet
- **States:** Invalid credentials; account inactive; busy; SSO unavailable; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Home; Password Help; institution SSO if configured

## Faculty Home

- **Purpose:** Orient faculty around the next class
- **Primary action:** Open next class
- **Secondary actions:** Bell; profile; schedule; root tabs
- **Components:** Greeting/date, next-class hero, editorial summary, timeline, tab bar
- **States:** No next class; no classes; partial summaries; refresh; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Timetable; Notifications; Profile

## Timetable Today

- **Purpose:** Read dated teaching and substitution duties
- **Primary action:** Select Today or Week
- **Secondary actions:** Open class; root tabs
- **Components:** Navigation, segmented control, schedule rows, academic rail
- **States:** No classes; changed class; substitution; fetch failure; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Timetable Week; class context

## Timetable Week

- **Purpose:** Read one day at a time on phone
- **Primary action:** Choose day
- **Secondary actions:** Return Today; open class
- **Components:** Day selector, selected date, mobile schedule list
- **States:** Weekend empty; selected-day load/error; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Timetable Today; selected day

## Attendance

- **Purpose:** Record daily attendance and review history
- **Primary action:** Check In or Check Out according to server state
- **Secondary actions:** Review month and recent activity
- **Components:** Status summary, contextual action, monthly distribution, activity rows
- **States:** Not checked in; checked in; checked out; permission denied; write uncertainty; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Same screen after confirmed punch; root tabs

## Leave Management

- **Purpose:** Read balances and personal requests
- **Primary action:** Apply for Leave
- **Secondary actions:** Filter requests; open request
- **Components:** Balance rows, primary button, filter control, native list
- **States:** No requests; balances unavailable; pending/approved/rejected; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Apply Leave; Leave Detail

## Apply Leave

- **Purpose:** Submit a dated leave request with impact context
- **Primary action:** Submit Request
- **Secondary actions:** Choose type/dates; half-day; attachment; cancel
- **Components:** Full-screen form, date selector, toggle, reason, attachment row, impact group
- **States:** Invalid dates; insufficient balance; pending; upload error; preserved draft; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Leave Detail on confirmed creation; Leave on cancel

## Leave Detail

- **Purpose:** Understand request progress and class coverage
- **Primary action:** Read status and timeline
- **Secondary actions:** Back to requests
- **Components:** Status, reason, approval timeline, impact and coverage rows
- **States:** Pending recommendation; awaiting final approval; approved; rejected; changed coverage; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Leave Management

## Notifications

- **Purpose:** Read actionable academic updates
- **Primary action:** Open notification destination
- **Secondary actions:** Filter; mark all read; back
- **Components:** Category tabs, subtle unread row, semantic icon, timestamp
- **States:** All read; empty category; broken destination; read update failure; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Leave Detail; Timetable; substitution context; previous screen

## Faculty Profile

- **Purpose:** Access faculty record and preferences
- **Primary action:** Choose profile section
- **Secondary actions:** Settings; support; sign out
- **Components:** Editorial avatar header, compact stats, grouped profile rows
- **States:** Unavailable field; partial stats; expired session; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Existing profile sections; Settings; Password Help; Login on sign out

## Settings

- **Purpose:** Adjust existing preferences and obtain support
- **Primary action:** Choose setting
- **Secondary actions:** Back; account/security/support links
- **Components:** Grouped rows, toggles, accessibility rows
- **States:** Device-managed preference; permission denied; unsupported setting; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Profile; Password Help; platform settings when supported

## Password Help

- **Purpose:** Explain centrally managed account assistance
- **Primary action:** Done
- **Secondary actions:** HR Desk; Email Support
- **Components:** Native content-sized sheet, text, support rows, close
- **States:** Support contacts unconfigured; external action confirmation; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Restore the invoking screen and focus

## HOD Home

- **Purpose:** Prioritize department decisions
- **Primary action:** Review pending approvals
- **Secondary actions:** Coverage; workload; bell; role tabs
- **Components:** Greeting, two decision rows, compact presence/alerts, continuity progress
- **States:** No pending work; partial counts; stale departmental data; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Approvals; Academic Impact; Workload; Notifications

## Approvals

- **Purpose:** Review department leave queue
- **Primary action:** Review request
- **Secondary actions:** Pending/Approved/Rejected; role tabs
- **Components:** Status segment, applicant/request list rows
- **States:** No requests in selected status; permissions changed; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Leave Review; HOD roots

## Leave Review

- **Purpose:** Make a decision with balance/history/academic context
- **Primary action:** Recommend approval (requested design fixture says Approve & Find Cover with authority qualifier)
- **Secondary actions:** Reject with reason; inspect impact; back
- **Components:** Applicant, leave detail, history, balance, schedule, sticky decisions, confirmation sheet
- **States:** Pending; recommendation saved; final approval pending; rejection reason invalid; conflict; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Approvals; Academic Impact; cover only after final approval

## Academic Impact

- **Purpose:** Inspect each class affected by approved or pending leave
- **Primary action:** Find cover when authorized
- **Secondary actions:** Back to review
- **Components:** Schedule rows, coverage labels, readiness explanation
- **States:** Pending final approval; uncovered; partly covered; fully covered; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Smart Coverage on approved fixture; Leave Review

## Smart Coverage

- **Purpose:** Choose available, suitable covering faculty
- **Primary action:** Assign available faculty
- **Secondary actions:** Back; inspect recommendation reasons
- **Components:** Class context, recommendation rows, availability/status, factual match text
- **States:** Unavailable disabled; capacity changed; no candidates; fetch error; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Assignment Confirmation; Academic Impact

## Assignment Confirmation

- **Purpose:** Protect against assigning the wrong class or person
- **Primary action:** Confirm assignment
- **Secondary actions:** Cancel/back
- **Components:** Faculty context, class/time/location, notification expectation, sticky action
- **States:** Busy; availability conflict; workload conflict; lost response; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Coverage Success after saved result; Smart Coverage on cancel

## Coverage Success

- **Purpose:** Confirm saved coverage and expose remaining work
- **Primary action:** Continue to next class
- **Secondary actions:** View academic impact
- **Components:** Success symbol, assigned class context, delivery status, coverage progress
- **States:** Assignment saved; notification pending/sent; no remaining classes; initial loading; recoverable error; offline/cached context
- **Navigation destination:** Smart Coverage for next uncovered class; Academic Impact

## HOD Workload View

- **Purpose:** Review factual departmental hours and capacity
- **Primary action:** Review capacity alerts
- **Secondary actions:** Role root tabs
- **Components:** Department heading, compact alert summary, faculty workload rows
- **States:** No capacity alerts; missing hours; partial/stale data; initial loading; recoverable error; offline/cached context
- **Navigation destination:** HOD root destinations; no new faculty-management feature

