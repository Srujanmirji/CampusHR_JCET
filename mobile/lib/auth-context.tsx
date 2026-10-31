import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { clearDocumentCache } from './document-picker';
import { theme } from './theme';
import { Button } from '../components/ui/Button';
import { AppState, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getSession,
  subscribeSession,
  restoreSession,
  signIn,
  signOut,
  signInDemo,
  refreshIfExpired,
  type AuthUser,
  type SessionState,
} from './session';
export type { AuthUser } from './session';
interface AuthContextType extends SessionState {
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
  const [cacheReady, setCacheReady] = useState(false);
  const [cacheError, setCacheError] = useState(false);
  const prepare = useCallback(
    () =>
      clearDocumentCache()
        .then(async () => {
          setCacheError(false);
          setCacheReady(true);
          await restoreSession();
        })
        .catch(() => {
          setCacheError(true);
        }),
    [],
  );
  const state = useSyncExternalStore(subscribeSession, getSession, getSession);
  const queryClient = useQueryClient();
  useEffect(() => {
    let account = getSession().user;
    const unsubscribe = subscribeSession(() => {
      const next = getSession();
      if (next.user !== account || next.status === 'signedOut')
        queryClient.clear();
      account = next.user;
    });
    void prepare();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshIfExpired().catch(() => undefined);
    });
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [queryClient, prepare]);

  async function login(identifier: string, password: string, remember = false) {
    try {
      await clearDocumentCache();
    } catch {
      throw new Error(
        'Temporary document files could not be cleared. Unlock the device and retry.',
      );
    }
    const demo = DEMO_ACCOUNTS[identifier.trim().toLowerCase()];
    if (__DEV__ && demo && password === 'campus123') await signInDemo(demo);
    else await signIn(identifier, password, remember);
  }
  async function logout() {
    setCacheReady(false);
    await signOut();
    await prepare();
  }
  if (cacheError)
    return (
      <View style={{ padding: theme.spacing.section }}>
        <Text>
          Temporary document files could not be cleared. Unlock the device, then
          retry.
        </Text>
        <Button onPress={() => void prepare()}>
          Retry private storage cleanup
        </Button>
      </View>
    );
  return (
    <AuthContext.Provider
      value={{
        ...state,
        status: cacheReady ? state.status : 'loading',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
