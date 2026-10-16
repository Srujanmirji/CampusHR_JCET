import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import { theme } from '../../lib/theme';

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Profile</Text>
        <Text style={styles.subtitle}>Personal & Department Information</Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.name}>{user?.name || 'Faculty Member'}</Text>
            <Text style={styles.email}>{user?.email || 'employee@jcethbl.edu.in'}</Text>
            <Text style={styles.role}>Role: {user?.role || 'FACULTY'}</Text>
          </View>
        </View>

        <Button variant="danger" onPress={handleLogout} style={styles.logoutButton}>
          Sign Out
        </Button>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: theme.spacing.section,
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    color: theme.colors.primary,
  },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
  },
  card: {
    gap: theme.spacing.section,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.section,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 24,
    color: theme.colors.surface,
  },
  profileDetails: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.subheading,
    color: theme.colors.foreground,
  },
  email: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
  },
  role: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.accent,
    marginTop: 4,
  },
  logoutButton: {
    marginTop: theme.spacing.sm,
  },
});
