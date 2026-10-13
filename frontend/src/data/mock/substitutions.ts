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
  version: 1,
  statuses: {},
  coverage: {},
  rejectionReasons: {},
  activeLeaveId: null,
  notifications: initialNotifications,
};
export const scoreCriteria = [
  { key: 'subject', label: 'Subject Match', max: 35 },
  { key: 'availability', label: 'Availability', max: 25 },
  { key: 'department', label: 'Department Match', max: 15 },
  { key: 'workload', label: 'Workload Availability', max: 15 },
  { key: 'experience', label: 'Previous Experience', max: 10 },
] as const;
