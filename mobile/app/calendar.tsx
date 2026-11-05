import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DetailScreen } from '../components/ui/DetailScreen';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import {
  fetchMobileCalendarOverview,
  fetchMobileCalendarDays,
  fetchMobileRestrictedHolidays,
  type MobileCalendarDay,
  type MobileCalendarOverview,
  type MobileRestrictedHoliday,
} from '../lib/calendar-api';
import { theme } from '../lib/theme';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type CalendarTab = 'Upcoming' | 'Month View' | 'Restricted (RH)';

const TAB_OPTIONS: readonly { value: CalendarTab; label: string }[] = [
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Month View', label: 'Month View' },
  { value: 'Restricted (RH)', label: 'Restricted (RH)' },
];

export default function AcademicCalendarScreen() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [tab, setTab] = useState<CalendarTab>('Upcoming');
  const [overview, setOverview] = useState<MobileCalendarOverview | null>(null);
  const [days, setDays] = useState<MobileCalendarDay[]>([]);
  const [restrictedHolidays, setRestrictedHolidays] = useState<MobileRestrictedHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = async (targetDate: Date) => {
    try {
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const monthStr = `${y}-${m}`;

      const [ov, mDays, rh] = await Promise.all([
        fetchMobileCalendarOverview(),
        fetchMobileCalendarDays(monthStr),
        fetchMobileRestrictedHolidays(),
      ]);

      setOverview(ov);
      setDays(mDays);
      setRestrictedHolidays(rh);
    } catch (err) {
      console.warn('Failed to load mobile calendar', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(currentDate);
  }, [currentDate]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(currentDate);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getBadgeStyle = (dayType: string, isWorking: boolean) => {
    switch (dayType) {
      case 'PUBLIC_HOLIDAY':
        return { bg: theme.colors.coralContainer, text: theme.colors.coralInk, label: 'Public Holiday' };
      case 'RESTRICTED_HOLIDAY':
        return { bg: theme.colors.amberContainer, text: theme.colors.amberInk, label: 'Restricted Holiday' };
      case 'VACATION':
        return { bg: theme.colors.violetContainer, text: theme.colors.violet, label: 'Vacation' };
      case 'EXAMINATION':
        return { bg: theme.colors.blueContainer, text: theme.colors.brandBlue, label: 'Exam Period' };
      case 'INSTITUTIONAL_EVENT':
        return { bg: theme.colors.blueContainer, text: theme.colors.brandBlue, label: 'College Event' };
      case 'ACADEMIC_EVENT':
        return { bg: theme.colors.violetContainer, text: theme.colors.violet, label: 'Academic Event' };
      case 'SPECIAL_WORKING_DAY':
        return { bg: theme.colors.mintContainer, text: theme.colors.mintInk, label: 'Special Working' };
      case 'WEEKLY_OFF':
        return { bg: theme.colors.muted, text: theme.colors.mutedForeground, label: 'Weekly Off' };
      default:
        return {
          bg: isWorking ? theme.colors.mintContainer : theme.colors.muted,
          text: isWorking ? theme.colors.mintInk : theme.colors.mutedForeground,
          label: isWorking ? 'Working' : 'Non-Working',
        };
    }
  };

  return (
    <DetailScreen title="Academic Calendar">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Term & Academic Year Card */}
        <View style={styles.termCard}>
          <View style={styles.termHeader}>
            <View>
              <Text style={styles.termYear}>
                {overview?.currentAcademicYear?.name || 'Academic Year 2026–27'}
              </Text>
              <Text style={styles.termName}>
                {overview?.currentSemester?.name || 'Odd Semester'}
              </Text>
            </View>
            <View style={styles.termBadge}>
              <Text style={styles.termBadgeText}>
                {overview?.semesterWorkingDays ? `${overview.semesterWorkingDays} Term Days` : 'Mon–Sat Active'}
              </Text>
            </View>
          </View>
          <Text style={styles.termDates}>
            Jain College of Engineering & Technology, Hubballi
          </Text>
        </View>

        {/* View Segmented Switcher */}
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            options={TAB_OPTIONS}
            value={tab}
            onChange={(val) => setTab(val)}
            label="Academic calendar view tabs"
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading calendar schedule...</Text>
          </View>
        ) : tab === 'Upcoming' ? (
          <View style={styles.section}>
            {/* Upcoming Holidays */}
            <Text style={styles.sectionTitle}>UPCOMING INSTITUTIONAL HOLIDAYS</Text>
            {overview?.upcomingHolidays && overview.upcomingHolidays.length > 0 ? (
              <View style={styles.cardGroup}>
                {overview.upcomingHolidays.map((h, i) => {
                  const d = new Date(h.date);
                  const dateNum = String(d.getUTCDate()).padStart(2, '0');
                  const dayName = DAY_NAMES[d.getUTCDay()];
                  const badge = getBadgeStyle(h.dayType, h.isWorkingDay);

                  return (
                    <View
                      key={h.id}
                      style={[
                        styles.dayRow,
                        i < overview.upcomingHolidays.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <View style={styles.dateBlock}>
                        <Text style={styles.dateNumber}>{dateNum}</Text>
                        <Text style={styles.dateDay}>{dayName}</Text>
                      </View>
                      <View style={styles.dayInfo}>
                        <Text style={styles.dayTitle}>{h.title || 'Holiday'}</Text>
                        <Text style={styles.daySub}>
                          {h.dayType === 'PUBLIC_HOLIDAY' ? 'Official Public Holiday' : 'Restricted Holiday'}
                        </Text>
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.pillText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No upcoming public holidays within the next 30 days.</Text>
              </View>
            )}

            {/* Upcoming Academic & Exam Events */}
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>
              ACADEMIC EVENTS & EXAMINATIONS
            </Text>
            {overview?.upcomingAcademicEvents && overview.upcomingAcademicEvents.length > 0 ? (
              <View style={styles.cardGroup}>
                {overview.upcomingAcademicEvents.map((e, i) => {
                  const d = new Date(e.date);
                  const dateNum = String(d.getUTCDate()).padStart(2, '0');
                  const dayName = DAY_NAMES[d.getUTCDay()];
                  const badge = getBadgeStyle(e.dayType, e.isWorkingDay);

                  return (
                    <View
                      key={e.id}
                      style={[
                        styles.dayRow,
                        i < overview.upcomingAcademicEvents.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <View style={styles.dateBlock}>
                        <Text style={styles.dateNumber}>{dateNum}</Text>
                        <Text style={styles.dateDay}>{dayName}</Text>
                      </View>
                      <View style={styles.dayInfo}>
                        <Text style={styles.dayTitle}>{e.title || 'Academic Event'}</Text>
                        <Text style={styles.daySub}>
                          {e.isWorkingDay ? 'Regular working day' : 'Non-instructional'}
                        </Text>
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.pillText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No upcoming exam periods or academic events listed.</Text>
              </View>
            )}
          </View>
        ) : tab === 'Month View' ? (
          <View style={styles.section}>
            {/* Month Header Navigation */}
            <View style={styles.monthHeader}>
              <Pressable onPress={prevMonth} style={styles.navButton} accessibilityLabel="Previous month">
                <Text style={styles.navButtonText}>‹</Text>
              </Pressable>
              <Pressable onPress={goToToday} style={styles.monthTitleWrapper}>
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[month]?.toUpperCase()} {year}
                </Text>
                <Text style={styles.monthSub}>Tap for today</Text>
              </Pressable>
              <Pressable onPress={nextMonth} style={styles.navButton} accessibilityLabel="Next month">
                <Text style={styles.navButtonText}>›</Text>
              </Pressable>
            </View>

            {/* Month Days List */}
            {days.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No declared calendar entries or holidays for {MONTH_NAMES[month]} {year}.
                </Text>
              </View>
            ) : (
              <View style={styles.cardGroup}>
                {days.map((item, i) => {
                  const d = new Date(item.date);
                  const dateNum = String(d.getUTCDate()).padStart(2, '0');
                  const dayName = DAY_NAMES[d.getUTCDay()];
                  const badge = getBadgeStyle(item.dayType, item.isWorkingDay);

                  return (
                    <View
                      key={item.id}
                      style={[styles.dayRow, i < days.length - 1 && styles.rowDivider]}
                    >
                      <View style={styles.dateBlock}>
                        <Text style={styles.dateNumber}>{dateNum}</Text>
                        <Text style={styles.dateDay}>{dayName}</Text>
                      </View>
                      <View style={styles.dayInfo}>
                        <Text style={styles.dayTitle}>{item.title || badge.label}</Text>
                        {item.description ? (
                          <Text style={styles.daySub} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.pillText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* TAB 3: RESTRICTED HOLIDAYS (RH) */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ANNUAL RESTRICTED HOLIDAYS (RH)</Text>
            <Text style={styles.sectionDesc}>
              JCET faculty and staff can elect eligible restricted holidays when submitting Casual Leave applications.
            </Text>

            {restrictedHolidays.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No restricted holidays declared for this academic cycle.</Text>
              </View>
            ) : (
              <View style={styles.cardGroup}>
                {restrictedHolidays.map((rh, i) => {
                  const d = new Date(rh.date);
                  const dateNum = String(d.getUTCDate()).padStart(2, '0');
                  const dayName = DAY_NAMES[d.getUTCDay()];
                  const monthName = MONTH_NAMES[d.getUTCMonth()];

                  return (
                    <View
                      key={rh.id}
                      style={[
                        styles.dayRow,
                        i < restrictedHolidays.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <View style={styles.dateBlock}>
                        <Text style={styles.dateNumber}>{dateNum}</Text>
                        <Text style={styles.dateDay}>{monthName?.slice(0, 3)}</Text>
                      </View>
                      <View style={styles.dayInfo}>
                        <Text style={styles.dayTitle}>{rh.name}</Text>
                        <Text style={styles.daySub}>
                          {dayName} · {rh.annualYear} · {rh.eligibleEmployeeTypes || 'All Staff'}
                        </Text>
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: theme.colors.amberContainer }]}>
                        <Text style={[styles.pillText, { color: theme.colors.amberInk }]}>
                          RH
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  termCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  termYear: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  termName: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginTop: 2,
  },
  termBadge: {
    backgroundColor: theme.colors.mintContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  termBadgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.mintInk,
  },
  termDates: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: theme.spacing.sm,
  },
  segmentWrapper: {
    marginBottom: theme.spacing.md,
  },
  loadingWrapper: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.mutedForeground,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  sectionDesc: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.muted,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
    lineHeight: 22,
  },
  monthTitleWrapper: {
    alignItems: 'center',
  },
  monthTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '700',
    color: theme.colors.foreground,
    letterSpacing: 0.5,
  },
  monthSub: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 10,
    color: theme.colors.mutedForeground,
    marginTop: 1,
  },
  cardGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  dateBlock: {
    width: 44,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  dateNumber: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    lineHeight: 22,
  },
  dateDay: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 10,
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
  },
  dayInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  dayTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  daySub: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  emptyCard: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
});
