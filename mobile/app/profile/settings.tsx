import { Alert } from '../../lib/dialogs';
import React, { useRef, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DetailScreen } from '../../components/ui/DetailScreen';
import { ProfileListRow } from '../../components/profile/ProfileListRow';
import { AccountSupportSheet } from '../../components/profile/AccountSupportSheet';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { usePush } from '../../lib/push-context';
import {
  getAppearance,
  setAppearance,
  subscribeAppearance,
  theme,
  type AppearanceMode,
} from '../../lib/theme';

export default function Settings() {
  const push = usePush(),
    router = useRouter();
  const appearance = useSyncExternalStore(
    subscribeAppearance,
    getAppearance,
    getAppearance,
  );
  const [support, setSupport] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [switchFocused, setSwitchFocused] = useState(false);
  const supportRef = useRef<View>(null);
  async function updateAlerts(enabled: boolean) {
    if (push.status === 'busy' || pendingEnabled !== null) return;
    setPendingEnabled(enabled);
    setNotice('');
    try {
      await (enabled ? push.enable() : push.disable());
    } catch {
      setNotice('Remote alert preferences could not be updated. Try again.');
    } finally {
      setPendingEnabled(null);
    }
  }
  return (
    <DetailScreen title="Settings">
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          Account
        </Text>
        <View style={styles.group}>
          <ProfileListRow
            label="Faculty account"
            detail="Personal and academic information"
            icon="profile"
            onPress={() => router.push('/profile/details')}
          />
          <ProfileListRow
            label="Change password"
            icon="lock"
            last
            onPress={() => router.push('/profile/password')}
          />
        </View>
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          Notifications
        </Text>
        <View style={styles.group}>
          {push.status !== 'unsupported' && (
            <View
              style={[styles.preferenceRow, switchFocused && styles.focused]}
            >
              <Icon
                name="bell"
                color={theme.colors.primary}
                size={theme.sizes.icon}
              />
              <View style={styles.preferenceCopy}>
                <Text nativeID="remote-alerts-label" style={styles.label}>
                  Remote alerts
                </Text>
                <Text style={styles.caption}>Updates on this device</Text>
              </View>
              {(push.status === 'busy' || pendingEnabled !== null) && (
                <ActivityIndicator
                  color={theme.colors.primary}
                  accessibilityLabel="Updating remote alerts"
                />
              )}
              <Switch
                accessibilityLabel="Remote alerts"
                aria-labelledby="remote-alerts-label"
                accessibilityHint="Receive CampusHR updates on this device. Device permission may be requested."
                value={pendingEnabled ?? push.status === 'enabled'}
                disabled={push.status === 'busy' || pendingEnabled !== null}
                onValueChange={(enabled) => void updateAlerts(enabled)}
                onFocus={() => setSwitchFocused(true)}
                onBlur={() => setSwitchFocused(false)}
                trackColor={{
                  false: theme.colors.input,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.muted}
                style={styles.switch}
              />
            </View>
          )}
          <View style={styles.preferenceMessage}>
            <Text accessibilityLiveRegion="polite" style={styles.detail}>
              {push.message}
            </Text>
            {!!notice && (
              <Text accessibilityRole="alert" style={styles.error}>
                {notice}
              </Text>
            )}
            {push.status === 'denied' && (
              <Button
                variant="secondary"
                onPress={() =>
                  void Linking.openSettings().catch(() => push.refresh())
                }
              >
                Open notification settings
              </Button>
            )}
            {push.status === 'error' && (
              <Button variant="text" onPress={() => void push.refresh()}>
                Retry remote alert setup
              </Button>
            )}
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          App preferences
        </Text>
        <View style={styles.group}>
          <View style={styles.appearanceBlock}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.label}>Appearance</Text>
              <Text style={styles.caption}>
                iOS 18 {appearance === 'dark' ? 'Dark' : 'Light'} appearance
              </Text>
            </View>
            <SegmentedControl<AppearanceMode>
              label="Appearance mode"
              value={appearance}
              onChange={(mode) => setAppearance(mode)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </View>
          <ProfileListRow
            label="Text size & reduced motion"
            detail="Follows your device settings"
            icon="profile"
            last
            onPress={() =>
              Alert.alert(
                'Accessibility',
                'CampusHR follows your device text size and Reduce Motion preferences. Open your device Accessibility settings to adjust them.',
              )
            }
          />
        </View>
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          Support
        </Text>
        <View style={styles.group}>
          <ProfileListRow
            label="Help & support"
            detail="JCET college office"
            icon="help"
            pressRef={supportRef}
            last
            onPress={() => setSupport(true)}
          />
        </View>
      </View>
      <View style={styles.about}>
        <Text style={styles.aboutTitle}>CampusHR</Text>
        <Text style={styles.detail}>
          Faculty & Academic Workforce Operations
        </Text>
        <Text style={styles.caption}>
          Jain College of Engineering & Technology, Hubballi
        </Text>
      </View>
      <AccountSupportSheet
        visible={support}
        onClose={() => setSupport(false)}
        returnFocusRef={supportRef}
      />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  groupLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    fontWeight: '500',
    paddingHorizontal: theme.spacing.section,
  },
  group: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  appearanceBlock: {
    paddingHorizontal: theme.spacing.section,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  preferenceRow: {
    minHeight: theme.sizes.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.section,
    paddingVertical: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  preferenceCopy: { flex: 1, gap: theme.spacing.xs },
  preferenceMessage: {
    paddingHorizontal: theme.spacing.section,
    paddingBottom: theme.spacing.section,
    paddingTop: theme.spacing.xs,
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
  },
  caption: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
  },
  detail: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
  },
  switch: { minWidth: theme.sizes.tapTarget, minHeight: theme.sizes.tapTarget },
  focused: { borderColor: theme.colors.primary },
  error: {
    color: theme.colors.errorInk,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
  },
  about: {
    paddingHorizontal: theme.spacing.section,
    paddingTop: theme.spacing.page,
    paddingBottom: theme.spacing.section,
    gap: theme.spacing.sm,
  },
  aboutTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '600',
  },
});
