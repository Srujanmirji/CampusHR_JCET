import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Check if running inside Expo Go client
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

// Expo SDK 53+ removed remote push notifications (FCM) from Expo Go on Android.
// In SDK 53+, importing the root `expo-notifications` package on Android Expo Go evaluates
// DevicePushTokenAutoRegistration.fx which calls warnOfExpoGoPushUsage and throws an unhandled Error at module evaluation time.
// To ensure the app starts safely in Expo Go without crashing, we dynamically require expo-notifications
// only when safe, and wrap in try/catch.
let Notifications: typeof import('expo-notifications') | null = null;

if (!isAndroidExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
  } catch (error) {
    console.warn('[notifications] expo-notifications could not be loaded in current environment:', error);
    Notifications = null;
  }
}

export interface NotificationDeliveryResult {
  delivered: boolean;
  type: 'native-local' | 'preview-simulated' | 'unsupported';
  message: string;
}

/**
 * Checks whether native notification features are available in the current runtime environment.
 */
export function isNotificationSupported(): boolean {
  return Notifications !== null && !isAndroidExpoGo;
}

/**
 * Configures notification channels and requests notification permissions.
 * Gracefully returns false if running in Expo Go on Android or if permissions are denied.
 */
export async function enableNotifications(): Promise<boolean> {
  if (isAndroidExpoGo || !Notifications) {
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'CampusHR',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.warn('[notifications] Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Fetches the Expo push token for server-side remote pushes.
 * Returns an informative error object on Android Expo Go or unsupported environments.
 */
export async function getPushToken(): Promise<{ token?: string; error?: string }> {
  if (isAndroidExpoGo) {
    return {
      error:
        'Remote push notifications are not supported in Expo Go on Android (SDK 53+). A development build is required for production FCM push.',
    };
  }

  if (!Notifications || typeof Notifications.getExpoPushTokenAsync !== 'function') {
    return {
      error: 'Push notification service is not available in the current environment.',
    };
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return { token };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Push token unavailable.',
    };
  }
}

/**
 * Sends a local test notification to demonstrate notification rendering.
 * Falls back to a simulated console log preview on Android Expo Go.
 */
export async function sendTestNotification(): Promise<NotificationDeliveryResult> {
  const title = 'Substitute assigned';
  const body = 'You are covering CSE 5A, Data Structures, today at 10:00 AM. [Local Device Preview]';

  if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: null,
      });
      return {
        delivered: true,
        type: 'native-local',
        message: 'Notification sent to device tray.',
      };
    } catch (err) {
      console.warn('[notifications] Failed to schedule test notification:', err);
    }
  }

  console.info(`[Notification Preview] ${title}: ${body}`);
  return {
    delivered: true,
    type: 'preview-simulated',
    message: isAndroidExpoGo
      ? 'Preview simulated (native notifications unavailable in Android Expo Go SDK 53+; requires development build for remote push).'
      : 'Notification simulated in current environment.',
  };
}

/**
 * Triggers a local preview notification when an HOD assigns a substitute.
 * Note: Delivered only to the local test device for prototype demonstration.
 * Does not throw when running in Expo Go.
 */
export async function sendSubstitutionAssignedNotification(params: {
  substituteName: string;
  subjectCode: string;
  date: string;
  periodLabel: string;
}): Promise<NotificationDeliveryResult> {
  const title = 'Smart Substitution Assigned';
  const body = `Assigned: ${params.substituteName} covering ${params.subjectCode} on ${params.date} (${params.periodLabel}). [Local Device Preview]`;

  if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'substitution', ...params },
        },
        trigger: null,
      });
      return {
        delivered: true,
        type: 'native-local',
        message: 'Local notification banner scheduled.',
      };
    } catch (err) {
      console.warn('[notifications] Failed to schedule native substitution notification:', err);
    }
  }

  console.info(`[Notification Preview] ${title}: ${body}`);
  return {
    delivered: true,
    type: 'preview-simulated',
    message: isAndroidExpoGo
      ? 'Local preview simulated (native notifications unavailable in Android Expo Go SDK 53+; requires development build for remote push).'
      : 'Notification simulated in current environment.',
  };
}
