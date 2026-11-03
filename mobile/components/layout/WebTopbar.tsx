import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../lib/auth-context';
import { theme } from '../../lib/theme';

export function WebTopbar({
  breadcrumb,
  unreadCount = 0,
}: {
  breadcrumb: string;
  unreadCount?: number;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .replace(/^(Prof\.?|Dr\.?)\s+/i, '')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'HR';

  return (
    <View style={styles.topbar}>
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>
            Campus<Text style={styles.brandAccent}>HR</Text>
          </Text>
        </View>
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbMuted}>Workspace</Text>
          <Icon name="next" size={12} color={theme.colors.mutedForeground} />
          <Text style={styles.breadcrumbActive} numberOfLines={1}>
            {breadcrumb}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Icon name="attendance" size={20} color={theme.colors.foreground} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Profile for ${user?.name || 'User'}`}
          onPress={() => router.push('/(tabs)/profile')}
          style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  left: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: theme.colors.foreground,
  },
  brandAccent: {
    color: theme.colors.brandOrange,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbMuted: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  breadcrumbActive: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  avatarBtn: {
    borderRadius: 18,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
