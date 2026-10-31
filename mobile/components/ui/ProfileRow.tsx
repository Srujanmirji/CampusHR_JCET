import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { theme } from '../../lib/theme';
export function ProfileRow({
  label,
  icon,
  onPress,
  detail,
  destructive = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  detail?: string;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.colors.muted },
      ]}
    >
      <Icon
        name={icon}
        color={
          destructive ? theme.colors.errorInk : theme.colors.mutedForeground
        }
      />
      <View style={styles.copy}>
        <Text
          style={[
            styles.label,
            destructive && { color: theme.colors.errorInk },
          ]}
        >
          {label}
        </Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      <Icon name="next" size={20} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 0,
    borderBottomColor: theme.colors.border,
  },
  copy: { flex: 1, gap: theme.spacing.xs },
  label: {
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
    fontFamily: theme.typography.bodyFamily,
  },
  detail: {
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    lineHeight: 20,
  },
});
