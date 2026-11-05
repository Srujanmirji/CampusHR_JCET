import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../lib/dialogs';
import { useAuth } from '../lib/auth-context';
import { theme } from '../lib/theme';
import {
  decideDutySwap,
  fetchExamDuties,
  fetchExamSessions,
  fetchFacultyList,
  requestDutySwap,
  type ExamDutyRole,
  type ExamDutyStatus,
  type MobileExamDuty,
} from '../lib/exam-duty-api';

const DUTY_TABS = [
  { value: 'my', label: 'My Duties' },
  { value: 'swaps', label: 'Swap Requests' },
  { value: 'all', label: 'All Roster' },
] as const;

export default function ExamDutyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isManagement =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'HR_ADMIN' ||
    user?.role === 'PRINCIPAL' ||
    user?.role === 'HOD';

  const [activeTab, setActiveTab] = useState<'my' | 'swaps' | 'all'>('my');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Modals
  const [activeDuty, setActiveDuty] = useState<MobileExamDuty | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Swap Request Form
  const [selectedSwapFacultyId, setSelectedSwapFacultyId] = useState('');
  const [swapReason, setSwapReason] = useState('');

  // Swap Decision Form
  const [decisionRemarks, setDecisionRemarks] = useState('');

  const sessionsQuery = useQuery({
    queryKey: ['exam-sessions'],
    queryFn: fetchExamSessions,
  });

  const facultyQuery = useQuery({
    queryKey: ['exam-eligible-faculty'],
    queryFn: fetchFacultyList,
    enabled: showSwapModal,
  });

  const { data: duties = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['exam-duties', selectedSessionId],
    queryFn: () =>
      fetchExamDuties({
        sessionId: selectedSessionId || undefined,
      }),
  });

  const myDuties = duties.filter(
    (d) =>
      d.facultyId === user?.id ||
      d.faculty?.employeeCode === user?.employeeCode ||
      (d.faculty?.email && d.faculty.email.toLowerCase() === user?.email?.toLowerCase()),
  );

  const swapRequests = duties.filter((d) => d.status === 'SWAP_REQUESTED');

  const displayedDuties =
    activeTab === 'my'
      ? myDuties
      : activeTab === 'swaps'
        ? swapRequests
        : duties;

  const morningCount = displayedDuties.filter((d) => d.sessionTime === 'MORNING').length;
  const afternoonCount = displayedDuties.filter((d) => d.sessionTime === 'AFTERNOON').length;

  const swapRequestMutation = useMutation({
    mutationFn: ({ id, facultyId, reason }: { id: string; facultyId: string; reason: string }) =>
      requestDutySwap(id, { swapWithFacultyId: facultyId, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exam-duties'] });
      setShowSwapModal(false);
      setSelectedSwapFacultyId('');
      setSwapReason('');
      Alert.alert('Swap Requested', 'Your exam duty swap request has been submitted for approval.');
    },
    onError: (err: any) => {
      Alert.alert('Request Failed', err.message || 'Could not request swap.');
    },
  });

  const swapDecideMutation = useMutation({
    mutationFn: ({ id, decision, remarks }: { id: string; decision: 'APPROVED' | 'REJECTED'; remarks?: string }) =>
      decideDutySwap(id, { decision, remarks }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['exam-duties'] });
      setShowReviewModal(false);
      setDecisionRemarks('');
      Alert.alert('Decision Recorded', `Swap request has been ${updated.swapStatus?.toLowerCase()}.`);
    },
    onError: (err: any) => {
      Alert.alert('Decision Failed', err.message || 'Could not process swap decision.');
    },
  });

  const getRoleColors = (role: ExamDutyRole) => {
    switch (role) {
      case 'CHIEF_SUPERINTENDENT':
      case 'DEPUTY_CHIEF':
        return { bg: theme.colors.violetContainer, text: theme.colors.violet };
      case 'SQUAD':
        return { bg: theme.colors.coralContainer, text: theme.colors.coralInk };
      default:
        return { bg: theme.colors.blueContainer, text: theme.colors.brandBlue };
    }
  };

  const getStatusColors = (status: ExamDutyStatus) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: theme.colors.mintContainer, text: theme.colors.mintInk };
      case 'SWAP_REQUESTED':
        return { bg: theme.colors.amberContainer, text: theme.colors.amberInk };
      case 'SWAPPED':
        return { bg: theme.colors.violetContainer, text: theme.colors.violet };
      case 'ABSENT':
        return { bg: theme.colors.coralContainer, text: theme.colors.coralInk };
      default:
        return { bg: theme.colors.muted, text: theme.colors.foreground };
    }
  };

  return (
    <ScreenContainer
      testID="exam-duty-screen"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="back" color={theme.colors.primary} size={20} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.headerTitleRow}>
          <View style={styles.grow}>
            <Text accessibilityRole="header" style={styles.title}>
              Exam Duty Allotment
            </Text>
            <Text style={styles.subtitle}>
              VTU semester examinations & internal invigilation
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.segmentedArea}>
        <SegmentedControl
          label="Exam Duty Filter"
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
          options={isManagement ? DUTY_TABS : DUTY_TABS.slice(0, 2)}
        />
      </View>

      {/* Sessions Filter Pills */}
      {sessionsQuery.data && sessionsQuery.data.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionScroll}
        >
          <Pressable
            onPress={() => setSelectedSessionId('')}
            style={[styles.sessionChip, !selectedSessionId && styles.sessionChipActive]}
          >
            <Text style={[styles.sessionChipText, !selectedSessionId && styles.sessionChipTextActive]}>
              All Sessions
            </Text>
          </Pressable>
          {sessionsQuery.data.map((s) => {
            const active = selectedSessionId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSelectedSessionId(s.id)}
                style={[styles.sessionChip, active && styles.sessionChipActive]}
              >
                <Text style={[styles.sessionChipText, active && styles.sessionChipTextActive]}>
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{displayedDuties.length}</Text>
          <Text style={styles.metricLabel}>Total Duties</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: theme.colors.brandBlue }]}>
            {morningCount}
          </Text>
          <Text style={styles.metricLabel}>Morning (AM)</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: theme.colors.amberInk }]}>
            {afternoonCount}
          </Text>
          <Text style={styles.metricLabel}>Afternoon (PM)</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: theme.colors.violet }]}>
            {swapRequests.length}
          </Text>
          <Text style={styles.metricLabel}>Swaps</Text>
        </View>
      </View>

      {/* Duties List */}
      {isLoading ? (
        <View style={styles.loaderArea}>
          <Skeleton label="Loading exam duty allotment..." />
        </View>
      ) : isError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Could not load exam duties</Text>
          <Text style={styles.emptySubtitle}>
            Please check connection to JCET servers.
          </Text>
          <Button variant="secondary" onPress={() => void refetch()} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </View>
      ) : displayedDuties.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="timetable" color={theme.colors.mutedForeground} size={36} />
          <Text style={styles.emptyTitle}>No duties found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'my'
              ? 'You have no exam invigilation duties allotted in this session.'
              : 'There are no records matching your selected filter.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listArea}>
          {displayedDuties.map((duty) => {
            const rColors = getRoleColors(duty.role);
            const sColors = getStatusColors(duty.status);
            const dutyDate = new Date(duty.date).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            const facultyName = duty.faculty
              ? `${duty.faculty.firstName} ${duty.faculty.lastName}`
              : 'Assigned Faculty';

            const roomText = duty.room ? `Room ${duty.room.name}` : 'Main Exam Hall';

            return (
              <View key={duty.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: rColors.bg }]}>
                      <Text style={[styles.badgeText, { color: rColors.text }]}>
                        {duty.role.replace('_', ' ')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            duty.sessionTime === 'MORNING'
                              ? theme.colors.blueContainer
                              : theme.colors.amberContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              duty.sessionTime === 'MORNING'
                                ? theme.colors.brandBlue
                                : theme.colors.amberInk,
                          },
                        ]}
                      >
                        {duty.sessionTime === 'MORNING' ? '09:00 AM – 12:00 PM' : '02:00 PM – 05:00 PM'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sColors.bg }]}>
                    <Text style={[styles.badgeText, { color: sColors.text }]}>
                      {duty.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{dutyDate}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Reporting Time:</Text>
                  <Text style={styles.metaValue}>{duty.reportingTime || '30 mins before session'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Room / Venue:</Text>
                  <Text style={styles.metaValue}>{roomText}</Text>
                </View>

                {activeTab !== 'my' && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Faculty:</Text>
                    <Text style={styles.metaValue}>{facultyName} ({duty.faculty?.department?.code || ''})</Text>
                  </View>
                )}

                {duty.status === 'SWAP_REQUESTED' && (
                  <View style={styles.swapNoticeBox}>
                    <Text style={styles.swapNoticeTitle}>Swap Requested With:</Text>
                    <Text style={styles.swapNoticeBody}>
                      {duty.swapWithFaculty
                        ? `${duty.swapWithFaculty.firstName} ${duty.swapWithFaculty.lastName}`
                        : 'Colleague'}
                    </Text>
                    <Text style={styles.swapNoticeReason}>
                      Reason: {duty.swapReason || 'Personal / Academic clash'}
                    </Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  {duty.status === 'ASSIGNED' && (
                    <Button
                      variant="outline"
                      onPress={() => {
                        setActiveDuty(duty);
                        setShowSwapModal(true);
                      }}
                    >
                      Request Swap
                    </Button>
                  )}

                  {duty.status === 'SWAP_REQUESTED' && isManagement && (
                    <Button
                      variant="accent"
                      onPress={() => {
                        setActiveDuty(duty);
                        setShowReviewModal(true);
                      }}
                    >
                      Review Swap Decision
                    </Button>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Swap Request Modal */}
      <Modal
        visible={showSwapModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSwapModal(false)}
      >
        {activeDuty && (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalTitle}>Request Duty Swap</Text>
                <Text style={styles.modalRefText}>
                  {new Date(activeDuty.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  · {activeDuty.sessionTime}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowSwapModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" color={theme.colors.foreground} size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.formLabel}>Select Substitute Faculty *</Text>
              {facultyQuery.isLoading ? (
                <Skeleton label="Loading eligible faculty..." />
              ) : (
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                  <View style={styles.chipRow}>
                    {(facultyQuery.data || []).map((f) => {
                      const selected = selectedSwapFacultyId === f.id;
                      return (
                        <Pressable
                          key={f.id}
                          onPress={() => setSelectedSwapFacultyId(f.id)}
                          style={[styles.formChip, selected && styles.formChipActive]}
                        >
                          <Text style={[styles.formChipText, selected && styles.formChipTextActive]}>
                            {f.firstName} {f.lastName} ({f.department?.code || ''})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              <Text style={styles.formLabel}>Reason for Swap *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="e.g. VTU Valuation Duty on the same day, medical emergency..."
                multiline
                numberOfLines={4}
                value={swapReason}
                onChangeText={setSwapReason}
              />

              <Button
                variant="accent"
                style={{ marginTop: 20 }}
                loading={swapRequestMutation.isPending}
                onPress={() => {
                  if (!selectedSwapFacultyId || !swapReason.trim()) {
                    Alert.alert('Incomplete Form', 'Please choose a faculty colleague and provide a reason.');
                    return;
                  }
                  swapRequestMutation.mutate({
                    id: activeDuty.id,
                    facultyId: selectedSwapFacultyId,
                    reason: swapReason.trim(),
                  });
                }}
              >
                Submit Swap Request
              </Button>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Review Swap Decision Modal (HOD / Admin) */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReviewModal(false)}
      >
        {activeDuty && (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalTitle}>Review Duty Swap</Text>
                <Text style={styles.modalRefText}>
                  {new Date(activeDuty.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  · {activeDuty.sessionTime}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowReviewModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" color={theme.colors.foreground} size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.swapNoticeBox}>
                <Text style={styles.swapNoticeTitle}>Current Faculty:</Text>
                <Text style={styles.swapNoticeBody}>
                  {activeDuty.faculty?.firstName} {activeDuty.faculty?.lastName}
                </Text>

                <Text style={[styles.swapNoticeTitle, { marginTop: 8 }]}>Proposed Replacement:</Text>
                <Text style={styles.swapNoticeBody}>
                  {activeDuty.swapWithFaculty
                    ? `${activeDuty.swapWithFaculty.firstName} ${activeDuty.swapWithFaculty.lastName}`
                    : 'Colleague'}
                </Text>

                <Text style={[styles.swapNoticeTitle, { marginTop: 8 }]}>Reason for Swap:</Text>
                <Text style={styles.swapNoticeReason}>{activeDuty.swapReason || '—'}</Text>
              </View>

              <Text style={styles.formLabel}>Remarks (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter approval remarks..."
                value={decisionRemarks}
                onChangeText={setDecisionRemarks}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <Button
                  variant="secondary"
                  style={{ flex: 1 }}
                  loading={swapDecideMutation.isPending}
                  onPress={() =>
                    swapDecideMutation.mutate({
                      id: activeDuty.id,
                      decision: 'REJECTED',
                      remarks: decisionRemarks.trim() || undefined,
                    })
                  }
                >
                  Reject Swap
                </Button>
                <Button
                  variant="accent"
                  style={{ flex: 1 }}
                  loading={swapDecideMutation.isPending}
                  onPress={() =>
                    swapDecideMutation.mutate({
                      id: activeDuty.id,
                      decision: 'APPROVED',
                      remarks: decisionRemarks.trim() || undefined,
                    })
                  }
                >
                  Approve Swap
                </Button>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backText: {
    marginLeft: 6,
    color: theme.colors.primary,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grow: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  segmentedArea: {
    marginBottom: 12,
  },
  sessionScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  sessionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sessionChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sessionChipText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.textSecondary,
  },
  sessionChipTextActive: {
    color: theme.colors.onAction,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  metricLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  loaderArea: {
    paddingVertical: 24,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 12,
  },
  emptyTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginTop: 12,
  },
  emptySubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  listArea: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.typography.headingFamily,
  },
  cardTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.bodyFamily,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.foreground,
    fontFamily: theme.typography.bodyFamily,
  },
  swapNoticeBox: {
    backgroundColor: theme.colors.amberContainer,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  swapNoticeTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.amberInk,
  },
  swapNoticeBody: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginTop: 2,
  },
  swapNoticeReason: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  modalRefText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.bodyFamily,
    marginBottom: 2,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalScroll: {
    padding: 16,
  },
  formLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginTop: 14,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    padding: 12,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  formChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.bodyFamily,
  },
  formChipTextActive: {
    color: theme.colors.onAction,
    fontWeight: '600',
  },
});
