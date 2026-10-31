import React, { useSyncExternalStore } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type RefreshControlProps,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Topbar } from './Topbar';
import {
  getAppearance,
  subscribeAppearance,
  theme,
} from '../../lib/theme';

interface ScreenContainerProps {
  testID?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function ScreenContainer({
  testID,
  children,
  scrollable = true,
  contentContainerStyle,
  style,
  refreshControl,
}: ScreenContainerProps) {
  useSyncExternalStore(subscribeAppearance, getAppearance, getAppearance);
  const path = usePathname();
  const tabRoot = [
    '/',
    '/timetable',
    '/attendance',
    '/leave',
    '/profile',
    '/approvals',
    '/workload',
  ].includes(path);
  const innerContent = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView
      testID={testID}
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background },
        style,
      ]}
      edges={
        tabRoot ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']
      }
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {tabRoot && <Topbar />}
        {innerContent}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.page,
    paddingVertical: theme.spacing.section,
  },
});
