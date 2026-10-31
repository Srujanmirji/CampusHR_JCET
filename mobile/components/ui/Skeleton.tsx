import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../lib/theme';

// Static placeholders respect Reduce Motion and keep content geometry stable.
export function Skeleton({
  label = 'Loading content',
  inverse = false,
}: {
  label?: string;
  inverse?: boolean;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={styles.group}
    >
      <View style={[styles.line, inverse && styles.inverse, styles.short]} />
      <View style={[styles.line, inverse && styles.inverse]} />
      <View style={[styles.line, inverse && styles.inverse, styles.medium]} />
    </View>
  );
}
const styles = StyleSheet.create({
  group: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.section,
    minHeight: 96,
  },
  line: {
    height: theme.spacing.section,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.status,
  },
  inverse: { backgroundColor: theme.colors.heroInset },
  short: { width: '40%', height: theme.spacing.page },
  medium: { width: '75%' },
});
