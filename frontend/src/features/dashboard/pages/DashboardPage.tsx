import { useEffect, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { metrics } from '@/data/mock/dashboard';
import { useLeaveWaiting } from '@/features/leave/hooks/useLeaveWaiting';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { DashboardCharts } from '../components/DashboardCharts';
import { RecentLeaveRequests } from '../components/RecentLeaveRequests';
import { QuickActions } from '../components/QuickActions';
import { NotificationsPreview } from '../components/NotificationsPreview';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export default function DashboardPage() {
  const pending = useLeaveWaiting().data?.length ?? 0;
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [loading]);
  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        description="Your people and campus operations, at a glance."
        action={
          <div className="dashboard-heading-actions">
            <span>
              <CalendarDays aria-hidden="true" />
              March 2026
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLoading(true)}
              disabled={loading}
              aria-label="Refresh dashboard"
            >
              <RefreshCw />
            </Button>
          </div>
        }
      />
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="welcome-banner" aria-labelledby="welcome-title">
            <div>
              <h2 id="welcome-title">Welcome to CampusHR</h2>
              <p>Jain College of Engineering and Technology, Hubballi</p>
              <span>
                Manage People <b>•</b> Simplify Processes <b>•</b> Enable
                Academic Excellence
              </span>
            </div>
            <img
              src="/assets/jcet-campus.png"
              alt=""
              width="656"
              height="305"
            />
          </section>
          <section
            aria-label="Campus HR key indicators"
            className="metrics-grid"
          >
            {metrics.map((metric, index) => {
              const metricRoutes: Record<string, string> = {
                employees: '/employees',
                present: '/attendance',
                leave: '/leave',
                pending: '/leave',
                departments: '/employees',
                workload: '/workload',
              };

              return (
                <MetricCard
                  key={metric.id}
                  label={metric.label}
                  value={metric.id === 'pending' ? pending : metric.value}
                  detail={metric.detail}
                  icon={metric.icon}
                  index={index}
                  href={metricRoutes[metric.id]}
                />
              );
            })}
          </section>
          <DashboardCharts />
          <div className="dashboard-lower">
            <RecentLeaveRequests />
            <QuickActions />
          </div>
          <NotificationsPreview />
        </>
      )}
    </PageTransition>
  );
}
