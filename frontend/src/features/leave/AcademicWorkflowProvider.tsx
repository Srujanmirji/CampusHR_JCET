import { useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  initialWorkflow,
  initialNotifications,
} from '@/data/mock/substitutions';
import { leaveRequests } from '@/data/mock/leaveRequests';
import { affectedClasses } from '@/data/mock/timetable';
import { employees } from '@/data/mock/employees';
import { getCandidates } from '@/lib/academic';
import type {
  AppNotification,
  Coverage,
  WorkflowState,
} from '@/types/academic';
import { AcademicWorkflowContext, workflowKey } from './useAcademicWorkflow';

const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  time: z.string(),
  unread: z.boolean().optional(),
});

const storedSchema = z.object({
  version: z.literal(1),
  activeLeaveId: z
    .string()
    .refine((id) => leaveRequests.some((item) => item.id === id))
    .nullable(),
  rejectionReasons: z.record(z.string(), z.string()).default({}),
  statuses: z.record(
    z.string().refine((id) => leaveRequests.some((item) => item.id === id)),
    z.enum(['Pending', 'Approved', 'Rejected']),
  ),
  coverage: z.record(
    z.string().refine((id) => affectedClasses.some((item) => item.id === id)),
    z.discriminatedUnion('kind', [
      z.object({
        kind: z.literal('faculty'),
        facultyId: z
          .string()
          .refine((id) => employees.some((item) => item.id === id)),
      }),
      z.object({ kind: z.literal('waived'), reason: z.string().trim().min(1) }),
    ]),
  ),
  notifications: z.array(notificationSchema).default(initialNotifications),
});

function readState(): WorkflowState {
  try {
    const raw = sessionStorage.getItem(workflowKey);
    if (!raw) return initialWorkflow;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* A blocked or invalid browser store must not prevent the demo opening. */
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
        'Browser storage is unavailable. Keep this tab open to retain demo changes.',
        { id: 'workflow-storage' },
      );
    }
  }, [state]);

  const status = (id: string) =>
    state.statuses[id] ??
    leaveRequests.find((item) => item.id === id)?.status ??
    'Pending';

  function decide(id: string, result: 'Approved' | 'Rejected', reason = '') {
    const req = leaveRequests.find((item) => item.id === id);
    if (!req || status(id) !== 'Pending') return;

    const faculty = employees.find((emp) => emp.id === req.employeeId);
    const facultyName = faculty?.name ?? 'Faculty';

    const newNotifications: AppNotification[] = [];
    if (result === 'Approved') {
      newNotifications.push({
        id: `notif-appr-${id}-${Date.now()}`,
        title: 'Leave approved',
        body: `Leave request for ${facultyName} has been approved.`,
        time: 'Just now',
        unread: true,
      });
    }

    setState((previous) => ({
      ...previous,
      statuses: { ...previous.statuses, [id]: result },
      rejectionReasons:
        result === 'Rejected'
          ? { ...previous.rejectionReasons, [id]: reason.trim() }
          : previous.rejectionReasons,
      notifications: [...newNotifications, ...previous.notifications],
    }));
  }

  function selectLeave(id: string) {
    if (leaveRequests.some((item) => item.id === id))
      setState((previous) => ({ ...previous, activeLeaveId: id }));
  }

  function coverClass(id: string, coverage: Coverage) {
    const item = affectedClasses.find((item) => item.id === id);
    if (!item || status(item.leaveId) !== 'Approved' || state.coverage[id])
      return false;

    if (
      coverage.kind === 'faculty' &&
      !getCandidates(item, state.coverage).some(
        (candidate) =>
          candidate.employee.id === coverage.facultyId && !candidate.reason,
      )
    )
      return false;

    if (coverage.kind === 'waived' && !coverage.reason.trim()) return false;

    const newNotifications: AppNotification[] = [];

    if (coverage.kind === 'faculty') {
      const sub = employees.find((e) => e.id === coverage.facultyId);
      const subName = sub?.name ?? 'Faculty';
      newNotifications.push({
        id: `notif-sub-${id}-${Date.now()}`,
        title: 'Substitute assigned',
        body: `${subName} assigned as substitute for ${item.shortSubject} — ${item.cohort}.`,
        time: 'Just now',
        unread: true,
      });
    }

    const leaveClassList = affectedClasses.filter(
      (c) => c.leaveId === item.leaveId,
    );
    const alreadyCoveredCount = leaveClassList.filter(
      (c) => c.id !== id && Boolean(state.coverage[c.id]),
    ).length;

    if (alreadyCoveredCount + 1 === leaveClassList.length) {
      const leave = leaveRequests.find((r) => r.id === item.leaveId);
      const origEmp = employees.find((e) => e.id === leave?.employeeId);
      const origName = origEmp?.name ?? 'Faculty';
      newNotifications.push({
        id: `notif-all-${item.leaveId}-${Date.now()}`,
        title: 'All classes covered',
        body: `All classes affected by ${origName}'s leave are now covered.`,
        time: 'Just now',
        unread: true,
      });
    }

    setState((previous) => ({
      ...previous,
      coverage: { ...previous.coverage, [id]: coverage },
      notifications: [...newNotifications, ...previous.notifications],
    }));
    return true;
  }

  function resetDemoData() {
    try {
      sessionStorage.removeItem(workflowKey);
    } catch {
      /* ignore */
    }
    setState(initialWorkflow);
    toast.success('CampusHR demo data has been reset to initial state.');
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

  const unreadCount = state.notifications.filter((n) => n.unread).length;

  return (
    <AcademicWorkflowContext.Provider
      value={{
        state,
        status,
        decide,
        selectLeave,
        coverClass,
        resetDemoData,
        notifications: state.notifications,
        unreadCount,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AcademicWorkflowContext.Provider>
  );
}
