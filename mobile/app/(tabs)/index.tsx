import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import { sendTestNotification } from '../../lib/notifications';
import {
  mergeSubstitutionsIntoTimetable,
  subscribeToSubstitutionStore,
} from '../../lib/substitution-store';
import { theme } from '../../lib/theme';
import {
  formatPeriodTime,
  getCurrentTimeMinutes,
  getPeriods,
  getSystemDayOfWeek,
  getTimetableEntries,
  JCET_PERIODS,
  parseTimeToMinutes,
  type DayOfWeek,
} from '../../lib/timetable-api';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Current system day of week (MON - SAT) or Sunday holiday
  const { day: todayDay, isSunday } = useMemo(() => getSystemDayOfWeek(), []);

  // Fetch JCET period timetable definitions
  const { data: periods = JCET_PERIODS } = useQuery({
    queryKey: ['timetable-periods', accessToken],
    queryFn: () => getPeriods(accessToken),
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });

  // Fetch timetable entries for today
  const {
    data: entries = [],
    isLoading: loadingClasses,
    isRefetching: refreshingClasses,
    error: classesQueryError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ['timetable-entries', accessToken, todayDay, user?.employeeId],
    queryFn: () =>
      getTimetableEntries(accessToken, {
        day: todayDay || undefined,
        facultyId: user?.employeeId || undefined,
      }),
    enabled: !!todayDay && !isSunday,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const classesError = classesQueryError
    ? classesQueryError instanceof Error
      ? classesQueryError.message
      : 'Unable to load today’s schedule.'
    : null;

  // Listen for smart substitution assignments updates
  const [subVersion, setSubVersion] = useState(0);

  useEffect(() => {
    return subscribeToSubstitutionStore(() => {
      setSubVersion((v) => v + 1);
    });
  }, []);

  const todayDateStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Merge any assigned substitution duties for the authenticated faculty member for today
  const mergedEntries = useMemo(() => {
    return mergeSubstitutionsIntoTimetable(
      entries,
      {
        id: user?.id,
        employeeId: user?.employeeId,
        employeeCode: user?.employeeCode,
      },
      todayDay,
      todayDateStr
    );
  }, [entries, user?.id, user?.employeeId, user?.employeeCode, todayDay, todayDateStr, subVersion]);

  // Enrich timetable entries with period timings, formatted times, and live status
  const enrichedEntries = useMemo(() => {
    if (isSunday || !todayDay) return [];

    const currentMinutes = getCurrentTimeMinutes();
    const sorted = [...mergedEntries].sort((a, b) => a.startPeriod - b.startPeriod);

    return sorted.map((entry) => {
      const startPeriodObj = periods.find((p) => p.number === entry.startPeriod);
      const endPeriodObj = periods.find((p) => p.number === entry.endPeriod);

      const startTime = startPeriodObj?.startTime || '09:00';
      const endTime = endPeriodObj?.endTime || '10:00';

      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);

      const isActiveNow = currentMinutes >= startMin && currentMinutes < endMin;
      const isUpcoming = currentMinutes < startMin;
      const isCompleted = currentMinutes >= endMin;

      const format12 = (t: string) => {
        const [hStr, mStr] = t.split(':');
        let h = parseInt(hStr, 10);
        const m = mStr || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      };

      return {
        ...entry,
        startTime,
        endTime,
        startTime12: format12(startTime),
        endTime12: format12(endTime),
        timeLabel: formatPeriodTime(startTime, endTime),
        periodLabel:
          entry.startPeriod === entry.endPeriod
            ? `P${entry.startPeriod}`
            : `P${entry.startPeriod}–${entry.endPeriod}`,
        isActiveNow,
        isUpcoming,
        isCompleted,
      };
    });
  }, [mergedEntries, periods, todayDay, isSunday]);

  // Find active or next upcoming class for key metric teasers
  const classStatus = useMemo(() => {
    const active = enrichedEntries.find((e) => e.isActiveNow);
    if (active) {
      return { kind: 'ACTIVE' as const, entry: active };
    }
    const next = enrichedEntries.find((e) => e.isUpcoming);
    if (next) {
      return { kind: 'NEXT' as const, entry: next };
    }
    const allDone = enrichedEntries.length > 0 && enrichedEntries.every((e) => e.isCompleted);
    if (allDone) {
      return { kind: 'COMPLETED' as const, entry: null };
    }
    return { kind: 'NONE' as const, entry: null };
  }, [enrichedEntries]);

  async function handleTestNotification() {
    try {
      setNotificationStatus('Sending notification…');
      const result = await sendTestNotification();
      if (result.type === 'preview-simulated') {
        setNotificationStatus('✓ Notification preview simulated (Expo Go: native push unavailable)');
      } else {
        setNotificationStatus('✓ Notification sent! Check your device tray.');
      }
      setTimeout(() => setNotificationStatus(null), 4000);
    } catch {
      setNotificationStatus('Failed to send notification.');
      setTimeout(() => setNotificationStatus(null), 4000);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  const dayTitle = isSunday
    ? 'Sunday · Campus Holiday'
    : todayDay
    ? `${DAY_LABELS[todayDay]} Schedule`
    : 'Today’s Schedule';

  return (
    <ScreenContainer
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshingClasses}
          onRefresh={() => {
            if (!isSunday && todayDay) {
              void refetchClasses();
            }
          }}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            Hello, {user?.name || 'Faculty Member'}
          </Text>
          <Text style={styles.subGreeting}>
            {user?.employeeCode || 'JCET-FACULTY'} · Dept. of Computer Science
          </Text>
        </View>
        <Badge
          label={user?.role || 'FACULTY'}
          variant="default"
          style={styles.roleBadge}
        />
      </View>

      {/* Campus Hero Card */}
      <Card style={styles.heroCard}>
        <Image
          source={require('../../assets/jcet-campus.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTagline}>JCET HUBBALLI · CAMPUSHR</Text>
          <Text style={styles.heroTitle}>People at the heart of our campus.</Text>
        </View>
      </Card>

      {/* 2x2 Key Status Metrics */}
      <View style={styles.metricsGrid}>
        {/* Metric 1: Today's Classes (Dynamic MB-003) */}
        <Card style={styles.metricCard} onPress={() => router.push('/(tabs)/timetable')}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Today's Classes</Text>
            {loadingClasses ? (
              <Badge label="Loading…" variant="secondary" />
            ) : classesError ? (
              <Badge label="Offline" variant="secondary" />
            ) : isSunday ? (
              <Badge label="Holiday" variant="secondary" />
            ) : enrichedEntries.length === 0 ? (
              <Badge label="Free" variant="secondary" />
            ) : classStatus.kind === 'ACTIVE' ? (
              <Badge label="In Progress" variant="success" />
            ) : classStatus.kind === 'COMPLETED' ? (
              <Badge label="Completed" variant="secondary" />
            ) : (
              <Badge label="Active" variant="success" />
            )}
          </View>
          <Text style={styles.metricValue}>
            {loadingClasses
              ? '…'
              : classesError
              ? '—'
              : isSunday
              ? '0'
              : enrichedEntries.length}
          </Text>
          <Text style={styles.metricDetail} numberOfLines={1}>
            {loadingClasses
              ? 'Checking schedule…'
              : classesError
              ? 'Unable to load classes'
              : isSunday
              ? 'Sunday · Campus Holiday'
              : enrichedEntries.length === 0
              ? 'No classes scheduled today'
              : classStatus.kind === 'ACTIVE'
              ? `Now: ${classStatus.entry?.subject.code} (${classStatus.entry?.room.name})`
              : classStatus.kind === 'NEXT'
              ? `Next: ${classStatus.entry?.subject.code} at ${classStatus.entry?.startTime12}`
              : 'All classes completed for today'}
          </Text>
        </Card>

        {/* Metric 2: Attendance */}
        <Card style={styles.metricCard} onPress={() => router.push('/(tabs)/attendance')}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Attendance</Text>
            <Badge label="Present" variant="success" />
          </View>
          <Text style={styles.metricValue}>9:15 AM</Text>
          <Text style={styles.metricDetail}>Punch recorded</Text>
        </Card>

        {/* Metric 3: Leave Balance */}
        <Card style={styles.metricCard} onPress={() => router.push('/(tabs)/leave')}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Leave Balance</Text>
            <Badge label="CL" variant="secondary" />
          </View>
          <Text style={styles.metricValue}>8.5</Text>
          <Text style={styles.metricDetail}>Casual leave remaining</Text>
        </Card>

        {/* Metric 4: Workload */}
        <Card style={styles.metricCard} onPress={() => router.push('/(tabs)/timetable')}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Workload</Text>
            <Badge label="Normal" variant="secondary" />
          </View>
          <Text style={styles.metricValue}>16 / 18</Text>
          <Text style={styles.metricDetail}>Weekly teaching hours</Text>
        </Card>
      </View>

      {/* Today's Schedule Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Today's Class Schedule</Text>
          <Text style={styles.sectionSubtitle}>{dayTitle}</Text>
        </View>
        <View style={styles.sectionHeaderActions}>
          {!isSunday && (
            <Pressable
              onPress={() => {
                void refetchClasses();
              }}
              style={styles.refreshBtn}
              accessibilityLabel="Refresh today's timetable"
              accessibilityRole="button"
            >
              <Text style={styles.refreshIcon}>↻</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/(tabs)/timetable')}>
            <Text style={styles.sectionAction}>View all</Text>
          </Pressable>
        </View>
      </View>

      {/* Today's Class Schedule Card */}
      <Card style={styles.scheduleCard}>
        {loadingClasses ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.stateText}>Loading today's classes…</Text>
          </View>
        ) : classesError ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorTitle}>Could not load schedule</Text>
            <Text style={styles.errorDetail}>{classesError}</Text>
            <Button
              variant="outline"
              onPress={() => {
                void refetchClasses();
              }}
              style={styles.retryButton}
            >
              Retry
            </Button>
          </View>
        ) : isSunday || enrichedEntries.length === 0 ? (
          <View style={styles.stateContainer}>
            <View style={styles.emptyPill}>
              <Text style={styles.emptyPillText}>
                {isSunday ? 'Campus Holiday' : 'Free Day'}
              </Text>
            </View>
            <Text style={styles.emptyTitle}>
              {isSunday
                ? 'Sunday · Campus Closed'
                : 'No classes scheduled for today'}
            </Text>
            <Text style={styles.emptyDetail}>
              {isSunday
                ? 'The college is closed on Sundays. View your full schedule for the week ahead.'
                : 'You have no teaching periods or laboratory sessions scheduled for today.'}
            </Text>
            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/timetable')}
              style={styles.viewWeekButton}
            >
              View Full Week Timetable
            </Button>
          </View>
        ) : (
          enrichedEntries.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <View style={styles.itemSeparator} />}
              <View style={[styles.classItem, item.isActiveNow && styles.classItemActive]}>
                {/* Time & Period Column */}
                <View style={styles.classTime}>
                  <Text style={[styles.classTimeStart, item.isActiveNow && styles.textActive]}>
                    {item.startTime12}
                  </Text>
                  <Text style={styles.classTimeEnd}>{item.endTime12}</Text>
                  <View style={[styles.periodBadge, item.isActiveNow && styles.periodBadgeActive]}>
                    <Text
                      style={[
                        styles.periodBadgeText,
                        item.isActiveNow && styles.periodBadgeTextActive,
                      ]}
                    >
                      {item.periodLabel}
                    </Text>
                  </View>
                </View>

                {/* Vertical Divider */}
                <View
                  style={[
                    styles.classDivider,
                    item.isActiveNow && styles.classDividerActive,
                    item.isCompleted && styles.classDividerCompleted,
                  ]}
                />

                {/* Class Details Column */}
                <View style={styles.classDetails}>
                  <View style={styles.subjectRow}>
                    <Text
                      style={[styles.classSubject, item.isActiveNow && styles.textActive]}
                      numberOfLines={1}
                    >
                      {item.subject.code} · {item.subject.name}
                    </Text>
                  </View>

                  {/* Active Now Pill */}
                  {item.isActiveNow && (
                    <View style={styles.activePill}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activePillText}>In Progress Now</Text>
                    </View>
                  )}

                  {/* Substitution Badge */}
                  {item.isSubstitute && (
                    <View style={styles.substitutePill}>
                      <Text style={styles.substitutePillText}>Covering Substitution</Text>
                    </View>
                  )}

                  {/* Class Meta (Section, Batch, Room, Kind) */}
                  <Text style={styles.classMeta}>
                    {`Sem ${item.semester}${item.section}`}
                    {item.batch ? ` · ${item.batch}` : ''}
                    {` · ${item.room.name}`}
                    {` · ${item.subject.kind === 'LAB' ? 'Lab' : 'Theory'}`}
                  </Text>

                  {/* Substitute Note if assigned */}
                  {item.substituteNote && (
                    <Text style={styles.substituteNote} numberOfLines={2}>
                      {item.substituteNote}
                    </Text>
                  )}
                </View>
              </View>
            </React.Fragment>
          ))
        )}
      </Card>

      {/* Quick Actions Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.quickActionsGrid}>
        <Button
          variant="secondary"
          onPress={() => router.push('/(tabs)/leave')}
          style={styles.actionBtn}
        >
          Apply for Leave
        </Button>
        <Button
          variant="secondary"
          onPress={() => router.push('/(tabs)/timetable')}
          style={styles.actionBtn}
        >
          My Timetable
        </Button>
      </View>

      {/* Integrated Notification Demonstration Card */}
      <Card style={styles.notificationCard}>
        <Text style={styles.notificationCardTitle}>Notifications Channel</Text>
        <Text style={styles.notificationCardBody}>
          CampusHR delivers real-time notifications for substitution duty assignments and leave approvals.
        </Text>
        <Button
          variant="outline"
          onPress={handleTestNotification}
          style={styles.notificationTestButton}
        >
          Send Test Notification
        </Button>
        {notificationStatus && (
          <Text style={styles.notificationStatusText}>{notificationStatus}</Text>
        )}
      </Card>

      {/* Sign Out Option */}
      <Button
        variant="outline"
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        Sign Out from CampusHR
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.section,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.subheading,
    color: theme.colors.primary,
  },
  subGreeting: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  roleBadge: {
    marginLeft: theme.spacing.sm,
  },
  heroCard: {
    padding: 0,
    overflow: 'hidden',
    height: 140,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 31, 91, 0.75)',
    padding: theme.spacing.md,
  },
  heroTagline: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.surface,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  metricValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 22,
    color: theme.colors.primary,
    marginTop: 2,
  },
  metricDetail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    color: theme.colors.primary,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: 1,
  },
  sectionAction: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.accent,
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: 'bold',
    marginTop: -2,
  },
  scheduleCard: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  stateText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  errorTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.error,
  },
  errorDetail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  retryButton: {
    marginTop: 4,
    minWidth: 100,
  },
  emptyPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  emptyPillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  emptyDetail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: 6,
  },
  viewWeekButton: {
    marginTop: 4,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: 2,
  },
  classItemActive: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.control,
    padding: 6,
    marginHorizontal: -6,
  },
  classTime: {
    width: 72,
    alignItems: 'flex-start',
    gap: 2,
  },
  classTimeStart: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },
  classTimeEnd: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  periodBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  periodBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  periodBadgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 9,
    color: theme.colors.mutedForeground,
  },
  periodBadgeTextActive: {
    color: '#15803D',
    fontWeight: 'bold',
  },
  classDivider: {
    width: 2.5,
    height: 48,
    backgroundColor: theme.colors.border,
    borderRadius: 1.5,
    marginTop: 2,
  },
  classDividerActive: {
    backgroundColor: theme.colors.accent,
  },
  classDividerCompleted: {
    backgroundColor: '#CBD5E1',
  },
  classDetails: {
    flex: 1,
    gap: 3,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classSubject: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
    flex: 1,
  },
  textActive: {
    color: theme.colors.accent,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activePillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: '#15803D',
  },
  substitutePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  substitutePillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: '#B45309',
  },
  classMeta: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  substituteNote: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: theme.colors.muted,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  notificationCard: {
    gap: theme.spacing.sm,
    backgroundColor: '#FAFCFF',
  },
  notificationCardTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.primary,
  },
  notificationCardBody: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    lineHeight: 18,
  },
  notificationTestButton: {
    marginTop: 4,
  },
  notificationStatusText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.success,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: theme.spacing.sm,
    borderColor: theme.colors.border,
  },
});
