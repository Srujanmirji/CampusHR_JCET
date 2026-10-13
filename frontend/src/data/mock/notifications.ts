import type { AppNotification } from '@/types/academic';

export const seededNotifications: (AppNotification & {
  category: 'Leave' | 'Timetable' | 'Attendance' | 'System';
  date: string;
})[] = [
  {
    id: 'N001',
    title: 'Pending Leave Approvals',
    body: '3 leave requests from CSE and ME require your review before afternoon classes.',
    time: '10 minutes ago',
    date: 'Today, 08:45 AM',
    unread: true,
    category: 'Leave',
  },
  {
    id: 'N002',
    title: 'Faculty Workload Audit Updated',
    body: 'Weekly teaching hours audited across all 6 departments. 2 faculty reached maximum capacity.',
    time: '35 minutes ago',
    date: 'Today, 08:20 AM',
    unread: true,
    category: 'System',
  },
  {
    id: 'N003',
    title: 'Timetable Revised for 5th Sem CSE',
    body: 'Tomorrow’s timetable has been revised to incorporate new laboratory practical batches.',
    time: '1 hour ago',
    date: 'Today, 07:55 AM',
    unread: true,
    category: 'Timetable',
  },
  {
    id: 'N004',
    title: 'Biometric Attendance Alert',
    body: 'CSE department attendance recorded at 96% today with 2 faculty members on scheduled leave.',
    time: '2 hours ago',
    date: 'Today, 07:00 AM',
    unread: false,
    category: 'Attendance',
  },
  {
    id: 'N006',
    title: 'NAAC Criteria 2 Dossier Synced',
    body: 'Faculty qualification and research publications successfully synced with NAAC portal.',
    time: '2 days ago',
    date: 'Oct 10, 11:30 AM',
    unread: false,
    category: 'System',
  },
  {
    id: 'N007',
    title: 'Substitute Recommendation Ready',
    body: 'Smart Substitution engine identified Prof. Priya Kulkarni as Best Match for DBMS.',
    time: '3 days ago',
    date: 'Oct 09, 09:15 AM',
    unread: false,
    category: 'Timetable',
  },
];
