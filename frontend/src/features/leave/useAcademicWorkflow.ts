import { createContext, useContext } from 'react';
import type { AppNotification } from '@/types/academic';

export const workflowKey = 'campushr-academic-demo-v1';
export const AcademicWorkflowContext = createContext<{
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
