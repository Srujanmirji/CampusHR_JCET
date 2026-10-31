import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth-context';
import { getHomeUnread, homeUnavailable } from '../../lib/home-api';
import { IconButton } from './IconButton';
import { theme } from '../../lib/theme';

export function Topbar() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const unread = useQuery({
    queryKey: ['notifications', user?.id, 'unread'],
    queryFn: () => getHomeUnread(user, accessToken),
    enabled: !homeUnavailable(user, accessToken, 'notification.read'),
    retry: false,
  });
  const initials =
    user?.name
      ?.replace(/^(Prof\.?|Dr\.?)\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .map((x) => x[0])
      .slice(0, 2)
      .join('') || 'HR';
  return (
    <View style={styles.bar}>
      <View style={styles.identity}>
        <Text accessibilityLabel="CampusHR" style={styles.brand}>
          Campus<Text style={styles.brandAccent}>HR</Text>
        </Text>
        <Text style={styles.subtitle}>
          JCET, Hubballi{user?.role === 'HOD' ? ' · HOD' : ''}
        </Text>
      </View>
      <View style={styles.actions}>
        <IconButton
          name="bell"
          label={`Notifications${unread.isSuccess ? `, ${unread.data} unread` : ''}`}
          onPress={() => router.push('/notifications')}
        >
          {!!unread.data && <View style={styles.dot} />}
        </IconButton>
        <IconButton
          label="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
        >
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        </IconButton>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    minHeight: 64,
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  identity: { flex: 1, gap: theme.spacing.xs },
  brand: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: theme.colors.deepInk,
  },
  brandAccent: { color: theme.colors.primary },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: theme.sizes.avatar,
    height: theme.sizes.avatar,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.blueContainer,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  dot: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.coral,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
});
