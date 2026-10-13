import { createContext, useContext } from 'react';
import type { SessionUser } from '../api/auth';

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: SessionUser };

export const SessionContext = createContext<
  | (Session & {
      login: (input: {
        email: string;
        password: string;
        remember: boolean;
      }) => Promise<void>;
      logout: () => Promise<void>;
    })
  | null
>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within Providers.');
  return context;
}
