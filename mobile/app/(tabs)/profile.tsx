import { Alert } from '../../lib/dialogs';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ProfileListRow } from '../../components/profile/ProfileListRow';
import { AccountSupportSheet } from '../../components/profile/AccountSupportSheet';
import { useAuth } from '../../lib/auth-context';
import { getOwnProfile } from '../../lib/profile-api';
import { getHomeWorkload, homeUnavailable } from '../../lib/home-api';
import { theme } from '../../lib/theme';

export default function ProfileTab() {
  const { user, accessToken, logout } = useAuth();
  const router = useRouter();
  const [support, setSupport] = useState(false);
  const supportRef = useRef<View>(null);
  const profileUnavailable = homeUnavailable(
    user,
    accessToken,
    'employee.read',
  );
  const workloadUnavailable = homeUnavailable(
    user,
    accessToken,
    'workload.read',
  );
  const profile = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getOwnProfile(user, accessToken),
    enabled: !profileUnavailable,
    retry: false,
  });
  const workload = useQuery({
    queryKey: ['home', user?.id, 'workload'],
    queryFn: () => getHomeWorkload(user, accessToken),
    enabled: !workloadUnavailable,
    retry: false,
  });
  const row = profile.data;
  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('') || 'HR';
  const unavailable = (title: string) =>
    Alert.alert(
      title,
      'This part of your faculty record is not available in the mobile app yet. Contact JCET administration for assistance.',
    );
  const signOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          void logout()
            .then(() => router.replace('/(auth)/login'))
            .catch(() =>
              Alert.alert(
                'Sign out failed',
                'Try again to clear the saved session.',
              ),
            ),
      },
    ]);

  return (
    <ScreenContainer
      testID="profile-screen"
      contentContainerStyle={styles.content}
    >
      <Text accessibilityRole="header" style={styles.title}>
        Profile
      </Text>
      <View style={styles.identity}>
        <View style={styles.avatar} accessibilityElementsHidden>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{user?.name || 'Signed-in account'}</Text>
          <Text style={styles.body}>{row?.designation.name || user?.role}</Text>
          <Text style={styles.detail}>
            {row?.department.name || user?.email}
          </Text>
          {!!(row?.employeeCode || user?.employeeCode) && (
            <Text style={styles.detail}>
              {row?.employeeCode || user?.employeeCode}
            </Text>
          )}
        </View>
      </View>
      {!profileUnavailable && profile.isPending && (
        <Skeleton label="Loading your employee record" />
      )}
      {profileUnavailable && (
        <Text style={styles.detail}>{profileUnavailable}</Text>
      )}
      {profile.isError && (
        <View style={styles.notice}>
          <Text style={styles.detail}>
            Your employee record could not be updated.
          </Text>
          <Button variant="text" onPress={() => void profile.refetch()}>
            Retry profile
          </Button>
        </View>
      )}
      {(row?.experienceYears != null || workload.isSuccess) && (
        <View style={styles.stats}>
          {row?.experienceYears != null && (
            <View style={styles.stat}>
              <Text style={styles.value}>{row.experienceYears}</Text>
              <Text style={styles.detail}>years of experience</Text>
            </View>
          )}
          {workload.isSuccess && (
            <View
              style={[
                styles.stat,
                row?.experienceYears != null && styles.statDivider,
              ]}
            >
              <Text style={styles.value}>
                {workload.data.totalHours}
                {workload.data.maxHours != null
                  ? ` / ${workload.data.maxHours}`
                  : ''}{' '}
                hrs
              </Text>
              <Text style={styles.detail}>weekly workload</Text>
            </View>
          )}
        </View>
      )}
      {workload.isError && (
        <View style={styles.notice}>
          <Text style={styles.detail}>Workload could not be updated.</Text>
          <Button variant="text" onPress={() => void workload.refetch()}>
            Retry workload
          </Button>
        </View>
      )}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          Academic record
        </Text>
        <View style={styles.group}>
          <ProfileListRow
            label="Personal information"
            icon="profile"
            onPress={() => router.push('/profile/details')}
          />
          <ProfileListRow
            label="Academic profile"
            icon="school"
            onPress={() => router.push('/profile/details')}
          />
          <ProfileListRow
            label="Documents"
            icon="document"
            onPress={() => router.push('/documents')}
          />
          <ProfileListRow
            label="Research & publications"
            detail="Ask administration for your record"
            icon="school"
            onPress={() => unavailable('Research & publications')}
          />
          <ProfileListRow
            label="Performance"
            detail="Ask administration for your record"
            icon="workload"
            onPress={() => unavailable('Performance')}
          />
          <ProfileListRow
            label="Service history"
            detail="Employment and joining details"
            icon="clock"
            last
            onPress={() => router.push('/profile/details')}
          />
        </View>
      </View>
      <View style={styles.contact}>
        <Text style={styles.groupLabel}>Official contact</Text>
        <Text selectable style={styles.body}>
          {row?.email || user?.email}
        </Text>
        {!!row?.phone && (
          <Text selectable style={styles.detail}>
            {row.phone}
          </Text>
        )}
      </View>
      {user?.role === 'HOD' && (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.groupLabel}>
            Your personal records
          </Text>
          <View style={styles.group}>
            <ProfileListRow
              label="My leave"
              icon="leave"
              onPress={() => router.push('/profile/leave')}
            />
            <ProfileListRow
              label="My attendance"
              icon="attendance"
              last
              onPress={() => router.push('/profile/attendance')}
            />
          </View>
        </View>
      )}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          Preferences & support
        </Text>
        <View style={styles.group}>
          <ProfileListRow
            label="Notification preferences"
            icon="bell"
            onPress={() => router.push('/profile/settings')}
          />
          <ProfileListRow
            label="Privacy & security"
            icon="lock"
            onPress={() => router.push('/profile/password')}
          />
          <ProfileListRow
            label="Settings"
            icon="settings"
            onPress={() => router.push('/profile/settings')}
          />
          <ProfileListRow
            label="Help & support"
            icon="help"
            pressRef={supportRef}
            last
            onPress={() => setSupport(true)}
          />
        </View>
      </View>
      <View style={styles.group}>
        <ProfileListRow
          label="Sign out"
          icon="logout"
          destructive
          last
          onPress={signOut}
        />
      </View>
      <AccountSupportSheet
        visible={support}
        onClose={() => setSupport(false)}
        returnFocusRef={supportRef}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.page, paddingBottom: theme.spacing.xl },
  title: {
    fontSize: theme.typography.heading,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: theme.colors.foreground,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.section,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  identityCopy: { flex: 1, gap: theme.spacing.xs },
  avatar: {
    width: theme.sizes.avatarLarge,
    height: theme.sizes.avatarLarge,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.blueContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: theme.typography.greeting,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  name: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  body: {
    fontSize: theme.typography.body,
    fontFamily: theme.typography.bodyFamily,
    color: theme.colors.foreground,
    lineHeight: theme.typography.lineHeight,
  },
  detail: {
    fontSize: theme.typography.secondary,
    fontFamily: theme.typography.bodyFamily,
    color: theme.colors.mutedForeground,
    lineHeight: theme.typography.secondaryLineHeight,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  stat: {
    flex: 1,
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.section,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  value: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  section: { gap: theme.spacing.sm },
  groupLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.mutedForeground,
  },
  group: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  contact: {
    gap: theme.spacing.xs,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  notice: { gap: theme.spacing.xs, alignItems: 'flex-start' },
});
