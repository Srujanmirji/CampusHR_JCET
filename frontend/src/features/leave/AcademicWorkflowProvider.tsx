import { useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { initialWorkflow } from '@/data/mock/substitutions';
import type { WorkflowState } from '@/types/academic';
import { AcademicWorkflowContext, workflowKey } from './useAcademicWorkflow';

// Demo notifications until the Notifications service (BE-011) exists. Leave
// and substitution read and write the API.
const storedSchema = z.object({
  version: z.literal(2),
  notifications: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      time: z.string(),
      unread: z.boolean().optional(),
    }),
  ),
});

function readState(): WorkflowState {
  try {
    const raw = sessionStorage.getItem(workflowKey);
    if (!raw) return initialWorkflow;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* A blocked or invalid browser store must not prevent the app opening. */
  }
  return initialWorkflow;
}

export function AcademicWorkflowProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState(readState);

  useEffect(() => {
    try {
      sessionStorage.setItem(workflowKey, JSON.stringify(state));
    } catch {
      toast.info(
        'Browser storage is unavailable. Keep this tab open to retain your changes.',
        { id: 'workflow-storage' },
      );
    }
  }, [state]);

  function resetDemoData() {
    try {
      sessionStorage.removeItem(workflowKey);
    } catch {
      /* ignore */
    }
    setState(initialWorkflow);
    toast.success('Workflow data has been reset.');
  }

  function markAllNotificationsRead() {
    setState((previous) => ({
      ...previous,
      notifications: previous.notifications.map((n) => ({
        ...n,
        unread: false,
      })),
    }));
  }

  return (
    <AcademicWorkflowContext.Provider
      value={{
        resetDemoData,
        notifications: state.notifications,
        unreadCount: state.notifications.filter((n) => n.unread).length,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AcademicWorkflowContext.Provider>
  );
}
