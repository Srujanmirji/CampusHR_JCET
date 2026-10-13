import { createContext, useContext } from 'react';
import type {
  Coverage,
  LeaveStatus,
  WorkflowState,
  AppNotification,
} from '@/types/academic';

export const workflowKey = 'campushr-academic-demo-v1';
export const AcademicWorkflowContext = createContext<{
  state: WorkflowState;
  status: (id: string) => LeaveStatus;
  decide: (
    id: string,
    status: 'Approved' | 'Rejected',
    reason?: string,
  ) => void;
  selectLeave: (id: string) => void;
  coverClass: (id: string, coverage: Coverage) => boolean;
  resetDemoData: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  markAllNotificationsRead: () => void;
} | null>(null);
export function useAcademicWorkflow() {
  const context = useContext(AcademicWorkflowContext);
  if (!context) throw new Error('Academic workflow requires its provider.');
  return context;
}
