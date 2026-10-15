import { useQuery } from '@tanstack/react-query';
import { useScope } from '@/features/auth/hooks/useCan';
import { listRequests } from '../api/leave';

/** Leave requests waiting for the signed-in user's decision. */
export function useLeaveWaiting() {
  const canDecide = useScope()('leave.approve') !== undefined;
  return useQuery({
    queryKey: ['leave', 'requests', { awaitingMe: true }],
    queryFn: () => listRequests({ awaitingMe: true }),
    enabled: canDecide,
  });
}
