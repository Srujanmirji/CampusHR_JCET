/* Faculty-only design prototype. All records are synthetic and remain in memory. */
const screens = [
  [
    'login',
    'Login',
    'Core',
    'An open institutional sign-in, with no giant enclosing form card.',
  ],
  [
    'home',
    'Faculty Home',
    'Core',
    'Next class first; an editorial summary and a continuous schedule rail.',
  ],
  [
    'today',
    'Timetable · Today',
    'Core',
    'Readable class detail, period and location, grouped along a time rail.',
  ],
  [
    'week',
    'Timetable · Week',
    'Core',
    'Six touch-friendly day choices; the selected day updates the actual sample schedule.',
  ],
  [
    'attendance',
    'Attendance',
    'Core',
    'Daily check-in utility, a factual monthly distribution and dated activity.',
  ],
  [
    'leave',
    'Leave Management',
    'Secondary',
    'Unboxed balance rows and a filterable personal request list.',
  ],
  [
    'apply',
    'Apply Leave',
    'Secondary',
    'A full-screen form with an explicit academic-impact preview.',
  ],
  [
    'detail',
    'Leave Detail',
    'Secondary',
    'Status, reason, approval history, impact and coverage in one readable narrative.',
  ],
  [
    'notifications',
    'Notifications',
    'Secondary',
    'A quiet feed with subtle unread tint, meaningful symbols and category filters.',
  ],
  [
    'profile',
    'Faculty Profile',
    'Secondary',
    'Editorial identity, compact factual statistics and grouped destinations.',
  ],
  [
    'settings',
    'Settings',
    'Secondary',
    'Accessible grouped preferences, account controls and support.',
  ],
  [
    'password',
    'Password Help',
    'Secondary',
    'A native-style support sheet, with centrally managed account guidance.',
  ],
];
const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ],
  );
const icon = (name, small = false) =>
  `<span aria-hidden="true" class="icon${small ? ' small' : ''}">${name}</span>`;
const link = (screen, content, cls = '', label = '') =>
  `<a href="#${screen}" class="${cls}"${label ? ` aria-label="${esc(label)}"` : ''}>${content}</a>`;
const action = (name, content, cls = '', attrs = '') =>
  `<button type="button" data-action="${name}" class="${cls}" ${attrs}>${content}</button>`;
