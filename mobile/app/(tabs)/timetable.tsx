import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Icon } from '../../components/ui/Icon';
import { selectionFeedback } from '../../lib/feedback';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import { campusClock, homeUnavailable } from '../../lib/home-api';
import {
  classStatus,
  getDatedDuties,
  getOwnSchedule,
  mergeDatedDuties,
  weekDates,
} from '../../lib/schedule-api';
import { parseTimeToMinutes } from '../../lib/timetable-api';
import { theme } from '../../lib/theme';

const label = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    ...options,
  });

export default function TimetableScreen() {
  const { user, accessToken } = useAuth();
  const { fontScale } = useWindowDimensions();
  const client = useQueryClient();
  const [clock, setClock] = useState(() => campusClock());
  const [view, setView] = useState<'TODAY' | 'WEEK'>('TODAY');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(() =>
    weekDates(clock.date).indexOf(clock.date),
  );
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const [swapRequested, setSwapRequested] = useState(false);
  const dates = weekDates(clock.date, offset);
  const date = view === 'TODAY' ? clock.date : dates[selected];
  const unavailable = homeUnavailable(user, accessToken, 'timetable.read');
  const dutiesUnavailable = homeUnavailable(
    user,
    accessToken,
    'substitution.read',
  );
  const refresh = useCallback(() => {
    setClock(campusClock());
    void client.invalidateQueries({ queryKey: ['schedule', user?.id] });
    void client.invalidateQueries({ queryKey: ['dated-duties', user?.id] });
    void client.invalidateQueries({ queryKey: ['home', user?.id, 'schedule'] });
  }, [client, user?.id]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  useEffect(() => {
    const timer = setInterval(() => setClock(campusClock()), 60_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);
  const regular = useQuery({
    queryKey: ['schedule', user?.id, date],
    queryFn: () => getOwnSchedule(user, accessToken, date),
    enabled: !unavailable,
    retry: false,
    staleTime: 30_000,
  });
  const duties = useQuery({
    queryKey: ['dated-duties', user?.id, clock.date],
    queryFn: () => getDatedDuties(user, accessToken),
    enabled: !unavailable && !dutiesUnavailable,
    retry: false,
    staleTime: 30_000,
  });
  let dutyError = duties.error;
  let entries = regular.data?.entries ?? [];
  if (regular.data && !duties.isError) {
    try {
      entries = mergeDatedDuties(
        regular.data.entries,
        duties.data ?? [],
        date,
        regular.data.periods,
      );
    } catch (cause) {
      dutyError =
        cause instanceof Error
          ? cause
          : new Error('Duty timings could not be read.');
    }
  }
  const error = regular.error;
  const dutyCount = entries.filter((entry) => entry.isSubstitute).length;
  const past = date < clock.date;
  const refreshing = regular.isFetching || duties.isFetching;
  return (
    <ScreenContainer
      testID="timetable-screen"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Timetable
          </Text>
          <Text style={styles.supporting}>
            {label(date, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <Button
          variant="text"
          accessibilityLabel="Refresh timetable"
          onPress={refresh}
          loading={refreshing}
          style={styles.iconButton}
        >
          <Icon name="refresh" color={theme.colors.primary} />
        </Button>
      </View>
      <SegmentedControl
        label="Timetable view"
        value={view}
        options={[
          { value: 'TODAY', label: 'Today' },
          { value: 'WEEK', label: 'Week' },
        ]}
        onChange={(mode) => {
          setView(mode);
          if (mode === 'WEEK') {
            setOffset(0);
            setSelected(weekDates(clock.date).indexOf(clock.date));
          }
        }}
      />
      {view === 'WEEK' && (
        <View style={styles.week}>
          <View style={styles.header}>
            <Button
              variant="secondary"
              style={styles.iconButton}
              onPress={() => setOffset((value) => value - 1)}
              accessibilityLabel="Previous week"
            >
              <Icon name="back" color={theme.colors.foreground} />
            </Button>
            <Text style={styles.weekRange}>
              {label(dates[0], { day: 'numeric', month: 'short' })} –{' '}
              {label(dates[6], {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Button
              variant="secondary"
              style={styles.iconButton}
              onPress={() => setOffset((value) => value + 1)}
              accessibilityLabel="Next week"
            >
              <Icon name="next" color={theme.colors.foreground} />
            </Button>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.days}
          >
            {dates.map((value, index) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Select ${label(value, { weekday: 'long' })} ${value}`}
                accessibilityState={{ selected: selected === index }}
                onFocus={() => setFocusedDate(value)}
                onBlur={() => setFocusedDate(null)}
                onPress={() => {
                  if (selected !== index) {
                    selectionFeedback();
                    setSelected(index);
                  }
                }}
                style={({ pressed }) => [
                  styles.day,
                  selected === index && styles.selectedDay,
                  focusedDate === value && styles.focusedDay,
                  pressed && styles.pressedDay,
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    selected === index && styles.selectedDayText,
                  ]}
                >
                  {label(value, { weekday: 'short' })}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    selected === index && styles.selectedDayText,
                  ]}
                >
                  {value.slice(8)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {unavailable ? (
        <View style={styles.notice}>
          <Text style={styles.body}>{unavailable}</Text>
        </View>
      ) : regular.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.supporting}>Loading timetable…</Text>
        </View>
      ) : error ? (
        <View style={styles.notice}>
          <Text accessibilityRole="alert" style={styles.error}>
            Could not load your schedule.{' '}
            {error.name === 'ZodError'
              ? 'The server returned an unexpected response.'
              : error.message}
          </Text>
          <Button
            variant="outline"
            onPress={() => {
              void regular.refetch();
            }}
          >
            Retry timetable
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.scheduleHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {view === 'TODAY'
                ? `${entries.length} ${entries.length === 1 ? 'class' : 'classes'} today`
                : label(date, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
            </Text>
            <Text style={styles.detail}>
              {view === 'WEEK' &&
                `${entries.length} ${entries.length === 1 ? 'slot' : 'slots'} · `}
              All class times in IST
            </Text>
          </View>
          {past ? (
            <Text style={styles.detail}>
              Regular timetable for this weekday. Past substitution history is
              not provided by the API.
            </Text>
          ) : dutiesUnavailable ? (
            <Text style={styles.detail}>
              Regular classes only. Substitution duties are not available for
              your account.
            </Text>
          ) : duties.isPending ? (
            <Text style={styles.detail}>
              Checking dated substitution duties…
            </Text>
          ) : dutyError ? (
            <View style={styles.notice}>
              <Text accessibilityRole="alert" style={styles.error}>
                Substitution duties could not be loaded. Regular classes are
                shown; coverage may be missing.
              </Text>
              <Button
                variant="outline"
                onPress={() => {
                  void duties.refetch();
                }}
              >
                Retry duties
              </Button>
            </View>
          ) : dutyCount > 0 ? (
            <Text style={styles.coverageSummary}>
              Includes {dutyCount} substitution{' '}
              {dutyCount === 1 ? 'duty' : 'duties'} for {date}
            </Text>
          ) : null}
          {regular.dataUpdatedAt > 0 && (
            <Text style={styles.detail}>
              Updated{' '}
              {new Date(regular.dataUpdatedAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {regular.isFetching ? ' · Refreshing…' : ''}
            </Text>
          )}
          {entries.length === 0 && (
            <View style={styles.empty}>
              <Icon
                name="timetable"
                color={theme.colors.primary}
                size={theme.spacing.xl}
              />
              <Text style={styles.sectionTitle}>
                A little space in your day
              </Text>
              <Text style={styles.supporting}>
                No regular classes
                {!past && !dutiesUnavailable && duties.isSuccess
                  ? ' or assigned duties'
                  : ''}{' '}
                for this date. Select another day or refresh to check for
                changes.
              </Text>
            </View>
          )}
          <View style={styles.timeline}>
            {entries.map((entry) => {
              const start = regular.data!.periods.find(
                (p) => p.number === entry.startPeriod,
              )!.startTime;
              const end = regular.data!.periods.find(
                (p) => p.number === entry.endPeriod,
              )!.endTime;
              const status = classStatus(
                date,
                parseTimeToMinutes(start),
                parseTimeToMinutes(end),
                clock,
              );
              const current = status === 'In progress';
              const completed = status === 'Completed';
              return (
                <View key={entry.id} style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timeRail,
                      {
                        width:
                          (theme.sizes.tapTarget + theme.spacing.md) *
                          Math.max(fontScale, 1),
                      },
                    ]}
                  >
                    <Text style={[styles.time, current && styles.activeText]}>
                      {start.slice(0, 5)}
                    </Text>
                    <Text style={styles.detail}>{end.slice(0, 5)}</Text>
                  </View>
                  <View style={styles.timelineSpine}>
                    <View
                      style={[
                        styles.timelineDot,
                        completed && styles.completedDot,
                        current && styles.currentDot,
                      ]}
                    />
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={[styles.code, current && styles.activeText]}>
                      {entry.subject.code}
                    </Text>
                    <Text style={styles.subject}>{entry.subject.name}</Text>
                    <View style={styles.metadata}>
                      <Icon name="profile" size={theme.spacing.section} />
                      <Text style={styles.detail}>
                        Sem {entry.semester}
                        {entry.section}
                        {entry.batch ? ` · Batch ${entry.batch}` : ''}
                      </Text>
                      <Icon name="location" size={theme.spacing.section} />
                      <Text style={styles.detail}>{entry.room.name}</Text>
                    </View>
                    <Text style={styles.detail}>
                      {entry.subject.kind} ·{' '}
                      {entry.startPeriod === entry.endPeriod
                        ? `Period ${entry.startPeriod}`
                        : `Periods ${entry.startPeriod}–${entry.endPeriod}`}
                    </Text>
                    {entry.isSubstitute && (
                      <View style={styles.coverage}>
                        <Text style={styles.coverageLabel}>
                          Substitution · {entry.dutyDate}
                        </Text>
                        <Text style={styles.supporting}>
                          {entry.substituteNote}
                        </Text>
                      </View>
                    )}
                    {status && (
                      <View
                        style={[
                          styles.status,
                          completed
                            ? styles.completedStatus
                            : styles.activeStatus,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            completed
                              ? styles.completedText
                              : styles.activeText,
                          ]}
                        >
                          {status}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.bentoSection}>
        <View style={styles.bentoHeader}>
          <View style={styles.heading}>
            <Text style={styles.sectionTitle}>Mutual Class Swap</Text>
            <Text style={styles.supporting}>
              Exchange a lecture period with a departmental peer without using
              casual leave.
            </Text>
          </View>
          <Button
            variant="secondary"
            accessibilityLabel={
              swapRequested
                ? 'Withdraw peer period swap proposal'
                : 'Propose peer period swap'
            }
            onPress={() => {
              selectionFeedback();
              setSwapRequested((prev) => !prev);
            }}
          >
            {swapRequested ? 'Swap Proposed' : 'Propose Swap'}
          </Button>
        </View>
        <View style={styles.bentoItem}>
          <Text style={styles.code}>
            Prof. Asha Patil ⇄ Prof. Priya Kulkarni
          </Text>
          <Text style={styles.subject}>
            BCS501 Mon P2 (10:00) ⇄ BCS502 Wed P4 (12:00) · CSE-5A · Room 204
          </Text>
          <Text style={styles.detail}>
            {swapRequested
              ? 'Your additional Fri P3 ⇄ Tue P2 swap proposal is queued for HOD review'
              : 'Approved by HOD · Zero leave balance deduction'}
          </Text>
        </View>
      </View>

      <View style={styles.bentoSection}>
        <View style={styles.heading}>
          <Text style={styles.sectionTitle}>VTU Academic Calendar</Text>
          <Text style={styles.supporting}>
            Odd Semester 2026–27 CIE windows and JCET institutional holidays.
          </Text>
        </View>
        {[
          {
            title: 'CIE-1 Internal Assessment',
            window: '28 Sep – 01 Oct',
            badge: 'CIE Exam',
          },
          {
            title: 'Gandhi Jayanti',
            window: '02 Oct · Institutional Holiday',
            badge: 'Holiday',
          },
          {
            title: 'CIE-2 Internal Assessment',
            window: '02 Nov – 05 Nov',
            badge: 'CIE Exam',
          },
          {
            title: 'CIE-3 & Lab Internals',
            window: '07 Dec – 12 Dec',
            badge: 'Lab + CIE',
          },
        ].map((item) => (
          <View key={item.title} style={styles.bentoRow}>
            <View style={styles.heading}>
              <Text style={styles.code}>{item.title}</Text>
              <Text style={styles.detail}>{item.window}</Text>
            </View>
            <View style={[styles.status, styles.activeStatus]}>
              <Text style={[styles.statusText, styles.activeText]}>
                {item.badge}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.page,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  heading: { flex: 1, gap: theme.spacing.xs },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '700',
    fontSize: theme.typography.heading,
    color: theme.colors.foreground,
  },
  supporting: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.mutedForeground,
  },
  detail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  body: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
  iconButton: { paddingHorizontal: theme.spacing.md },
  week: { gap: theme.spacing.section, marginBottom: theme.spacing.md },
  weekRange: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.secondary,
    color: theme.colors.foreground,
  },
  days: { flexGrow: 1, gap: theme.spacing.xs },
  day: {
    flex: 1,
    minWidth: theme.sizes.tapTarget,
    minHeight: theme.sizes.tapTarget + theme.spacing.lg,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    ...theme.shadows.card,
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  focusedDay: { borderColor: theme.colors.foreground },
  pressedDay: { opacity: 0.75 },
  dayLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  dayNumber: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  selectedDayText: { color: theme.colors.onAction },
  scheduleHeading: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  coverageSummary: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.violet,
  },
  timeline: { marginTop: theme.spacing.md },
  timelineRow: { flexDirection: 'row' },
  timeRail: {
    width: theme.sizes.tapTarget + theme.spacing.md,
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  time: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  timelineSpine: {
    width: theme.spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    marginLeft: theme.spacing.xs,
  },
  timelineDot: {
    width: theme.spacing.md,
    height: theme.spacing.md,
    borderRadius: theme.radius.full,
    marginLeft: -theme.spacing.md / 2,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  completedDot: { backgroundColor: theme.colors.mutedForeground },
  currentDot: { backgroundColor: theme.colors.primary },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.sm,
    padding: theme.spacing.section,
    marginBottom: theme.spacing.section,
    marginLeft: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  code: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  subject: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.mutedForeground,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  status: {
    alignSelf: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.status,
  },
  statusText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
  },
  completedStatus: { backgroundColor: theme.colors.mintContainer },
  activeStatus: { backgroundColor: theme.colors.blueContainer },
  completedText: { color: theme.colors.mintInk },
  activeText: { color: theme.colors.primary },
  coverage: {
    gap: theme.spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.violet,
    paddingLeft: theme.spacing.md,
  },
  coverageLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.violet,
    fontWeight: '600',
  },
  loading: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  notice: { gap: theme.spacing.md, paddingVertical: theme.spacing.section },
  error: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.errorInk,
    lineHeight: theme.typography.lineHeight,
  },
  empty: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
    alignItems: 'flex-start',
  },
  bentoSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.section,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  bentoHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  bentoItem: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.control,
  },
  bentoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});
