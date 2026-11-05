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
import { WebTopbar } from '../../components/layout/WebTopbar';
import { WebPageHeader } from '../../components/shared/WebPageHeader';
import { WebMetricCard } from '../../components/shared/WebMetricCard';
import { theme } from '../../lib/theme';

const label = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    ...options,
  });

export default function TimetableScreen() {
  const { user, accessToken } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const isTablet = width >= 768;
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

  const currentClass = entries.find((e) => {
    const pStart = regular.data?.periods.find((p) => p.number === e.startPeriod);
    const pEnd = regular.data?.periods.find((p) => p.number === e.endPeriod);
    if (!pStart || !pEnd) return false;
    return (
      classStatus(
        date,
        parseTimeToMinutes(pStart.startTime),
        parseTimeToMinutes(pEnd.endTime),
        clock,
      ) === 'In progress'
    );
  });

  return (
    <ScreenContainer
      testID="timetable-screen"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <WebTopbar breadcrumb="Timetable" />

      <WebPageHeader
        title="Timetable"
        subtitle="Weekly classes by department, semester and section."
      >
        <Button
          variant="secondary"
          accessibilityLabel="Refresh timetable"
          onPress={refresh}
          loading={refreshing}
          style={styles.refreshButton}
        >
          <Icon name="refresh" color={theme.colors.primary} size={16} />
        </Button>
      </WebPageHeader>

      {/* Web-Style 2x2 Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Classes Today"
            value={`${entries.length}`}
            detail={label(date, { weekday: 'short', day: 'numeric', month: 'short' })}
            icon="timetable"
            accentColor="#0071E3"
          />
          <WebMetricCard
            label="Active Period"
            value={currentClass ? currentClass.subject.code : 'None active'}
            detail={currentClass ? currentClass.room.name : 'All class times in IST'}
            icon="clock"
            accentColor="#10B981"
          />
        </View>

        <View style={styles.metricsRow}>
          <WebMetricCard
            label="Substitutions"
            value={`${dutyCount}`}
            detail={`${dutyCount} dated duties`}
            icon="coverage"
            accentColor="#8B5CF6"
          />
          <WebMetricCard
            label="Teaching Load"
            value={`${entries.length * 2}h`}
            detail="Hours scheduled today"
            icon="workload"
            accentColor="#F59E0B"
          />
        </View>
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
        <View style={styles.card}>
          <View style={styles.weekHeader}>
            <Button
              variant="secondary"
              style={styles.navButton}
              onPress={() => setOffset((value) => value - 1)}
              accessibilityLabel="Previous week"
            >
              <Icon name="back" color="#0F172A" size={16} />
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
              style={styles.navButton}
              onPress={() => setOffset((value) => value + 1)}
              accessibilityLabel="Next week"
            >
              <Icon name="next" color="#0F172A" size={16} />
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
        <View style={isTablet ? styles.tabletSplit : undefined}>
          <View style={isTablet ? styles.tabletScheduleColumn : undefined}>
            <View style={styles.card}>
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
                    size={32}
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
                          <Icon name="profile" size={14} color="#6E6E73" />
                          <Text style={styles.detail}>
                            Sem {entry.semester}
                            {entry.section}
                            {entry.batch ? ` · Batch ${entry.batch}` : ''}
                          </Text>
                          <Icon name="location" size={14} color="#6E6E73" />
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
                              styles.statusBadge,
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
            </View>
          </View>

          <View style={isTablet ? styles.tabletInspectorColumn : undefined}>
            <View style={styles.card}>
              <View style={styles.bentoHeader}>
                <View style={styles.heading}>
                  <Text style={styles.sectionTitle}>Mutual Class Swap</Text>
                  <Text style={styles.supporting}>
                    Exchange a lecture period with a departmental peer without
                    using casual leave.
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
                  BCS501 Mon P2 (10:00) ⇄ BCS502 Wed P4 (12:00) · CSE-5A · Room
                  204
                </Text>
                <Text style={styles.detail}>
                  {swapRequested
                    ? 'Your additional Fri P3 ⇄ Tue P2 swap proposal is queued for HOD review'
                    : 'Approved by HOD · Zero leave balance deduction'}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.heading}>
                <Text style={styles.sectionTitle}>VTU Academic Calendar</Text>
                <Text style={styles.supporting}>
                  Odd Semester 2026–27 CIE windows and JCET institutional
                  holidays.
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
                  <View style={styles.calendarBadge}>
                    <Text style={styles.calendarBadgeText}>{item.badge}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 40 },
  refreshButton: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  navButton: {
    width: 34,
    height: 34,
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
  heading: { flex: 1, gap: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  supporting: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6E6E73',
  },
  detail: {
    fontSize: 12,
    color: '#6E6E73',
  },
  error: {
    fontSize: 13,
    color: theme.colors.errorInk,
    lineHeight: 18,
  },
  coverageSummary: {
    fontSize: 13,
    color: theme.colors.violet,
    fontWeight: '600',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekRange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  days: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  day: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    minWidth: 48,
  },
  selectedDay: {
    backgroundColor: '#0F172A',
  },
  focusedDay: {
    borderColor: '#0071E3',
    borderWidth: 1,
  },
  pressedDay: {
    opacity: 0.7,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6E73',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  scheduleHeading: {
    gap: 2,
  },
  timeline: {
    gap: 16,
    marginTop: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeRail: {
    alignItems: 'flex-start',
    gap: 2,
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  timelineSpine: {
    width: 16,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  currentDot: {
    backgroundColor: '#0071E3',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  completedDot: {
    backgroundColor: '#10B981',
  },
  timelineCopy: {
    flex: 1,
    gap: 4,
  },
  code: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  subject: {
    fontSize: 13,
    color: '#1D1D1F',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  coverage: {
    backgroundColor: '#EDE9FE',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    gap: 2,
  },
  coverageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D28D9',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  activeStatus: {
    backgroundColor: '#EFF6FF',
  },
  completedStatus: {
    backgroundColor: '#ECFDF5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#0071E3',
  },
  completedText: {
    color: '#10B981',
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  notice: {
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    gap: 8,
  },
  loading: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  body: {
    fontSize: 14,
    color: '#1D1D1F',
  },
  bentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bentoItem: {
    backgroundColor: '#F5F5F7',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  bentoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  calendarBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  calendarBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0071E3',
  },
  tabletSplit: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletScheduleColumn: {
    flex: 3,
  },
  tabletInspectorColumn: {
    flex: 2,
    gap: 16,
  },
});
