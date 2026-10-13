import { useSession } from './useSession';

const SCOPES = ['all', 'department', 'own'];

// Whether the signed-in user holds `permission` (`resource.action`) at any scope.
// UI only: the server enforces every permission itself.
export function useCan() {
  const session = useSession();
  return (permission?: string) =>
    !permission ||
    (session.status === 'signedIn' &&
      SCOPES.some((scope) =>
        session.user.permissions.includes(`${permission}.${scope}`),
      ));
}
