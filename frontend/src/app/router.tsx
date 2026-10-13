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
        path: '/attendance',
        lazy: page(() => import('@/features/attendance/pages/AttendancePage')),
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
