import {
  Alert as NativeAlert,
  Platform,
  type AlertButton,
  type AlertOptions,
} from 'react-native';
// React Native Web's Alert is a no-op; browser previews must still confirm consequential actions.
export const Alert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) {
    if (Platform.OS !== 'web') {
      NativeAlert.alert(title, message, buttons, options);
      return;
    }
    const text = [title, message].filter(Boolean).join('\n\n');
    if (buttons && buttons.length > 1) {
      if (globalThis.confirm(text)) buttons.at(-1)?.onPress?.();
      else buttons.find((b) => b.style === 'cancel')?.onPress?.();
    } else {
      globalThis.alert(text);
      buttons?.[0]?.onPress?.();
    }
  },
};
