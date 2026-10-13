import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { motionTiming } from '@/lib/motion';
import { AcademicWorkflowProvider } from '@/features/leave/AcademicWorkflowProvider';
import { SessionProvider } from '@/features/auth/SessionProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}
