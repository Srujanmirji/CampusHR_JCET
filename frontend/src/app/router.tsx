import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/features/auth/pages/LoginPage';
import AppShell from '@/layouts/AppShell';
import NotFoundPage from '@/pages/NotFoundPage';

// Each workspace page is a separate chunk, loaded on first visit.
const page =
  (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
    Component: (await load()).default,
  });

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    Component: AppShell,
    children: [
      {
        path: '/dashboard',
        lazy: page(() => import('@/features/dashboard/pages/DashboardPage')),
      },
      {
        path: '/employees',
        lazy: page(() => import('@/features/employees/pages/EmployeesPage')),
      },
      {
        path: '/departments',
        lazy: page(
          () => import('@/features/departments/pages/DepartmentsPage'),
        ),
      },
      {
        path: '/attendance',
        lazy: page(() => import('@/features/attendance/pages/AttendancePage')),
      },
      {
        path: '/documents',
        lazy: page(() => import('@/features/documents/pages/DocumentsPage')),
      },
      {
        path: '/leave',
        lazy: page(() => import('@/features/leave/pages/LeavePage')),
      },
      {
        path: '/timetable',
        lazy: page(() => import('@/features/timetable/pages/TimetablePage')),
      },
      {
        path: '/workload',
        lazy: page(() => import('@/features/workload/pages/WorkloadPage')),
      },
      {
        path: '/substitution',
        lazy: page(
          () => import('@/features/substitution/pages/SubstitutionPage'),
        ),
      },
      {
        path: '/exam-duty',
        lazy: page(() => import('@/features/exam-duty/pages/ExamDutyPage')),
      },
      {
        path: '/circulars',
        lazy: page(() => import('@/features/circulars/pages/CircularsPage')),
      },
      {
        path: '/work-assignments',
        lazy: page(
          () =>
            import('@/features/work-assignments/pages/WorkAssignmentsPage'),
        ),
      },
      {
        path: '/onboarding',
        lazy: page(() => import('@/features/onboarding/pages/OnboardingPage')),
      },
      {
        path: '/reports',
        lazy: page(() => import('@/features/reports/pages/ReportsPage')),
      },
      {
        path: '/notifications',
        lazy: page(
          () => import('@/features/notifications/pages/NotificationsPage'),
        ),
      },
      {
        path: '/settings',
        lazy: page(() => import('@/features/settings/pages/SettingsPage')),
      },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);
