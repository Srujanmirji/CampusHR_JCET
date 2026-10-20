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
