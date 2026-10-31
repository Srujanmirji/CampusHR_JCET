import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { theme } from '../../lib/theme';

export function IconButton({
  name,
  label,
  onPress,
  children,
  style,
}: {
  name?: IconName;
  label: string;
  onPress: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.target,
        pressed && styles.pressed,
        focused && Platform.OS === 'web' && styles.focus,
        style,
      ]}
    >
      {name && (
        <Icon
          name={name}
          color={theme.colors.foreground}
          size={theme.sizes.iconSmall}
        />
      )}
      {children}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  target: {
    minWidth: theme.sizes.tapTarget,
    minHeight: theme.sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.control,
  },
  pressed: { backgroundColor: theme.colors.muted },
  focus: {
    outlineColor: theme.colors.focus,
    outlineWidth: 2,
    outlineOffset: 2,
    outlineStyle: 'solid',
  },
});
