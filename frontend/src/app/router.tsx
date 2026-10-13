import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/features/auth/pages/LoginPage';
import AppShell from '@/layouts/AppShell';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import EmployeesPage from '@/features/employees/pages/EmployeesPage';
import AttendancePage from '@/features/attendance/pages/AttendancePage';
import LeavePage from '@/features/leave/pages/LeavePage';
import TimetablePage from '@/features/timetable/pages/TimetablePage';
import WorkloadPage from '@/features/workload/pages/WorkloadPage';
import SubstitutionPage from '@/features/substitution/pages/SubstitutionPage';
import PayrollPage from '@/features/payroll/pages/PayrollPage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

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
        Component: DashboardPage,
      },
      {
        path: '/employees',
        Component: EmployeesPage,
      },
      {
        path: '/attendance',
        Component: AttendancePage,
      },
      {
        path: '/leave',
        Component: LeavePage,
      },
      {
        path: '/timetable',
        Component: TimetablePage,
      },
      {
        path: '/workload',
        Component: WorkloadPage,
      },
      {
        path: '/substitution',
        Component: SubstitutionPage,
      },
      {
        path: '/payroll',
        Component: PayrollPage,
      },
      {
        path: '/reports',
        Component: ReportsPage,
      },
      {
        path: '/notifications',
        Component: NotificationsPage,
      },
      {
        path: '/settings',
        Component: SettingsPage,
      },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);