const state = {
  screen: 'login',
  day: 2,
  leaveFilter: 'All',
  notificationFilter: 'All',
  checkedOut: false,
  selectedRequest: 0,
  settings: { alerts: true, reduceMotion: false, contrast: false },
  apply: {
    type: 'Casual Leave',
    start: '2026-10-29',
    end: '2026-10-29',
    half: false,
    period: 'First half',
    reason: '',
    file: '',
  },
  message: '',
};
const classes = [
  {
    time: '09:00',
    end: '10:00',
    code: 'BCS504',
    subject: 'Computer Networks',
    section: 'Sem 5B',
    room: 'Room 204',
    period: 'Period 1',
    type: 'Theory',
  },
  {
    time: '11:15',
    end: '12:15',
    code: 'BCS501',
    subject: 'Database Management Systems',
    section: 'Sem 5A',
    room: 'Room 302',
    period: 'Period 3',
    type: 'Theory',
  },
  {
    time: '16:00',
    end: '17:00',
    code: 'BCS508',
    subject: 'Mini Project & Mentorship',
    section: 'Sem 5A',
    room: 'Project Studio',
    period: 'Period 7',
    type: 'Mentorship',
  },
];
const weekly = [
  [
    classes[0],
    { ...classes[1], time: '14:00', end: '15:00', period: 'Period 5' },
  ],
  [
    { ...classes[0], time: '10:00', end: '11:00', period: 'Period 2' },
    classes[2],
  ],
  classes,
  [classes[1], classes[2]],
  [
    classes[0],
    {
      ...classes[1],
      time: '14:00',
      end: '16:00',
      period: 'Periods 5–6',
      type: 'Lab',
    },
  ],
  [{ ...classes[2], time: '09:00', end: '11:00', period: 'Periods 1–2' }],
];
const dayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const requests = [
  {
    type: 'Casual Leave',
    date: '22 Oct 2026',
    start: '2026-10-22',
    status: 'Pending',
    reason: 'Attending an academic workshop.',
    submitted: '20 Oct 2026',
    days: '1 day',
  },
  {
    type: 'Duty Leave',
    date: '15 Oct 2026',
    start: '2026-10-15',
    status: 'Approved',
    reason: 'Presenting a paper at a faculty development programme.',
    submitted: '12 Oct 2026',
    days: '1 day',
  },
  {
    type: 'Restricted Holiday',
    date: '8 Oct 2026',
    start: '2026-10-08',
    status: 'Rejected',
    reason: 'Personal observance.',
    submitted: '5 Oct 2026',
    days: '1 day',
  },
];
const notifications = [
  {
    kind: 'Substitution',
    title: 'Substitute assigned',
    body: 'You have been assigned BCS501.',
    time: '10 min ago',
    icon: 'swap_horiz',
    unread: true,
  },
  {
    kind: 'Leave',
    title: 'Leave approved',
    body: 'Your Casual Leave request was approved.',
    time: '1 hour ago',
    icon: 'event_available',
    unread: true,
  },
  {
    kind: 'Timetable',
    title: 'Timetable updated',
    body: 'CSE 5A timetable changed.',
    time: 'Yesterday',
    icon: 'calendar_month',
    unread: false,
  },
];
const navItems = [
  ['home', 'home', 'Home'],
  ['today', 'calendar_month', 'Timetable'],
  ['attendance', 'event_available', 'Attendance'],
  ['leave', 'event_busy', 'Leave'],
  ['profile', 'account_circle', 'Profile'],
];
function tabs(active) {
  return `<nav class="tabs" aria-label="Faculty destinations">${navItems.map(([screen, glyph, title]) => link(screen, `${icon(glyph)}<span class="tab-label">${title}</span>`, 'tab', title).replace('class="tab"', `class="tab"${screen === active || (active === 'week' && screen === 'today') || (active === 'detail' && screen === 'leave') ? ' aria-current="page"' : ''}`)).join('')}</nav>`;
}
function bar(title = '', back = '', root = false, avatar = false) {
  return `<header class="navbar${root ? ' root' : ''}"><div class="nav-side">${back ? link(back, icon('arrow_back'), 'icon-button', 'Back') : root ? '<span class="institution-mini"><img src="assets/jcet-logo.png" alt="">JCET · CampusHR</span>' : '<span class="icon-button" aria-hidden="true"></span>'}</div>${title ? `<div class="nav-title">${title}</div>` : ''}<div class="nav-side right">${root ? link('notifications', `${icon('notifications')}<span class="unread-dot"></span>`, 'icon-button', `Notifications, ${notifications.filter((n) => n.unread).length} unread`) : '<span class="icon-button" aria-hidden="true"></span>'}${avatar ? link('profile', '<span class="avatar">AP</span>', 'avatar-link', 'Open faculty profile') : ''}</div></header>`;
}
function shell(content, active = '', options = {}) {
  return `<section class="screen" aria-label="${esc(options.label || screens.find((row) => row[0] === state.screen)?.[1] || 'Faculty screen')}">${options.bar || ''}<div class="screen-scroll${options.plain ? ' plain' : ''}">${content}</div>${options.footer || ''}${active ? tabs(active) : ''}</section>`;
}
function status(value) {
  const glyph =
    { Pending: 'schedule', Approved: 'check_circle', Rejected: 'close' }[
      value
    ] || 'info';
  return `<span class="status ${value.toLowerCase()}">${icon(glyph, true)}${value}</span>`;
}
function schedule(rows, detailed = false) {
  return `<div class="schedule-list">${rows.map((row) => `<article class="schedule-row"><div class="schedule-time">${row.time}${detailed ? `<br><span class="caption">${row.end}</span>` : ''}</div><div class="schedule-main">${detailed ? `<div class="schedule-meta"><span class="schedule-pill">${row.code}</span><span>${row.period}</span></div>` : ''}<h3>${row.subject}</h3>${!detailed ? `<div class="secondary">${row.code}</div>` : ''}<div class="secondary">${row.section} · ${row.room}</div>${detailed ? `<div class="schedule-meta">${icon('school', true)}${row.type}</div>` : ''}</div></article>`).join('')}</div>`;
}
function row(label, glyph, screen = '', sub = '', extra = '') {
  const inside = `${icon(glyph)}<span class="row-copy">${label}${sub ? `<span class="secondary">${sub}</span>` : ''}</span>${extra || icon('chevron_right')}`;
  return screen
    ? link(screen, inside, 'profile-row')
    : action(
        'out-of-scope',
        inside,
        'profile-row',
        `data-note="${esc(label)}"`,
      );
}
function login() {
  return `<section class="screen" aria-label="Login"><div class="login-content"><div class="login-brand"><img src="assets/jcet-logo.png" alt="JCET institutional identity"><div><div class="wordmark">Campus<span class="hr">HR</span></div><div class="login-institution">Jain College of Engineering<br>& Technology, Hubballi</div></div></div><h1>Welcome back</h1><p class="secondary login-intro">Your academic day, in one place.</p><form id="login-form"><div class="field"><label for="identifier">Employee ID / College Email</label><input id="identifier" name="identifier" placeholder="JCET-CSE-021" autocomplete="username" required></div><div class="field"><label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required>${action('visibility', icon('visibility'), 'icon-button', 'aria-label="Show password" aria-pressed="false"')}</div></div><div class="remember-row"><label class="checkbox-label"><input type="checkbox" name="remember">Remember me</label>${link('password', 'Forgot password?', 'text-button')}</div><button class="button full" type="submit">Sign in ${icon('arrow_forward', true)}</button></form><div class="login-divider">or</div>${action('sso', `${icon('business', true)}Institutional SSO`, 'button secondary-button full')}<p class="login-footer">Secure access for JCET faculty and staff.</p></div></section>`;
}
function home() {
  return shell(
    `<div class="page-heading"><h1 class="greeting"><span>Good morning,</span>Prof. Asha Patil <span class="wave">👋</span></h1><p class="secondary">Wednesday, 21 October 2026</p></div><section class="next-class" aria-labelledby="next-title"><div class="eyebrow">Next class ${icon('calendar_month', true)}</div><span class="subject-code">BCS501</span><h2 id="next-title">Database Management Systems</h2><div class="hero-context"><span class="time">11:15 AM</span><span class="room">${icon('location_on', true)}Room 302</span></div><div class="hero-foot"><span>CSE 5A</span><span class="countdown">Starts in 42 min</span></div></section><section class="summary" aria-label="Faculty summary"><div class="summary-values"><div><strong class="stat-value">3</strong><span class="stat-label">Classes today</span></div><div><strong class="stat-value">96.4%</strong><span class="stat-label">Attendance</span></div><div><strong class="stat-value">8.5</strong><span class="stat-label">CL balance</span></div></div><div class="workload-summary"><span>Weekly workload</span><strong>16 / 18 hours</strong></div></section><div class="section-heading"><h2>Today’s Schedule</h2>${link('today', 'View all', 'text-button')}</div><section class="list-section">${schedule(classes)}</section>`,
    'home',
    { bar: bar('', '', true, true) },
  );
}
function timetable(week) {
  const day = week ? state.day : 2;
  const rows = weekly[day];
  return shell(
    `<div class="page-heading"><h1>Timetable</h1><p class="secondary">Even semester · 2026</p></div><div class="segment" aria-label="Timetable scope">${['Today', 'Week'].map((label) => action(label === 'Today' ? 'today' : 'week', label, '', `aria-pressed="${week === (label === 'Week')}"`)).join('')}</div>${week ? `<div class="date-line"><span class="date-copy">19–24 October 2026</span>${action('week-reset', 'Today', 'text-button')}</div><div class="day-selector" aria-label="Days of the academic week">${dayNames.map((name, i) => action('day', `<span>${name.slice(0, 3)}</span><strong>${19 + i}</strong>`, '', `id="day-${i}" data-day="${i}" aria-label="${name}, ${19 + i} October" aria-pressed="${state.day === i}"`)).join('')}</div>` : `<div class="date-line"><span class="date-copy">Wednesday, 21 October</span>${icon('calendar_month', true)}</div>`}<div id="day-schedule" aria-live="polite"><div class="section-heading"><h2>${week ? dayNames[day] : 'Today'}</h2><span class="caption">${rows.length} classes</span></div><section class="list-section">${schedule(rows, true)}</section></div>`,
    'today',
    { bar: bar('', '', true) },
  );
}
function attendance() {
  return shell(
    `<div class="page-heading"><h1>Attendance</h1><p class="secondary">Wednesday, 21 October 2026</p></div><section class="attendance-state"><div class="state-top"><span class="success-symbol">${icon('check')}</span><h3>${state.checkedOut ? 'Checked out' : 'Checked in'}</h3></div><div class="state-time">${state.checkedOut ? '05:08 PM' : '09:15 AM'}</div><div class="location-copy">${icon('location_on', true)}CSE Block · Main Gate</div></section>${action('attendance', state.checkedOut ? 'Check In' : 'Check Out', 'button full')}<section class="attendance-month"><div class="month-head"><h2>Monthly attendance</h2><span class="caption">September</span></div><div class="attendance-percentage">96.4%</div><p class="secondary">Your attendance in September</p><div class="attendance-bar" aria-hidden="true"><span class="present"></span><span class="leave"></span><span class="late"></span></div><div class="attendance-legend"><span><i class="dot"></i>22 Present</span><span><i class="dot leave"></i>1 Leave</span><span><i class="dot late"></i>1 Late</span></div></section><div class="section-heading"><h2>Recent activity</h2></div><div class="activity-label">Today</div><div class="activity-row"><time>09:15</time><span>Checked in</span></div><div class="activity-label">Yesterday · 20 October</div><div class="activity-row"><time>17:08</time><span>Checked out</span></div><div class="activity-row"><time>13:05</time><span>Lunch break</span></div><div class="activity-row"><time>09:15</time><span>Checked in</span></div>`,
    'attendance',
    { bar: bar('', '', true) },
  );
}
function leave() {
  const balances = [
    ['Casual Leave', 8.5, 15],
    ['Duty Leave', 8, 10],
    ['Restricted Holiday', 1, 2],
    ['Earned Leave', 12, 20],
  ];
  const rows = requests
    .map((r, i) => ({ ...r, id: i }))
    .filter(
      (r) => state.leaveFilter === 'All' || r.status === state.leaveFilter,
    );
  return shell(
    `<div class="page-heading"><h1>Leave</h1><p class="secondary">Your balance and requests · 2026</p></div><section class="balance-list" aria-label="Available leave balances">${balances.map(([name, remaining, total]) => `<div class="balance-row"><h3>${name}</h3><div class="balance-value">${remaining} <small>/ ${total}</small></div><div class="balance-progress" role="meter" aria-label="${name}, days remaining" aria-valuenow="${remaining}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${(remaining / total) * 100}%"></span></div></div>`).join('')}</section>${link('apply', `${icon('add', true)}Apply for Leave`, 'button full')}<div class="section-heading"><h2>My Requests</h2></div><div class="filters" aria-label="Filter leave requests">${['All', 'Pending', 'Approved', 'Rejected'].map((filter) => action('leave-filter', filter, '', `id="leave-filter-${filter}" data-filter="${filter}" aria-pressed="${state.leaveFilter === filter}"`)).join('')}</div><div class="list-section" id="request-list" aria-live="polite">${rows.length ? rows.map((r) => `<a href="#detail" data-request="${r.id}" class="request-row"><div class="request-top"><h3>${r.type}</h3>${status(r.status)}</div><div class="secondary">${r.date} · ${r.days}</div><span class="caption">${r.reason}</span></a>`).join('') : '<div class="empty-state"><h3>No matching requests</h3><p class="secondary">Choose another filter to view your leave.</p></div>'}</div>`,
    'leave',
    { bar: bar('', '', true) },
  );
}
function affectedClasses() {
  const a = state.apply;
  if (!a.start || !a.end || a.start > a.end) return [];
  const from = new Date(`${a.start}T00:00:00Z`),
    end = new Date(`${a.end}T00:00:00Z`);
  const rows = [];
  for (
    let date = new Date(from), count = 0;
    date <= end && count < 366;
    date.setUTCDate(date.getUTCDate() + 1), count++
  ) {
    const i = (date.getUTCDay() + 6) % 7;
    for (const row of weekly[i] || []) {
      if (
        a.half &&
        (a.period === 'First half' ? row.time >= '13:00' : row.time < '13:00')
      )
        continue;
      rows.push(row);
    }
  }
  return rows;
}
function impact() {
  const rows = affectedClasses();
  return `<h3>Academic Impact</h3><p class="secondary">${rows.length} scheduled ${rows.length === 1 ? 'class' : 'classes'} affected.</p>${rows
    .slice(0, 4)
    .map(
      (row) =>
        `<div class="impact-row"><strong>${row.code}</strong><span>${row.time === '16:00' ? '4:00 PM' : row.time === '11:15' ? '11:15 AM' : row.time}</span></div>`,
    )
    .join(
      '',
    )}${rows.length > 4 ? `<p class="caption">And ${rows.length - 4} more scheduled classes.</p>` : ''}`;
}
function apply() {
  const a = state.apply;
  return shell(
    `<form id="leave-form" class="form-content"><div class="field"><label for="leave-type">Leave type</label><select id="leave-type" name="type">${['Casual Leave', 'Duty Leave', 'Restricted Holiday', 'Earned Leave'].map((type) => `<option${type === a.type ? ' selected' : ''}>${type}</option>`).join('')}</select></div><div class="date-fields"><div class="field"><label for="start-date">Start date</label><input type="date" id="start-date" name="start" value="${a.start}" required></div><div class="field"><label for="end-date">End date</label><input type="date" id="end-date" name="end" value="${a.end}" min="${a.start}" ${a.half ? 'readonly' : ''} required></div></div><div class="switch-row"><div><div class="field-label">Half-day leave</div><p class="secondary">Only part of the working day</p></div>${action('half', '<span class="switch-track"><span class="switch-thumb"></span></span>', 'switch', `id="half-day-toggle" role="switch" aria-label="Half-day leave" aria-checked="${a.half}"`)}</div>${a.half ? `<div class="field"><label for="half-period">Part of day</label><select id="half-period" name="period"><option${a.period === 'First half' ? ' selected' : ''}>First half</option><option${a.period === 'Second half' ? ' selected' : ''}>Second half</option></select></div>` : ''}<div class="field"><label for="reason">Reason</label><textarea id="reason" name="reason" placeholder="Explain the reason for your leave" minlength="3" maxlength="1000" required>${esc(a.reason)}</textarea></div><div class="field"><label class="field-label" for="attachment">Attachment <span class="caption">(optional)</span></label><label class="attachment-label">${icon('attach_file', true)}<span id="attachment-name">${esc(a.file || 'Choose a document')}</span><input id="attachment" name="attachment" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label><span class="caption">PDF or image · up to 10 MB</span></div><section class="impact" id="academic-impact" aria-live="polite">${impact()}</section><div id="apply-error" class="field-error" role="alert"></div></form>`,
    '',
    {
      bar: bar('Apply Leave', 'leave'),
      footer:
        '<div class="form-action"><button type="submit" form="leave-form" class="button full">Submit Request</button></div>',
    },
  );
}
function detail() {
  const r = requests[state.selectedRequest] || requests[0],
    approved = r.status === 'Approved',
    rejected = r.status === 'Rejected';
  return shell(
    `<section class="detail-summary">${status(r.status)}<h2>${r.type}</h2><p>${r.date} · ${r.days}</p></section><section class="detail-block"><h2>Reason</h2><p>${esc(r.reason)}</p></section><section class="detail-block"><h2>Approval timeline</h2><div class="approval-timeline"><div class="approval-step">${icon('check_circle')}<div>Request submitted<p class="secondary">${r.submitted}</p></div></div><div class="approval-step${rejected ? ' rejected' : ''}">${icon(rejected ? 'close' : 'check_circle')}<div>${rejected ? 'Request rejected' : 'HOD recommendation sent'}<p class="secondary">${rejected ? 'Request was not approved.' : 'Department review completed.'}</p></div></div>${!rejected ? `<div class="approval-step${approved ? '' : ' pending'}">${icon(approved ? 'check_circle' : 'schedule')}<div>${approved ? 'Final approval received' : 'Awaiting final approval'}<p class="secondary">${approved ? 'Your leave is approved.' : 'No further action needed from you.'}</p></div></div>` : ''}</div></section><section class="detail-block"><h2>Academic Impact</h2><p class="secondary">2 scheduled classes affected.</p><div class="impact-row"><strong>BCS501</strong><span>11:15 AM</span></div><div class="impact-row"><strong>BCS508</strong><span>4:00 PM</span></div></section><section class="detail-block"><h2>Coverage</h2>${approved ? '<div class="coverage-row"><span><strong>Prof. Priya Kulkarni</strong><span class="secondary">2 of 2 classes covered</span></span><span class="status approved">Covered</span></div>' : `<p class="secondary">${rejected ? 'No substitution required.' : 'No substitute assigned yet. Coverage follows leave approval.'}</p>`}</section>`,
    'leave',
    { bar: bar('Leave Detail', 'leave') },
  );
}
function inbox() {
  const rows = notifications.filter(
    (n) =>
      state.notificationFilter === 'All' || n.kind === state.notificationFilter,
  );
  return shell(
    `<div class="page-heading"><h1>Notifications</h1><p class="secondary">Your latest academic updates</p></div><div class="filters" aria-label="Notification categories">${['All', 'Leave', 'Timetable', 'Substitution'].map((filter) => action('notification-filter', filter, '', `id="notification-filter-${filter}" data-filter="${filter}" aria-pressed="${state.notificationFilter === filter}"`)).join('')}</div><div class="section-heading"><h2>Latest</h2>${action('read-all', 'Mark all read', 'text-button')}</div><section class="feed" aria-live="polite">${rows.map((n) => `<article class="feed-row${n.unread ? ' unread' : ''}" aria-label="${esc((n.unread ? 'Unread: ' : '') + n.title)}">${icon(n.icon)}<div class="feed-copy"><h3>${n.title}</h3><p class="secondary">${n.body}</p><span class="caption">${n.time}</span></div>${n.unread ? '<span class="read-marker" aria-hidden="true"></span>' : ''}</article>`).join('')}</section>`,
    '',
    { bar: bar('', 'home') },
  );
}
function profile() {
  return shell(
    `<section class="profile-header"><span class="avatar large" aria-hidden="true">AP</span><h1>Prof. Asha Patil</h1><p>Assistant Professor</p><p class="secondary">Computer Science & Engineering</p><div class="profile-code">JCET-CSE-021</div></section><section class="profile-stats" aria-label="Faculty statistics"><div><strong>6 years</strong><span class="caption">Experience</span></div><div><strong>96.4%</strong><span class="caption">Attendance</span></div><div><strong>16 / 18</strong><span class="caption">Workload</span></div></section><div class="group-label">Your faculty record</div><section class="list-section">${row('Personal Information', 'account_circle')}${row('Academic Details', 'school')}${row('Documents', 'description')}${row('Research & Publications', 'workspace_premium')}${row('Performance', 'bar_chart')}${row('Service History', 'history')}</section><div class="group-label">Preferences & support</div><section class="list-section">${row('Settings', 'settings', 'settings')}${row('Notification Preferences', 'notifications', 'settings')}${row('Privacy & Security', 'shield', 'settings')}${row('Help & Support', 'help', 'password')}</section>${action('signout', `${icon('logout')}<span class="row-copy">Sign Out</span>`, 'profile-row destructive')}`,
    'profile',
    { bar: bar('Profile', '', false) },
  );
}
function settingSwitch(label, key, subtitle = '') {
  return `<div class="profile-row"><span class="row-copy">${label}${subtitle ? `<span class="secondary">${subtitle}</span>` : ''}</span>${action('setting-switch', '<span class="switch-track"><span class="switch-thumb"></span></span>', 'switch', `data-key="${key}" role="switch" aria-label="${label}" aria-checked="${state.settings[key]}"`)}</div>`;
}
function settings() {
  return shell(
    `<div class="group-label">Account</div><section class="settings-group">${row('Faculty account', 'account_circle', 'profile', 'JCET-CSE-021')}${row('Password assistance', 'lock', 'password')}</section><div class="group-label">App Preferences</div><section class="settings-group">${row('Language', 'language', '', 'English')}${row('Appearance', 'contrast', '', 'Light')}</section><div class="group-label">Accessibility</div><section class="settings-group">${settingSwitch('Reduce motion', 'reduceMotion', 'Limit movement and transitions')}${settingSwitch('Increase contrast', 'contrast', 'Stronger control boundaries')}${row('Text size', 'accessibility_new', '', 'Follows your device setting')}</section><div class="group-label">Notifications</div><section class="settings-group">${settingSwitch('Academic updates', 'alerts', 'Leave, classes and substitutions')}</section><div class="group-label">Privacy & Security</div><section class="settings-group">${row('Privacy information', 'shield')}${row('Account security', 'fingerprint', 'password')}</section><div class="group-label">Support</div><section class="settings-group">${row('HR Desk', 'help', 'password')}${row('Email Support', 'mail', 'password')}</section><div class="group-label">About CampusHR</div><section class="settings-group">${row('Faculty & Academic Workforce', 'business', '', 'Jain College of Engineering & Technology, Hubballi')}</section>`,
    '',
    { bar: bar('Settings', 'profile') },
  );
}
function passwordHelp() {
  return `<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="password-help-title"><div class="sheet-handle"></div><div class="sheet-title"><h2 id="password-help-title">Password Help</h2>${action('help-close', icon('close'), 'icon-button', 'aria-label="Close Password Help"')}</div><p>Faculty and staff accounts are managed centrally. Contact JCET administration for password reset or account assistance.</p>${action('hr-support', `${icon('call')}<span class="row-copy">HR Desk</span>${icon('chevron_right')}`, 'profile-row')}${action('email-support', `${icon('mail')}<span class="row-copy">Email Support</span>${icon('chevron_right')}`, 'profile-row')}${action('help-close', 'Done', 'button full')}</section></div>`;
}
let helpReturn = 'login';
let helpReturnIndex = 0;
function showNote(message) {
  state.message = message;
  $('#preview-state').textContent = message;
  const toast = $('#preview-message');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showNote.timer);
  showNote.timer = setTimeout(() => {
    toast.hidden = true;
  }, 6000);
}
function render(preserve = false, focusId = '') {
  const scroll = $('.screen-scroll')?.scrollTop || 0;
  const screen = state.screen;
  document.body.dataset.screen = screen;
  $('#app').innerHTML = {
    login,
    home,
    today: () => timetable(false),
    week: () => timetable(true),
    attendance,
    leave,
    apply,
    detail,
    notifications: inbox,
    profile,
    settings,
    password: () =>
      (({ login, home, profile, settings })[helpReturn] || login)() +
      passwordHelp(),
  }[screen]();
  const metadata = screens.find((row) => row[0] === screen);
  $('#preview-title').textContent = metadata[1];
  $('#preview-description').textContent = metadata[3];
  $('#preview-state').textContent =
    state.message ||
    'Sample persona: Prof. Asha Patil · Wednesday, 21 October 2026, 10:33 AM. Nothing here changes real records.';
  $('#screen-list').innerHTML = ['Core', 'Secondary']
    .map(
      (group) =>
        `<h2>${group} screens</h2>${screens
          .filter((row) => row[2] === group)
          .map(
            ([id, title]) =>
              `<a href="#${id}"${id === screen ? ' aria-current="page"' : ''}>${title}</a>`,
          )
          .join('')}`,
    )
    .join('');
  if (preserve && $('.screen-scroll')) $('.screen-scroll').scrollTop = scroll;
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  if (screen === 'password') {
    const dialog = $('[role=dialog]');
    const behind = $('#app>.screen');
    if (behind) behind.inert = true;
    dialog.querySelector('button').focus({ preventScroll: true });
  }
  document.title = `${metadata[1]} · CampusHR V2 design`;
}
function route(screen) {
  if (!screens.some((row) => row[0] === screen)) screen = 'login';
  const leavingHelp = state.screen === 'password' && screen !== 'password';
  if (screen === 'password' && state.screen !== 'password') {
    helpReturn = state.screen;
    helpReturnIndex = Math.max(
      0,
      [...document.querySelectorAll('#app a[href="#password"]')].indexOf(
        document.activeElement,
      ),
    );
  }
  state.screen = screen;
  state.message = '';
  $('.preview-nav').classList.remove('open');
  $('#screen-menu').setAttribute('aria-expanded', 'false');
  render();
  if (leavingHelp)
    document
      .querySelectorAll('#app a[href="#password"]')
      [helpReturnIndex]?.focus({ preventScroll: true });
}
window.addEventListener('hashchange', () => route(location.hash.slice(1)));
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action],[data-request]');
  if (!target) return;
  if (target.dataset.request !== undefined) {
    state.selectedRequest = Number(target.dataset.request);
    if (state.screen === 'detail') render();
    return;
  }
  const name = target.dataset.action;
  if (name === 'today' || name === 'week') {
    location.hash = name;
    return;
  }
  if (name === 'visibility') {
    const input = $('#password'),
      visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    target.innerHTML = icon(visible ? 'visibility_off' : 'visibility');
    target.setAttribute(
      'aria-label',
      visible ? 'Hide password' : 'Show password',
    );
    target.setAttribute('aria-pressed', String(visible));
    return;
  }
  if (name === 'day') {
    state.day = Number(target.dataset.day);
    render(true, `day-${state.day}`);
    return;
  }
  if (name === 'week-reset') {
    state.day = 2;
    render(true, 'day-2');
    return;
  }
  if (name === 'leave-filter') {
    state.leaveFilter = target.dataset.filter;
    render(true, target.id);
    return;
  }
  if (name === 'notification-filter') {
    state.notificationFilter = target.dataset.filter;
    render(true, target.id);
    return;
  }
  if (name === 'read-all') {
    notifications.forEach((n) => (n.unread = false));
    render(true);
    showNote(
      'Preview: all sample notifications are now read. No server state changed.',
    );
    return;
  }
  if (name === 'half') {
    state.apply.half = !state.apply.half;
    if (state.apply.half) state.apply.end = state.apply.start;
    render(true, 'half-day-toggle');
    return;
  }
  if (name === 'setting-switch') {
    state.settings[target.dataset.key] = !state.settings[target.dataset.key];
    target.setAttribute(
      'aria-checked',
      String(state.settings[target.dataset.key]),
    );
    showNote(
      'Design-preview preference only. Native system integration is not connected.',
    );
    return;
  }
  if (name === 'help-close') {
    location.hash = helpReturn === 'password' ? 'login' : helpReturn;
    return;
  }
  if (name === 'sso') {
    showNote(
      'Institutional SSO is a design entry point. JCET identity-provider setup is required; no sign-in was attempted.',
    );
    return;
  }
  if (name === 'hr-support' || name === 'email-support') {
    showNote(
      'JCET support contact details need institutional confirmation. No call or email is started by this preview.',
    );
    return;
  }
  if (name === 'attendance') {
    showNote(
      'Attendance action preview only. No check-in or check-out was recorded.',
    );
    return;
  }
  if (name === 'signout') {
    state.apply.reason = '';
    state.apply.file = '';
    location.hash = 'login';
    showNote(
      'Returned to the login design. This preview never creates a real session.',
    );
    return;
  }
  if (name === 'out-of-scope')
    showNote(
      `${target.dataset.note} is a future destination, outside these 12 requested designs.`,
    );
});
document.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'login-form') {
    event.target.reset();
    location.hash = 'home';
    return;
  }
  if (event.target.id === 'leave-form') {
    if (!state.apply.reason.trim() || state.apply.reason.trim().length < 3) {
      $('#apply-error').textContent = 'Please add a reason for your leave.';
      $('#reason').focus();
      return;
    }
    showNote(
      'Submission preview only. No leave request or attachment was sent.',
    );
  }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'reason') state.apply.reason = event.target.value;
});
document.addEventListener('change', (event) => {
  const el = event.target;
  if (
    el.closest('#leave-form') &&
    ['type', 'start', 'end', 'period'].includes(el.name)
  ) {
    state.apply[el.name] = el.value;
    if (state.apply.half) state.apply.end = state.apply.start;
    $('#end-date').value = state.apply.end;
    $('#end-date').min = state.apply.start;
    $('#academic-impact').innerHTML = impact();
  }
  if (el.id === 'attachment') {
    const file = el.files[0];
    if (
      file &&
      (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
        file.type,
      ) ||
        file.size <= 0 ||
        file.size > 10 * 1024 * 1024)
    ) {
      el.value = '';
      $('#apply-error').textContent = 'Choose a PDF or image up to 10 MB.';
      return;
    }
    state.apply.file = file?.name || '';
    $('#attachment-name').textContent = state.apply.file || 'Choose a document';
  }
});
document.addEventListener('keydown', (event) => {
  if (state.screen !== 'password') return;
  const controls = [...$('[role=dialog]').querySelectorAll('button,a[href]')];
  if (event.key === 'Escape') {
    event.preventDefault();
    location.hash = helpReturn;
    return;
  }
  if (event.key === 'Tab') {
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
$('#screen-menu').addEventListener('click', () => {
  const open = $('.preview-nav').classList.toggle('open');
  $('#screen-menu').setAttribute('aria-expanded', String(open));
});
const params = new URLSearchParams(location.search);
if (params.get('capture') === '1') document.body.classList.add('capture');
route(location.hash.slice(1) || params.get('screen') || 'login');
