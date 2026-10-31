import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { DetailScreen } from '../../components/ui/DetailScreen';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import {
  ApprovalPath,
  FacultyInitials,
  LeaveStatus,
  leaveDates,
} from '../../components/leave/LeavePresentation';
import { useAuth } from '../../lib/auth-context';
import { getLeaveRequest } from '../../lib/leave-api';
import { coverageUnavailable } from '../../lib/substitution-api';
import { theme } from '../../lib/theme';

export default function LeaveDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['leave', user?.id, 'detail', id],
    queryFn: async () => {
      const record = await getLeaveRequest(accessToken, id);
      const global = user?.permissions.includes('leave.read.all');
      const department =
        user?.permissions.includes('leave.read.department') &&
        record.department.id === user.departmentId;
      if (!global && !department && record.employee.id !== user?.employeeId)
        throw new Error('This request is not available for your account.');
      if (record.id !== id)
        throw new Error('Leave request could not be verified.');
      return record;
    },
    enabled: !!user && !!accessToken && !!id,
    retry: false,
  });
  const request = query.data;
  return (
    <DetailScreen title="Leave details">
      {query.isPending && <Text style={styles.detail}>Loading request…</Text>}
      {query.isError && (
        <View style={styles.section}>
          <Text accessibilityRole="alert" style={styles.error}>
            {query.error.message}
          </Text>
          <Button onPress={() => void query.refetch()}>Retry request</Button>
        </View>
      )}
      {request && (
        <>
          <View style={styles.person}>
            <FacultyInitials name={request.employee.name} />
            <View style={styles.grow}>
              <Text style={styles.personName}>{request.employee.name}</Text>
              <Text style={styles.detail}>
                {request.department.name} · {request.employee.employeeCode}
              </Text>
            </View>
          </View>
          <View style={styles.summary}>
            <View style={styles.summaryTitle}>
              <Icon name="leave" color={theme.colors.violet} />
              <Text style={styles.leaveTitle}>{request.leaveType.name}</Text>
            </View>
            <Text style={styles.body}>
              {leaveDates(request.startDate, request.endDate)} · {request.days}{' '}
              {request.days === 1 ? 'day' : 'days'}
              {request.halfDay
                ? ` · ${request.halfDay === 'FIRST' ? 'First' : 'Second'} half`
                : ''}
            </Text>
            <LeaveStatus status={request.status} />
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>
              Reason
            </Text>
            <Text style={styles.body}>{request.reason}</Text>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>
              Approval path
            </Text>
            <ApprovalPath request={request} />
          </View>
          <View style={styles.impact}>
            <Icon name="school" color={theme.colors.primary} />
            <View style={styles.grow}>
              <Text accessibilityRole="header" style={styles.impactTitle}>
                Academic impact & coverage
              </Text>
              <Text style={styles.impactText}>
                {request.status === 'APPROVED'
                  ? 'Your department manages dated class coverage for this approved leave.'
                  : 'Coverage is arranged only after final approval.'}
              </Text>
            </View>
          </View>
          {request.status === 'APPROVED' &&
            !coverageUnavailable(user, accessToken) && (
              <Button onPress={() => router.push('/leave/coverage')}>
                View class coverage
              </Button>
            )}
        </>
      )}
    </DetailScreen>
  );
}
const styles = StyleSheet.create({
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  grow: { flex: 1, gap: theme.spacing.sm },
  personName: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  detail: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
  },
  body: {
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
  summary: {
    gap: theme.spacing.md,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.violetContainer,
    borderRadius: theme.radius.field,
  },
  summaryTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  leaveTitle: {
    flex: 1,
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.violet,
  },
  section: {
    gap: theme.spacing.section,
    paddingVertical: theme.spacing.section,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  heading: {
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  error: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.errorInk,
  },
  impact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.blueContainer,
    borderRadius: theme.radius.field,
    marginTop: theme.spacing.section,
  },
  impactTitle: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  impactText: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.primary,
  },
});
