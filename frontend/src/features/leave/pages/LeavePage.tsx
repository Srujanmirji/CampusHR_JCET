import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScope } from '@/features/auth/hooks/useCan';
import { useLeaveWaiting } from '../hooks/useLeaveWaiting';
import { LeaveRequestDrawer } from '../components/LeaveRequestDrawer';
import { LeaveTypesPanel } from '../components/LeaveTypesPanel';
import { MyLeave } from '../components/MyLeave';
import { RequestsPanel, type RequestsView } from '../components/RequestsPanel';

type Tab = 'mine' | 'requests' | 'types';

export default function LeavePage() {
  const scopeOf = useScope();
  const [params, setParams] = useSearchParams();
  const canApply = scopeOf('leave.apply') !== undefined;
  const canDecide = scopeOf('leave.approve') !== undefined;
  const readScope = scopeOf('leave.read');
  const canSeeOthers =
    canDecide || readScope === 'all' || readScope === 'department';
  const canManageTypes = scopeOf('leave_type.manage') !== undefined;

  const waiting = useLeaveWaiting();
  const tabs = [
    ...(canApply ? (['mine'] as const) : []),
    ...(canSeeOthers ? (['requests'] as const) : []),
    ...(canManageTypes ? (['types'] as const) : []),
  ];
  // Approvers land on requests; everyone else on their own leave.
  const fallback: Tab = canSeeOthers ? 'requests' : (tabs[0] ?? 'mine');
  const tab = tabs.find((item) => item === params.get('tab')) ?? fallback;
  const view =
    (params.get('show') as RequestsView | null) ??
    (canDecide ? 'MINE_TO_DECIDE' : 'PENDING');
  const openId = params.get('request');

  const update = (changes: Record<string, string | null>) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  const open = (request: { id: string }) => update({ request: request.id });

  return (
    <PageTransition>
      <PageHeader
        title="Leave management"
        description="Apply for leave, follow each approval step, and decide requests waiting for you."
      />
      <Tabs value={tab} onValueChange={(value) => update({ tab: value })}>
        {tabs.length > 1 && (
          <TabsList className="mb-4">
            {canApply && <TabsTrigger value="mine">My leave</TabsTrigger>}
            {canSeeOthers && (
              <TabsTrigger value="requests">
                Requests
                {waiting.data?.length ? (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                    {waiting.data.length}
                    <span className="sr-only"> waiting for you</span>
                  </span>
                ) : null}
              </TabsTrigger>
            )}
            {canManageTypes && (
              <TabsTrigger value="types">Leave types</TabsTrigger>
            )}
          </TabsList>
        )}
        {canApply && (
          <TabsContent value="mine">
            <MyLeave onOpen={open} />
          </TabsContent>
        )}
        {canSeeOthers && (
          <TabsContent value="requests">
            <RequestsPanel
              view={view}
              onViewChange={(next) => update({ show: next })}
              canDecide={canDecide}
              onOpen={open}
            />
          </TabsContent>
        )}
        {canManageTypes && (
          <TabsContent value="types">
            <LeaveTypesPanel />
          </TabsContent>
        )}
      </Tabs>
      <LeaveRequestDrawer
        requestId={openId}
        onClose={() => update({ request: null })}
      />
    </PageTransition>
  );
}
