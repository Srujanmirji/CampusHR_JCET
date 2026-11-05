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
  createWorkAssignments,
  fetchAssignableEmployees,
  fetchWorkAssignments,
  reviewWorkAssignment,
  updateWorkStatus,
  type MobileWorkAssignment,
  type WorkCategory,
  type WorkPriority,
} from '../lib/work-assignments-api';

const CATEGORY_TABS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All Tasks' },
  { key: 'NBA_NAAC', label: 'NBA / NAAC' },
  { key: 'ACADEMIC', label: 'Academic' },
  { key: 'EXAMINATION', label: 'Exams' },
  { key: 'EVENT', label: 'Events' },
  { key: 'ADMINISTRATIVE', label: 'Admin' },
  { key: 'STUDENT_AFFAIR', label: 'Student Affairs' },
];

const VIEW_OPTIONS = [
  { value: 'assigned-to-me', label: 'Assigned to Me' },
  { value: 'assigned-by-me', label: 'Assigned by Me' },
  { value: 'all', label: 'All Tasks' },
] as const;

export default function WorkAssignmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAssigner =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'HR_ADMIN' ||
    user?.role === 'PRINCIPAL' ||
    user?.role === 'HOD';

  const [activeView, setActiveView] = useState<'assigned-to-me' | 'assigned-by-me' | 'all'>('assigned-to-me');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activeTask, setActiveTask] = useState<MobileWorkAssignment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Status Action state
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  // Creation form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<WorkCategory>('ACADEMIC');
  const [newPriority, setNewPriority] = useState<WorkPriority>('NORMAL');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['work-assignments', activeView, selectedCategory, selectedStatus, searchQuery],
    queryFn: () =>
      fetchWorkAssignments({
        view: activeView,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        search: searchQuery.trim() || undefined,
        pageSize: 100,
      }),
  });

  const employeesQuery = useQuery({
    queryKey: ['assignable-employees'],
    queryFn: fetchAssignableEmployees,
    enabled: showCreateModal && isAssigner,
  });

  const tasks = data?.data || [];
  const metrics = data?.metrics || { assigned: 0, inProgress: 0, submitted: 0, completed: 0 };

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'IN_PROGRESS' | 'SUBMITTED' | 'CANCELLED'; notes?: string }) =>
      updateWorkStatus(id, { status, submissionNotes: notes }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['work-assignments'] });
      setActiveTask(updated);
      setSubmissionNotes('');
      Alert.alert('Status Updated', `Task status changed to ${updated.status}.`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to update task.');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, feedback }: { id: string; status: 'COMPLETED' | 'IN_PROGRESS'; feedback?: string }) =>
      reviewWorkAssignment(id, { status, reviewFeedback: feedback }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['work-assignments'] });
      setActiveTask(updated);
      setReviewNotes('');
      Alert.alert('Review Submitted', `Task marked as ${updated.status}.`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to review task.');
    },
  });

  const createMutation = useMutation({
    mutationFn: createWorkAssignments,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['work-assignments'] });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setSelectedAssigneeIds([]);
      Alert.alert('Task Created', 'Work assignment successfully delegated.');
    },
    onError: (err: any) => {
      Alert.alert('Creation Failed', err.message || 'Could not assign task.');
    },
  });

  const getPriorityColors = (p: WorkPriority) => {
    switch (p) {
      case 'URGENT':
        return { bg: theme.colors.coralContainer, text: theme.colors.coralInk };
      case 'HIGH':
        return { bg: theme.colors.amberContainer, text: theme.colors.amberInk };
      default:
        return { bg: theme.colors.muted, text: theme.colors.textSecondary };
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: theme.colors.mintContainer, text: theme.colors.mintInk };
      case 'SUBMITTED':
        return { bg: theme.colors.blueContainer, text: theme.colors.brandBlue };
      case 'IN_PROGRESS':
        return { bg: theme.colors.amberContainer, text: theme.colors.amberInk };
      case 'CANCELLED':
        return { bg: theme.colors.coralContainer, text: theme.colors.coralInk };
      default:
        return { bg: theme.colors.muted, text: theme.colors.foreground };
    }
  };

  return (
    <ScreenContainer
      testID="work-assignments-screen"
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
              Work Delegation
            </Text>
            <Text style={styles.subtitle}>
              Institutional task assignments & committee duties
            </Text>
          </View>
          {isAssigner && (
            <Button
              variant="accent"
              onPress={() => setShowCreateModal(true)}
            >
              + Delegate
            </Button>
          )}
        </View>
      </View>

      {/* Scope Segmented Control */}
      {isAssigner && (
        <View style={styles.segmentedArea}>
          <SegmentedControl
            label="Work Delegation View"
            value={activeView}
            onChange={(val) => setActiveView(val as any)}
            options={VIEW_OPTIONS}
          />
        </View>
      )}

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics.assigned}</Text>
          <Text style={styles.metricLabel}>Assigned</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: theme.colors.amberInk }]}>
            {metrics.inProgress}
          </Text>
          <Text style={styles.metricLabel}>In Progress</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: theme.colors.brandBlue }]}>
            {metrics.submitted}
          </Text>
          <Text style={styles.metricLabel}>Submitted</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: theme.colors.mintInk }]}>
            {metrics.completed}
          </Text>
          <Text style={styles.metricLabel}>Done</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="document" color={theme.colors.mutedForeground} size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search assignments by title or keyword..."
          placeholderTextColor={theme.colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {!!searchQuery && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Icon name="close" color={theme.colors.mutedForeground} size={16} />
          </Pressable>
        )}
      </View>

      {/* Category Filter Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {CATEGORY_TABS.map((tab) => {
          const active = selectedCategory === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedCategory(tab.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Task List */}
      {isLoading ? (
        <View style={styles.loaderArea}>
          <Skeleton label="Loading task assignments..." />
        </View>
      ) : isError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Could not load tasks</Text>
          <Text style={styles.emptySubtitle}>
            Please check connection to JCET servers.
          </Text>
          <Button variant="secondary" onPress={() => void refetch()} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="workload" color={theme.colors.mutedForeground} size={36} />
          <Text style={styles.emptyTitle}>No assignments found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try modifying your search criteria'
              : 'You have no assigned tasks in this view.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listArea}>
          {tasks.map((task) => {
            const pColors = getPriorityColors(task.priority);
            const sColors = getStatusColors(task.status);
            const isOverdue =
              task.status !== 'COMPLETED' &&
              task.status !== 'CANCELLED' &&
              new Date(task.dueDate).getTime() < Date.now();

            const assigneeName = task.assignedTo
              ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
              : 'Unassigned';

            const assignerName = task.assignedBy?.employee
              ? `${task.assignedBy.employee.firstName} ${task.assignedBy.employee.lastName}`
              : task.assignedBy?.email || 'JCET Office';

            return (
              <Pressable
                key={task.id}
                onPress={() => setActiveTask(task)}
                style={({ pressed }) => [
                  styles.card,
                  isOverdue && styles.cardOverdue,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: pColors.bg }]}>
                      <Text style={[styles.badgeText, { color: pColors.text }]}>
                        {task.priority}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.colors.violetContainer }]}>
                      <Text style={[styles.badgeText, { color: theme.colors.violet }]}>
                        {task.category.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sColors.bg }]}>
                    <Text style={[styles.badgeText, { color: sColors.text }]}>
                      {task.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{task.title}</Text>
                <Text numberOfLines={2} style={styles.cardPreview}>
                  {task.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.personRow}>
                    <Icon name="profile" color={theme.colors.textSecondary} size={14} />
                    <Text style={styles.personText}>
                      {activeView === 'assigned-by-me'
                        ? `Assigned to: ${assigneeName}`
                        : `From: ${assignerName}`}
                    </Text>
                  </View>

                  <View style={styles.dueRow}>
                    <Icon
                      name="clock"
                      color={isOverdue ? theme.colors.coralInk : theme.colors.textSecondary}
                      size={14}
                    />
                    <Text
                      style={[
                        styles.dueText,
                        isOverdue && { color: theme.colors.coralInk, fontWeight: '600' },
                      ]}
                    >
                      Due {new Date(task.dueDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Task Detail & Action Modal */}
      <Modal
        visible={!!activeTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveTask(null)}
      >
        {activeTask && (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalRefText}>
                  {activeTask.category.replace('_', ' ')} · {activeTask.priority}
                </Text>
                <Text style={styles.modalTitle}>{activeTask.title}</Text>
              </View>
              <Pressable
                onPress={() => setActiveTask(null)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" color={theme.colors.foreground} size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Status</Text>
                  <Text style={[styles.metaValue, { color: getStatusColors(activeTask.status).text }]}>
                    {activeTask.status.replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Assigned To</Text>
                  <Text style={styles.metaValue}>
                    {activeTask.assignedTo
                      ? `${activeTask.assignedTo.firstName} ${activeTask.assignedTo.lastName} (${activeTask.assignedTo.department?.code || ''})`
                      : '—'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Assigned By</Text>
                  <Text style={styles.metaValue}>
                    {activeTask.assignedBy?.employee
                      ? `${activeTask.assignedBy.employee.firstName} ${activeTask.assignedBy.employee.lastName}`
                      : activeTask.assignedBy?.email || 'JCET Office'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Due Date</Text>
                  <Text style={styles.metaValue}>
                    {new Date(activeTask.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Task Scope & Instructions</Text>
              <View style={styles.instructionBox}>
                <Text style={styles.instructionText}>{activeTask.description}</Text>
              </View>

              {!!activeTask.submissionNotes && (
                <>
                  <Text style={styles.sectionHeading}>Submission Notes</Text>
                  <View style={styles.instructionBox}>
                    <Text style={styles.instructionText}>{activeTask.submissionNotes}</Text>
                  </View>
                </>
              )}

              {!!activeTask.reviewFeedback && (
                <>
                  <Text style={styles.sectionHeading}>Review Feedback</Text>
                  <View style={[styles.instructionBox, { borderColor: theme.colors.brandBlue }]}>
                    <Text style={styles.instructionText}>{activeTask.reviewFeedback}</Text>
                  </View>
                </>
              )}

              {/* Action Controls for Assignee */}
              {activeTask.status === 'ASSIGNED' && (
                <View style={styles.actionSection}>
                  <Button
                    variant="accent"
                    loading={statusMutation.isPending}
                    onPress={() =>
                      statusMutation.mutate({ id: activeTask.id, status: 'IN_PROGRESS' })
                    }
                  >
                    Start Working
                  </Button>
                </View>
              )}

              {activeTask.status === 'IN_PROGRESS' && (
                <View style={styles.actionSection}>
                  <Text style={styles.formLabel}>Completion / Submission Notes</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    placeholder="Describe completed work, document references, links..."
                    multiline
                    value={submissionNotes}
                    onChangeText={setSubmissionNotes}
                  />
                  <Button
                    variant="accent"
                    style={{ marginTop: 12 }}
                    loading={statusMutation.isPending}
                    onPress={() => {
                      if (!submissionNotes.trim()) {
                        Alert.alert('Notes Required', 'Please provide notes on the completed work.');
                        return;
                      }
                      statusMutation.mutate({
                        id: activeTask.id,
                        status: 'SUBMITTED',
                        notes: submissionNotes.trim(),
                      });
                    }}
                  >
                    Submit Task for Review
                  </Button>
                </View>
              )}

              {/* Action Controls for Reviewer / Assigner */}
              {activeTask.status === 'SUBMITTED' && isAssigner && (
                <View style={styles.actionSection}>
                  <Text style={styles.formLabel}>Feedback (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter review remarks..."
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Button
                      variant="secondary"
                      style={{ flex: 1 }}
                      loading={reviewMutation.isPending}
                      onPress={() =>
                        reviewMutation.mutate({
                          id: activeTask.id,
                          status: 'IN_PROGRESS',
                          feedback: reviewNotes.trim() || 'Please revise and resubmit.',
                        })
                      }
                    >
                      Request Revisions
                    </Button>
                    <Button
                      variant="accent"
                      style={{ flex: 1 }}
                      loading={reviewMutation.isPending}
                      onPress={() =>
                        reviewMutation.mutate({
                          id: activeTask.id,
                          status: 'COMPLETED',
                          feedback: reviewNotes.trim() || undefined,
                        })
                      }
                    >
                      Approve & Complete
                    </Button>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Create / Delegate Task Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.grow}>
              <Text style={styles.modalTitle}>Delegate Work Assignment</Text>
              <Text style={styles.modalRefText}>
                Assign institutional task to faculty
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" color={theme.colors.foreground} size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.formLabel}>Task Title *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Prepare NBA Criteria 3 Course File"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.chipRow}>
              {(['ACADEMIC', 'NBA_NAAC', 'EXAMINATION', 'EVENT', 'ADMINISTRATIVE', 'STUDENT_AFFAIR'] as WorkCategory[]).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewCategory(c)}
                  style={[styles.formChip, newCategory === c && styles.formChipActive]}
                >
                  <Text style={[styles.formChipText, newCategory === c && styles.formChipTextActive]}>
                    {c.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {(['NORMAL', 'HIGH', 'URGENT'] as WorkPriority[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setNewPriority(p)}
                  style={[styles.formChip, newPriority === p && styles.formChipActive]}
                >
                  <Text style={[styles.formChipText, newPriority === p && styles.formChipTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>Due Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="YYYY-MM-DD"
              value={newDueDate}
              onChangeText={setNewDueDate}
            />

            <Text style={styles.formLabel}>Assign Faculty *</Text>
            {employeesQuery.isLoading ? (
              <Skeleton label="Loading faculty list..." />
            ) : (
              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                <View style={styles.chipRow}>
                  {(employeesQuery.data || []).map((emp) => {
                    const selected = selectedAssigneeIds.includes(emp.id);
                    return (
                      <Pressable
                        key={emp.id}
                        onPress={() => {
                          if (selected) {
                            setSelectedAssigneeIds((prev) => prev.filter((id) => id !== emp.id));
                          } else {
                            setSelectedAssigneeIds((prev) => [...prev, emp.id]);
                          }
                        }}
                        style={[styles.formChip, selected && styles.formChipActive]}
                      >
                        <Text style={[styles.formChipText, selected && styles.formChipTextActive]}>
                          {emp.firstName} {emp.lastName} ({emp.department?.code || ''})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <Text style={styles.formLabel}>Detailed Instructions *</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Outline deliverables, deadlines, guidelines..."
              multiline
              numberOfLines={4}
              value={newDescription}
              onChangeText={setNewDescription}
            />

            <Button
              variant="accent"
              style={{ marginTop: 20 }}
              loading={createMutation.isPending}
              onPress={() => {
                if (!newTitle.trim() || !newDescription.trim() || selectedAssigneeIds.length === 0) {
                  Alert.alert('Incomplete Form', 'Please provide title, instructions, and select at least one assignee.');
                  return;
                }
                createMutation.mutate({
                  title: newTitle.trim(),
                  description: newDescription.trim(),
                  category: newCategory,
                  priority: newPriority,
                  dueDate: newDueDate,
                  assignedToIds: selectedAssigneeIds,
                });
              }}
            >
              Delegate Task
            </Button>
          </ScrollView>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.control,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.onAction,
    fontWeight: '600',
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
  cardOverdue: {
    borderColor: theme.colors.coralInk,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
    marginBottom: 4,
  },
  cardPreview: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.muted,
    paddingTop: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personText: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.bodyFamily,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueText: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.bodyFamily,
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
  metaBox: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  sectionHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 8,
    marginTop: 8,
  },
  instructionBox: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  instructionText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.foreground,
  },
  actionSection: {
    marginTop: 12,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
