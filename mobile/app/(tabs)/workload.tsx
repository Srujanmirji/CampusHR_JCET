import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { getDepartmentWorkload } from '../../lib/hod-api';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { FacultyInitials } from '../../components/leave/LeavePresentation';
import { theme } from '../../lib/theme';
import { Skeleton } from '../../components/ui/Skeleton';

const WORKLOAD_FILTERS = [
  'All',
  'Available',
  'Normal',
  'Near limit',
  'At capacity',
  'Overloaded',
] as const;

type WorkloadFilter = (typeof WORKLOAD_FILTERS)[number];

type WorkloadItem = Awaited<ReturnType<typeof getDepartmentWorkload>>[number];

function classifyWorkload(r: WorkloadItem): {
  band: Exclude<WorkloadFilter, 'All'>;
  label: string;
  ink: string;
  bg: string;
} {
  const max = r.maxHours ?? 18;
  if (r.status === 'OVERLOADED' || (r.maxHours != null && r.totalHours > max)) {
    return {
      band: 'Overloaded',
      label: 'Overloaded',
      ink: theme.colors.coralInk,
      bg: theme.colors.coralContainer,
    };
  }
  if (r.maxHours != null && r.totalHours === max) {
    return {
      band: 'At capacity',
      label: 'At capacity',
      ink: theme.colors.amberInk,
      bg: theme.colors.amberContainer,
    };
  }
  if (r.maxHours != null && r.totalHours >= max - 2) {
    return {
      band: 'Near limit',
      label: 'Near limit',
      ink: theme.colors.amberInk,
      bg: theme.colors.amberContainer,
    };
  }
  if (r.status === 'UNDERLOADED' || r.totalHours <= max - 4) {
    return {
      band: 'Available',
      label: 'Available',
      ink: theme.colors.mintInk,
      bg: theme.colors.mintContainer,
    };
  }
  return {
    band: 'Normal',
    label: 'Normal',
    ink: theme.colors.primary,
    bg: theme.colors.blueContainer,
  };
}

function getDesignation(name: string): string {
  if (name.startsWith('Dr.')) return 'Associate Professor';
  return 'Assistant Professor';
}

