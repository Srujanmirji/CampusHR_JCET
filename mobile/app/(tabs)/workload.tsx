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
import { Skeleton } from '../../components/ui/Skeleton';
import { WebTopbar } from '../../components/layout/WebTopbar';
import { WebPageHeader } from '../../components/shared/WebPageHeader';
import { WebMetricCard } from '../../components/shared/WebMetricCard';
import { theme } from '../../lib/theme';

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
      ink: '#DC2626',
      bg: '#FEE2E2',
    };
  }
  if (r.maxHours != null && r.totalHours === max) {
    return {
      band: 'At capacity',
      label: 'At capacity',
      ink: '#D97706',
      bg: '#FEF3C7',
    };
  }
  if (r.maxHours != null && r.totalHours >= max - 2) {
    return {
      band: 'Near limit',
      label: 'Near limit',
      ink: '#D97706',
      bg: '#FEF3C7',
    };
  }
  if (r.status === 'UNDERLOADED' || r.totalHours <= max - 4) {
    return {
      band: 'Available',
      label: 'Available',
      ink: '#059669',
      bg: '#D1FAE5',
    };
  }
  return {
    band: 'Normal',
    label: 'Normal',
    ink: '#0071E3',
    bg: '#EFF6FF',
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
            <Text style={[styles.metricNumber, { color: '#059669' }]}>
              {freePeriods}
            </Text>
            <Text style={styles.captionText}>Free periods / wk</Text>
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 4 }}>
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
      contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <WebTopbar breadcrumb="Faculty Workload" />

      <WebPageHeader
        title="Faculty workload"
        subtitle="Weekly teaching hours from the timetable, against each designation's band."
      >
        <Button
          variant="secondary"
          onPress={() => void query.refetch()}
          style={styles.refreshButton}
        >
          <Icon name="refresh" color={theme.colors.primary} size={16} />
        </Button>
      </WebPageHeader>

      {/* Web-Style 2x2 Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Faculty"
            value={`${allRows.length}`}
            detail="Total in department"
            icon="profile"
            accentColor="#0071E3"
          />
          <WebMetricCard
            label="Normal"
            value={`${allRows.filter((r) => r.status === 'NORMAL').length}`}
            detail="Within workload band"
            icon="attendance"
            accentColor="#10B981"
          />
        </View>

        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Underloaded"
            value={`${allRows.filter((r) => r.status === 'UNDERLOADED').length}`}
            detail="Headroom available"
            icon="workload"
            accentColor="#F59E0B"
          />
          <WebMetricCard
            label="Overloaded"
            value={`${allRows.filter((r) => r.status === 'OVERLOADED').length}`}
            detail="Above max capacity"
            icon="clock"
            accentColor="#8B5CF6"
          />
        </View>
      </View>

      {query.isPending && <Skeleton label="Loading department workload" />}
      {query.isError && (
        <View style={styles.card}>
          <Text
            accessibilityRole="alert"
            style={{ color: theme.colors.errorInk }}
          >
            {query.error.message}
          </Text>
          <Button onPress={() => void query.refetch()}>Retry workload</Button>
        </View>
      )}

      {query.isSuccess && (
        <>
          {/* Filter Strip */}
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
            <View style={styles.card}>
              <Text style={styles.secondaryText}>
                No teaching workload records in your department.
              </Text>
            </View>
          )}

          <View style={isTablet ? styles.tabletSplit : styles.stack}>
            <View style={isTablet ? styles.tabletListCol : styles.stack}>
              {filteredRows.map((r) => {
                const info = classifyWorkload(r);
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
                          fontSize: 14,
                          color:
                            r.status === 'OVERLOADED'
                              ? '#DC2626'
                              : '#0F172A',
                          fontWeight: '600',
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {r.totalHours}
                        {r.maxHours != null ? ` / ${r.maxHours}` : ''} hrs ·{' '}
                        {r.status === 'OVERLOADED'
                          ? 'Over capacity'
                          : r.status === 'UNDERLOADED'
                            ? 'Below workload band'
                            : r.status === 'NORMAL'
                              ? 'Within band'
                              : r.status}
                      </Text>
                    </View>
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

          {/* Modal for Mobile when tapping a faculty */}
          {!isTablet && selectedFacultyId && selectedFaculty && (
            <Modal
              visible
              animationType="slide"
              transparent
              onRequestClose={() => setSelectedFacultyId(null)}
            >
              <View style={styles.modalOverlay}>
                <SafeAreaView edges={['bottom']} style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Faculty Workload</Text>
                    <Pressable
                      onPress={() => setSelectedFacultyId(null)}
                      style={styles.closeBtn}
                    >
                      <Icon name="close" color="#0F172A" size={18} />
                    </Pressable>
                  </View>
                  {renderDetailCard(selectedFaculty)}
                </SafeAreaView>
              </View>
            </Modal>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  metricsGrid: { gap: 12 },
  metricsRow: { flexDirection: 'row', gap: 12 },
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
  filterStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  stack: { gap: 12 },
  facultyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    padding: 16,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  facultyCardSelected: {
    borderColor: '#0071E3',
    borderWidth: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryText: {
    fontSize: 13,
    color: '#6E6E73',
  },
  captionText: {
    fontSize: 12,
    color: '#6E6E73',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    padding: 18,
    gap: 16,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  bodyText: {
    fontSize: 13,
    color: '#1D1D1F',
  },
  tabletSplit: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletListCol: {
    flex: 3,
    gap: 12,
  },
  tabletDetailCol: {
    flex: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
});
