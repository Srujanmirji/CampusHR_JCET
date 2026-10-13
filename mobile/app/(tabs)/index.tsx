import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  enableNotifications,
  getPushToken,
  sendTestNotification,
} from '../../lib/notifications';
import { theme } from '../../lib/theme';

type Status =
  | { kind: 'idle' | 'working' | 'sent' | 'denied' }
  | { kind: 'error'; message: string };

export default function FoundationScreen() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [push, setPush] = useState<{ token?: string; error?: string }>();

  async function onTest() {
    setStatus({ kind: 'working' });
    try {
      if (!(await enableNotifications())) {
        setStatus({ kind: 'denied' });
        return;
      }
      await sendTestNotification();
      setStatus({ kind: 'sent' });
      setPush(await getPushToken());
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unknown error.',
      });
    }
  }

  const message = {
    idle: null,
    working: 'Sending…',
    sent: 'Test notification sent.',
    denied:
      'Notifications are turned off. Allow them for CampusHR in your phone settings.',
    error: status.kind === 'error' ? `Failed: ${status.message}` : null,
  }[status.kind];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.heading}>
          CampusHR
        </Text>
        <Text style={styles.label}>JCET Hubballi</Text>
        <Text style={styles.body}>
          Project foundation initialized. Faculty workflows will follow the
          documented mobile specification.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: status.kind === 'working' }}
          disabled={status.kind === 'working'}
          onPress={onTest}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Send test notification</Text>
        </Pressable>
        {message && (
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {message}
          </Text>
        )}
        {push?.token && (
          <Text selectable style={styles.mono}>
            Push token: {push.token}
          </Text>
        )}
        {push?.error && (
          <Text style={styles.note}>Remote push not ready: {push.error}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.page,
    gap: theme.spacing.section,
  },
  label: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.primary,
  },
  heading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    color: theme.colors.foreground,
  },
  body: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
  button: {
    minHeight: theme.sizes.tapTarget,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.page,
  },
  pressed: { opacity: 0.85 },
  buttonText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.surface,
  },
  mono: {
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
  },
  note: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
});
