import { Text, View, StyleSheet } from 'react-native';
import {
  passwordRequirements,
  passwordProblem,
} from '@campushr/password-policy';
import { theme } from '../../lib/theme';
import { Icon } from '../ui/Icon';
export function PasswordRequirements({ password }: { password: string }) {
  return (
    <View style={styles.list}>
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {password.length > 0 && password.length < 12
          ? `Add ${12 - password.length} more ${password.length === 11 ? 'character' : 'characters'} to reach 12.`
          : password.length === 0
            ? 'Your password needs all of the following.'
            : passwordProblem(password) || 'All password requirements met.'}
      </Text>
      {passwordRequirements(password).map((rule) => (
        <View
          key={rule.id}
          style={styles.row}
          accessible
          accessibilityLabel={`${rule.met ? 'Met' : 'Needed'}: ${rule.label}`}
        >
          <Icon
            name={rule.met ? 'check' : 'close'}
            size={16}
            color={
              rule.met ? theme.colors.mutedForeground : theme.colors.foreground
            }
          />
          <Text style={[styles.text, rule.met && styles.met]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  list: { gap: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  text: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.foreground,
    flexShrink: 1,
  },
  met: { color: theme.colors.mutedForeground },
});
