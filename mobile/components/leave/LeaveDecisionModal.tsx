import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import {
  decideLeaveRequest,
  type LeaveRequestDto,
} from '../../lib/leave-api';
import { theme } from '../../lib/theme';

interface LeaveDecisionModalProps {
  visible: boolean;
  request: LeaveRequestDto | null;
  mode: 'APPROVE' | 'REJECT';
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  deciderName?: string;
}

export function LeaveDecisionModal({
  visible,
  request,
  mode,
  onClose,
  onSuccess,
  token,
  deciderName,
}: LeaveDecisionModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const isReject = mode === 'REJECT';

  async function handleConfirm() {
    if (!request) return;
    setError(null);

    // Backend rejectSchema requires note with at least 3 characters
    if (isReject && (!note.trim() || note.trim().length < 3)) {
      setError('Please provide a rejection reason (minimum 3 characters).');
      return;
    }

    setLoading(true);
    try {
      await decideLeaveRequest(
        token,
        request.id,
        !isReject,
        note.trim(),
        deciderName
      );
      setNote('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode.toLowerCase()} request.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isReject ? styles.titleReject : styles.titleApprove]}>
              {isReject ? 'Reject Leave Request' : 'Approve Leave Request'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Request Summary Card */}
          <Card style={styles.summaryCard}>
            <Text style={styles.facultyName}>{request.employee.name}</Text>
            <Text style={styles.employeeCode}>{request.employee.employeeCode} · {request.department.name}</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Leave Type:</Text>
              <Text style={styles.detailValue}>{request.leaveType.name} ({request.leaveType.code})</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Period:</Text>
              <Text style={styles.detailValue}>
                {request.startDate} to {request.endDate} ({request.days} {request.days === 1 ? 'day' : 'days'})
              </Text>
            </View>

            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason provided:</Text>
              <Text style={styles.reasonText}>"{request.reason}"</Text>
            </View>
          </Card>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Decision Note / Remark */}
          <Input
            label={isReject ? 'Rejection Reason (Required)' : 'Recommendation Remark (Optional)'}
            placeholder={
              isReject
                ? 'State the reason for rejecting this leave request…'
                : 'e.g. Recommended. Alternate arrangements confirmed.'
            }
            value={note}
            onChangeText={setNote}
            helperText={
              isReject
                ? 'Minimum 3 characters. This note will be recorded in the official audit trail.'
                : 'Optional comment for the faculty member and HR office.'
            }
          />

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Button variant="outline" onPress={onClose} style={styles.cancelBtn}>
              Cancel
            </Button>
            <Button
              variant={isReject ? 'danger' : 'primary'}
              onPress={handleConfirm}
              loading={loading}
              disabled={loading}
              style={styles.confirmBtn}
            >
              {isReject ? 'Confirm Rejection' : 'Confirm Approval'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 31, 91, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.page,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.modal,
    padding: theme.spacing.page,
    gap: theme.spacing.section,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.subheading,
  },
  titleApprove: {
    color: theme.colors.primary,
  },
  titleReject: {
    color: theme.colors.error,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  closeBtnText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 14,
    color: theme.colors.primary,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    gap: 6,
    padding: theme.spacing.md,
  },
  facultyName: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  employeeCode: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  detailValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
  },
  reasonBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  reasonLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  reasonText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
    fontStyle: 'italic',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.error,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1.5,
  },
});
