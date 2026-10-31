import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DetailScreen } from '../../components/ui/DetailScreen';
import { Icon } from '../../components/ui/Icon';
import { CoveragePanel } from '../../components/substitution/CoveragePanel';
import { useAuth } from '../../lib/auth-context';
import { coverageUnavailable } from '../../lib/substitution-api';
import { theme } from '../../lib/theme';
export default function Coverage() {
  const { user, accessToken } = useAuth();
  const reason = coverageUnavailable(user, accessToken);
  return (
    <DetailScreen title="Class coverage">
      {reason ? (
        <View style={styles.empty}>
          <Icon
            name="coverage"
            color={theme.colors.violet}
            size={theme.spacing.xl}
          />
          <Text style={styles.text}>{reason}</Text>
        </View>
      ) : (
        <CoveragePanel key={user!.id} user={user!} token={accessToken!} />
      )}
    </DetailScreen>
  );
}
const styles = StyleSheet.create({
  empty: { gap: theme.spacing.section, paddingVertical: theme.spacing.page },
  text: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.mutedForeground,
  },
});
