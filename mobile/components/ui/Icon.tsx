import React from 'react';
import type { ColorValue } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { theme } from '../../lib/theme';

const names = {
  phone: { ios: 'phone', android: 'call', web: 'call' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  home: { ios: 'house', android: 'home', web: 'home' },
  timetable: {
    ios: 'calendar',
    android: 'calendar_month',
    web: 'calendar_month',
  },
  attendance: {
    ios: 'checkmark.circle',
    android: 'check_circle',
    web: 'check_circle',
  },
  leave: {
    ios: 'calendar.badge.clock',
    android: 'event_busy',
    web: 'event_busy',
  },
  profile: {
    ios: 'person.crop.circle',
    android: 'account_circle',
    web: 'account_circle',
  },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  next: {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
  },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  location: {
    ios: 'mappin.and.ellipse',
    android: 'location_on',
    web: 'location_on',
  },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: {
    ios: 'eye.slash',
    android: 'visibility_off',
    web: 'visibility_off',
  },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  document: { ios: 'doc', android: 'description', web: 'description' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  logout: {
    ios: 'rectangle.portrait.and.arrow.right',
    android: 'logout',
    web: 'logout',
  },
  workload: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  coverage: {
    ios: 'arrow.left.arrow.right',
    android: 'swap_horiz',
    web: 'swap_horiz',
  },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  school: { ios: 'graduationcap', android: 'school', web: 'school' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
} as const;
export type IconName = keyof typeof names;
export function Icon({
  name,
  color = theme.colors.mutedForeground,
  size = 24,
  selected = false,
}: {
  name: IconName;
  color?: ColorValue;
  size?: number;
  selected?: boolean;
}) {
  return (
    <SymbolView
      name={{
        ...names[name],
        ios: selected
          ? ((
              {
                home: 'house.fill',
                profile: 'person.crop.circle.fill',
                attendance: 'checkmark.circle.fill',
                workload: 'chart.bar.fill',
                bell: 'bell.fill',
              } as const
            )[
              name as 'home' | 'profile' | 'attendance' | 'workload' | 'bell'
            ] ?? names[name].ios)
          : names[name].ios,
      }}
      size={size}
      tintColor={color}
      weight="regular"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size }}
    />
  );
}
