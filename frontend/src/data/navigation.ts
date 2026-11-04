import {
  LayoutDashboard,
  UsersRound,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Repeat2,
  ChartColumn,
  Bell,
  Settings,
  Files,
  GraduationCap,
  ScrollText,
} from 'lucide-react';

// `permission` (product/USER_ROLES.md) decides who sees each page; the
// dashboard is open to every signed-in user.
export const navigation: {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  permission?: string;
}[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    path: '/employees',
    permission: 'employee.read',
    label: 'Employees',
    icon: UsersRound,
    group: 'People & academics',
  },
  {
    path: '/departments',
    permission: 'department.read',
    label: 'Departments',
    icon: Building2,
    group: 'People & academics',
  },
  {
    path: '/attendance',
    permission: 'attendance.read',
    label: 'Attendance',
    icon: CalendarCheck2,
    group: 'People & academics',
  },
  {
    path: '/documents',
    permission: 'document.read',
    label: 'Documents',
    icon: Files,
    group: 'People & academics',
  },
  {
    path: '/leave',
    permission: 'leave.read',
    label: 'Leave',
    icon: CalendarDays,
    group: 'People & academics',
  },
  {
    path: '/timetable',
    permission: 'timetable.read',
    label: 'Timetable',
    icon: CalendarRange,
    group: 'People & academics',
  },
  {
    path: '/workload',
    permission: 'workload.read',
    label: 'Faculty Workload',
    icon: ChartNoAxesCombined,
    group: 'People & academics',
  },
  {
    path: '/substitution',
    permission: 'substitution.read',
    label: 'Smart Substitution',
    icon: Repeat2,
    group: 'People & academics',
  },
  {
    path: '/exam-duty',
    permission: 'exam_duty.read',
    label: 'Exam Duty Allotment',
    icon: GraduationCap,
    group: 'People & academics',
  },
  {
    path: '/circulars',
    permission: 'circular.read',
    label: 'Digital Circulars',
    icon: ScrollText,
    group: 'Administration',
  },
  {
    path: '/reports',
    permission: 'report.read',
    label: 'Reports',
    icon: ChartColumn,
    group: 'Administration',
  },
  {
    path: '/notifications',
    permission: 'notification.read',
    label: 'Notifications',
    icon: Bell,
    group: 'Administration',
  },
  {
    path: '/settings',
    permission: 'settings.manage',
    label: 'Settings',
    icon: Settings,
    group: 'Administration',
  },
];

export const facultyNavigation: {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  permission?: string;
}[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    path: '/timetable',
    permission: 'timetable.read',
    label: 'My Timetable',
    icon: CalendarRange,
    group: 'My Academics',
  },
  {
    path: '/workload',
    permission: 'workload.read',
    label: 'Teaching Workload',
    icon: ChartNoAxesCombined,
    group: 'My Academics',
  },
  {
    path: '/exam-duty',
    permission: 'exam_duty.read',
    label: 'My Exam Duties',
    icon: GraduationCap,
    group: 'My Academics',
  },
  {
    path: '/attendance',
    permission: 'attendance.read',
    label: 'My Attendance',
    icon: CalendarCheck2,
    group: 'My Services',
  },
  {
    path: '/leave',
    permission: 'leave.read',
    label: 'Leave Applications',
    icon: CalendarDays,
    group: 'My Services',
  },
  {
    path: '/documents',
    permission: 'document.read',
    label: 'My Documents',
    icon: Files,
    group: 'My Services',
  },
  {
    path: '/circulars',
    permission: 'circular.read',
    label: 'Notice Board',
    icon: ScrollText,
    group: 'Communication',
  },
  {
    path: '/notifications',
    permission: 'notification.read',
    label: 'Notifications',
    icon: Bell,
    group: 'Communication',
  },
];

