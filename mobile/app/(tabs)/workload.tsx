import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { getDepartmentWorkload } from '../../lib/hod-api';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { theme } from '../../lib/theme';
import { Skeleton } from '../../components/ui/Skeleton';
export default function Workload() {
  const { user, accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['department-workload', user?.id],
    queryFn: () => getDepartmentWorkload(user),
    enabled:
      user?.role === 'HOD' && !!accessToken && !accessToken.startsWith('demo-'),
    retry: false,
  });
  if (user?.role !== 'HOD') return <Redirect href="/(tabs)" />;
  return (
    <ScreenContainer
      contentContainerStyle={{ gap: theme.spacing.section }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
        />
      }
    >
      <Text
        style={{
          fontSize: theme.typography.heading,
          fontWeight: '600',
          color: theme.colors.foreground,
        }}
      >
        Workload
      </Text>
      <Text
        style={{
          fontSize: theme.typography.secondary,
          color: theme.colors.mutedForeground,
        }}
      >
        Scheduled teaching hours · Weekly
      </Text>
      {query.isPending && <Skeleton label="Loading department workload" />}
      {query.isError && (
        <>
          <Text
            accessibilityRole="alert"
            style={{ color: theme.colors.errorInk }}
          >
            {query.error.message}
          </Text>
          <Button onPress={() => void query.refetch()}>Retry workload</Button>
        </>
      )}
      {query.isSuccess && (
        <>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              padding: theme.spacing.section,
              borderRadius: theme.radius.card,
              gap: theme.spacing.sm,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
              ...theme.shadows.card,
            }}
          >
            <Text
              style={{
                fontSize: theme.typography.metric,
                fontWeight: '600',
                color: theme.colors.primary,
              }}
            >
              {query.data.length
                ? (
                    query.data.reduce((n, row) => n + row.totalHours, 0) /
                    query.data.length
                  ).toFixed(1)
                : '—'}{' '}
              hrs/wk
            </Text>
            <Text
              style={{
                fontSize: theme.typography.secondary,
                color: theme.colors.mutedForeground,
              }}
            >
              Average scheduled load · {query.data.length} faculty
            </Text>
          </View>
          <Text
            style={{
              fontSize: theme.typography.body,
              color: theme.colors.warning,
            }}
          >
            {
              query.data.filter(
                (r) => r.status === 'OVERLOADED' || r.status === 'UNDERLOADED',
              ).length
            }{' '}
            workload alerts
          </Text>
          {!query.data.length && (
            <Text>No teaching workload records in your department.</Text>
          )}
          {query.data.map((r) => (
            <View
              key={r.faculty.id}
              style={{
                padding: theme.spacing.section,
                gap: theme.spacing.sm,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
                ...theme.shadows.card,
              }}
            >
              <Text
                style={{
                  fontSize: theme.typography.body,
                  fontWeight: '600',
                  color: theme.colors.foreground,
                }}
              >
                {r.faculty.name}
              </Text>
              <Text
                style={{
                  fontSize: theme.typography.secondary,
                  color: theme.colors.mutedForeground,
                }}
              >
                {r.faculty.department.name}
              </Text>
              <Text
                style={{
                  fontSize: theme.typography.body,
                  color:
                    r.status === 'OVERLOADED'
                      ? theme.colors.warning
                      : theme.colors.foreground,
                }}
              >
                {r.totalHours}
                {r.maxHours != null ? ` / ${r.maxHours}` : ''} hrs ·{' '}
                {r.status === 'OVERLOADED'
                  ? 'Over capacity'
                  : r.status === 'UNDERLOADED'
                    ? 'Below workload band'
                    : r.status === 'NORMAL'
                      ? 'Within workload band'
                      : 'Band not configured'}
              </Text>
              {r.maxHours != null && r.maxHours > 0 && (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={`${r.faculty.name} weekly teaching capacity`}
                  accessibilityValue={{
                    min: 0,
                    max: r.maxHours,
                    now: r.totalHours,
                    text: `${r.totalHours} of ${r.maxHours} hours`,
                  }}
                  style={{
                    height: theme.spacing.sm,
                    backgroundColor: theme.colors.muted,
                    borderRadius: theme.radius.control,
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, (r.totalHours / r.maxHours) * 100)}%`,
                      height: '100%',
                      borderRadius: theme.radius.control,
                      backgroundColor:
                        r.status === 'OVERLOADED'
                          ? theme.colors.warning
                          : theme.colors.primary,
                    }}
                  />
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}
