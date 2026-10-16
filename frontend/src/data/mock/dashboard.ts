import {
  UsersRound,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Building2,
  ChartNoAxesCombined,
  CalendarRange,
} from 'lucide-react';

export const metrics = [
  {
    id: 'employees',
    label: 'Total employees',
    value: 186,
    detail: '132 teaching · 54 non-teaching',
    icon: UsersRound,
  },
  {
    id: 'present',
    label: 'Present today',
    value: 162,
    detail: '87% of total employees',
    icon: CalendarCheck2,
  },
  {
    id: 'leave',
    label: 'On leave',
    value: 11,
    detail: 'Across all departments',
    icon: CalendarDays,
  },
  {
    id: 'pending',
    label: 'Pending leave requests',
    value: 8,
    detail: 'Awaiting your review',
    icon: Clock3,
  },
  {
    id: 'departments',
    label: 'Departments',
    value: 6,
    detail: 'One connected campus',
    icon: Building2,
  },
  {
    id: 'workload',
    label: 'Faculty workload alerts',
    value: 6,
    detail: 'Review teaching allocations',
    icon: ChartNoAxesCombined,
  },
] as const;

export const departmentData = [
  { department: 'CSE', employees: 42 },
  { department: 'ECE', employees: 38 },
  { department: 'ME', employees: 28 },
  { department: 'CE', employees: 24 },
  { department: 'AI & ML', employees: 22 },
  { department: 'MBA', employees: 32 },
];

export const attendanceData = [
  { day: 'Mon', Present: 158, Absent: 17 },
  { day: 'Tue', Present: 164, Absent: 11 },
  { day: 'Wed', Present: 162, Absent: 13 },
  { day: 'Thu', Present: 169, Absent: 6 },
  { day: 'Fri', Present: 166, Absent: 9 },
  { day: 'Sat', Present: 159, Absent: 16 },
];

export const notifications = [
  {
    id: 'N001',
    title: 'Leave approvals',
    body: '3 leave requests require approval.',
    time: '10 minutes ago',
    icon: CalendarDays,
  },
  {
    id: 'N002',
    title: 'Workload report',
    body: 'Faculty workload report updated.',
    time: '35 minutes ago',
    icon: ChartNoAxesCombined,
  },
  {
    id: 'N003',
    title: 'Timetable revised',
    body: 'Tomorrow’s timetable has been revised.',
    time: '1 hour ago',
    icon: CalendarRange,
  },
] as const;

export const previewMessage = 'This feature isn’t available yet.';
