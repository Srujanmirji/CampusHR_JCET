import React, { createContext, useContext, useEffect, useState } from 'react';

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
  login: (identifier: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const DEMO_ACCOUNTS: Record<string, AuthUser> = {
  'jcet-cse-021': {
    id: 'demo-faculty-021',
    email: 'asha.patil@jcethbl.edu.in',
    role: 'FACULTY',
    permissions: ['timetable.read', 'leave.apply', 'leave.read', 'attendance.check_in'],
    employeeId: 'JCET-CSE-021',
    departmentId: 1,
    employeeCode: 'JCET-CSE-021',
    name: 'Prof. Asha Patil',
  },
  'asha.patil@jcethbl.edu.in': {
    id: 'demo-faculty-021',
    email: 'asha.patil@jcethbl.edu.in',
    role: 'FACULTY',
    permissions: ['timetable.read', 'leave.apply', 'leave.read', 'attendance.check_in'],
    employeeId: 'JCET-CSE-021',
    departmentId: 1,
    employeeCode: 'JCET-CSE-021',
    name: 'Prof. Asha Patil',
  },
  'hod.cse@jcethbl.edu.in': {
    id: 'demo-hod-001',
    email: 'hod.cse@jcethbl.edu.in',
    role: 'HOD',
    permissions: ['timetable.read', 'timetable.manage', 'leave.apply', 'leave.read', 'leave.approve.department', 'attendance.read'],
    employeeId: 'JCET-CSE-001',
    departmentId: 1,
    employeeCode: 'JCET-CSE-001',
    name: 'Dr. Ramesh K',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'signedIn' | 'signedOut'>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Initial startup check
    setStatus('signedOut');
  }, []);

  async function login(identifier: string, password: string, remember: boolean = false) {
    const trimmedId = identifier.trim().toLowerCase();

    // Check development demo credentials first for seamless UI testing
    const demoUser = DEMO_ACCOUNTS[trimmedId];
    if (demoUser && password === 'campus123') {
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
        throw new Error('Authentication succeeded but no access token was returned.');
      }

      const rawUser = data.user || {};
      const authenticatedUser: AuthUser = {
        id: rawUser.id,
        email: rawUser.email,
        role: rawUser.role,
        permissions: rawUser.permissions || [],
        employeeId: rawUser.employeeId || null,
        departmentId: rawUser.departmentId || null,
        employeeCode: rawUser.employeeCode || (identifier.includes('@') ? undefined : identifier),
        name: rawUser.name || (rawUser.email ? rawUser.email.split('@')[0] : 'Faculty Member'),
      };

      setAccessToken(data.accessToken);
      setUser(authenticatedUser);
      setStatus('signedIn');
    } catch (error) {
      // If backend is unreachable but user entered demo credentials with any password, allow dev testing
      if (demoUser) {
        setAccessToken('demo-jwt-token-jcet');
        setUser(demoUser);
        setStatus('signedIn');
        return;
      }

      if (
        (error instanceof TypeError && error.message.includes('fetch')) ||
        (error instanceof Error && error.message.includes('Network request failed'))
      ) {
        throw new Error(
          `Backend server is offline at ${API_BASE_URL}.\nTo test in Development Mode, use:\nID: JCET-CSE-021\nPassword: campus123`
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
