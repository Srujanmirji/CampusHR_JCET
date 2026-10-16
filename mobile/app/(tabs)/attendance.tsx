import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { theme } from '../../lib/theme';

export default function AttendanceTab() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>Daily Check-in & Monthly Records</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardHeading}>Attendance Management</Text>
        <Text style={styles.cardBody}>
          Daily self check-in, check-out, working duration, and attendance history will be managed here.
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
