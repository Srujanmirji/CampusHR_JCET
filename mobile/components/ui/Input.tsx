import React, { useId, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../lib/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isPassword?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  error?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  helperText?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  isPassword = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  error,
  disabled = false,
  style,
  helperText,
}: InputProps) {
  const labelId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text nativeID={labelId} style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
          disabled && styles.inputWrapperDisabled,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          aria-labelledby={label ? labelId : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.mutedForeground}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={!disabled}
          underlineColorAndroid="transparent"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.input}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide password' : 'Show password'
            }
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            hitSlop={8}
          >
            <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 13,
    color: '#334155',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
        } as unknown as ViewStyle)
      : {}),
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: theme.colors.error,
    backgroundColor: '#FEF2F2',
  },
  inputWrapperDisabled: {
    backgroundColor: theme.colors.muted,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontFamily: theme.typography.bodyFamily,
    fontSize: 15,
    color: theme.colors.foreground,
    paddingVertical: 12,
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
        } as unknown as TextStyle)
      : {}),
  },
  eyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  eyeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 12,
    color: theme.colors.primary,
  },
  errorText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: theme.colors.errorInk,
    marginTop: 2,
  },
  helperText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
});
