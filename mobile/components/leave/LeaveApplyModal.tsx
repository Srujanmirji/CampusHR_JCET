import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { applyForLeave, type LeaveTypeDto } from '../../lib/leave-api';
import { theme } from '../../lib/theme';

interface LeaveApplyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  currentUser: {
    id: string;
    name?: string;
    employeeCode?: string;
    role: string;
  };
  leaveTypes: LeaveTypeDto[];
}

export function LeaveApplyModal({
  visible,
  onClose,
  onSuccess,
  token,
  currentUser,
  leaveTypes,
}: LeaveApplyModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [tomorrow] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );

  const [selectedTypeId, setSelectedTypeId] = useState<number>(
    leaveTypes[0]?.id || 1,
  );
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<'FIRST' | 'SECOND'>(
    'FIRST',
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType =
    leaveTypes.find((t) => t.id === selectedTypeId) || leaveTypes[0];

  function validate(): boolean {
    setError(null);
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setError('Start date must be in YYYY-MM-DD format.');
      return false;
    }
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      setError('End date must be in YYYY-MM-DD format.');
      return false;
    }
    if (startDate > endDate) {
      setError('End date cannot be earlier than start date.');
      return false;
    }
    if (isHalfDay && startDate !== endDate) {
      setError('Half-day leave must cover one single date only.');
      return false;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a reason (minimum 3 characters).');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await applyForLeave(
        token,
        {
          leaveTypeId: selectedTypeId,
          startDate,
          endDate,
          halfDay: isHalfDay ? halfDaySession : null,
          reason: reason.trim(),
        },
        currentUser,
      );
      // Reset form
      setReason('');
      setIsHalfDay(false);
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit leave request.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalSheet}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.modalTitle}>Apply for Leave</Text>
                <Text style={styles.modalSubtitle}>
                  Submit request for HOD academic approval
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Leave Type Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Leave Type</Text>
              <View style={styles.typeSelectorRow}>
                {leaveTypes.map((type) => {
                  const isSelected = type.id === selectedTypeId;
                  return (
                    <Pressable
                      key={type.id}
                      onPress={() => setSelectedTypeId(type.id)}
                      style={[
                        styles.typeChip,
                        isSelected && styles.typeChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          isSelected && styles.typeChipTextSelected,
                        ]}
                      >
                        {type.code}
                      </Text>
                      <Text
                        style={[
                          styles.typeChipName,
                          isSelected && styles.typeChipNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {type.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Quick Date Shortcuts */}
            <View style={styles.shortcutsRow}>
              <Text style={styles.shortcutsLabel}>Quick dates:</Text>
              <Pressable
                onPress={() => {
                  setStartDate(today);
                  setEndDate(today);
                }}
                style={styles.shortcutBtn}
              >
                <Text style={styles.shortcutBtnText}>Today</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStartDate(tomorrow);
                  setEndDate(tomorrow);
                }}
                style={styles.shortcutBtn}
              >
                <Text style={styles.shortcutBtnText}>Tomorrow</Text>
              </Pressable>
            </View>

            {/* Date Inputs */}
            <View style={styles.dateInputsRow}>
              <View style={styles.dateCol}>
                <Input
                  label="Start Date"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateCol}>
                <Input
                  label="End Date"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Half Day Option */}
            {selectedType?.allowHalfDay && (
              <Card style={styles.halfDayCard}>
                <Pressable
                  onPress={() => setIsHalfDay(!isHalfDay)}
                  style={styles.halfDayCheckboxRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isHalfDay && styles.checkboxActive,
                    ]}
                  >
                    {isHalfDay && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.halfDayLabel}>
                    Apply as Half-Day Leave
                  </Text>
                </Pressable>

                {isHalfDay && (
                  <View style={styles.sessionToggleRow}>
                    <Pressable
                      onPress={() => setHalfDaySession('FIRST')}
                      style={[
                        styles.sessionBtn,
                        halfDaySession === 'FIRST' && styles.sessionBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sessionText,
                          halfDaySession === 'FIRST' &&
                            styles.sessionTextActive,
                        ]}
                      >
                        Morning Session (First)
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setHalfDaySession('SECOND')}
                      style={[
                        styles.sessionBtn,
                        halfDaySession === 'SECOND' && styles.sessionBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sessionText,
                          halfDaySession === 'SECOND' &&
                            styles.sessionTextActive,
                        ]}
                      >
                        Afternoon Session (Second)
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            )}

            {/* Reason Input */}
            <Input
              label="Reason for Leave"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Attending VTU conference, personal work, medical"
              helperText="Minimum 3 characters. This will be reviewed by your HOD."
            />

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Button
                variant="outline"
                onPress={onClose}
                style={styles.cancelBtn}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitBtn}
              >
                Submit Application
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 31, 91, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.modal,
    borderTopRightRadius: theme.radius.modal,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scrollContent: {
    padding: theme.spacing.page,
    gap: theme.spacing.section,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.subheading,
    color: theme.colors.primary,
  },
  modalSubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
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
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    gap: 2,
  },
  typeChipSelected: {
    backgroundColor: '#EBF1FC',
    borderColor: theme.colors.primary,
  },
  typeChipText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
  },
  typeChipTextSelected: {
    color: theme.colors.primary,
  },
  typeChipName: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  typeChipNameSelected: {
    color: theme.colors.primary,
  },
  shortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  shortcutsLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  shortcutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  shortcutBtnText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateCol: {
    flex: 1,
  },
  halfDayCard: {
    gap: theme.spacing.sm,
    backgroundColor: '#F8FAFC',
  },
  halfDayCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  halfDayLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
  },
  sessionToggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  sessionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  sessionBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sessionText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.foreground,
  },
  sessionTextActive: {
    color: theme.colors.surface,
    fontFamily: theme.typography.headingFamily,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
