import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import {
  mergeSubstitutionsIntoTimetable,
  subscribeToSubstitutionStore,
} from '../../lib/substitution-store';
import {
  getPeriods,
  getTimetableEntries,
  type DayOfWeek,
} from '../../lib/timetable-api';
import { theme } from '../../lib/theme';

const DAYS: { key: DayOfWeek; label: string; full: string }[] = [
  { key: 'MON', label: 'Mon', full: 'Monday' },
  { key: 'TUE', label: 'Tue', full: 'Tuesday' },
  { key: 'WED', label: 'Wed', full: 'Wednesday' },
  { key: 'THU', label: 'Thu', full: 'Thursday' },
  { key: 'FRI', label: 'Fri', full: 'Friday' },
  { key: 'SAT', label: 'Sat', full: 'Saturday' },
];

function getSystemDayOfWeek(): { day: DayOfWeek | null; isSunday: boolean } {
  const dayIndex = new Date().getDay();
  switch (dayIndex) {
    case 1:
      return { day: 'MON', isSunday: false };
    case 2:
      return { day: 'TUE', isSunday: false };
    case 3:
      return { day: 'WED', isSunday: false };
    case 4:
      return { day: 'THU', isSunday: false };
    case 5:
      return { day: 'FRI', isSunday: false };
    case 6:
      return { day: 'SAT', isSunday: false };
    default:
      return { day: null, isSunday: true };
  }
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatPeriodTime(startStr?: string, endStr?: string): string {
  if (!startStr || !endStr) return '';
  const format12 = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };
  return `${format12(startStr)} – ${format12(endStr)}`;
}

