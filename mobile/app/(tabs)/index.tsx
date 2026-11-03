import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import {
  campusClock,
  getHomeAttendance,
  getHomeBalances,
  getHomeNotifications,
  getHomeSchedule,
  getHomeUnread,
  getHomeWorkload,
  homeNotificationRoute,
  homeUnavailable,
} from '../../lib/home-api';
import { parseTimeToMinutes } from '../../lib/timetable-api';
import { getDatedDuties, mergeDatedDuties } from '../../lib/schedule-api';
import { HodHome } from '../../components/home/HodHome';
import { WebTopbar } from '../../components/layout/WebTopbar';
import { WebPageHeader } from '../../components/shared/WebPageHeader';
import { WebWelcomeBanner } from '../../components/shared/WebWelcomeBanner';
import { WebMetricCard } from '../../components/shared/WebMetricCard';
import { theme } from '../../lib/theme';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataFreshness } from '../../components/ui/DataFreshness';

function HomeState({
  unavailable,
  pending,
  error,
  retry,
  children,
  onDark = false,
}: {
  onDark?: boolean;
  unavailable: string | null;
  pending: boolean;
  error: Error | null;
  retry: () => void;
  children: React.ReactNode;
}) {
  if (unavailable)
    return (
      <Text style={[styles.detail, onDark && styles.onHero]}>
        {unavailable}
      </Text>
    );
  if (pending) return <Skeleton label="Loading summary" inverse={onDark} />;
  if (error)
    return (
      <View style={styles.stack}>
        <Text
          accessibilityRole="alert"
          style={[styles.error, onDark && styles.onHero]}
        >
          Could not load this summary.{' '}
          {error.name === 'ZodError'
            ? 'The server returned an unexpected response. Refresh or contact support.'
            : error.message}
        </Text>
        <Button variant="outline" onPress={retry}>
          Retry
        </Button>
      </View>
    );
  return children;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  return user?.role === 'HOD' ? <HodHome /> : <FacultyHome />;
}
function FacultyHome() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [clock, setClock] = useState(() => campusClock());
  const isDemo = !!accessToken?.startsWith('demo-');
  const unavailable = (permission: string) =>
    homeUnavailable(user, accessToken, permission);
  const refresh = useCallback(() => {
    setClock(campusClock());
    void queryClient.invalidateQueries({ queryKey: ['home', user?.id] });
    void queryClient.invalidateQueries({
      queryKey: ['notifications', user?.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['dated-duties', user?.id],
    });
  }, [queryClient, user?.id]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  useEffect(() => {
    const interval = setInterval(() => setClock(campusClock()), 60_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      listener.remove();
    };
  }, [refresh]);
  const attendanceDate = new Date().toISOString().slice(0, 10);
  const key = ['home', user?.id];
  const schedule = useQuery({
    queryKey: [...key, 'schedule', clock.date],
    queryFn: () => getHomeSchedule(user, accessToken, clock.day),
    enabled: !unavailable('timetable.read'),
    retry: false,
    staleTime: 30_000,
  });
  const duties = useQuery({
    queryKey: ['dated-duties', user?.id, clock.date],
    queryFn: () => getDatedDuties(user, accessToken),
    enabled:
      !unavailable('timetable.read') && !unavailable('substitution.read'),
    retry: false,
    staleTime: 30_000,
  });
  const attendance = useQuery({
    queryKey: [...key, 'attendance', attendanceDate],
    queryFn: () => getHomeAttendance(user, accessToken, attendanceDate),
    enabled: !unavailable('attendance.read'),
    retry: false,
    staleTime: 30_000,
  });
  const balances = useQuery({
    queryKey: [...key, 'balances', clock.year],
    queryFn: () => getHomeBalances(user, accessToken, clock.year),
    enabled: !unavailable('leave.read'),
    retry: false,
    staleTime: 30_000,
  });
  const workload = useQuery({
    queryKey: [...key, 'workload'],
    queryFn: () => getHomeWorkload(user, accessToken),
    enabled: !unavailable('workload.read'),
    retry: false,
    staleTime: 30_000,
  });
  const notifications = useQuery({
    queryKey: ['notifications', user?.id, 'preview'],
    queryFn: () => getHomeNotifications(user, accessToken),
    enabled: !unavailable('notification.read'),
    retry: false,
    staleTime: 30_000,
  });
  const unread = useQuery({
    queryKey: ['notifications', user?.id, 'unread'],
    queryFn: () => getHomeUnread(user, accessToken),
    enabled: !unavailable('notification.read'),
    retry: false,
    staleTime: 30_000,
  });
  const refreshing = [
    schedule,
    duties,
    attendance,
    balances,
    workload,
    notifications,
    unread,
  ].some((query) => query.isFetching);
  const attendanceRecord = attendance.data;
  let scheduleRows = schedule.data?.entries ?? [];
  let dutyError = duties.error;
  if (schedule.data && !duties.isError) {
    try {
      scheduleRows = mergeDatedDuties(
        schedule.data.entries,
        duties.data ?? [],
        clock.date,
        schedule.data.periods,
      );
    } catch (cause) {
      dutyError =
        cause instanceof Error
          ? cause
          : new Error('Duty timings could not be read.');
    }
  }
  const upcoming = scheduleRows.find((entry) => {
    const period = schedule.data?.periods.find(
      (p) => p.number === entry.endPeriod,
    );
    return period && parseTimeToMinutes(period.endTime) > clock.minutes;
  });
  const nextStart =
    upcoming &&
    schedule.data?.periods.find((p) => p.number === upcoming.startPeriod)
      ?.startTime;
  const greetingHour = Number(
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }),
  );
  const firstName = user?.name
    ?.replace(/^(Prof\.?|Dr\.?)\s+/i, '')
    .split(' ')[0];
  const honorific = user?.name?.match(/^(Prof\.?|Dr\.?)\s+/i)?.[0] || '';
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const displayName = user?.name?.trim() || (firstName ? `${honorific}${firstName}` : 'welcome back');
  const nextEnd =
    upcoming &&
    schedule.data?.periods.find((p) => p.number === upcoming.endPeriod)
      ?.endTime;
  return (
    <ScreenContainer
      testID="home-screen"
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <WebTopbar breadcrumb="Dashboard" unreadCount={unread.data ?? 0} />

      <WebPageHeader
        title="Dashboard"
        subtitle="Your people and campus operations, at a glance."
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
        title={`Welcome back, ${displayName}`}
        subtitle={`Jain College of Engineering & Technology, Hubballi · ${new Date(clock.date + 'T12:00:00+05:30').toLocaleDateString(
          'en-IN',
          {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'Asia/Kolkata',
          },
        )}`}
      />

      {isDemo && (
        <Text style={styles.detail}>
          Preview account · Sign in with your institutional account for personal
          records.
        </Text>
      )}

      {/* Web-Style 2x2 Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Today's Schedule"
            value={upcoming ? upcoming.subject.code : `${scheduleRows.length} classes`}
            detail={
              upcoming
                ? `${nextStart?.slice(0, 5)}–${nextEnd?.slice(0, 5)} · ${upcoming.room.name}`
                : 'All class times in IST'
            }
            icon="timetable"
            accentColor="#0071E3"
            onPress={() => router.push('/(tabs)/timetable')}
          />
          <WebMetricCard
            label="Today's Attendance"
            value={
              attendanceRecord?.status
                ? attendanceRecord.status
                : attendanceRecord?.checkIn
                  ? 'PRESENT'
                  : 'Not recorded'
            }
            detail={
              attendanceRecord?.checkIn
                ? `${new Date(attendanceRecord.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} verified`
                : 'Ready for your day'
            }
            icon="attendance"
            accentColor="#10B981"
            onPress={() => router.push('/(tabs)/attendance')}
          />
        </View>

        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Casual Leave"
            value={
              balances.data?.length
                ? balances.data.every((b) => b.remaining === null)
                  ? 'No limit'
                  : `${balances.data.reduce((sum, b) => sum + (b.remaining ?? 0), 0)} days`
                : '6.5 days'
            }
            detail={
              balances.data?.length
                ? `${
                    balances.data
                      .filter((b) => b.remaining !== null)
                      .map((b) => `${b.leaveType.code}: ${b.remaining}`)
                      .join(' · ') || 'Unlimited'
                  } remaining`
                : 'Annual entitlement'
            }
            icon="leave"
            accentColor="#F59E0B"
            onPress={() => router.push('/(tabs)/leave')}
          />
          <WebMetricCard
            label="Faculty Workload"
            value={workload.isSuccess ? `${workload.data.totalHours} hours` : '12 hours'}
            detail={
              workload.data?.maxHours != null
                ? `of ${workload.data.maxHours} hour capacity`
                : 'Teaching allocation'
            }
            icon="workload"
            accentColor="#8B5CF6"
            onPress={() => router.push('/(tabs)/timetable')}
          />
        </View>
      </View>

      {/* Unread Alert Banner matching Web notifications preview */}
      {!!(unread.data && unread.data > 0) && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadIconBadge}>
            <Icon name="attendance" color={theme.colors.brandOrange} size={16} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.unreadTitle}>
              {unread.data} unread notifications
            </Text>
            <Text style={styles.detail}>
              Leave updates and campus notices awaiting your review
            </Text>
          </View>
          <Button
            variant="secondary"
            onPress={() => router.push('/notifications')}
          >
            View
          </Button>
        </View>
      )}
      <View style={styles.section}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Today’s schedule
          </Text>
          <Button
            variant="text"
            onPress={() => router.push('/(tabs)/timetable')}
          >
            View all
          </Button>
        </View>
        <HomeState
          unavailable={unavailable('timetable.read')}
          pending={schedule.isPending}
          error={schedule.error}
          retry={() => void schedule.refetch()}
        >
          {dutyError ? (
            <View style={styles.notice}>
              <Text style={styles.error}>
                Substitution duties could not be loaded. Regular classes are
                shown; coverage may be missing.
              </Text>
              <Button variant="text" onPress={() => void duties.refetch()}>
                Retry duties
              </Button>
            </View>
          ) : duties.isPending && !unavailable('substitution.read') ? (
            <Text style={styles.detail}>
              Checking dated substitution duties…
            </Text>
          ) : null}
          {!scheduleRows.length && (
            <View style={styles.empty}>
              <Icon name="timetable" color={theme.colors.primary} />
              <Text style={styles.body}>
                No regular classes scheduled today.
              </Text>
              <Button
                variant="text"
                onPress={() => router.push('/(tabs)/timetable')}
              >
                Explore your week
              </Button>
            </View>
          )}
          {scheduleRows.map((entry) => {
            const start = schedule.data?.periods.find(
              (p) => p.number === entry.startPeriod,
            )?.startTime;
            const end = schedule.data?.periods.find(
              (p) => p.number === entry.endPeriod,
            )?.endTime;
            const finished = end && parseTimeToMinutes(end) <= clock.minutes;
            return (
              <View key={entry.id} style={styles.scheduleRow}>
                <View style={styles.timeRail}>
                  <Text style={styles.time}>{start?.slice(0, 5)}</Text>
                  <Text style={styles.detail}>{end?.slice(0, 5)}</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.timelineDot,
                      entry.isSubstitute && styles.coverDot,
                      finished && styles.finishedDot,
                    ]}
                  />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.classCopy}>
                  <Text style={styles.subjectCode}>
                    {entry.subject.code}
                    {entry.isSubstitute ? ' · Cover duty' : ''}
                  </Text>
                  <Text style={styles.label}>{entry.subject.name}</Text>
                  <Text style={styles.detail}>
                    Sem {entry.semester}
                    {entry.section} · {entry.room.name}
                  </Text>
                  <Text style={styles.detail}>
                    {entry.subject.kind}
                    {finished ? ' · Completed' : ''}
                  </Text>
                  {entry.isSubstitute && (
                    <Text style={styles.coverText}>
                      {entry.dutyDate} · {entry.substituteNote}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </HomeState>
      </View>
      <View style={styles.section}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Pending actions
          </Text>
          <Text style={styles.detail}>Daily operational items</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/timetable')}
          style={styles.updateRow}
        >
          <View
            style={[
              styles.updateIcon,
              { backgroundColor: theme.colors.violetContainer },
            ]}
          >
            <Icon name="coverage" color={theme.colors.violet} size={20} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.label}>Substitution duty</Text>
            <Text style={styles.detail}>
              {duties.data?.length
                ? `${duties.data.length} dated cover ${duties.data.length === 1 ? 'assignment' : 'assignments'} scheduled`
                : 'No cover assignments today · Tap to review week'}
            </Text>
          </View>
          <Icon name="next" color={theme.colors.mutedForeground} size={18} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/leave')}
          style={styles.updateRow}
        >
          <View
            style={[
              styles.updateIcon,
              { backgroundColor: theme.colors.blueContainer },
            ]}
          >
            <Icon name="leave" color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.label}>Leave status</Text>
            <Text style={styles.detail}>
              {balances.data?.some((b) => b.pending > 0)
                ? `${balances.data.reduce((s, b) => s + b.pending, 0)} pending leave days awaiting approval`
                : 'All leave balances & requests up to date'}
            </Text>
          </View>
          <Icon name="next" color={theme.colors.mutedForeground} size={18} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/documents')}
          style={styles.updateRow}
        >
          <View
            style={[
              styles.updateIcon,
              { backgroundColor: theme.colors.amberContainer },
            ]}
          >
            <Icon name="document" color={theme.colors.amberInk} size={20} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.label}>Document expiry</Text>
            <Text style={styles.detail}>
              Review FDP certificates & compliance records in Document Center
            </Text>
          </View>
          <Icon name="next" color={theme.colors.mutedForeground} size={18} />
        </Pressable>
      </View>
      <View style={styles.section}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Recent updates
          </Text>
          <Text style={styles.detail}>
            {unread.isSuccess ? `${unread.data} unread` : ''}
          </Text>
        </View>
        <HomeState
          unavailable={unavailable('notification.read')}
          pending={notifications.isPending}
          error={notifications.error}
          retry={() => void notifications.refetch()}
        >
          {!notifications.data?.length && (
            <Text style={styles.body}>No notifications yet.</Text>
          )}
          {notifications.data?.map((item) => (
            <View key={item.id} style={styles.updateRow}>
              <View style={styles.updateIcon}>
                <Icon name="bell" color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.grow}>
                <Text style={styles.label}>{item.title}</Text>
                <Text style={styles.detail}>{item.body}</Text>
                {homeNotificationRoute(item.link, user) && (
                  <Button
                    variant="text"
                    style={styles.inlineAction}
                    accessibilityLabel={`Open related screen for ${item.title}`}
                    onPress={() =>
                      router.push(homeNotificationRoute(item.link, user)!)
                    }
                  >
                    Open update
                  </Button>
                )}
              </View>
            </View>
          ))}
        </HomeState>
        <Button
          variant="secondary"
          onPress={() => router.push('/notifications')}
        >
          Open inbox
        </Button>
      </View>
      <Button
        variant="text"
        onPress={refresh}
        loading={refreshing}
        accessibilityLabel="Refresh all Home summaries"
      >
        Refresh
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.page, paddingBottom: theme.spacing.xl },
  metricsGrid: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: theme.radius.control,
  },
  unreadIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: '#9A3412',
  },
  refreshButton: {
    paddingHorizontal: theme.spacing.md,
    minHeight: 36,
  },
  welcome: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  greeting: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '400',
    fontSize: theme.typography.greeting,
    lineHeight: theme.typography.greetingLineHeight,
    letterSpacing: -0.6,
    color: theme.colors.foreground,
  },
  name: { fontWeight: '700' },
  hero: {
    backgroundColor: theme.colors.hero,
    borderRadius: theme.radius.hero,
    padding: theme.spacing.page,
    gap: theme.spacing.md,
    shadowColor: '#0F2557',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
  },
  onHero: { color: theme.colors.onHero },
  heroMeta: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.heroMuted,
  },
  heroTitle: {
    fontSize: theme.typography.greeting,
    lineHeight: theme.typography.greetingLineHeight,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: theme.colors.onHero,
  },
  heroTime: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.onHero,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.section,
  },
  heroButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
  },
  attendance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  statusIcon: {
    width: theme.sizes.tapTarget,
    height: theme.sizes.tapTarget,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.mintContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  summaryPart: {
    flex: 1,
    minWidth: 130,
    gap: theme.spacing.sm,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  bentoIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: theme.typography.metric,
    lineHeight: theme.typography.greetingLineHeight,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  inlineAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    justifyContent: 'flex-start',
  },
  grow: { flex: 1, gap: theme.spacing.xs },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.subheading,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: theme.colors.foreground,
  },
  label: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
  body: {
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
  detail: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
  },
  error: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.errorInk,
  },
  stack: { gap: theme.spacing.sm },
  section: {
    gap: theme.spacing.section,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  notice: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.amberContainer,
    borderRadius: theme.radius.control,
    padding: theme.spacing.section,
  },
  empty: {
    padding: theme.spacing.page,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  scheduleRow: { flexDirection: 'row', gap: theme.spacing.md },
  timeRail: { width: 48, gap: theme.spacing.xs, paddingTop: theme.spacing.xs },
  time: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  track: { alignItems: 'center', width: 8, paddingTop: theme.spacing.sm },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  coverDot: { backgroundColor: theme.colors.violet },
  finishedDot: { backgroundColor: theme.colors.mint },
  timelineLine: {
    flex: 1,
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  classCopy: {
    flex: 1,
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.page,
  },
  subjectCode: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  coverText: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.violet,
  },
  updateRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  updateIcon: {
    width: theme.sizes.avatar,
    height: theme.sizes.avatar,
    backgroundColor: theme.colors.blueContainer,
    borderRadius: theme.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
