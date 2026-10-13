import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, onSessionExpired, setAccessToken } from '@/services/api';
import * as authApi from './api/auth';
import { SessionContext, type Session } from './hooks/useSession';

const CONCURRENT_REFRESH_RETRY_MS = 1_000;

// Gets a fresh session from the HttpOnly refresh cookie.
async function restore(retried = false): Promise<Session> {
  try {
    const { accessToken, user } = await authApi.refresh();
    setAccessToken(accessToken);
    return { status: 'signedIn', user };
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
    setAccessToken(undefined);
    return { status: 'signedOut' };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    void restore().then((restored) => {
      if (active) setSession(restored);
    });
    // An API call found the access token expired (or the account disabled).
    onSessionExpired(async () => {
      const renewed = await restore();
      setSession(renewed);
      return renewed.status === 'signedIn';
    });
    return () => {
      active = false;
    };
  }, []);

  async function login(input: {
    identifier: string;
    password: string;
    remember: boolean;
  }) {
    const { accessToken, user } = await authApi.login(input);
    setAccessToken(accessToken);
    setSession({ status: 'signedIn', user });
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      // Sign out locally even if the server is unreachable, and drop cached
      // data so the next person does not see it.
      setAccessToken(undefined);
      queryClient.clear();
      setSession({ status: 'signedOut', loggedOut: true });
    }
  }

  return (
    <SessionContext.Provider value={{ ...session, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
