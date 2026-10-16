import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import { sendTestNotification } from '../../lib/notifications';
import { theme } from '../../lib/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  async function handleTestNotification() {
    try {
      setNotificationStatus('Sending notification…');
      await sendTestNotification();
      setNotificationStatus('✓ Notification sent! Check your device tray.');
      setTimeout(() => setNotificationStatus(null), 4000);
    } catch (err) {
      setNotificationStatus('Failed to send notification.');
      setTimeout(() => setNotificationStatus(null), 4000);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
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
        {/* Metric 1: Today's Classes */}
        <Card style={styles.metricCard} onPress={() => router.push('/(tabs)/timetable')}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Today's Classes</Text>
            <Badge label="Active" variant="success" />
          </View>
          <Text style={styles.metricValue}>3</Text>
          <Text style={styles.metricDetail}>Next: BCS501 at 10:00 AM</Text>
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

      {/* Today's Schedule Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Class Schedule</Text>
        <Pressable onPress={() => router.push('/(tabs)/timetable')}>
          <Text style={styles.sectionAction}>View all</Text>
        </Pressable>
      </View>

      <Card style={styles.scheduleCard}>
        <View style={styles.classItem}>
          <View style={styles.classTime}>
            <Text style={styles.classTimeStart}>09:00 AM</Text>
            <Text style={styles.classTimeEnd}>10:00 AM</Text>
          </View>
          <View style={styles.classDivider} />
          <View style={styles.classDetails}>
            <Text style={styles.classSubject}>BCS501 · Database Management</Text>
            <Text style={styles.classMeta}>Semester 5A · Room 302 · Theory</Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        <View style={styles.classItem}>
          <View style={styles.classTime}>
            <Text style={styles.classTimeStart}>11:15 AM</Text>
            <Text style={styles.classTimeEnd}>12:15 PM</Text>
          </View>
          <View style={styles.classDivider} />
          <View style={styles.classDetails}>
            <Text style={styles.classSubject}>BCS504 · Computer Networks</Text>
            <Text style={styles.classMeta}>Semester 5B · Room 204 · Theory</Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        <View style={styles.classItem}>
          <View style={styles.classTime}>
            <Text style={styles.classTimeStart}>02:00 PM</Text>
            <Text style={styles.classTimeEnd}>04:00 PM</Text>
          </View>
          <View style={styles.classDivider} />
          <View style={styles.classDetails}>
            <Text style={styles.classSubject}>BCSL507 · DBMS Laboratory</Text>
            <Text style={styles.classMeta}>Semester 5A · Batch A1 · Lab 3</Text>
          </View>
        </View>
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
  sectionTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    color: theme.colors.primary,
  },
  sectionAction: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.accent,
  },
  scheduleCard: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  classTime: {
    width: 68,
    alignItems: 'flex-start',
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
  classDivider: {
    width: 2,
    height: 32,
    backgroundColor: theme.colors.border,
    borderRadius: 1,
  },
  classDetails: {
    flex: 1,
    gap: 2,
  },
  classSubject: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
  },
  classMeta: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
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
