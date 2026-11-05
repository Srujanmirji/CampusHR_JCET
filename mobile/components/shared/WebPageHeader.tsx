import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../lib/theme';

export function WebPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.textContainer}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.mutedForeground,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
