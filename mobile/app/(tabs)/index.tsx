import React, { useCallback, useEffect, useState } from 'react';
import { AppState, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.welcome}>
        <Text accessibilityRole="header" style={styles.greeting}>
          Good{' '}
          {greetingHour < 12
            ? 'morning'
            : greetingHour < 17
              ? 'afternoon'
              : 'evening'}
          ,
          <Text style={styles.name}>
            {'\n'}
            {firstName ? `${honorific}${firstName}` : 'welcome back'}
          </Text>
        </Text>
        <Text style={styles.detail}>
          {new Date(clock.date + 'T12:00:00+05:30').toLocaleDateString(
            'en-IN',
            {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'Asia/Kolkata',
            },
          )}
        </Text>
      </View>
      {isDemo && (
        <Text style={styles.detail}>
          Preview account · Sign in with your institutional account for personal
          records.
        </Text>
      )}
      <View style={styles.hero}>
        <View style={styles.header}>
          <Text style={styles.heroMeta}>
            {upcoming
              ? nextStart && parseTimeToMinutes(nextStart) <= clock.minutes
                ? 'In progress'
                : 'Up next'
              : 'Your teaching day'}
          </Text>
          <Icon name="school" color={theme.colors.heroMuted} />
        </View>
        <HomeState
          onDark
          unavailable={unavailable('timetable.read')}
          pending={schedule.isPending}
          error={schedule.error}
          retry={() => void schedule.refetch()}
        >
          <Text style={styles.heroTitle}>
            {upcoming?.subject.name ||
              (scheduleRows.length
                ? 'Teaching day complete'
                : 'A little room to focus')}
          </Text>
          <Text style={styles.heroMeta}>
            {upcoming
              ? `${upcoming.subject.code} · Semester ${upcoming.semester}${upcoming.section}`
              : scheduleRows.length
                ? `${scheduleRows.length} ${scheduleRows.length === 1 ? 'class' : 'classes'} on today’s schedule`
                : 'No regular classes on today’s schedule'}
          </Text>
          <View style={styles.heroFooter}>
            <View style={styles.grow}>
              {upcoming && (
                <Text style={styles.heroTime}>
                  {nextStart?.slice(0, 5)} – {nextEnd?.slice(0, 5)}
                </Text>
              )}
              <Text style={styles.heroMeta}>
                {upcoming ? upcoming.room.name : 'View your week at a glance'}
              </Text>
            </View>
            <Button
              variant="secondary"
              accessibilityLabel="View timetable"
              style={styles.heroButton}
              onPress={() => router.push('/(tabs)/timetable')}
            >
              <Icon name="next" color={theme.colors.primary} size={20} />
            </Button>
          </View>
        </HomeState>
        <DataFreshness
          updatedAt={schedule.dataUpdatedAt}
          refreshing={schedule.isFetching}
          inverse
        />
      </View>
      <View style={styles.attendance}>
        <View style={styles.statusIcon}>
          <Icon name="attendance" color={theme.colors.mintInk} />
        </View>
        <View style={styles.grow}>
          <HomeState
            unavailable={unavailable('attendance.read')}
            pending={attendance.isPending}
            error={attendance.error}
            retry={() => void attendance.refetch()}
          >
            <Text style={styles.label}>
              {attendanceRecord?.checkOut
                ? 'Your day is recorded'
                : attendanceRecord?.checkIn
                  ? 'You’re checked in'
                  : 'Ready for your day?'}
            </Text>
            <Text style={styles.detail}>
              {attendanceRecord?.checkIn
                ? `${new Date(attendanceRecord.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC · ${attendanceRecord.checkOut ? 'Checked out' : 'Checked in'}`
                : 'No check-in recorded · UTC day'}
            </Text>
          </HomeState>
          <DataFreshness
            updatedAt={attendance.dataUpdatedAt}
            refreshing={attendance.isFetching}
          />
        </View>
        <Button
          variant="text"
          accessibilityLabel="Open attendance"
          onPress={() => router.push('/(tabs)/attendance')}
        >
          <Icon name="next" color={theme.colors.mintInk} size={20} />
        </Button>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryPart}>
          <View
            style={[
              styles.bentoIconBadge,
              { backgroundColor: theme.colors.violetContainer },
            ]}
          >
            <Icon name="leave" color={theme.colors.violet} size={18} />
          </View>
          <Text style={styles.detail}>Leaves</Text>
          <HomeState
            unavailable={unavailable('leave.read')}
            pending={balances.isPending}
            error={balances.error}
            retry={() => void balances.refetch()}
          >
            <Text style={styles.summaryValue}>
              {balances.data?.length
                ? balances.data.every((b) => b.remaining === null)
                  ? 'No limit'
                  : `${balances.data.reduce((sum, b) => sum + (b.remaining ?? 0), 0)} days`
                : 'Not configured'}
            </Text>
            <Text style={styles.detail}>
              {balances.data?.length
                ? `${
                    balances.data
                      .filter((b) => b.remaining !== null)
                      .map((b) => `${b.leaveType.code}: ${b.remaining}`)
                      .join(' · ') || 'Unlimited'
                  } remaining`
                : 'Annual entitlement'}
            </Text>
          </HomeState>
          <DataFreshness
            updatedAt={balances.dataUpdatedAt}
            refreshing={balances.isFetching}
          />
          <Button
            variant="text"
            style={styles.inlineAction}
            onPress={() => router.push('/(tabs)/leave')}
          >
            Manage leave
          </Button>
        </View>
        <View style={styles.summaryPart}>
          <View
            style={[
              styles.bentoIconBadge,
              { backgroundColor: theme.colors.blueContainer },
            ]}
          >
            <Icon name="workload" color={theme.colors.primary} size={18} />
          </View>
          <Text style={styles.detail}>Weekly workload</Text>
          <HomeState
            unavailable={unavailable('workload.read')}
            pending={workload.isPending}
            error={workload.error}
            retry={() => void workload.refetch()}
          >
            <Text style={styles.summaryValue}>
              {workload.isSuccess ? `${workload.data.totalHours} hours` : '—'}
            </Text>
            <Text style={styles.detail}>
              {workload.data?.maxHours != null
                ? `of ${workload.data.maxHours} hour capacity`
                : 'Teaching allocation'}
            </Text>
          </HomeState>
          <DataFreshness
            updatedAt={workload.dataUpdatedAt}
            refreshing={workload.isFetching}
          />
          <Text style={styles.detail}>
            {schedule.isSuccess
              ? `${scheduleRows.length} ${scheduleRows.length === 1 ? 'class' : 'classes'} today`
              : 'Schedule unavailable'}
          </Text>
        </View>
      </View>
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
