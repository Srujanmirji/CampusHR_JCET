import React from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  type ColorValue,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/ui/Icon';
import { selectionFeedback } from '../../lib/feedback';
import { useAuth } from '../../lib/auth-context';
import { theme } from '../../lib/theme';

export default function TabsLayout() {
  const { user } = useAuth();
  const { fontScale } = useWindowDimensions();
  const hod = user?.role === 'HOD';
  const insets = useSafeAreaInsets();
  const tab = (title: string, icon: IconName, visible = true) => ({
    title,
    tabBarAccessibilityLabel: title,
    tabBarLabel: ({ color }: { color: ColorValue }) => (
      <Text style={[styles.label, { color, textAlign: 'center' }]}>
        {title}
      </Text>
    ),
    href: visible ? undefined : null,
    tabBarIcon: ({
      color,
      focused,
    }: {
      color: ColorValue;
      focused: boolean;
    }) => <Icon name={icon} color={color} selected={focused} />,
  });
  return (
    <Tabs
      screenListeners={{
        tabPress: () => selectionFeedback(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarItemStyle: {
          minHeight: theme.sizes.tapTarget,
          paddingHorizontal: 0,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: [
          styles.bar,
          {
            height: Math.max(60, 52 * fontScale) + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],
        tabBarLabelStyle: styles.label,
        tabBarAllowFontScaling: true,
      }}
    >
      <Tabs.Screen name="index" options={tab('Home', 'home')} />
      <Tabs.Screen
        name="approvals"
        options={tab('Approvals', 'attendance', hod)}
      />
      <Tabs.Screen name="timetable" options={tab('Timetable', 'timetable')} />
      <Tabs.Screen
        name="attendance"
        options={tab('Attendance', 'attendance', !hod)}
      />
      <Tabs.Screen name="leave" options={tab('Leave', 'leave', !hod)} />
      <Tabs.Screen name="workload" options={tab('Workload', 'workload', hod)} />
      <Tabs.Screen name="profile" options={tab('Profile', 'profile')} />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 0,
  },
  label: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.tab,
    letterSpacing: -0.1,
  },
});
