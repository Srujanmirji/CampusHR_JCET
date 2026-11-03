import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';
import { theme } from '../../lib/theme';

export interface WebMetricCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: IconName;
  accentColor?: string;
  onPress?: () => void;
  flex?: number;
}

export function WebMetricCard({
  label,
  value,
  detail,
  icon,
  accentColor = '#0071E3',
  onPress,
  flex = 1,
}: WebMetricCardProps) {
  const CardContainer = onPress ? Pressable : View;

  return (
    <CardContainer
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[styles.card, { flex }]}
    >
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: `${accentColor}18` },
          ]}
        >
          <Icon name={icon} size={18} color={accentColor} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>

      {/* Bottom colored accent strip matching web .metric-card::after */}
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.section,
    gap: theme.spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
    ...theme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  label: {
    flex: 1,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.mutedForeground,
    lineHeight: 18,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginTop: 'auto',
    gap: 2,
  },
  value: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.foreground,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  accentStrip: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 9999,
  },
});
