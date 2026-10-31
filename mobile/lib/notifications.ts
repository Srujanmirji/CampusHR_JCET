import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

export const pushPayloadSchema = z
  .object({ notificationId: z.uuid(), recipientId: z.uuid() })
  .strict();
export const pushProjectId = z
  .uuid()
  .safeParse(
    Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
  );
const supported =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
let notifications: typeof import('expo-notifications') | null = null;
if (supported) {
  try {
    // Expo Go/web must never evaluate the native remote-push registration module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifications = require('expo-notifications');
  } catch {
    /* A missing native module is shown as unavailable, never simulated. */
  }
}
export const pushNative = {
  supported: !!notifications && pushProjectId.success,
  projectId: pushProjectId.success ? pushProjectId.data : null,
  platform: Platform.OS === 'ios' ? ('ios' as const) : ('android' as const),
  async permission(ask: boolean) {
    if (!notifications)
      throw new Error(
        'A signed development build is required for remote alerts.',
      );
    if (Platform.OS === 'android')
      await notifications.setNotificationChannelAsync('campushr', {
        name: 'CampusHR',
        importance: notifications.AndroidImportance.DEFAULT,
      });
    const current = await notifications.getPermissionsAsync();
    if (ask && !current.granted && current.canAskAgain)
      return notifications.requestPermissionsAsync();
    return current;
  },
  async token() {
    if (!notifications || !pushProjectId.success)
      throw new Error('An approved Expo project is required.');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        notifications.getExpoPushTokenAsync({ projectId: pushProjectId.data }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  'Push token request timed out. Retry when connected.',
                ),
              ),
            15000,
          );
        }),
      ]);
      return result.data;
    } finally {
      clearTimeout(timer);
    }
  },
  listen(
    own: (data: unknown) => boolean,
    received: () => void,
    tapped: (data: unknown) => void,
    rotated: () => void,
  ) {
    if (!notifications) return () => {};
    const api = notifications;
    let listening = true;
    api.setNotificationHandler({
      handleNotification: async (notification) => {
        const allowed = own(notification.request.content.data);
        return {
          shouldShowBanner: allowed,
          shouldShowList: allowed,
          shouldPlaySound: allowed,
          shouldSetBadge: false,
        };
      },
    });
    const subscriptions = [
      api.addNotificationReceivedListener((notification) => {
        if (own(notification.request.content.data)) received();
      }),
      api.addNotificationResponseReceivedListener((response) =>
        tapped(response.notification.request.content.data),
      ),
      api.addPushTokenListener(() => rotated()),
    ];
    void api
      .getLastNotificationResponseAsync()
      .then((response) => {
        if (listening && response)
          tapped(response.notification.request.content.data);
      })
      .catch(() => undefined);
    return () => {
      listening = false;
      subscriptions.forEach((subscription) => subscription.remove());
      api.setNotificationHandler(null);
    };
  },
  async clearResponse() {
    await notifications?.clearLastNotificationResponseAsync();
  },
  async clearTray() {
    await notifications?.dismissAllNotificationsAsync();
    await notifications?.setBadgeCountAsync(0);
  },
};
