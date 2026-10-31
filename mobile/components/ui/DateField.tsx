import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input } from './Input';
import { theme } from '../../lib/theme';
export function DateField({
  label,
  value,
  onChangeText,
  disabled = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web')
    return (
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        disabled={disabled}
        placeholder="YYYY-MM-DD"
      />
    );
  const parsed = new Date(value + 'T12:00:00');
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const picker = (
    <DateTimePicker
      accessibilityLabel={label}
      value={date}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      disabled={disabled}
      onChange={(event, next) => {
        setOpen(false);
        if (event.type === 'set' && next)
          onChangeText(
            `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`,
          );
      }}
    />
  );
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.picker}>{picker}</View>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${value}`}
            onPress={() => setOpen(true)}
            disabled={disabled}
            style={styles.picker}
          >
            <Text style={styles.value}>{value}</Text>
          </Pressable>
          {open && picker}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  label: {
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  picker: {
    minHeight: 52,
    justifyContent: 'center',
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.field,
    borderWidth: 1,
    borderColor: theme.colors.input,
  },
  value: { fontSize: theme.typography.body, color: theme.colors.foreground },
});
