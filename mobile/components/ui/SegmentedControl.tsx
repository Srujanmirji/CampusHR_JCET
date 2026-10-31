import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { selectionFeedback } from '../../lib/feedback';
import { theme } from '../../lib/theme';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const [focused, setFocused] = useState<T | null>(null);
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={styles.track}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: option.value === value }}
          aria-selected={option.value === value}
          onFocus={() => setFocused(option.value)}
          onBlur={() => setFocused(null)}
          onPress={() => {
            if (option.value !== value) {
              selectionFeedback();
              onChange(option.value);
            }
          }}
          style={[
            styles.segment,
            focused === option.value && Platform.OS === 'web' && styles.focus,
          ]}
        >
          {option.value === value && (
            <Animated.View
              pointerEvents="none"
              entering={FadeIn.duration(theme.motion.selectionMs).reduceMotion(
                ReduceMotion.System,
              )}
              style={styles.selection}
            />
          )}
          <Text
            style={[
              styles.label,
              option.value === value && styles.selectedLabel,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.inset,
    borderRadius: theme.radius.control,
    padding: theme.spacing.xs,
    marginVertical: theme.spacing.md,
  },
  segment: {
    flex: 1,
    minWidth: 90,
    minHeight: theme.sizes.tapTarget,
    padding: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.control,
  },
  selection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: theme.radius.control - 2,
    backgroundColor:
      Platform.OS === 'android'
        ? theme.colors.blueContainer
        : theme.colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.mutedForeground,
  },
  selectedLabel: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  focus: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: theme.colors.primary,
    outlineOffset: 2,
  },
});