export default function TimetableScreen() {
  const { user, accessToken } = useAuth();

  const { day: todayDay, isSunday } = getSystemDayOfWeek();
  const [viewMode, setViewMode] = useState<'TODAY' | 'WEEK'>(
    isSunday ? 'WEEK' : 'TODAY',
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay || 'MON');

  const activeDay: DayOfWeek | null =
    viewMode === 'TODAY' ? todayDay : selectedDay;

  const {
    data: periods = [],
    error: periodsError,
    isPending: loadingPeriods,
    refetch: refetchPeriods,
  } = useQuery({
    queryKey: ['timetable-periods', accessToken],
    queryFn: () => getPeriods(accessToken),
  });

  const {
    data: entries = [],
    isLoading: loadingEntries,
    isRefetching: refreshing,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['timetable-entries', accessToken, activeDay, user?.employeeId],
    queryFn: () =>
      getTimetableEntries(accessToken, {
        day: activeDay || undefined,
        facultyId: user?.employeeId || undefined,
      }),
    enabled: !!activeDay,
  });

  const loading = loadingEntries || loadingPeriods;
  const scheduleError = queryError || periodsError;
  const error = scheduleError
    ? scheduleError instanceof Error
      ? scheduleError.message
      : 'Unable to load timetable schedule.'
    : null;

  const onRefresh = () => {
    if (activeDay) {
      void refetch();
      void refetchPeriods();
    }
  };

  // Listen for smart substitution assignments updates
  const [, setSubVersion] = useState(0);

  useEffect(() => {
    return subscribeToSubstitutionStore(() => {
      setSubVersion((v) => v + 1);
    });
  }, []);

  // Merge any assigned substitution duties for the authenticated faculty member
  const mergedEntries = (() => {
    if (!accessToken?.startsWith('demo-')) return entries;
    return mergeSubstitutionsIntoTimetable(
      entries,
      {
        id: user?.id,
        employeeId: user?.employeeId,
        employeeCode: user?.employeeCode,
      },
      activeDay,
    );
  })();

  // Map entries with period times
  const enrichedEntries = useMemo(() => {
    const currentMinutes = getCurrentTimeMinutes();
    const isToday = activeDay !== null && activeDay === todayDay;

    return mergedEntries.map((entry) => {
      const startPeriodObj = periods.find(
        (p) => p.number === entry.startPeriod,
      );
      const endPeriodObj = periods.find((p) => p.number === entry.endPeriod);

      const startTime = startPeriodObj?.startTime || '09:00';
      const endTime = endPeriodObj?.endTime || '10:00';

      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);
      const isActiveNow =
        isToday && currentMinutes >= startMin && currentMinutes < endMin;
      const isUpcoming = isToday && currentMinutes < startMin;
      const isCompleted = isToday && currentMinutes >= endMin;

      return {
        ...entry,
        startTime,
        endTime,
        timeLabel: formatPeriodTime(startTime, endTime),
        isActiveNow,
        isUpcoming,
        isCompleted,
      };
    });
  }, [mergedEntries, periods, activeDay, todayDay]);

  // Calculate day summary
  const { theoryCount, labCount } = useMemo(() => {
    let theory = 0;
    let lab = 0;
    for (const entry of mergedEntries) {
      if (entry.subject.kind === 'THEORY') {
        theory++;
      } else if (entry.subject.kind === 'LAB') {
        lab++;
      }
    }
    return { theoryCount: theory, labCount: lab };
  }, [mergedEntries]);

  const isSundayHoliday = viewMode === 'TODAY' && isSunday;

  return (
    <ScreenContainer scrollable={false} style={styles.screenContainer}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.pageTitle}>Class Timetable</Text>
          <Text style={styles.pageSubtitle}>
            {viewMode === 'TODAY'
              ? isSunday
                ? 'Sunday · Campus Holiday'
                : `Today's Schedule · ${DAYS.find((d) => d.key === todayDay)?.full || 'Classes'}`
              : `Weekly Schedule · ${DAYS.find((d) => d.key === selectedDay)?.full || 'Classes'}`}
          </Text>
        </View>

        <Pressable
          onPress={onRefresh}
          style={styles.refreshBtn}
          accessibilityLabel="Refresh timetable"
          accessibilityRole="button"
        >
          <Text style={styles.refreshIcon}>↻</Text>
        </Pressable>
      </View>

      {/* Main View Mode Selector: Today vs Week */}
      <View style={styles.viewModeToggle} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'TODAY' }}
          onPress={() => setViewMode('TODAY')}
          style={[styles.modeTab, viewMode === 'TODAY' && styles.modeTabActive]}
        >
          <Text
            style={[
              styles.modeTabText,
              viewMode === 'TODAY' && styles.modeTabTextActive,
            ]}
          >
            Today
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'WEEK' }}
          onPress={() => setViewMode('WEEK')}
          style={[styles.modeTab, viewMode === 'WEEK' && styles.modeTabActive]}
        >
          <Text
            style={[
              styles.modeTabText,
              viewMode === 'WEEK' && styles.modeTabTextActive,
            ]}
          >
            Full Week
          </Text>
        </Pressable>
      </View>

      {/* Day Selector Pills for Weekly View */}
      {viewMode === 'WEEK' && (
        <View style={styles.dayPillsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayPillsScroll}
          >
            {DAYS.map((day) => {
              const isSelected = selectedDay === day.key;
              const isTodayPill = todayDay === day.key;
              return (
                <Pressable
                  key={day.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${day.full}`}
                  onPress={() => setSelectedDay(day.key)}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillSelected,
                    isTodayPill && !isSelected && styles.dayPillToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPillLabel,
                      isSelected && styles.dayPillLabelSelected,
                    ]}
                  >
                    {day.label}
                  </Text>
                  {isTodayPill && (
                    <View
                      style={[
                        styles.todayDot,
                        isSelected && styles.todayDotSelected,
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Day Stats Bar */}
      {!loading && !error && activeDay && entries.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Total Slots:</Text>
            <Text style={styles.statValue}>{entries.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Theory:</Text>
            <Text style={styles.statValue}>{theoryCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Labs:</Text>
            <Text style={styles.statValue}>{labCount}</Text>
          </View>
        </View>
      )}

      {/* Error Banner */}
      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            variant="outline"
            onPress={() => {
              void refetch();
              void refetchPeriods();
            }}
            style={styles.retryBtn}
          >
            Try Again
          </Button>
        </Card>
      )}

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading class schedule…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scheduleList}
          contentContainerStyle={[
            styles.scheduleListContent,
            (isSundayHoliday || enrichedEntries.length === 0) &&
              styles.emptyScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          {isSundayHoliday ? (
            /* Sunday / Weekend Free Day State */
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIconBadge}></View>
              <Text style={styles.emptyTitle}>Sunday Campus Holiday</Text>
              <Text style={styles.emptySubtitle}>
                No teaching periods are scheduled for today. You can view
                Monday’s classes or browse the full weekly timetable below.
              </Text>
              <Button
                variant="primary"
                onPress={() => {
                  setViewMode('WEEK');
                  setSelectedDay('MON');
                }}
                style={styles.emptyActionBtn}
              >
                View Weekly Schedule
              </Button>
            </Card>
          ) : enrichedEntries.length === 0 ? (
            /* No Classes State */
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIconBadge}></View>
              <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
              <Text style={styles.emptySubtitle}>
                You have no teaching periods assigned for{' '}
                {DAYS.find((d) => d.key === activeDay)?.full || 'this day'}.
              </Text>
              <Button
                variant="outline"
                onPress={onRefresh}
                style={styles.emptyActionBtn}
              >
                Refresh Timetable
              </Button>
            </Card>
          ) : (
            /* Class Schedule List */
            enrichedEntries.map((classItem) => {
              const periodLabel =
                classItem.startPeriod === classItem.endPeriod
                  ? `Period ${classItem.startPeriod}`
                  : `Periods ${classItem.startPeriod}–${classItem.endPeriod}`;

              return (
                <Card
                  key={classItem.id}
                  style={[
                    styles.classCard,
                    classItem.isActiveNow && styles.classCardActive,
                    classItem.isCompleted && styles.classCardCompleted,
                  ]}
                >
                  {/* Active Class Highlight Banner */}
                  {classItem.isActiveNow && (
                    <View style={styles.activeBanner}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.activeBannerText}>HAPPENING NOW</Text>
                    </View>
                  )}

                  {/* Substitute Duty Alert Banner */}
                  {classItem.isSubstitute && (
                    <View style={styles.substituteBanner}>
                      <Text style={styles.substituteTag}>
                        ★ SMART SUBSTITUTION
                      </Text>
                      <Text style={styles.substituteNote}>
                        {classItem.substituteNote ||
                          'Assigned substitution duty'}
                      </Text>
                    </View>
                  )}

                  {/* Header Row: Period & Type Badges */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.periodBadgeGroup}>
                      <View style={styles.periodPill}>
                        <Text style={styles.periodPillText}>{periodLabel}</Text>
                      </View>
                      <Text style={styles.timeRangeText}>
                        {classItem.timeLabel}
                      </Text>
                    </View>

                    <Badge
                      label={classItem.subject.kind}
                      variant={
                        classItem.subject.kind === 'LAB'
                          ? 'accent'
                          : 'secondary'
                      }
                    />
                  </View>

                  {/* Subject Info */}
                  <View style={styles.subjectBlock}>
                    <Text style={styles.subjectCode}>
                      {classItem.subject.code}
                    </Text>
                    <Text style={styles.subjectName}>
                      {classItem.subject.name}
                    </Text>
                  </View>

                  {/* Details Footer: Section, Batch, Room */}
                  <View style={styles.cardFooter}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaLabel}>Section:</Text>
                      <Text style={styles.metaValue}>
                        Sem {classItem.semester}
                        {classItem.section}
                        {classItem.batch ? ` · ${classItem.batch}` : ''}
                      </Text>
                    </View>

                    <View style={styles.roomBadge}>
                      <Text style={styles.roomValue}>
                        {classItem.room.name}
                      </Text>
                    </View>
                  </View>

                  {/* Status Indicator text for accessibility */}
                  {classItem.isCompleted && (
                    <View style={styles.completedNotice}>
                      <Text style={styles.completedNoticeText}>
                        ✓ Period Concluded
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: theme.spacing.section,
    paddingTop: theme.spacing.section,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  pageTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    color: theme.colors.primary,
  },
  pageSubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
  },
  refreshBtn: {
    width: theme.sizes.tapTarget,
    height: theme.sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.muted,
  },
  refreshIcon: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },

  /* View Mode Toggle */
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.control,
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.control - 2,
    minHeight: 44,
  },
  modeTabActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  modeTabText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: theme.colors.primary,
    fontFamily: theme.typography.headingFamily,
  },

  /* Day Selector Pills */
  dayPillsContainer: {
    marginBottom: theme.spacing.md,
  },
  dayPillsScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  dayPill: {
    minWidth: 54,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayPillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayPillToday: {
    borderColor: theme.colors.accent,
  },
  dayPillLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
  },
  dayPillLabelSelected: {
    color: theme.colors.surface,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  todayDotSelected: {
    backgroundColor: theme.colors.surface,
  },

  /* Stats Bar */
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  statValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.primary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.border,
  },

  /* Schedule List */
  scheduleList: {
    flex: 1,
  },
  scheduleListContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  classCard: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  classCardActive: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
    backgroundColor: '#FFFDFB',
    ...theme.shadows.card,
  },
  classCardCompleted: {
    opacity: 0.72,
    backgroundColor: '#FAFAFB',
  },

  /* Active Class Banner */
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  activeBannerText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    color: '#991B1B',
    fontWeight: 'bold',
  },

  /* Substitute Banner */
  substituteBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.control - 2,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 2,
  },
  substituteTag: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    color: '#92400E',
    letterSpacing: 0.5,
  },
  substituteNote: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: '#78350F',
  },

  /* Card Header */
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodPill: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodPillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },
  timeRangeText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
  },

  /* Subject Details */
  subjectBlock: {
    gap: 2,
    marginVertical: 2,
  },
  subjectCode: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    color: theme.colors.primary,
  },
  subjectName: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },

  /* Card Footer */
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.muted,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  metaValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomIcon: {
    fontSize: 11,
  },
  roomValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },

  completedNotice: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  completedNoticeText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },

  /* Empty / Error / Loading States */
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.mutedForeground,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadgeText: {
    fontSize: 26,
  },
  emptyTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionBtn: {
    marginTop: theme.spacing.sm,
    minHeight: 44,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: '#991B1B',
  },
  retryBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
  },
});
