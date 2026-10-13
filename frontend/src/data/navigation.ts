import {
  LayoutDashboard,
  UsersRound,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Repeat2,
  ChartColumn,
  Bell,
  Settings,
} from 'lucide-react';

export const navigation = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    path: '/employees',
    label: 'Employees',
    icon: UsersRound,
    group: 'People & academics',
  },
  {
    path: '/attendance',
    label: 'Attendance',
    icon: CalendarCheck2,
    group: 'People & academics',
  },
  {
    path: '/leave',
    label: 'Leave',
    icon: CalendarDays,
    group: 'People & academics',
  },
  {
    path: '/timetable',
    label: 'Timetable',
    icon: CalendarRange,
    group: 'People & academics',
  },
  {
    path: '/workload',
    label: 'Faculty Workload',
    icon: ChartNoAxesCombined,
    group: 'People & academics',
  },
  {
    path: '/substitution',
    label: 'Smart Substitution',
    icon: Repeat2,
    group: 'People & academics',
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: ChartColumn,
    group: 'Administration',
  },
  {
    path: '/notifications',
    label: 'Notifications',
    icon: Bell,
    group: 'Administration',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    group: 'Administration',
  },
];
