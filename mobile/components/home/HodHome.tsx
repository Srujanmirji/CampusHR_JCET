import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../ui/ScreenContainer';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../lib/auth-context';
import { campusClock, canReadHome } from '../../lib/home-api';
import { getDepartmentSummary, getDepartmentWorkload } from '../../lib/hod-api';
import { getLeaveRequests } from '../../lib/leave-api';
import {
  listCoverageLeave,
  coverageUnavailable,
} from '../../lib/substitution-api';
import { theme } from '../../lib/theme';
import { DataFreshness } from '../ui/DataFreshness';
import { WebTopbar } from '../layout/WebTopbar';
import { WebPageHeader } from '../shared/WebPageHeader';
import { WebWelcomeBanner } from '../shared/WebWelcomeBanner';
import { WebMetricCard } from '../shared/WebMetricCard';

export function HodHome() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const clock = campusClock();
  const live =
    !!accessToken &&
    !accessToken.startsWith('demo-') &&
    user?.role === 'HOD' &&
    !!user.departmentId;

  const queue = useQuery({
    queryKey: ['leave', user?.id, 'hod-home-queue'],
    queryFn: () => getLeaveRequests(accessToken, { awaitingMe: true }),
    enabled: live && canReadHome(user, 'leave.approve'),
    retry: false,
  });

  const cover = useQuery({
    queryKey: ['coverage', user?.id, 'leaves'],
    queryFn: () => listCoverageLeave(user, accessToken),
    enabled: live && !coverageUnavailable(user, accessToken),
    retry: false,
  });

  const workload = useQuery({
    queryKey: ['department-workload', user?.id],
    queryFn: () => getDepartmentWorkload(user),
    enabled: live && canReadHome(user, 'workload.read'),
    retry: false,
  });

  const report = useQuery({
    queryKey: ['department-summary', user?.id],
    queryFn: () => getDepartmentSummary(user),
    enabled: live && canReadHome(user, 'report.read'),
    retry: false,
  });

  const alerts = workload.data?.filter(
    (r) => r.status === 'OVERLOADED' || r.status === 'UNDERLOADED',
  ).length;

  const greetingHour = Number(
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }),
  );

  const refresh = () => {
    for (const key of [
      'leave',
      'coverage',
      'department-workload',
      'department-summary',
    ])
      void client.invalidateQueries({ queryKey: [key, user?.id] });
  };

  const refreshing = [queue, cover, workload, report].some(
    (q) => q.isRefetching,
  );

  return (
    <ScreenContainer
      testID="hod-home-screen"
      contentContainerStyle={styles.stack}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <WebTopbar breadcrumb="Dashboard" />

      <WebPageHeader
        title="Dashboard"
        subtitle="Department workforce and teaching continuity, at a glance."
      >
        <Button
          variant="secondary"
          accessibilityLabel="Refresh all Home summaries"
          onPress={refresh}
          style={styles.refreshButton}
        >
          <Icon name="refresh" color={theme.colors.primary} size={16} />
        </Button>
      </WebPageHeader>

      <WebWelcomeBanner
        title={`Good ${greetingHour < 12 ? 'morning' : greetingHour < 17 ? 'afternoon' : 'evening'}, ${user?.name || 'Dr. Ramesh K'}`}
        subtitle={`HOD · Computer Science & Engineering · JCET Hubballi · ${clock.date}`}
      />

      {/* Web-Style 2x2 Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Pending Approvals"
            value={queue.isSuccess ? `${queue.data.length}` : '—'}
            detail={
              queue.isSuccess
                ? `${queue.data.length} requests awaiting review`
                : 'Awaiting HOD review'
            }
            icon="leave"
            accentColor="#F59E0B"
            onPress={() => router.push('/(tabs)/approvals')}
          />
          <WebMetricCard
            label="Staff Present"
            value={
              report.isSuccess
                ? `${report.data.attendance.present} / ${report.data.headcount.total}`
                : '—'
            }
            detail="Staff present · UTC day"
            icon="attendance"
            accentColor="#10B981"
            onPress={() => router.push('/(tabs)/attendance')}
          />
        </View>

        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Workload Alerts"
            value={alerts !== undefined ? `${alerts}` : '—'}
            detail="Workload alerts"
            icon="workload"
            accentColor="#8B5CF6"
            onPress={() => router.push('/(tabs)/workload')}
          />
          <WebMetricCard
            label="Academic Continuity"
            value={
              report.isSuccess && report.data.continuity.affectedClasses
                ? `${report.data.continuity.coverageRate}%`
                : '—'
            }
            detail={
              report.isSuccess
                ? `${report.data.continuity.classesCovered} of ${report.data.continuity.affectedClasses} covered`
                : 'Department report unavailable.'
            }
            icon="school"
            accentColor="#0071E3"
            onPress={() => router.push('/leave/coverage')}
          />
        </View>
      </View>

      {/* Coverage Alert Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardBadge, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="coverage" color="#0071E3" size={18} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.heading}>Keep teaching on track</Text>
            <Text style={styles.body}>
              {cover.isSuccess
                ? `${cover.data.reduce((n, row) => n + row.classes - row.covered, 0)} classes need coverage`
                : cover.isFetching
                  ? 'Checking class coverage…'
                  : 'Coverage unavailable.'}
            </Text>
          </View>
        </View>
        {cover.isError && (
          <Text style={styles.error}>{cover.error.message}</Text>
        )}
        <View style={styles.cardFooter}>
          <DataFreshness
            updatedAt={cover.dataUpdatedAt}
            refreshing={cover.isFetching}
          />
          <Button
            variant="secondary"
            onPress={() => router.push('/leave/coverage')}
          >
            Find class coverage
          </Button>
        </View>
      </View>

      {/* Decisions & Department Overview */}
      <View style={styles.card}>
        <Text style={styles.heading}>Your department today</Text>
        <View style={styles.decisionRow}>
          <Text style={styles.metric}>
            {queue.isSuccess ? queue.data.length : '—'}
          </Text>
          <View style={styles.grow}>
            <Text style={styles.body}>Pending approvals</Text>
            {queue.isError && (
              <Text style={styles.error}>{queue.error.message}</Text>
            )}
          </View>
        </View>
        <View style={styles.cardFooter}>
          <DataFreshness
            updatedAt={queue.dataUpdatedAt}
            refreshing={queue.isFetching}
          />
          <Button
            variant="secondary"
            onPress={() => router.push('/(tabs)/approvals')}
          >
            Review requests
          </Button>
        </View>
      </View>

      {/* Pending Actions */}
      <View style={styles.card}>
        <Text style={styles.heading}>Pending actions</Text>
        <View style={styles.request}>
          <Text style={styles.body}>Leave request</Text>
          <Text style={styles.detail}>
            {queue.isSuccess
              ? `${queue.data.length} department leave ${queue.data.length === 1 ? 'request' : 'requests'} awaiting HOD recommendation`
              : 'Review pending department leave applications'}
          </Text>
        </View>
        <View style={styles.request}>
          <Text style={styles.body}>Attendance correction</Text>
          <Text style={styles.detail}>
            1 faculty attendance log correction pending verification
          </Text>
        </View>
        <View style={styles.request}>
          <Text style={styles.body}>Coverage request</Text>
          <Text style={styles.detail}>
            {cover.isSuccess
              ? `${cover.data.reduce((n, row) => n + row.classes - row.covered, 0)} scheduled classes require substitute assignment`
              : 'Assign faculty coverage for affected classes'}
          </Text>
        </View>
      </View>

      {/* Pending Approvals List */}
      {queue.isSuccess && queue.data.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.heading}>Pending approvals</Text>
          {queue.data.slice(0, 3).map((request) => (
            <View key={request.id} style={styles.request}>
              <Text style={styles.heading}>{request.employee.name}</Text>
              <Text style={styles.detail}>
                {request.leaveType.name} · {request.startDate} · {request.days}{' '}
                days
              </Text>
              <Text style={styles.body}>{request.reason}</Text>
              <Button
                variant="accent"
                onPress={() => router.push('/(tabs)/approvals')}
              >
                Review leave
              </Button>
            </View>
          ))}
        </View>
      )}

      {/* Academic Continuity Breakdown */}
      <View style={styles.card}>
        <Text style={styles.heading}>Academic continuity</Text>
        <Text style={styles.metric}>
          {report.isSuccess && report.data.continuity.affectedClasses
            ? `${report.data.continuity.coverageRate}%`
            : '—'}
        </Text>
        <Text style={styles.detail}>
          {report.isSuccess
            ? `${report.data.continuity.classesCovered} of ${report.data.continuity.affectedClasses} affected classes covered · Report period`
            : 'Department report unavailable.'}
        </Text>
        {report.isError && (
          <Text style={styles.error}>{report.error.message}</Text>
        )}
        <View style={styles.cardFooter}>
          <Button
            variant="secondary"
            onPress={() => router.push('/(tabs)/workload')}
          >
            View department workload
          </Button>
        </View>
      </View>

      {workload.isError && (
        <Text style={styles.error}>{workload.error.message}</Text>
      )}
      {!live && (
        <Text style={styles.detail}>
          Sign in with a department-linked HOD account to view live information.
        </Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
    paddingBottom: 40,
  },
  refreshButton: {
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  metricsGrid: {
    gap: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    marginTop: 4,
    gap: 8,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  request: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
    gap: 6,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  body: {
    fontSize: 14,
    color: '#1D1D1F',
    flexShrink: 1,
  },
  detail: {
    fontSize: 13,
    color: '#6E6E73',
    lineHeight: 18,
  },
  error: {
    fontSize: 13,
    color: theme.colors.errorInk,
    lineHeight: 18,
  },
  metric: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  grow: {
    flex: 1,
  },
});
