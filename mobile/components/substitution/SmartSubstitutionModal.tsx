import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { LeaveRequestDto } from '../../lib/leave-api';
import { theme } from '../../lib/theme';
import type { TimetableEntryDto } from '../../lib/timetable-api';
import {
  type AffectedClassSlot,
  type FacultyCandidate,
  createSubstitutionAssignment,
  deriveAffectedClasses,
  findAvailableSubstitutes,
} from '../../lib/substitution-store';

interface SmartSubstitutionModalProps {
  visible: boolean;
  leaveRequest: LeaveRequestDto | null;
  onClose: () => void;
  onAssigned?: () => void;
  timetableEntries: TimetableEntryDto[];
  currentUser: {
    id: string;
    name?: string;
    role: string;
    employeeCode?: string;
  };
}

export function SmartSubstitutionModal({
  visible,
  leaveRequest,
  onClose,
  onAssigned,
  timetableEntries,
  currentUser,
}: SmartSubstitutionModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<AffectedClassSlot | null>(
    null,
  );
  const [selectedCandidate, setSelectedCandidate] =
    useState<FacultyCandidate | null>(null);
  const [assignmentNote, setAssignmentNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, setRefreshTrigger] = useState(0);

  const affectedSlots = leaveRequest
    ? deriveAffectedClasses(leaveRequest, timetableEntries)
    : [];
  const candidates = selectedSlot
    ? findAvailableSubstitutes({
        slot: selectedSlot,
        allTimetableEntries: timetableEntries,
      })
    : [];

  if (!leaveRequest) return null;

  async function handleConfirmAssignment() {
    if (!selectedSlot || !selectedCandidate) return;

    setActionError(null);
    setSuccessMessage(null);
    setAssigning(true);

    try {
      await createSubstitutionAssignment({
        slot: selectedSlot,
        candidate: selectedCandidate,
        note: assignmentNote,
        assignedBy: {
          id: currentUser.id,
          name: currentUser.name || 'Dr. Ramesh K (HOD)',
          role: currentUser.role,
        },
      });

      setSuccessMessage(
        `Assigned ${selectedCandidate.name} to cover ${selectedSlot.subject.code} on ${selectedSlot.date} (${selectedSlot.periodLabel}).`,
      );
      setSelectedCandidate(null);
      setSelectedSlot(null);
      setAssignmentNote('');
      setRefreshTrigger((prev) => prev + 1);

      if (onAssigned) {
        onAssigned();
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to confirm substitution assignment.',
      );
    } finally {
      setAssigning(false);
    }
  }

  const unassignedCount = affectedSlots.filter((s) => !s.assignment).length;
  const assignedCount = affectedSlots.filter((s) => !!s.assignment).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.title}>Smart Faculty Substitution</Text>
              <Text style={styles.subtitle}>
                Covering for {leaveRequest.employee.name} (
                {leaveRequest.employee.employeeCode})
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close substitution preview"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Prototype Sync Notice */}
          <View style={styles.prototypeNotice}>
            <Text style={styles.prototypeNoticeText}>
              ★ Local Prototype: Assignments are recorded locally on this
              device. Use the web substitution page for real assignments.
            </Text>
          </View>

          {/* Leave Summary Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Leave Dates:</Text>
                <Text style={styles.summaryValue}>
                  {leaveRequest.startDate} to {leaveRequest.endDate}
                </Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Department:</Text>
                <Text style={styles.summaryValue}>
                  {leaveRequest.department.name}
                </Text>
              </View>
            </View>

            <View style={styles.summaryMetricsRow}>
              <Badge
                label={`${affectedSlots.length} Affected Classes`}
                variant="secondary"
              />
              <Badge
                label={`${assignedCount} Covered`}
                variant={assignedCount > 0 ? 'success' : 'secondary'}
              />
              {unassignedCount > 0 && (
                <Badge
                  label={`${unassignedCount} Needs Substitution`}
                  variant="warning"
                />
              )}
            </View>
          </Card>

          {successMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ {successMessage}</Text>
            </View>
          )}

          {actionError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>✕ {actionError}</Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Step 1: Affected Classes Overview */}
            <Text style={styles.sectionHeading}>
              {selectedSlot
                ? 'Step 1: Selected Affected Class'
                : 'Affected Class Periods'}
            </Text>

            {affectedSlots.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Classes Affected</Text>
                <Text style={styles.emptyDetail}>
                  The faculty member has no timetable classes scheduled during
                  the approved leave dates.
                </Text>
              </Card>
            ) : (
              affectedSlots
                .filter((slot) => !selectedSlot || slot.id === selectedSlot.id)
                .map((slot) => {
                  const isAssigned = !!slot.assignment;
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <Card
                      key={slot.id}
                      style={[
                        styles.slotCard,
                        isSelected && styles.slotCardSelected,
                        isAssigned && styles.slotCardAssigned,
                      ]}
                    >
                      <View style={styles.slotHeader}>
                        <View style={styles.slotTimeGroup}>
                          <View style={styles.periodPill}>
                            <Text style={styles.periodPillText}>
                              {slot.periodLabel}
                            </Text>
                          </View>
                          <Text style={styles.slotDateText}>
                            {slot.date} ({slot.day}) · {slot.timeLabel}
                          </Text>
                        </View>

                        <Badge
                          label={isAssigned ? 'Covered' : 'Unassigned'}
                          variant={isAssigned ? 'success' : 'warning'}
                        />
                      </View>

                      <View style={styles.slotSubjectRow}>
                        <Text style={styles.slotSubjectCode}>
                          {slot.subject.code}
                        </Text>
                        <Text style={styles.slotSubjectName}>
                          {slot.subject.name}
                        </Text>
                      </View>

                      <Text style={styles.slotMeta}>
                        Sem {slot.semester}
                        {slot.section}
                        {slot.batch ? ` · ${slot.batch}` : ''} ·{' '}
                        {slot.room.name} · {slot.subject.kind}
                      </Text>

                      {isAssigned && slot.assignment ? (
                        <View style={styles.assignedBanner}>
                          <Text style={styles.assignedBannerText}>
                            ★ Covered by:{' '}
                            {slot.assignment.substituteFaculty.name}
                          </Text>
                          {slot.assignment.note && (
                            <Text style={styles.assignedBannerNote}>
                              "{slot.assignment.note}"
                            </Text>
                          )}
                          <Text style={styles.assignedBannerMeta}>
                            Assigned by {slot.assignment.assignedBy.name} at{' '}
                            {new Date(
                              slot.assignment.assignedAt,
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.slotActionRow}>
                          <Button
                            variant={isSelected ? 'outline' : 'primary'}
                            onPress={() => {
                              setActionError(null);
                              setSuccessMessage(null);
                              if (isSelected) {
                                setSelectedSlot(null);
                                setSelectedCandidate(null);
                              } else {
                                setSelectedSlot(slot);
                                setSelectedCandidate(null);
                              }
                            }}
                            style={styles.selectSlotBtn}
                          >
                            {isSelected
                              ? 'Change Class'
                              : 'Find Best Substitute'}
                          </Button>
                        </View>
                      )}
                    </Card>
                  );
                })
            )}

            {/* Step 2: Candidate Recommendation & Selection */}
            {selectedSlot && (
              <View style={styles.candidatesSection}>
                <View style={styles.candidatesHeaderRow}>
                  <Text style={styles.sectionHeading}>
                    Step 2: Recommended Faculty for {selectedSlot.periodLabel}
                  </Text>
                  <Text style={styles.candidatesCountText}>
                    {candidates.filter((c) => c.isAvailable).length} Available ·
                    Ranked by Rubric
                  </Text>
                </View>

                {candidates.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Faculty Available</Text>
                    <Text style={styles.emptyDetail}>
                      All department faculty members have existing timetable
                      commitments or conflicts during this period.
                    </Text>
                  </Card>
                ) : (
                  candidates.map((cand) => {
                    const isSelected =
                      selectedCandidate?.facultyId === cand.facultyId;

                    return (
                      <Card
                        key={cand.facultyId}
                        style={[
                          styles.candidateCard,
                          isSelected && styles.candidateCardSelected,
                          !cand.isAvailable && styles.candidateCardDisabled,
                        ]}
                        onPress={() => {
                          if (cand.isAvailable) {
                            setSelectedCandidate(cand);
                            setActionError(null);
                          }
                        }}
                      >
                        <View style={styles.candidateTopRow}>
                          <View style={styles.candidateInfo}>
                            <View style={styles.candidateNameRow}>
                              <Text style={styles.candidateName}>
                                {cand.name}
                              </Text>
                              {cand.isAvailable && (
                                <View style={styles.scorePill}>
                                  <Text style={styles.scorePillText}>
                                    ★ {cand.matchScore} pts
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.candidateCode}>
                              {cand.employeeCode} · {cand.departmentCode}
                            </Text>
                          </View>

                          <Badge
                            label={
                              cand.isAvailable ? 'Available' : 'Unavailable'
                            }
                            variant={cand.isAvailable ? 'success' : 'secondary'}
                          />
                        </View>

                        {/* Specialization / Expertise */}
                        {cand.specialization && (
                          <Text style={styles.candidateSpec} numberOfLines={1}>
                            Expertise: {cand.specialization}
                          </Text>
                        )}

                        {/* Workload metric */}
                        {cand.workloadHours !== null && (
                          <View style={styles.rubricPillsRow}>
                            <Text style={styles.workloadText}>
                              Load: {cand.workloadHours}h / week (
                              {cand.workloadStatus || 'NORMAL'})
                            </Text>
                            {cand.scoreBreakdown.specializationMatch > 0 && (
                              <View style={styles.tagPill}>
                                <Text style={styles.tagPillText}>
                                  Subject Match +20
                                </Text>
                              </View>
                            )}
                            <View style={styles.tagPill}>
                              <Text style={styles.tagPillText}>
                                Dept Match +
                                {cand.scoreBreakdown.departmentMatch}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Conflict Reason */}
                        {!cand.isAvailable && cand.conflictReason && (
                          <View style={styles.conflictBox}>
                            <Text style={styles.conflictText}>
                              ✕ {cand.conflictReason}
                            </Text>
                          </View>
                        )}

                        {cand.isAvailable && (
                          <View style={styles.candidateSelectRow}>
                            <Pressable
                              onPress={() => setSelectedCandidate(cand)}
                              style={[
                                styles.radioCircle,
                                isSelected && styles.radioCircleSelected,
                              ]}
                            >
                              {isSelected && <View style={styles.radioInner} />}
                            </Pressable>
                            <Text style={styles.radioLabel}>
                              {isSelected
                                ? 'Selected Substitute'
                                : 'Tap to Select'}
                            </Text>
                          </View>
                        )}
                      </Card>
                    );
                  })
                )}

                {/* Assignment Form & Confirmation */}
                {selectedCandidate && (
                  <Card style={styles.confirmationCard}>
                    <Text style={styles.confirmationTitle}>
                      Confirm Substitution Assignment
                    </Text>
                    <Text style={styles.confirmationDetail}>
                      Assign{' '}
                      <Text style={styles.boldText}>
                        {selectedCandidate.name}
                      </Text>{' '}
                      to cover{' '}
                      <Text style={styles.boldText}>
                        {selectedSlot.subject.code} ({selectedSlot.subject.name}
                        )
                      </Text>{' '}
                      for{' '}
                      <Text style={styles.boldText}>
                        {selectedSlot.absentFaculty.name}
                      </Text>{' '}
                      on{' '}
                      <Text style={styles.boldText}>{selectedSlot.date}</Text>{' '}
                      during{' '}
                      <Text style={styles.boldText}>
                        {selectedSlot.periodLabel}
                      </Text>
                      .
                    </Text>

                    <Text style={styles.inputLabel}>
                      Coverage Instructions (Optional):
                    </Text>
                    <TextInput
                      accessibilityLabel="Coverage instructions (optional)"
                      maxLength={500}
                      style={styles.textInput}
                      placeholder="e.g. Please conduct Unit 4 revision lecture and mark attendance."
                      placeholderTextColor={theme.colors.mutedForeground}
                      value={assignmentNote}
                      onChangeText={setAssignmentNote}
                    />

                    <Text style={styles.notificationDisclaimer}>
                      Upon confirmation, a local-device preview push
                      notification will be triggered on this device.
                    </Text>

                    <View style={styles.confirmActionRow}>
                      <Button
                        variant="outline"
                        onPress={() => setSelectedCandidate(null)}
                        style={styles.cancelCandidateBtn}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onPress={handleConfirmAssignment}
                        loading={assigning}
                        disabled={assigning}
                        style={styles.confirmAssignBtn}
                      >
                        Confirm Assignment
                      </Button>
                    </View>
                  </Card>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Close */}
          <View style={styles.footerRow}>
            <Button variant="outline" onPress={onClose} style={styles.doneBtn}>
              Close Smart Substitution
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
    backgroundColor: 'rgba(5, 31, 91, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.modal,
    borderTopRightRadius: theme.radius.modal,
    height: '92%',
    padding: theme.spacing.page,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.subheading,
    color: theme.colors.primary,
  },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    minHeight: theme.sizes.tapTarget,
    minWidth: theme.sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  closeBtnText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 14,
    color: theme.colors.primary,
  },
  prototypeNotice: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: theme.radius.control,
    padding: theme.spacing.sm,
  },
  prototypeNoticeText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  summaryValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
    marginTop: 2,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  slotCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  slotCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F7FF',
  },
  slotCardAssigned: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  periodPill: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  periodPillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    color: theme.colors.surface,
  },
  slotDateText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
  },
  slotSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotSubjectCode: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.primary,
  },
  slotSubjectName: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
    flex: 1,
  },
  slotMeta: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  slotActionRow: {
    marginTop: 4,
  },
  selectSlotBtn: {
    alignSelf: 'flex-start',
  },
  assignedBanner: {
    backgroundColor: '#DCFCE7',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.control,
    gap: 2,
    marginTop: 4,
  },
  assignedBannerText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: '#166534',
  },
  assignedBannerNote: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: '#14532D',
    fontStyle: 'italic',
  },
  assignedBannerMeta: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
  },
  candidatesSection: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  candidatesHeaderRow: {
    gap: 2,
  },
  candidatesCountText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  candidateCard: {
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  candidateCardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: '#FFFBEB',
  },
  candidateCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  candidateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  candidateInfo: {
    flex: 1,
  },
  candidateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  candidateName: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  scorePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scorePillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: '#92400E',
  },
  candidateCode: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  candidateSpec: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: '#475569',
  },
  rubricPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  workloadText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  tagPill: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: theme.colors.primary,
  },
  conflictBox: {
    backgroundColor: '#FEE2E2',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  conflictText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.error,
  },
  candidateSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.accent,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  radioLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 12,
    color: theme.colors.primary,
  },
  confirmationCard: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  confirmationTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: '#854D0E',
  },
  confirmationDetail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: '#713F12',
    lineHeight: 18,
  },
  boldText: {
    fontFamily: theme.typography.headingFamily,
    color: '#713F12',
  },
  inputLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    color: '#854D0E',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: theme.radius.control,
    padding: theme.spacing.sm,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
  },
  notificationDisclaimer: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 10,
    color: '#854D0E',
    fontStyle: 'italic',
  },
  confirmActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  cancelCandidateBtn: {
    flex: 1,
  },
  confirmAssignBtn: {
    flex: 1.5,
  },
  emptyCard: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  emptyTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.primary,
  },
  emptyDetail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: theme.radius.control,
    padding: theme.spacing.sm,
  },
  successText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: '#166534',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: theme.radius.control,
    padding: theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.error,
  },
  footerRow: {
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  doneBtn: {
    width: '100%',
  },
});
