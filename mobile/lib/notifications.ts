import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show notifications as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function enableNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CampusHR',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// The address the server sends pushes to. Needs an EAS projectId (`npx eas init`)
// and, on Android, a development build: Expo Go no longer supports remote push.
export async function getPushToken() {
  try {
    return { token: (await Notifications.getExpoPushTokenAsync()).data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Push token unavailable.',
    };
  }
}

export function sendTestNotification() {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Substitute assigned',
      body: 'You are covering CSE 5A, Data Structures, today at 10:00 AM.',
    },
    trigger: null,
  });
}