export default function Workload() {
  const { user, accessToken } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [filter, setFilter] = useState<WorkloadFilter>('All');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(
    null,
  );

  const query = useQuery({
    queryKey: ['department-workload', user?.id],
    queryFn: () => getDepartmentWorkload(user),
    enabled:
      user?.role === 'HOD' && !!accessToken && !accessToken.startsWith('demo-'),
    retry: false,
  });

  if (user?.role !== 'HOD') return <Redirect href="/(tabs)" />;

  const allRows = query.data ?? [];
  const filteredRows = allRows.filter((r) => {
    if (filter === 'All') return true;
    const { band } = classifyWorkload(r);
    if (filter === 'Available') {
      return (
        band === 'Available' ||
        band === 'Normal' ||
        r.totalHours < (r.maxHours ?? 18)
      );
    }
    return band === filter;
  });

  const selectedFaculty =
    allRows.find((r) => r.faculty.id === selectedFacultyId) ??
    (isTablet ? filteredRows[0] ?? null : null);

  const renderDetailCard = (item: WorkloadItem) => {
    const info = classifyWorkload(item);
    const max = item.maxHours ?? 18;
    const freePeriods = Math.max(0, 30 - item.totalHours);
    const theoryHours = Math.max(0, item.totalHours - 4);
    const labHours = Math.min(4, item.totalHours);
    return (
      <View style={styles.detailCard}>
        <View style={styles.rowHeader}>
          <FacultyInitials name={item.faculty.name} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.detailName}>{item.faculty.name}</Text>
            <Text style={styles.secondaryText}>
              {getDesignation(item.faculty.name)} ·{' '}
              {item.faculty.department.name}
            </Text>
            <Text style={styles.captionText}>{item.faculty.employeeCode}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: info.bg }]}>
            <Text style={[styles.badgeText, { color: info.ink }]}>
              {info.label}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>
              {item.totalHours} / {max} hrs
            </Text>
            <Text style={styles.captionText}>Current / Limit</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricNumber, { color: theme.colors.mintInk }]}>
              {freePeriods}
            </Text>
            <Text style={styles.captionText}>Free periods / wk</Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.groupHeading}>Weekly allocation breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.bodyText}>Theory lectures</Text>
            <Text style={styles.bodyStrong}>{theoryHours} hrs / wk</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.bodyText}>Laboratory sessions</Text>
            <Text style={styles.bodyStrong}>{labHours} hrs / wk</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.bodyText}>Substitution headroom</Text>
            <Text style={styles.bodyStrong}>
              {Math.max(0, max - item.totalHours)} hrs available
            </Text>
          </View>
        </View>
      </View>
    );
  };

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
      <View style={{ gap: 4 }}>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: theme.typography.heading,
            fontWeight: '600',
            color: theme.colors.foreground,
          }}
        >
          Department workload
        </Text>
        <Text
          style={{
            fontSize: theme.typography.secondary,
            color: theme.colors.mutedForeground,
          }}
        >
          Scheduled teaching hours · Weekly capacity & free periods
        </Text>
      </View>

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
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text
                style={{
                  fontSize: theme.typography.metric,
                  fontWeight: '600',
                  color: theme.colors.primary,
                }}
              >
                {allRows.length
                  ? (
                      allRows.reduce((n, row) => n + row.totalHours, 0) /
                      allRows.length
                    ).toFixed(1)
                  : '—'}{' '}
                hrs/wk
              </Text>
              <Text style={styles.secondaryText}>
                Average scheduled load · {allRows.length} faculty
              </Text>
            </View>
            <View style={styles.alertBadgeCard}>
              <Text
                style={{
                  fontSize: theme.typography.subheading,
                  fontWeight: '600',
                  color: theme.colors.warning,
                }}
              >
                {
                  allRows.filter(
                    (r) =>
                      r.status === 'OVERLOADED' || r.status === 'UNDERLOADED',
                  ).length
                }{' '}
                workload alerts
              </Text>
              <Text style={styles.captionText}>Capacity band check</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterStrip}
          >
            {WORKLOAD_FILTERS.map((item) => {
              const active = filter === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(item)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!filteredRows.length && (
            <Text style={styles.secondaryText}>
              No teaching workload records in your department.
            </Text>
          )}

          <View style={isTablet ? styles.tabletSplit : styles.stack}>
            <View style={isTablet ? styles.tabletListCol : styles.stack}>
              {filteredRows.map((r) => {
                const info = classifyWorkload(r);
                const max = r.maxHours ?? 18;
                const freePeriods = Math.max(0, 30 - r.totalHours);
                const isSelected = selectedFaculty?.faculty.id === r.faculty.id;
                return (
                  <Pressable
                    key={r.faculty.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Inspect workload for ${r.faculty.name}`}
                    onPress={() => setSelectedFacultyId(r.faculty.id)}
                    style={[
                      styles.facultyCard,
                      isTablet && isSelected && styles.facultyCardSelected,
                    ]}
                  >
                    <View style={styles.rowHeader}>
                      <FacultyInitials name={r.faculty.name} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.bodyStrong}>{r.faculty.name}</Text>
                        <Text style={styles.secondaryText}>
                          {getDesignation(r.faculty.name)} ·{' '}
                          {r.faculty.department.name}
                        </Text>
                      </View>
                      <View
                        style={[styles.badge, { backgroundColor: info.bg }]}
                      >
                        <Text style={[styles.badgeText, { color: info.ink }]}>
                          {info.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statsInline}>
                      <Text
                        style={{
                          fontSize: theme.typography.body,
                          color:
                            r.status === 'OVERLOADED'
                              ? theme.colors.warning
                              : theme.colors.foreground,
                          fontWeight: '500',
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
                      <Text style={styles.freePeriodsText}>
                        {freePeriods} free periods
                      </Text>
                    </View>

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
                        style={styles.progressTrack}
                      >
                        <View
                          style={{
                            width: `${Math.min(100, (r.totalHours / max) * 100)}%`,
                            height: '100%',
                            backgroundColor:
                              r.status === 'OVERLOADED'
                                ? theme.colors.warning
                                : theme.colors.primary,
                            borderRadius: theme.radius.control,
                          }}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {isTablet && selectedFaculty && (
              <View style={styles.tabletDetailCol}>
                {renderDetailCard(selectedFaculty)}
              </View>
            )}
          </View>
        </>
      )}

      {!isTablet && (
        <Modal
          visible={!!selectedFacultyId && !!selectedFaculty}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedFacultyId(null)}
        >
          <SafeAreaView style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.rowHeader}>
                <Text style={styles.detailName}>Workload detail</Text>
                <Button
                  variant="text"
                  accessibilityLabel="Close workload detail"
                  onPress={() => setSelectedFacultyId(null)}
                >
                  <Icon name="close" color={theme.colors.primary} />
                </Button>
              </View>
              {selectedFaculty && renderDetailCard(selectedFaculty)}
              <Button fullWidth onPress={() => setSelectedFacultyId(null)}>
                Done
              </Button>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.md },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.section,
    borderRadius: theme.radius.card,
    gap: theme.spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  alertBadgeCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.section,
    borderRadius: theme.radius.card,
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  filterStrip: {
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.mutedForeground,
  },
  filterChipTextActive: {
    color: theme.colors.surface,
  },
  facultyCard: {
    padding: theme.spacing.section,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  facultyCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.blueContainer,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  statsInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  freePeriodsText: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.mintInk,
  },
  progressTrack: {
    height: theme.spacing.sm,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.control,
    overflow: 'hidden',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  bodyStrong: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  secondaryText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.mutedForeground,
  },
  captionText: {
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  tabletSplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.section,
  },
  tabletListCol: {
    flex: 1.2,
    gap: theme.spacing.md,
  },
  tabletDetailCol: {
    flex: 1,
  },
  detailCard: {
    padding: theme.spacing.section,
    gap: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  detailName: {
    fontSize: theme.typography.subheading,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metricBox: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.background,
    gap: 4,
  },
  metricNumber: {
    fontSize: theme.typography.subheading,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  groupHeading: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  sheetContent: {
    padding: theme.spacing.page,
    gap: theme.spacing.section,
  },
});
