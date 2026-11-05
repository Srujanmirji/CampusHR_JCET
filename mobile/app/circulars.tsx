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
import { Skeleton } from '../components/ui/Skeleton';
import { Alert } from '../lib/dialogs';
import { useAuth } from '../lib/auth-context';
import { theme } from '../lib/theme';
import {
  acknowledgeCircular,
  createCircular,
  fetchCircularById,
  fetchCirculars,
  type CircularCategory,
  type CircularPriority,
  type MobileCircular,
} from '../lib/circulars-api';

const CATEGORY_TABS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All Notices' },
  { key: 'URGENT', label: 'Urgent' },
  { key: 'ACADEMIC', label: 'Academic' },
  { key: 'VTU_NOTIFICATION', label: 'VTU' },
  { key: 'ADMINISTRATIVE', label: 'Admin' },
  { key: 'EXAMINATION', label: 'Exams' },
  { key: 'HOLIDAY', label: 'Holidays' },
  { key: 'EVENT', label: 'Events' },
];

export default function CircularsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCircular, setActiveCircular] = useState<MobileCircular | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<CircularCategory>('ADMINISTRATIVE');
  const [newPriority, setNewPriority] = useState<CircularPriority>('NORMAL');
  const [newAudience, setNewAudience] = useState<'ALL' | 'TEACHING_ONLY' | 'NON_TEACHING_ONLY'>('ALL');

  const canManage =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'HR_ADMIN' ||
    user?.role === 'PRINCIPAL';

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['circulars', selectedCategory, searchQuery],
    queryFn: () =>
      fetchCirculars({
        category: selectedCategory || undefined,
        search: searchQuery.trim() || undefined,
        pageSize: 100,
      }),
  });

  const circulars = data?.data || [];
  const unreadCount = circulars.filter((c) => !c.hasRead).length;
  const urgentCount = circulars.filter((c) => c.priority === 'URGENT' || c.priority === 'HIGH').length;

  const ackMutation = useMutation({
    mutationFn: (id: string) => acknowledgeCircular(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ['circulars'] });
      setActiveCircular((prev) => (prev && prev.id === id ? { ...prev, hasRead: true } : prev));
      Alert.alert('Notice Acknowledged', 'Your read receipt has been submitted to JCET administration.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to acknowledge circular.');
    },
  });

  const createMutation = useMutation({
    mutationFn: createCircular,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['circulars'] });
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      Alert.alert('Success', 'Digital Circular published to institutional notice board.');
    },
    onError: (err: any) => {
      Alert.alert('Publication Failed', err.message || 'Could not publish circular.');
    },
  });

  const openCircularDetail = async (c: MobileCircular) => {
    setActiveCircular(c);
    try {
      // Backend automatically records read receipt on fetching detail
      const full = await fetchCircularById(c.id);
      setActiveCircular(full);
      void queryClient.invalidateQueries({ queryKey: ['circulars'] });
    } catch {
      // Keep displaying the current item
    }
  };

  const getPriorityColors = (p: CircularPriority) => {
    switch (p) {
      case 'URGENT':
        return { bg: theme.colors.coralContainer, text: theme.colors.coralInk };
      case 'HIGH':
        return { bg: theme.colors.amberContainer, text: theme.colors.amberInk };
      default:
        return { bg: theme.colors.muted, text: theme.colors.textSecondary };
    }
  };

  const getCategoryColors = (cat: CircularCategory) => {
    switch (cat) {
      case 'ACADEMIC':
      case 'VTU_NOTIFICATION':
        return { bg: theme.colors.blueContainer, text: theme.colors.brandBlue };
      case 'HOLIDAY':
        return { bg: theme.colors.mintContainer, text: theme.colors.mintInk };
      case 'EXAMINATION':
        return { bg: theme.colors.violetContainer, text: theme.colors.violet };
      default:
        return { bg: theme.colors.muted, text: theme.colors.foreground };
    }
  };

  return (
    <ScreenContainer
      testID="circulars-screen"
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
              Digital Circulars
            </Text>
            <Text style={styles.subtitle}>
              Institutional notice board & official orders
            </Text>
          </View>
          {canManage && (
            <Button
              variant="accent"
              onPress={() => setShowCreateModal(true)}
            >
              + Publish
            </Button>
          )}
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{circulars.length}</Text>
          <Text style={styles.metricLabel}>Total Notices</Text>
        </View>
        <View style={[styles.metricCard, unreadCount > 0 && styles.metricAccentCard]}>
          <Text
            style={[
              styles.metricValue,
              unreadCount > 0 && { color: theme.colors.brandOrange },
            ]}
          >
            {unreadCount}
          </Text>
          <Text style={styles.metricLabel}>Unread Notices</Text>
        </View>
        <View style={styles.metricCard}>
          <Text
            style={[
              styles.metricValue,
              urgentCount > 0 && { color: theme.colors.coralInk },
            ]}
          >
            {urgentCount}
          </Text>
          <Text style={styles.metricLabel}>High / Urgent</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="document" color={theme.colors.mutedForeground} size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search circulars by title, number or topic..."
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

      {/* Category Filter Pills */}
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

      {/* Notices List */}
      {isLoading ? (
        <View style={styles.loaderArea}>
          <Skeleton label="Loading digital circulars..." />
        </View>
      ) : isError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Could not load circulars</Text>
          <Text style={styles.emptySubtitle}>
            Please check connection to JCET network.
          </Text>
          <Button variant="secondary" onPress={() => void refetch()} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </View>
      ) : circulars.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="document" color={theme.colors.mutedForeground} size={36} />
          <Text style={styles.emptyTitle}>No circulars found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'There are no notices published in this category yet.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listArea}>
          {circulars.map((circ) => {
            const pColors = getPriorityColors(circ.priority);
            const cColors = getCategoryColors(circ.category);
            const pubDate = new Date(circ.publishedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <Pressable
                key={circ.id}
                onPress={() => void openCircularDetail(circ)}
                style={({ pressed }) => [
                  styles.card,
                  !circ.hasRead && styles.cardUnread,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: pColors.bg }]}>
                      <Text style={[styles.badgeText, { color: pColors.text }]}>
                        {circ.priority}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: cColors.bg }]}>
                      <Text style={[styles.badgeText, { color: cColors.text }]}>
                        {circ.category.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.circNumber}>{circ.circularNumber}</Text>
                </View>

                <Text style={styles.cardTitle}>{circ.title}</Text>
                <Text numberOfLines={2} style={styles.cardPreview}>
                  {circ.content}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.dateRow}>
                    <Icon name="timetable" color={theme.colors.textSecondary} size={14} />
                    <Text style={styles.dateText}>{pubDate}</Text>
                    <Text style={styles.dotSeparator}>·</Text>
                    <Text style={styles.audienceText}>
                      {circ.targetAudience.replace('_', ' ')}
                    </Text>
                  </View>

                  {circ.hasRead ? (
                    <View style={styles.readBadge}>
                      <Icon name="check" color={theme.colors.mintInk} size={12} />
                      <Text style={styles.readText}>Acknowledged</Text>
                    </View>
                  ) : (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>Tap to review</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Reader / Detail Modal */}
      <Modal
        visible={!!activeCircular}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveCircular(null)}
      >
        {activeCircular && (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalRefText}>
                  {activeCircular.circularNumber}
                </Text>
                <Text style={styles.modalTitle}>{activeCircular.title}</Text>
              </View>
              <Pressable
                onPress={() => setActiveCircular(null)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" color={theme.colors.foreground} size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Published</Text>
                  <Text style={styles.metaValue}>
                    {new Date(activeCircular.publishedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Category</Text>
                  <Text style={styles.metaValue}>
                    {activeCircular.category.replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Priority</Text>
                  <Text style={styles.metaValue}>{activeCircular.priority}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Target Audience</Text>
                  <Text style={styles.metaValue}>
                    {activeCircular.targetAudience.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.noticeBodyLabel}>Notice Content</Text>
              <View style={styles.noticeBodyBox}>
                <Text style={styles.noticeBodyText}>{activeCircular.content}</Text>
              </View>

              {!!activeCircular.attachmentUrl && (
                <View style={styles.attachmentBox}>
                  <Icon name="document" color={theme.colors.primary} size={20} />
                  <View style={styles.grow}>
                    <Text style={styles.attachmentName}>
                      {activeCircular.attachmentName || 'Circular Attachment'}
                    </Text>
                    <Text style={styles.attachmentDetail}>Official PDF Notice</Text>
                  </View>
                </View>
              )}

              <View style={styles.complianceBox}>
                {activeCircular.hasRead ? (
                  <View style={styles.acknowledgedRow}>
                    <Icon name="check" color={theme.colors.mintInk} size={20} />
                    <View style={styles.grow}>
                      <Text style={styles.ackHeading}>Acknowledged</Text>
                      <Text style={styles.ackDetail}>
                        Your compliance receipt has been officially recorded.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Button
                    variant="accent"
                    onPress={() => ackMutation.mutate(activeCircular.id)}
                    loading={ackMutation.isPending}
                  >
                    Acknowledge Notice
                  </Button>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Publish Modal (Admin / Principal) */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.grow}>
              <Text style={styles.modalTitle}>Publish Digital Circular</Text>
              <Text style={styles.modalRefText}>
                Official JCET Institutional Notice
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
            <Text style={styles.formLabel}>Circular Title *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Schedule for VTU Theory Examinations"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.chipRow}>
              {(['ADMINISTRATIVE', 'ACADEMIC', 'VTU_NOTIFICATION', 'EXAMINATION', 'HOLIDAY', 'URGENT'] as CircularCategory[]).map((c) => (
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
              {(['NORMAL', 'HIGH', 'URGENT'] as CircularPriority[]).map((p) => (
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

            <Text style={styles.formLabel}>Target Audience</Text>
            <View style={styles.chipRow}>
              {(['ALL', 'TEACHING_ONLY', 'NON_TEACHING_ONLY'] as const).map((a) => (
                <Pressable
                  key={a}
                  onPress={() => setNewAudience(a)}
                  style={[styles.formChip, newAudience === a && styles.formChipActive]}
                >
                  <Text style={[styles.formChipText, newAudience === a && styles.formChipTextActive]}>
                    {a.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>Notice Content *</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Enter full notice directives, guidelines or dates..."
              multiline
              numberOfLines={6}
              value={newContent}
              onChangeText={setNewContent}
            />

            <Button
              variant="accent"
              style={{ marginTop: 20 }}
              loading={createMutation.isPending}
              onPress={() => {
                if (!newTitle.trim() || !newContent.trim()) {
                  Alert.alert('Incomplete Form', 'Please provide both title and notice content.');
                  return;
                }
                createMutation.mutate({
                  title: newTitle.trim(),
                  content: newContent.trim(),
                  category: newCategory,
                  priority: newPriority,
                  targetAudience: newAudience,
                  isPublished: true,
                });
              }}
            >
              Publish Circular
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
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricAccentCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderColor: theme.colors.brandOrange,
  },
  metricValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  metricLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
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
  cardUnread: {
    borderColor: theme.colors.brandOrange,
    backgroundColor: '#FFFCFA',
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
  circNumber: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: theme.colors.textSecondary,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.bodyFamily,
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: theme.colors.mutedForeground,
  },
  audienceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.bodyFamily,
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.mintContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  readText: {
    fontSize: 11,
    color: theme.colors.mintInk,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: theme.colors.amberContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadText: {
    fontSize: 11,
    color: theme.colors.amberInk,
    fontWeight: '600',
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
  noticeBodyLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  noticeBodyBox: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  noticeBodyText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.foreground,
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    padding: 12,
    marginBottom: 16,
  },
  attachmentName: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  attachmentDetail: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  complianceBox: {
    marginTop: 8,
  },
  acknowledgedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.mintContainer,
    padding: 14,
    borderRadius: theme.radius.control,
  },
  ackHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '700',
    color: theme.colors.mintInk,
  },
  ackDetail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: theme.colors.mintInk,
    marginTop: 2,
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
    height: 120,
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
