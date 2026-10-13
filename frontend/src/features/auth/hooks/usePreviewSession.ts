import { createContext, useContext } from 'react';

export const previewSessionKey = 'campushr-ui-preview';
export const PreviewSessionContext = createContext<{
  signedIn: boolean;
  login: (remember: boolean) => void;
  logout: () => void;
} | null>(null);

export function usePreviewSession() {
  const context = useContext(PreviewSessionContext);
  if (!context)
    throw new Error('Preview session must be used within Providers.');
  return context;
}

export function readPreviewSession() {
  try {
    return (
      localStorage.getItem(previewSessionKey) === 'active' ||
      sessionStorage.getItem(previewSessionKey) === 'active'
    );
  } catch {
    return false;
  }
}
