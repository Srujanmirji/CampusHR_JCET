import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useAuth } from '../lib/auth-context';
import {
  getHomeUnread,
  homeNotificationRoute,
  homeUnavailable,
} from '../lib/home-api';
import {
  listNotifications,
  markNotificationRead,
  type AppNotification,
} from '../lib/notifications-api';
import { useNotificationConnection } from '../lib/notification-context';
import { getSession } from '../lib/session';
import { theme } from '../lib/theme';

const categories = [
  'All',
  'Leave',
  'Timetable',
  'Attendance',
  'Substitution',
] as const;
type Category = (typeof categories)[number];

export default function NotificationsScreen() {
  const { user, accessToken } = useAuth();
  return <Inbox key={user?.id ?? 'none'} user={user} token={accessToken} />;
}
function Inbox({
  user,
  token,
}: {
  user: ReturnType<typeof useAuth>['user'];
  token: string | null;
}) {
  const router = useRouter(),
    client = useQueryClient(),
    connection = useNotificationConnection();
  const unavailable = homeUnavailable(user, token, 'notification.read');
  const [category, setCategory] = useState<Category>('All');
  const [filterFocused, setFilterFocused] = useState<string | null>(null);
  const [notice, setNotice] = useState(''),
    [sending, setSending] = useState(false);
  const busy = useRef(false);
  const inbox = useInfiniteQuery({
    queryKey: ['notifications', user?.id, 'inbox'],
    queryFn: ({ pageParam }) => listNotifications(user, token, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore ? last.data.at(-1)?.id : undefined,
    enabled: !unavailable,
    retry: false,
  });
  const unread = useQuery({
    queryKey: ['notifications', user?.id, 'unread'],
    queryFn: () => getHomeUnread(user, token),
    enabled: !unavailable,
    retry: false,
  });
  const refresh = useCallback(
    () => client.invalidateQueries({ queryKey: ['notifications', user?.id] }),
    [client, user?.id],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function read(item?: AppNotification, open = false) {
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setNotice('');
    try {
      if (!item?.readAt) await markNotificationRead(user, token, item?.id);
      if (getSession().user?.id !== user?.id) return;
      await refresh();
      if (open && item) {
        const route = homeNotificationRoute(item.link, getSession().user);
        if (route) router.dismissTo(route);
        else
          setNotice(
            'This notification has no available screen for your account.',
          );
      } else
        setNotice(
          item ? 'Notification marked read.' : 'Notifications marked read.',
        );
    } catch (error) {
      setNotice(
        error instanceof Error && error.name !== 'ZodError'
          ? error.message
          : 'Read status could not be confirmed. Refresh the inbox.',
      );
      void refresh();
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  const items = [
    ...new Map(
      (inbox.data?.pages ?? [])
        .flatMap((page) => page.data)
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const filteredItems = items.filter(
    (item) =>
      category === 'All' || item.kind.startsWith(category.toLowerCase()),
  );
  const groups = new Map<string, AppNotification[]>();
  for (const item of filteredItems) {
    const label = dayLabel(item.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const errorMessage = (error: Error) =>
    error.name === 'ZodError'
      ? 'Unexpected notification response. Refresh or contact your administrator.'
      : error.message;
  const connectionMessage =
    connection === 'connected'
      ? 'Live updates connected'
      : connection === 'connecting'
        ? 'Connecting live updates…'
        : 'Live updates unavailable. Pull to refresh.';

  return (
    <ScreenContainer
      testID="notifications-screen"
      refreshControl={
        <RefreshControl
          refreshing={inbox.isRefetching || unread.isRefetching}
          onRefresh={() => void refresh()}
          tintColor={theme.colors.primary}
        />
      }
      contentContainerStyle={styles.stack}
    >
      <View style={styles.navigation}>
        <Button
          variant="text"
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.dismissTo('/(tabs)')
          }
          style={styles.back}
        >
          <Icon
            name="back"
            color={theme.colors.primary}
            size={theme.sizes.iconSmall}
          />
          <Text style={styles.action}>Back</Text>
        </Button>
        {!unavailable && (
          <Button
            variant="text"
            disabled={sending || !unread.isSuccess || unread.data === 0}
            loading={sending}
            onPress={() => void read()}
          >
            Mark all read
          </Button>
        )}
      </View>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>
          Notifications
        </Text>
        {!unavailable && (
          <View style={styles.summary}>
            <Text accessibilityLiveRegion="polite" style={styles.detail}>
              {unread.isPending
                ? 'Checking unread updates…'
                : unread.isError
                  ? 'Unread count unavailable'
                  : `${unread.data} unread`}
            </Text>
            <Button
              variant="text"
              accessibilityLabel="Refresh inbox"
              disabled={sending}
              onPress={() => void refresh()}
            >
              <Icon
                name="refresh"
                color={theme.colors.primary}
                size={theme.sizes.iconSmall}
              />
            </Button>
          </View>
        )}
      </View>
      {unavailable ? (
        <Text style={styles.detail}>{unavailable}</Text>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterStrip}
            contentContainerStyle={styles.filters}
          >
            {categories.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={`${value} notifications`}
                accessibilityState={{ selected: category === value }}
                aria-selected={category === value}
                onPress={() => setCategory(value)}
                onFocus={() => setFilterFocused(value)}
                onBlur={() => setFilterFocused(null)}
                style={({ pressed }) => [
                  styles.filter,
                  category === value && styles.filterSelected,
                  filterFocused === value && styles.focused,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    category === value && styles.filterTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {!!notice && (
            <Text accessibilityLiveRegion="polite" style={styles.detail}>
              {notice}
            </Text>
          )}
          {unread.isError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage(unread.error)}
            </Text>
          )}
          {inbox.isPending && <Skeleton label="Loading notifications" />}
          {inbox.isError && (
            <View style={styles.recovery}>
              <Text accessibilityRole="alert" style={styles.error}>
                Inbox could not be updated. {errorMessage(inbox.error)}
              </Text>
              <Button variant="secondary" onPress={() => void refresh()}>
                Try again
              </Button>
            </View>
          )}
          {inbox.isSuccess && filteredItems.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon
                  name="bell"
                  color={theme.colors.primary}
                  size={theme.spacing.xl}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {category === 'All'
                  ? 'You’re all caught up'
                  : `No ${category.toLowerCase()} updates`}
              </Text>
              <Text style={styles.emptyCopy}>
                {inbox.hasNextPage
                  ? 'No matching updates loaded yet. Load more to check older notifications.'
                  : category === 'All'
                    ? 'Your college updates will appear here. Pull down to check for new notifications.'
                    : 'Choose All to see the rest of your notifications.'}
              </Text>
              {category !== 'All' && (
                <Button variant="text" onPress={() => setCategory('All')}>
                  Show all notifications
                </Button>
              )}
            </View>
          )}
          {[...groups].map(([label, rows]) => (
            <View key={label} style={styles.feedGroup}>
              <Text accessibilityRole="header" style={styles.groupHeading}>
                {label}
              </Text>
              <View style={styles.feed}>
                {rows.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    disabled={sending}
                    canOpen={!!homeNotificationRoute(item.link, user)}
                    onPress={() =>
                      void read(item, !!homeNotificationRoute(item.link, user))
                    }
                  />
                ))}
              </View>
            </View>
          ))}
          {inbox.hasNextPage && (
            <Button
              variant="secondary"
              disabled={inbox.isFetching || sending}
              loading={inbox.isFetchingNextPage}
              onPress={() => void inbox.fetchNextPage()}
            >
              Load more notifications
            </Button>
          )}
          <View style={styles.footer}>
            <Text accessibilityLiveRegion="polite" style={styles.caption}>
              {connectionMessage}
            </Text>
            <Button
              variant="text"
              onPress={() => router.push('/profile/settings')}
            >
              Notification preferences
            </Button>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function dayLabel(createdAt: string) {
  const date = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const key = (value: Date) =>
    value.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (key(date) === key(today)) return 'Today';
  if (key(date) === key(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function NotificationRow({
  item,
  disabled,
  canOpen,
  onPress,
}: {
  item: AppNotification;
  disabled: boolean;
  canOpen: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const leave = item.kind.startsWith('leave'),
    substitution = item.kind.startsWith('substitution'),
    attendance = item.kind.startsWith('attendance');
  const icon: IconName = leave
    ? 'leave'
    : substitution
      ? 'coverage'
      : attendance
        ? 'attendance'
        : 'timetable';
  const color =
    leave || substitution
      ? theme.colors.violet
      : attendance
        ? theme.colors.mintInk
        : theme.colors.primary;
  const container =
    leave || substitution
      ? theme.colors.violetContainer
      : attendance
        ? theme.colors.mintContainer
        : theme.colors.blueContainer;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.readAt ? 'Read' : 'Unread'}: ${item.title}. ${item.body}`}
      accessibilityHint={
        canOpen
          ? 'Opens the related screen and marks this notification as read.'
          : 'Marks this notification as read.'
      }
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.feedRow,
        !item.readAt && { backgroundColor: container },
        focused && styles.focused,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.notificationIcon, { backgroundColor: container }]}>
        <Icon name={icon} color={color} size={theme.sizes.icon} />
      </View>
      <View style={styles.feedCopy}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <View style={styles.metadata}>
          <Text style={styles.caption}>
            {new Date(item.createdAt).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: 'numeric',
              minute: '2-digit',
            })}{' '}
            IST
          </Text>
          {!item.readAt && <Text style={styles.unreadText}>Unread</Text>}
        </View>
      </View>
      {canOpen && <Icon name="next" size={theme.sizes.iconSmall} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.section, paddingBottom: theme.spacing.xl },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  back: { paddingHorizontal: 0 },
  action: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.button,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  intro: { gap: theme.spacing.xs },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.heading,
    color: theme.colors.foreground,
    letterSpacing: -0.5,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  detail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.mutedForeground,
  },
  filterStrip: { flexGrow: 0, flexShrink: 0 },
  filters: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  filter: {
    minHeight: theme.sizes.tapTarget,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.control,
    borderWidth: 2,
    borderColor: theme.colors.muted,
  },
  filterSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.foreground,
    fontWeight: '500',
  },
  filterTextSelected: { color: theme.colors.onAction },
  focused: { borderColor: theme.colors.foreground },
  pressed: { opacity: 0.7 },
  feedGroup: { gap: theme.spacing.md, marginTop: theme.spacing.sm },
  groupHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
    fontWeight: '600',
  },
  feed: { backgroundColor: theme.colors.surface },
  feedRow: {
    minHeight: theme.sizes.tapTarget + theme.spacing.page,
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  notificationIcon: {
    width: theme.sizes.tapTarget,
    height: theme.sizes.tapTarget,
    borderRadius: theme.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCopy: { flex: 1, gap: theme.spacing.xs },
  notificationTitle: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
    lineHeight: theme.typography.lineHeight,
  },
  body: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.mutedForeground,
  },
  caption: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  unreadText: {
    fontSize: theme.typography.caption,
    fontFamily: theme.typography.bodyFamily,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  recovery: {
    gap: theme.spacing.section,
    paddingVertical: theme.spacing.section,
  },
  error: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.errorInk,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyIcon: {
    width: theme.sizes.avatarLarge,
    height: theme.sizes.avatarLarge,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.blueContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: theme.typography.secondary,
    fontFamily: theme.typography.bodyFamily,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  footer: {
    paddingTop: theme.spacing.page,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
});
