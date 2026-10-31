import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
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

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: CardProps) {
  const [focused, setFocused] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPressIn={() => {
          selectionFeedback();
          scale.set(
            withSpring(theme.motion.pressScale, {
              stiffness: 350,
              damping: 25,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        onPressOut={() => {
          scale.set(
            withSpring(1, {
              stiffness: 350,
              damping: 25,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        style={[
          styles.card,
          animatedStyle,
          focused && Platform.OS === 'web' && styles.focus,
          style,
        ]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  focus: {
    outlineWidth: 2,
    outlineColor: theme.colors.primary,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    minHeight: theme.sizes.tapTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
});
