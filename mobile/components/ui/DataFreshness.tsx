import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { theme } from '../../lib/theme';

export function DataFreshness({
  updatedAt,
  refreshing,
  inverse = false,
}: {
  updatedAt: number;
  refreshing: boolean;
  inverse?: boolean;
}) {
  if (!updatedAt) return null;
  const time = new Date(updatedAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.text, inverse && styles.inverse]}
    >
      {refreshing ? 'Updating · last checked ' : 'Updated '}
      {time}
    </Text>
  );
}
const styles = StyleSheet.create({
  text: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
  },
  inverse: { color: theme.colors.heroMuted },
});
