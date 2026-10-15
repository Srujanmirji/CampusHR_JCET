import type { WorkflowState, AppNotification } from '@/types/academic';

export const initialNotifications: AppNotification[] = [
  {
    id: 'N001',
    title: 'Leave approvals',
    body: '3 leave requests require approval.',
    time: '10 minutes ago',
    unread: true,
  },
  {
    id: 'N002',
    title: 'Workload report',
    body: 'Faculty workload report updated.',
    time: '35 minutes ago',
    unread: true,
  },
  {
    id: 'N003',
    title: 'Timetable revised',
    body: 'Tomorrow’s timetable has been revised.',
    time: '1 hour ago',
    unread: true,
  },
];

export const initialWorkflow: WorkflowState = {
  version: 2,
  notifications: initialNotifications,
};
