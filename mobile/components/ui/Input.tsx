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
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Icon } from './Icon';
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
  autoComplete?: TextInputProps['autoComplete'];
  onSubmitEditing?: () => void;
  multiline?: boolean;
  maxLength?: number;
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
  autoComplete,
  onSubmitEditing,
  multiline = false,
  maxLength,
}: InputProps) {
  const labelId = useId();
  const messageId = `${labelId}-message`;
  const [showPassword, setShowPassword] = useState(false);
  const [eyeFocused, setEyeFocused] = useState(false);
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
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityHint={error || helperText}
          accessibilityState={{ disabled }}
          aria-invalid={!!error}
          aria-describedby={error || helperText ? messageId : undefined}
          autoComplete={autoComplete}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'go' : undefined}
          accessibilityLabel={label}
          aria-labelledby={label ? labelId : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.mutedForeground}
          textContentType={
            autoComplete === 'new-password'
              ? 'newPassword'
              : autoComplete === 'username'
                ? 'username'
                : isPassword
                  ? 'password'
                  : keyboardType === 'email-address'
                    ? 'username'
                    : undefined
          }
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={!disabled}
          underlineColorAndroid="transparent"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, multiline && styles.multiline]}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide password' : 'Show password'
            }
            onPress={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            accessibilityState={{ disabled }}
            onFocus={() => setEyeFocused(true)}
            onBlur={() => setEyeFocused(false)}
            style={[
              styles.eyeButton,
              eyeFocused &&
                Platform.OS === 'web' && {
                  outlineWidth: 2,
                  outlineColor: theme.colors.primary,
                  outlineStyle: 'solid',
                },
            ]}
            hitSlop={8}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text
          nativeID={messageId}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text nativeID={messageId} style={styles.helperText}>
          {helperText}
        </Text>
      ) : null}
      {multiline && maxLength !== undefined && (
        <Text style={styles.helperText}>
          {value.length} / {maxLength} characters
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  label: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    minHeight: theme.sizes.tapTarget,
    borderWidth: 1,
    borderColor: theme.colors.input,
    borderRadius: theme.radius.field,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.section,
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
        } as unknown as ViewStyle)
      : {}),
  },
  multiline: { minHeight: 120 },
  inputWrapperFocused: {
    ...(Platform.OS === 'web'
      ? {
          outlineWidth: 2,
          outlineStyle: 'solid' as const,
          outlineColor: theme.colors.primary,
          outlineOffset: 2,
        }
      : {}),
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  inputWrapperError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.coralContainer,
  },
  inputWrapperDisabled: {
    backgroundColor: theme.colors.surface,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
    paddingVertical: 12,
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
        } as unknown as TextStyle)
      : {}),
  },
  eyeButton: {
    minWidth: theme.sizes.tapTarget,
    minHeight: theme.sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  eyeText: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },
  errorText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.errorInk,
    marginTop: 2,
  },
  helperText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
});
