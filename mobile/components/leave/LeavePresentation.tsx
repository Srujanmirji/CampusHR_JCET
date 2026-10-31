import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { theme } from '../../lib/theme';
import type { LeaveRequestDto } from '../../lib/leave-api';

export function leaveDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
}

export function leaveDates(start: string, end: string) {
  return start === end
    ? leaveDate(start)
    : `${leaveDate(start)} – ${leaveDate(end)}`;
}

export function LeaveStatus({ status }: { status: LeaveRequestDto['status'] }) {
  const ink =
    status === 'APPROVED'
      ? theme.colors.mintInk
      : status === 'PENDING'
        ? theme.colors.amberInk
        : status === 'REJECTED'
          ? theme.colors.coralInk
          : theme.colors.mutedForeground;
  return (
    <View style={styles.status}>
      <View style={[styles.dot, { backgroundColor: ink }]} />
      <Text style={[styles.statusText, { color: ink }]}>
        {status[0] + status.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

export function FacultyInitials({ name }: { name: string }) {
  const initials = name
    .replace(/^(prof\.?|dr\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return (
    <View
      style={styles.avatar}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

export function ApprovalPath({ request }: { request: LeaveRequestDto }) {
  const roles = [
    ...new Set([
      ...request.approverRoles,
      ...request.decisions.map((decision) => decision.role),
      ...(request.pendingRole ? [request.pendingRole] : []),
    ]),
  ];
  return (
    <View style={styles.path}>
      <View style={styles.pathRow}>
        <View style={[styles.pathMark, styles.done]}>
          <Icon
            name="check"
            color={theme.colors.mintInk}
            size={theme.spacing.section}
          />
        </View>
        <View style={styles.grow}>
          <Text style={styles.pathTitle}>Request submitted</Text>
          <Text style={styles.detail}>
            {request.createdAt
              ? leaveDate(request.createdAt)
              : 'Submission recorded'}
          </Text>
        </View>
      </View>
      {roles.map((role, index) => {
        const decision = request.decisions.find((item) => item.role === role);
        const pending =
          request.status === 'PENDING' && request.pendingRole === role;
        const rejected = decision?.approved === false;
        return (
          <View key={`${role}-${index}`} style={styles.pathRow}>
            <View
              style={[
                styles.pathMark,
                decision?.approved && styles.done,
                rejected && styles.rejected,
                pending && styles.current,
              ]}
            >
              {decision ? (
                <Icon
                  name={decision.approved ? 'check' : 'close'}
                  color={
                    rejected ? theme.colors.coralInk : theme.colors.mintInk
                  }
                  size={theme.spacing.section}
                />
              ) : (
                <Text style={[styles.step, pending && styles.currentText]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <View style={styles.grow}>
              <Text style={styles.pathTitle}>
                {role}
                {role === 'HOD' ? ' recommendation' : ' approval'}
              </Text>
              <Text style={styles.detail}>
                {decision
                  ? `${rejected ? 'Rejected' : 'Recorded'} · ${leaveDate(decision.decidedAt)}`
                  : pending
                    ? 'Awaiting review'
                    : request.status === 'CANCELLED'
                      ? 'Request cancelled'
                      : request.status === 'REJECTED'
                        ? 'Not reached'
                        : request.status === 'APPROVED'
                          ? 'Final status approved'
                          : 'Next step'}
              </Text>
              {!!decision?.note && (
                <Text style={styles.detail}>{decision.note}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 1,
  },
  dot: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  statusText: { fontSize: theme.typography.caption, fontWeight: '500' },
  avatar: {
    width: theme.sizes.tapTarget,
    height: theme.sizes.tapTarget,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.violetContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.violet,
  },
  path: { gap: theme.spacing.lg },
  pathRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  pathMark: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: theme.colors.mintContainer },
  rejected: { backgroundColor: theme.colors.coralContainer },
  current: { backgroundColor: theme.colors.primary },
  currentText: { color: theme.colors.surface },
  step: {
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    fontWeight: '600',
  },
  pathTitle: {
    fontSize: theme.typography.secondary,
    color: theme.colors.foreground,
    fontWeight: '600',
  },
  detail: {
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    lineHeight: theme.typography.captionLineHeight,
  },
  grow: { flex: 1, gap: theme.spacing.xs },
});
