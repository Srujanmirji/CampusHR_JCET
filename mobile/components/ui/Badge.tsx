import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon } from './Icon';
import { theme } from '../../lib/theme';

export type BadgeVariant =
  'default' | 'accent' | 'success' | 'warning' | 'secondary' | 'danger';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const resolved = label.toUpperCase() === 'REJECTED' ? 'danger' : variant;
  const glyph =
    label.toUpperCase() === 'PENDING'
      ? 'clock'
      : label.toUpperCase() === 'APPROVED'
        ? 'check'
        : label.toUpperCase() === 'REJECTED'
          ? 'close'
          : null;
  return (
    <View style={[styles.badge, styles[resolved], style]}>
      {glyph ? (
        <Icon
          name={glyph}
          size={14}
          color={
            resolved === 'danger'
              ? theme.colors.coralInk
              : resolved === 'warning'
                ? theme.colors.amberInk
                : theme.colors.mintInk
          }
        />
      ) : (
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                resolved === 'danger'
                  ? theme.colors.coralInk
                  : resolved === 'warning'
                    ? theme.colors.amberInk
                    : resolved === 'success'
                      ? theme.colors.mintInk
                      : resolved === 'accent'
                        ? theme.colors.violet
                        : theme.colors.primary,
            },
          ]}
        />
      )}
      <Text style={[styles.text, textStyles[resolved]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  danger: {
    backgroundColor: theme.colors.coralContainer,
    borderWidth: 1,
    borderColor: theme.colors.coralContainer,
  },
  badge: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.status,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  default: {
    backgroundColor: theme.colors.blueContainer,
  },
  accent: {
    backgroundColor: theme.colors.violetContainer,
  },
  success: {
    backgroundColor: theme.colors.mintContainer,
    borderWidth: 1,
    borderColor: theme.colors.mintContainer,
  },
  warning: {
    backgroundColor: theme.colors.amberContainer,
    borderWidth: 1,
    borderColor: theme.colors.amberContainer,
  },
  secondary: {
    backgroundColor: theme.colors.muted,
  },
  text: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.caption,
  },
});

const textStyles = StyleSheet.create({
  danger: { color: theme.colors.coralInk },
  default: {
    color: theme.colors.primary,
  },
  accent: {
    color: theme.colors.violet,
  },
  success: {
    color: theme.colors.mintInk,
  },
  warning: {
    color: theme.colors.amberInk,
  },
  secondary: {
    color: theme.colors.primary,
  },
});
