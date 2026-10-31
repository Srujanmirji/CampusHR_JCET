import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { selectionFeedback } from '../../lib/feedback';
import { theme } from '../../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant =
  'primary' | 'accent' | 'outline' | 'secondary' | 'danger' | 'text';

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
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const isInteractive = !disabled && !loading;

  const resolvedAccessibilityLabel =
    accessibilityLabel ||
    (typeof children === 'string'
      ? children
      : Array.isArray(children) &&
          children.every((c) => typeof c === 'string' || typeof c === 'number')
        ? children.join('')
        : undefined);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      disabled={!isInteractive}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        if (isInteractive) selectionFeedback();
        scale.set(
          withSpring(theme.motion.pressScale, {
            stiffness: 350,
            damping: 25,
            reduceMotion: ReduceMotion.System,
          }),
        );
      }}
      onPressOut={() => {
        setPressed(false);
        scale.set(
          withSpring(1, {
            stiffness: 350,
            damping: 25,
            reduceMotion: ReduceMotion.System,
          }),
        );
      }}
      style={[
        styles.base,
        motion,
        focused &&
          Platform.OS === 'web' && {
            outlineWidth: 2,
            outlineColor: theme.colors.primary,
            outlineStyle: 'solid',
            outlineOffset: 3,
          },
        styles[variant === 'text' ? 'textButton' : variant],
        fullWidth && styles.fullWidth,
        pressed && isInteractive && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
      )}
      {isTextContent(children) ? (
        <Text
          style={[
            styles.text,
            ['outline', 'secondary', 'text'].includes(variant) &&
              styles.textSecondary,
            (disabled || loading) && { color: theme.colors.mutedForeground },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.tapTarget,
    minWidth: theme.sizes.tapTarget,
    paddingVertical: theme.spacing.md,
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
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 2,
  },
  accent: {
    backgroundColor: theme.colors.accentInk,
    shadowColor: theme.colors.accentInk,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  outline: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondary: {
    backgroundColor: theme.colors.blueContainer,
  },
  danger: {
    backgroundColor: theme.colors.errorInk,
  },
  pressed: { opacity: 0.85 },
  disabled: {
    backgroundColor: theme.colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  textButton: { backgroundColor: 'transparent' },
  text: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.button,
    letterSpacing: -0.2,
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
