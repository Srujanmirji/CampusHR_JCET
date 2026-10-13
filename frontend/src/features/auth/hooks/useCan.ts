import { useSession } from './useSession';

export type Scope = 'all' | 'department' | 'own';
const SCOPES: Scope[] = ['all', 'department', 'own'];

// UI only: the server enforces every permission itself.

/** The widest scope at which the user holds `permission` (`resource.action`). */
export function useScope() {
  const session = useSession();
  return (permission: string): Scope | undefined =>
    session.status === 'signedIn'
      ? SCOPES.find((scope) =>
          session.user.permissions.includes(`${permission}.${scope}`),
        )
      : undefined;
}

/** Whether the user holds `permission` at any scope. */
export function useCan() {
  const scopeOf = useScope();
  return (permission?: string) =>
    !permission || scopeOf(permission) !== undefined;
}
