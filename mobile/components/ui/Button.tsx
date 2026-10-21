import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../lib/theme';

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'secondary' | 'danger';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

function isTextContent(content: React.ReactNode): boolean {
  if (typeof content === 'string' || typeof content === 'number') return true;
  if (Array.isArray(content)) {
    return content.length > 0 && content.every((item) => isTextContent(item));
  }
  return false;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
  accessibilityLabel,
}: ButtonProps) {
  const isInteractive = !disabled && !loading;

  const resolvedAccessibilityLabel =
    accessibilityLabel ||
    (typeof children === 'string'
      ? children
      : Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number')
      ? children.join('')
      : undefined);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      disabled={!isInteractive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && isInteractive && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' ? theme.colors.primary : theme.colors.surface}
        />
      ) : isTextContent(children) ? (
        <Text
          style={[
            styles.text,
            variant === 'outline' && styles.textOutline,
            variant === 'secondary' && styles.textSecondary,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.tapTarget,
    borderRadius: theme.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.section,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  accent: {
    backgroundColor: theme.colors.accent,
  },
  outline: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.muted,
  },
  danger: {
    backgroundColor: theme.colors.error,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.surface,
    textAlign: 'center',
  },
  textOutline: {
    color: theme.colors.primary,
  },
  textSecondary: {
    color: theme.colors.primary,
  },
});
