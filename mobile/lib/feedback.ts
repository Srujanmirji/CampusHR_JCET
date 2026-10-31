import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
// Native feedback is supplementary; a device that cannot play it never fails the saved action.
export function committedFeedback(destructive = false) {
  if (Platform.OS === 'web') return;
  void (
    destructive
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  ).catch(() => {});
}

// Selection feedback follows an actual value change, never a network request.
export function selectionFeedback() {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync().catch(() => {});
}
