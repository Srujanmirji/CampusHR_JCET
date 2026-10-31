import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../ui/ScreenContainer';
import { Button } from '../ui/Button';
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
export function HodHome() {
  const { user, accessToken } = useAuth();
  const router = useRouter(),
    client = useQueryClient();
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
  const greeting = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  });
  const refresh = () => {
    for (const key of [
      'leave',
      'coverage',
      'department-workload',
      'department-summary',
    ])
      void client.invalidateQueries({ queryKey: [key, user?.id] });
  };
  return (
    <ScreenContainer
      testID="hod-home-screen"
      contentContainerStyle={styles.stack}
      refreshControl={
        <RefreshControl
          refreshing={[queue, cover, workload, report].some(
            (q) => q.isRefetching,
          )}
          onRefresh={refresh}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.greeting}>
          Good{' '}
          {Number(greeting) < 12
            ? 'morning'
            : Number(greeting) < 17
              ? 'afternoon'
              : 'evening'}
          ,{'\n'}
          {user?.name}
        </Text>

        <Text style={styles.heroMeta}>{clock.date}</Text>
      </View>
      <View style={styles.coverageAlert}>
        <Text style={[styles.heading, styles.onHero]}>
          Keep teaching on track
        </Text>
        <Text style={[styles.body, styles.onHero]}>
          {cover.isSuccess
            ? `${cover.data.reduce((n, row) => n + row.classes - row.covered, 0)} classes need coverage`
            : cover.isFetching
              ? 'Checking class coverage…'
              : 'Coverage unavailable.'}
        </Text>
        {cover.isError && (
          <Text style={[styles.error, styles.onHero]}>
            {cover.error.message}
          </Text>
        )}
        <DataFreshness
          updatedAt={cover.dataUpdatedAt}
          refreshing={cover.isFetching}
          inverse
        />
        <Button
          variant="secondary"
          onPress={() => router.push('/leave/coverage')}
        >
          Find class coverage
        </Button>
      </View>
      <View style={styles.decisions}>
        <Text style={styles.heading}>Your department today</Text>
        <View style={styles.decision}>
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
      <View style={styles.summary}>
        <View style={styles.grow}>
          <Text style={styles.heading}>
            {report.isSuccess
              ? `${report.data.attendance.present} / ${report.data.headcount.total}`
              : '—'}
          </Text>
          <Text style={styles.detail}>Staff present · UTC day</Text>
          <DataFreshness
            updatedAt={report.dataUpdatedAt}
            refreshing={report.isFetching}
          />
        </View>
        <View style={styles.grow}>
          <Text style={styles.heading}>{alerts ?? '—'}</Text>
          <Text style={styles.detail}>Workload alerts</Text>
          <DataFreshness
            updatedAt={workload.dataUpdatedAt}
            refreshing={workload.isFetching}
          />
        </View>
      </View>
      {queue.isSuccess && queue.data.length > 0 && (
        <View style={styles.section}>
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
      <View style={styles.section}>
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
      </View>
      <Button
        variant="secondary"
        onPress={() => router.push('/(tabs)/workload')}
      >
        View department workload
      </Button>
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
  stack: { gap: theme.spacing.page, paddingBottom: theme.spacing.xl },
  hero: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  heroMeta: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.mutedForeground,
    lineHeight: 22,
  },
  request: {
    paddingVertical: theme.spacing.section,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  greeting: {
    fontSize: theme.typography.greeting,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    color: theme.colors.foreground,
    lineHeight: theme.typography.greetingLineHeight,
  },
  heading: {
    fontSize: theme.typography.subheading,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  body: {
    fontSize: theme.typography.body,
    color: theme.colors.brandDeep,
    flexShrink: 1,
  },
  detail: {
    fontSize: theme.typography.secondary,
    color: theme.colors.mutedForeground,
    lineHeight: 22,
    marginTop: 4,
  },
  error: {
    fontSize: theme.typography.secondary,
    color: theme.colors.errorInk,
    lineHeight: 22,
  },
  metric: {
    fontSize: theme.typography.metric,
    fontWeight: '600',
    color: theme.colors.brandDeep,
  },
  coverageAlert: {
    padding: theme.spacing.page,
    backgroundColor: theme.colors.hero,
    borderRadius: theme.radius.hero,
    gap: theme.spacing.md,
    shadowColor: '#0F2557',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
  },
  decisions: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    gap: theme.spacing.md,
  },
  decision: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    gap: theme.spacing.page,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  grow: { flex: 1 },
  onHero: { color: theme.colors.onHero },
  section: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
});
