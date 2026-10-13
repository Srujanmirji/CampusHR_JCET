import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { motionTiming } from '@/lib/motion';
import { AcademicWorkflowProvider } from '@/features/leave/AcademicWorkflowProvider';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import {
  PreviewSessionContext,
  previewSessionKey,
  readPreviewSession,
} from '@/features/auth/hooks/usePreviewSession';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(readPreviewSession);
  function login(remember: boolean) {
    try {
      localStorage.removeItem(previewSessionKey);
      sessionStorage.removeItem(previewSessionKey);
      (remember ? localStorage : sessionStorage).setItem(
        previewSessionKey,
        'active',
      );
    } catch {
      toast.info(
        'Browser storage is unavailable. Your session lasts while the page is open.',
      );
    }
    setSignedIn(true);
  }
  function logout() {
    try {
      localStorage.removeItem(previewSessionKey);
      sessionStorage.removeItem(previewSessionKey);
    } catch {
      toast.info(
        'Browser storage could not be cleared. Close this browser tab to sign out.',
      );
    }
    setSignedIn(false);
  }
  return (
    <PreviewSessionContext.Provider value={{ signedIn, login, logout }}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig
          reducedMotion="user"
          transition={{ duration: motionTiming.duration, ease: 'easeOut' }}
        >
          <TooltipProvider delayDuration={200}>
            <AcademicWorkflowProvider>{children}</AcademicWorkflowProvider>
          </TooltipProvider>
          <Toaster position="bottom-right" closeButton />
        </MotionConfig>
      </QueryClientProvider>
    </PreviewSessionContext.Provider>
  );
}