export const hodNavigation: {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  permission?: string;
}[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    path: '/timetable',
    permission: 'timetable.read',
    label: 'Dept. Timetable',
    icon: CalendarRange,
    group: 'Academic Operations',
  },
  {
    path: '/workload',
    permission: 'workload.read',
    label: 'Faculty Workload',
    icon: ChartNoAxesCombined,
    group: 'Academic Operations',
  },
  {
    path: '/substitution',
    permission: 'substitution.read',
    label: 'Smart Substitution',
    icon: Repeat2,
    group: 'Academic Operations',
  },
  {
    path: '/exam-duty',
    permission: 'exam_duty.read',
    label: 'Exam Duty & Swaps',
    icon: GraduationCap,
    group: 'Academic Operations',
  },
  {
    path: '/employees',
    permission: 'employee.read',
    label: 'Faculty Directory',
    icon: UsersRound,
    group: 'Department Staff',
  },
  {
    path: '/attendance',
    permission: 'attendance.read',
    label: 'Attendance & Corrections',
    icon: CalendarCheck2,
    group: 'Department Staff',
  },
  {
    path: '/leave',
    permission: 'leave.read',
    label: 'Leave Approvals',
    icon: CalendarDays,
    group: 'Department Staff',
  },
  {
    path: '/documents',
    permission: 'document.read',
    label: 'Faculty Documents',
    icon: Files,
    group: 'Department Staff',
  },
  {
    path: '/reports',
    permission: 'report.read',
    label: 'Department Reports',
    icon: ChartColumn,
    group: 'Administration',
  },
  {
    path: '/circulars',
    permission: 'circular.read',
    label: 'Circulars & Notices',
    icon: ScrollText,
    group: 'Administration',
  },
  {
    path: '/notifications',
    permission: 'notification.read',
    label: 'Notifications',
    icon: Bell,
    group: 'Administration',
  },
];

export const principalNavigation: {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  permission?: string;
}[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    path: '/workload',
    permission: 'workload.read',
    label: 'Workload & AICTE Bands',
    icon: ChartNoAxesCombined,
    group: 'Academic Governance',
  },
  {
    path: '/timetable',
    permission: 'timetable.read',
    label: 'Campus Timetables',
    icon: CalendarRange,
    group: 'Academic Governance',
  },
  {
    path: '/exam-duty',
    permission: 'exam_duty.read',
    label: 'Exam Duty Allotments',
    icon: GraduationCap,
    group: 'Academic Governance',
  },
  {
    path: '/departments',
    permission: 'department.read',
    label: 'Academic Departments',
    icon: Building2,
    group: 'Institutional People',
  },
  {
    path: '/employees',
    permission: 'employee.read',
    label: 'Faculty & Staff',
    icon: UsersRound,
    group: 'Institutional People',
  },
  {
    path: '/attendance',
    permission: 'attendance.read',
    label: 'Campus Attendance',
    icon: CalendarCheck2,
    group: 'Institutional People',
  },
  {
    path: '/leave',
    permission: 'leave.read',
    label: 'Executive Approvals',
    icon: CalendarDays,
    group: 'Institutional People',
  },
  {
    path: '/reports',
    permission: 'report.read',
    label: 'Executive Reports',
    icon: ChartColumn,
    group: 'Executive & Reports',
  },
  {
    path: '/circulars',
    permission: 'circular.read',
    label: 'Institutional Circulars',
    icon: ScrollText,
    group: 'Executive & Reports',
  },
  {
    path: '/notifications',
    permission: 'notification.read',
    label: 'Campus Broadcasts',
    icon: Bell,
    group: 'Executive & Reports',
  },
];

export const nonTeachingNavigation: {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  permission?: string;
}[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    path: '/attendance',
    permission: 'attendance.read',
    label: 'My Attendance',
    icon: CalendarCheck2,
    group: 'My Services & Duties',
  },
  {
    path: '/leave',
    permission: 'leave.read',
    label: 'Leave Applications',
    icon: CalendarDays,
    group: 'My Services & Duties',
  },
  {
    path: '/documents',
    permission: 'document.read',
    label: 'My Documents',
    icon: Files,
    group: 'My Services & Duties',
  },
  {
    path: '/circulars',
    permission: 'circular.read',
    label: 'Campus Circulars',
    icon: ScrollText,
    group: 'Communication',
  },
  {
    path: '/notifications',
    permission: 'notification.read',
    label: 'Campus Notices',
    icon: Bell,
    group: 'Communication',
  },
];
