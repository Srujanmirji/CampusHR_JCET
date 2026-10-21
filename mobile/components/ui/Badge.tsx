import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../lib/theme';

export type BadgeVariant =
  'default' | 'accent' | 'success' | 'warning' | 'secondary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, textStyles[variant]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {
    backgroundColor: theme.colors.primary,
  },
  accent: {
    backgroundColor: theme.colors.accentInk,
  },
  success: {
    backgroundColor: '#E6F9F0',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  secondary: {
    backgroundColor: theme.colors.muted,
  },
  text: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
  },
});

const textStyles = StyleSheet.create({
  default: {
    color: theme.colors.surface,
  },
  accent: {
    color: theme.colors.surface,
  },
  success: {
    color: '#065F46',
  },
  warning: {
    color: '#92400E',
  },
  secondary: {
    color: theme.colors.primary,
  },
});
