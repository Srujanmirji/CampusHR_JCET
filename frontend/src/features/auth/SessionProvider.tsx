import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '@/services/api';
import * as authApi from './api/auth';
import { SessionContext, type Session } from './hooks/useSession';

const CONCURRENT_REFRESH_RETRY_MS = 1_000;

// Restores the session from the HttpOnly refresh cookie on load.
async function restore(retried = false): Promise<Session> {
  try {
    return { status: 'signedIn', user: (await authApi.refresh()).user };
  } catch (error) {
    // Another tab is refreshing the same cookie; its new cookie arrives shortly.
    if (
      !retried &&
      error instanceof ApiError &&
      error.code === 'REFRESH_IN_PROGRESS'
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, CONCURRENT_REFRESH_RETRY_MS),
      );
      return restore(true);
    }
    return { status: 'signedOut' };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void restore().then((restored) => {
      if (active) setSession(restored);
    });
    return () => {
      active = false;
    };
  }, []);

  async function login(input: {
    email: string;
    password: string;
    remember: boolean;
  }) {
    const { user } = await authApi.login(input);
    setSession({ status: 'signedIn', user });
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      // Sign out locally even if the server is unreachable.
      setSession({ status: 'signedOut' });
    }
  }

  return (
    <SessionContext.Provider value={{ ...session, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
