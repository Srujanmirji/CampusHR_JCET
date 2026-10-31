import React, { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ProfileListRow } from './ProfileListRow';
import { theme } from '../../lib/theme';

export function restoreAccountFocus(element: View | null) {
  if (!element) return;
  element.focus();
  if (Platform.OS !== 'web') {
    const node = findNodeHandle(element);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }
}

/** One support presentation shared by signed-out and signed-in account flows. */
export function AccountSupportSheet({
  visible,
  onClose,
  returnFocusRef,
  passwordHelp = false,
}: {
  visible: boolean;
  onClose: () => void;
  returnFocusRef: React.RefObject<View | null>;
  passwordHelp?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<View>(null);
  const [notice, setNotice] = useState('');
  function close() {
    onClose();
    if (Platform.OS !== 'ios') {
      requestAnimationFrame(() => restoreAccountFocus(returnFocusRef.current));
    }
  }
  async function contact(url: string, fallback: string) {
    setNotice('');
    try {
      await Linking.openURL(url);
    } catch {
      setNotice(fallback);
    }
  }
  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={close}
      onDismiss={() => restoreAccountFocus(returnFocusRef.current)}
      onShow={() => {
        setNotice('');
        if (Platform.OS === 'web') headingRef.current?.focus();
        else {
          const node = findNodeHandle(headingRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }
      }}
    >
      <SafeAreaView
        style={styles.sheet}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ScrollView
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.toolbar}>
            <Text style={styles.context}>JCET account support</Text>
            <Button
              variant="text"
              accessibilityLabel="Close account support"
              onPress={close}
            >
              <Icon
                name="close"
                color={theme.colors.primary}
                size={theme.spacing.lg}
              />
            </Button>
          </View>
          <View style={styles.symbol}>
            <Icon
              name={passwordHelp ? 'lock' : 'help'}
              color={theme.colors.primary}
              size={theme.spacing.xl}
            />
          </View>
          <View
            ref={headingRef}
            tabIndex={-1}
            accessible
            accessibilityRole="header"
          >
            <Text style={styles.title}>
              {passwordHelp ? 'Need help signing in?' : 'Here to help'}
            </Text>
          </View>
          <Text style={styles.body}>
            JCET administration manages faculty and staff accounts. Contact the
            college office to ask for account assistance
            {passwordHelp ? ' or a password reset.' : '.'}
          </Text>
          <View style={styles.contacts}>
            <ProfileListRow
              label="Call the college office"
              detail="0836-2002117"
              icon="phone"
              onPress={() =>
                void contact(
                  'tel:08362002117',
                  'The phone app could not be opened. Call the college office at 0836-2002117.',
                )
              }
            />
            <ProfileListRow
              label="Email the college office"
              detail="contactus@jcethbl.edu.in"
              icon="mail"
              last
              onPress={() =>
                void contact(
                  'mailto:contactus@jcethbl.edu.in',
                  'The email app could not be opened. Write to contactus@jcethbl.edu.in.',
                )
              }
            />
          </View>
          <Text style={styles.caption}>
            These are general college contacts. Ask for faculty account support.
          </Text>
          {!!notice && (
            <Text accessibilityRole="alert" style={styles.error}>
              {notice}
            </Text>
          )}
          <Button fullWidth onPress={close}>
            Done
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: theme.colors.surface },
  content: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    padding: theme.spacing.page,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  context: {
    flex: 1,
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.secondary,
    fontFamily: theme.typography.bodyFamily,
  },
  symbol: {
    width: theme.sizes.tapTarget + theme.spacing.page,
    height: theme.sizes.tapTarget + theme.spacing.page,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.blueContainer,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: theme.spacing.page,
  },
  title: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.greeting,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: theme.typography.body + theme.spacing.sm,
    textAlign: 'center',
  },
  contacts: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  caption: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.caption + theme.spacing.sm,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.errorInk,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondary + theme.spacing.sm,
  },
});
