import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { AttendanceRecord } from '../../lib/attendance-api';
import { theme } from '../../lib/theme';

type AttendanceStatus = AttendanceRecord['status'];
export const attendanceStatus = {
  PRESENT: {
    label: 'Present',
    ink: theme.colors.mintInk,
    fill: theme.colors.mintContainer,
  },
  ON_LEAVE: {
    label: 'Leave',
    ink: theme.colors.violet,
    fill: theme.colors.violetContainer,
  },
  LATE: {
    label: 'Late',
    ink: theme.colors.amberInk,
    fill: theme.colors.amberContainer,
  },
  HALF_DAY: {
    label: 'Half day',
    ink: theme.colors.amberInk,
    fill: theme.colors.amberContainer,
  },
  ABSENT: {
    label: 'Absent',
    ink: theme.colors.coralInk,
    fill: theme.colors.coralContainer,
  },
} satisfies Record<
  AttendanceStatus,
  { label: string; ink: string; fill: string }
>;
const order: AttendanceStatus[] = [
  'PRESENT',
  'ON_LEAVE',
  'LATE',
  'HALF_DAY',
  'ABSENT',
];

/** Displays only recorded statuses; an unrecorded calendar day never implies absence. */
export function AttendanceMonth({
  month,
  records,
  today,
}: {
  month: string;
  records: AttendanceRecord[];
  today: string;
}) {
  const { width, fontScale } = useWindowDimensions();
  const calendarWidth = Math.max(
    Math.min(width, theme.sizes.contentMax) - theme.spacing.page * 2,
    (theme.spacing.xl + theme.spacing.sm) * 7 * Math.max(fontScale, 1),
  );
  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const cells = Math.ceil((count + leading) / 7) * 7;
  return (
    <View style={styles.container}>
      <ScrollView horizontal>
        <View style={[styles.grid, { width: calendarWidth }]}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
            <View key={weekday} style={styles.cell}>
              <Text style={styles.weekday}>{weekday}</Text>
            </View>
          ))}
          {Array.from({ length: cells }, (_, index) => {
            const day = index - leading + 1;
            if (day < 1 || day > count)
              return <View key={`empty-${index}`} style={styles.cell} />;
            const date = `${month}-${String(day).padStart(2, '0')}`;
            const record = records.find(
              (item) => item.date.slice(0, 10) === date,
            );
            const status = record ? attendanceStatus[record.status] : null;
            return (
              <View key={date} style={styles.cell}>
                <View
                  accessible
                  accessibilityLabel={`${date}${date === today ? ', today' : ''}, ${status ? status.label : 'no record'}`}
                  style={[
                    styles.date,
                    status && { backgroundColor: status.fill },
                    date === today && styles.today,
                  ]}
                >
                  <Text
                    style={[styles.dateText, status && { color: status.ink }]}
                  >
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {order.map((status) => {
          const count = records.filter(
            (record) => record.status === status,
          ).length;
          return (
            <View
              key={status}
              accessible
              accessibilityLabel={`${count} ${attendanceStatus[status].label} records`}
              style={styles.legendItem}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: attendanceStatus[status].ink },
                ]}
              />
              <Text style={styles.legendText}>
                <Text style={styles.count}>{count}</Text>{' '}
                {attendanceStatus[status].label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>
        Recorded days only. Missing records are not counted as absence.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.section },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.sm },
  cell: {
    width: `${100 / 7}%`,
    minHeight: theme.spacing.xl + theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekday: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  date: {
    minWidth: theme.spacing.xl + theme.spacing.sm,
    minHeight: theme.spacing.xl + theme.spacing.sm,
    padding: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  today: { borderColor: theme.colors.primary },
  dateText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '500',
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: theme.spacing.section,
    rowGap: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  legendText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  count: { color: theme.colors.foreground, fontWeight: '600' },
  note: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
});
