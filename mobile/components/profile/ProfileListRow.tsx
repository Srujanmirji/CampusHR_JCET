import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';
import { theme } from '../../lib/theme';

/** A destination in a native grouped list. The enclosing group owns its shape. */
export function ProfileListRow({
  label,
  detail,
  icon,
  onPress,
  destructive = false,
  last = false,
  disabled = false,
  pressRef,
}: {
  label: string;
  detail?: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
  disabled?: boolean;
  pressRef?: React.RefObject<View | null>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      ref={pressRef}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.row,
        !last && styles.divider,
        pressed && styles.pressed,
        focused && styles.focused,
      ]}
    >
      <Icon
        name={icon}
        color={destructive ? theme.colors.errorInk : theme.colors.primary}
        size={theme.spacing.page}
      />
      <View style={styles.copy}>
        <Text style={[styles.label, destructive && styles.destructive]}>
          {label}
        </Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      <Icon name="next" size={theme.spacing.section} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.sizes.tapTarget + theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.section,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.blueContainer },
  focused: { borderWidth: 2, borderColor: theme.colors.primary },
  copy: { flex: 1, gap: theme.spacing.xs },
  label: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  detail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.caption + theme.spacing.xs,
    color: theme.colors.mutedForeground,
  },
  destructive: { color: theme.colors.errorInk },
});
