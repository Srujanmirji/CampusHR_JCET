import React, { createContext, useContext, useState } from 'react';
import { API_BASE_URL } from './api-config';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  employeeId: string | null;
  departmentId: number | null;
  employeeCode?: string;
  name?: string;
}

interface AuthContextType {
  status: 'loading' | 'signedIn' | 'signedOut';
  user: AuthUser | null;
  accessToken: string | null;
  login: (
    identifier: string,
    password: string,
    remember?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_ACCOUNTS: Record<string, AuthUser> = {
  'jcet-cse-021': {
    id: 'demo-faculty-021',
    email: 'asha.patil@jcethbl.edu.in',
    role: 'FACULTY',
    permissions: [
      'timetable.read',
      'leave.apply',
      'leave.read',
      'attendance.check_in',
    ],
    employeeId: 'JCET-CSE-021',
    departmentId: 1,
    employeeCode: 'JCET-CSE-021',
    name: 'Prof. Asha Patil',
  },
  'asha.patil@jcethbl.edu.in': {
    id: 'demo-faculty-021',
    email: 'asha.patil@jcethbl.edu.in',
    role: 'FACULTY',
    permissions: [
      'timetable.read',
      'leave.apply',
      'leave.read',
      'attendance.check_in',
    ],
    employeeId: 'JCET-CSE-021',
    departmentId: 1,
    employeeCode: 'JCET-CSE-021',
    name: 'Prof. Asha Patil',
  },
  'zeeshan.faculty@jcethbl.edu.in': {
    id: 'demo-faculty-001',
    email: 'zeeshan.faculty@jcethbl.edu.in',
    role: 'FACULTY',
    permissions: [
      'timetable.read',
      'leave.apply',
      'leave.read',
      'attendance.check_in',
    ],
    employeeId: 'JCET-CSE-001',
    departmentId: 1,
    employeeCode: 'JCET-CSE-001',
    name: 'Zeeshan Madras',
  },
  'jcet-cse-001': {
    id: 'demo-faculty-001',
    email: 'zeeshan.faculty@jcethbl.edu.in',
    role: 'FACULTY',
    permissions: [
      'timetable.read',
      'leave.apply',
      'leave.read',
      'attendance.check_in',
    ],
    employeeId: 'JCET-CSE-001',
    departmentId: 1,
    employeeCode: 'JCET-CSE-001',
    name: 'Zeeshan Madras',
  },
  'hod.cse@jcethbl.edu.in': {
    id: 'demo-hod-001',
    email: 'hod.cse@jcethbl.edu.in',
    role: 'HOD',
    permissions: [
      'timetable.read',
      'timetable.manage',
      'leave.apply',
      'leave.read',
      'leave.approve.department',
      'attendance.read',
    ],
    employeeId: 'JCET-CSE-002',
    departmentId: 1,
    employeeCode: 'JCET-CSE-002',
    name: 'Rajesh Kulkarni',
  },
  'jcet-cse-002': {
    id: 'demo-hod-001',
    email: 'hod.cse@jcethbl.edu.in',
    role: 'HOD',
    permissions: [
      'timetable.read',
      'timetable.manage',
      'leave.apply',
      'leave.read',
      'leave.approve.department',
      'attendance.read',
    ],
    employeeId: 'JCET-CSE-002',
    departmentId: 1,
    employeeCode: 'JCET-CSE-002',
    name: 'Rajesh Kulkarni',
  },
  'principal@jcethbl.edu.in': {
    id: 'demo-principal-001',
    email: 'principal@jcethbl.edu.in',
    role: 'PRINCIPAL',
    permissions: [
      'attendance.read',
      'leave.read',
      'reports.view',
      'announcements.manage',
    ],
    employeeId: 'JCET-ADM-001',
    departmentId: 1,
    employeeCode: 'JCET-ADM-001',
    name: 'Dr. Suresh Patil',
  },
  'hr@jcethbl.edu.in': {
    id: 'demo-hr-001',
    email: 'hr@jcethbl.edu.in',
    role: 'HR_ADMIN',
    permissions: [
      'attendance.read',
      'leave.approve.all',
      'employees.manage',
      'reports.view',
    ],
    employeeId: 'JCET-ADM-002',
    departmentId: 1,
    employeeCode: 'JCET-ADM-002',
    name: 'Ananya Deshmukh',
  },
  'lab.cse@jcethbl.edu.in': {
    id: 'demo-lab-004',
    email: 'lab.cse@jcethbl.edu.in',
    role: 'NON_TEACHING',
    permissions: [
      'attendance.check_in',
      'leave.apply',
      'leave.read',
      'documents.read',
    ],
    employeeId: 'JCET-CSE-004',
    departmentId: 1,
    employeeCode: 'JCET-CSE-004',
    name: 'Ramesh Kumar',
  },
  'jcet-cse-004': {
    id: 'demo-lab-004',
    email: 'lab.cse@jcethbl.edu.in',
    role: 'NON_TEACHING',
    permissions: [
      'attendance.check_in',
      'leave.apply',
      'leave.read',
      'documents.read',
    ],
    employeeId: 'JCET-CSE-004',
    departmentId: 1,
    employeeCode: 'JCET-CSE-004',
    name: 'Ramesh Kumar',
  },
  'zeeshan@jcethbl.edu.in': {
    id: 'demo-superadmin-001',
    email: 'zeeshan@jcethbl.edu.in',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
    employeeId: 'JCET-SYS-001',
    departmentId: 1,
    employeeCode: 'JCET-SYS-001',
    name: 'Zeeshan (IT Sys)',
  },
  'srujanmirji@jcethbl.edu.in': {
    id: 'demo-superadmin-002',
    email: 'srujanmirji@jcethbl.edu.in',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
    employeeId: 'JCET-DIR-001',
    departmentId: 1,
    employeeCode: 'JCET-DIR-001',
    name: 'Srujan Mirji',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'signedIn' | 'signedOut'>(
    'signedOut',
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  async function login(
    identifier: string,
    password: string,
    remember: boolean = false,
  ) {
    const trimmedId = identifier.trim().toLowerCase();

    // Check development demo credentials first for seamless UI testing
    const demoUser = DEMO_ACCOUNTS[trimmedId];
    if (
      demoUser &&
      (password === 'campus123' ||
        password === 'CampusHR@2026' ||
        password === 'Srujan1@' ||
        password === 'Password123!')
    ) {
      setAccessToken('demo-jwt-token-jcet');
      setUser(demoUser);
      setStatus('signedIn');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          remember,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          data?.error?.message ||
          data?.message ||
          (response.status === 401
            ? 'Invalid employee ID, email, or password.'
            : response.status === 429
              ? 'Too many login attempts. Please wait 15 minutes.'
              : 'Unable to connect to the authentication server.');
        throw new Error(errorMessage);
      }

      if (!data?.accessToken) {
        throw new Error(
          'Authentication succeeded but no access token was returned.',
        );
      }

      const rawUser = data.user || {};
      const authenticatedUser: AuthUser = {
        id: rawUser.id,
        email: rawUser.email,
        role: rawUser.role,
        permissions: rawUser.permissions || [],
        employeeId: rawUser.employeeId || null,
        departmentId: rawUser.departmentId || null,
        employeeCode:
          rawUser.employeeCode ||
          (identifier.includes('@') ? undefined : identifier),
        name:
          rawUser.name ||
          (rawUser.email ? rawUser.email.split('@')[0] : 'Faculty Member'),
      };

      setAccessToken(data.accessToken);
      setUser(authenticatedUser);
      setStatus('signedIn');
    } catch (error) {
      if (
        (error instanceof TypeError && error.message.includes('fetch')) ||
        (error instanceof Error &&
          error.message.includes('Network request failed'))
      ) {
        throw new Error(
          `Backend server is offline at ${API_BASE_URL}.\nTo test in Development Mode, use:\nID: JCET-CSE-021\nPassword: campus123`,
          { cause: error },
        );
      }
      throw error;
    }
  }

  async function logout() {
    try {
      if (accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).catch(() => null);
      }
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('signedOut');
    }
  }

  return (
    <AuthContext.Provider value={{ status, user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
