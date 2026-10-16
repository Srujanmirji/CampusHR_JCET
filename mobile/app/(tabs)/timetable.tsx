import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { theme } from '../../lib/theme';

export default function TimetableTab() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Timetable</Text>
        <Text style={styles.subtitle}>Academic Schedule & Teaching Periods</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardHeading}>Full Timetable Module</Text>
        <Text style={styles.cardBody}>
          Weekly class timetable with period hours, classroom allocations, and lab batches will be fully presented here.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: theme.spacing.section,
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    color: theme.colors.primary,
  },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
  },
  card: {
    gap: theme.spacing.sm,
  },
  cardHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    color: theme.colors.primary,
  },
  cardBody: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
    lineHeight: 22,
  },
});
