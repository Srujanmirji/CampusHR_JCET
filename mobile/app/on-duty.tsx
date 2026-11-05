import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DetailScreen } from '../components/ui/DetailScreen';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useAuth } from '../lib/auth-context';
import {
  applyOnDuty,
  cancelOnDuty,
  fetchOnDutyRequests,
  reviewOnDuty,
  uploadOnDutyCertificate,
  type MobileOnDutyMetrics,
  type MobileOnDutyRequest,
  type OnDutyCategory,
  type OnDutyStatus,
} from '../lib/on-duty-api';
import { theme } from '../lib/theme';

const CATEGORY_LABELS: Record<OnDutyCategory, string> = {
  UNIVERSITY_VALUATION: 'University Valuation',
  EXTERNAL_EXAMINER: 'External Examiner',
  CONFERENCE_SEMINAR: 'Conference / Seminar',
  FDP_WORKSHOP: 'FDP / Workshop',
  BOS_BOE_MEETING: 'BOS / BOE Meeting',
  OFFICIAL_COLLEGE_DUTY: 'Official College Duty',
  OTHER: 'Other Official Duty',
};

type ViewFilter = 'my' | 'pending' | 'all';

export default function OnDutyScreen() {
  const { user } = useAuth();
  const isApprover = user?.role === 'HOD' || user?.role === 'Principal' || user?.role === 'Super Admin' || user?.role === 'HR Admin';
  const isPrincipal = user?.role === 'Principal' || user?.role === 'Super Admin';

  const [activeTab, setActiveTab] = useState<ViewFilter>(isApprover ? 'pending' : 'my');
  const [requests, setRequests] = useState<MobileOnDutyRequest[]>([]);
  const [metrics, setMetrics] = useState<MobileOnDutyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MobileOnDutyRequest | null>(null);

  // Apply Form state
  const [category, setCategory] = useState<OnDutyCategory>('UNIVERSITY_VALUATION');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]!);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]!);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review Form state
  const [decision, setDecision] = useState<'RECOMMEND' | 'APPROVE' | 'REJECT'>('RECOMMEND');
  const [reviewNote, setReviewNote] = useState('');

  // Certificate Form state
  const [certificateUrl, setCertificateUrl] = useState('');

  const loadData = async () => {
    try {
      setError(null);
      const res = await fetchOnDutyRequests({
        view: activeTab === 'pending' ? 'pending' : activeTab === 'my' ? 'my' : undefined,
        pageSize: 50,
      });
      setRequests(res.data);
      setMetrics(res.metrics);
    } catch (err: any) {
      setError(err?.message || 'Could not load On-Duty records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApply = async () => {
    if (!title.trim() || !venue.trim() || !description.trim()) {
      alert('Please fill in title, venue, and description.');
      return;
    }
    setSubmitting(true);
    try {
      await applyOnDuty({
        category,
        title: title.trim(),
        venue: venue.trim(),
        startDate,
        endDate,
        description: description.trim(),
      });
      setShowApplyModal(false);
      setTitle('');
      setVenue('');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await reviewOnDuty(selectedRequest.id, {
        decision,
        note: reviewNote.trim() || null,
      });
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNote('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadCert = async () => {
    if (!selectedRequest || !certificateUrl.trim()) return;
    setSubmitting(true);
    try {
      await uploadOnDutyCertificate(selectedRequest.id, certificateUrl.trim());
      setShowCertModal(false);
      setSelectedRequest(null);
      setCertificateUrl('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to upload certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this pending On-Duty application?')) return;
    try {
      await cancelOnDuty(id);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Could not cancel application.');
    }
  };

  const getStatusBadge = (status: OnDutyStatus) => {
    switch (status) {
      case 'APPROVED':
        return { bg: theme.colors.mintContainer, text: theme.colors.mintInk, label: 'Approved' };
      case 'RECOMMENDED':
        return { bg: theme.colors.blueContainer, text: theme.colors.brandBlue, label: 'HOD Recommended' };
      case 'PENDING':
        return { bg: theme.colors.amberContainer, text: theme.colors.amberInk, label: 'Pending Review' };
      case 'REJECTED':
        return { bg: theme.colors.coralContainer, text: theme.colors.coralInk, label: 'Rejected' };
      case 'CANCELLED':
        return { bg: theme.colors.muted, text: theme.colors.mutedForeground, label: 'Cancelled' };
    }
  };

  const segmentOptions = isApprover
    ? ([
        { value: 'pending', label: 'Pending' },
        { value: 'my', label: 'My Applications' },
        { value: 'all', label: 'All Records' },
      ] as const)
    : ([
        { value: 'my', label: 'My Applications' },
        { value: 'all', label: 'All History' },
      ] as const);

  return (
    <DetailScreen title="Official On-Duty (OD)">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Metric summary banner */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics?.total ?? 0}</Text>
            <Text style={styles.metricLabel}>Total OD</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.amberInk }]}>
              {metrics?.pending ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.mintInk }]}>
              {metrics?.approved ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Approved</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics?.valuation ?? 0}</Text>
            <Text style={styles.metricLabel}>Valuations</Text>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            options={segmentOptions}
            value={activeTab}
            onChange={(val) => setActiveTab(val as ViewFilter)}
            label="On-Duty views"
          />
        </View>

        {/* Action Button: Apply */}
        <Pressable
          style={styles.applyButton}
          onPress={() => setShowApplyModal(true)}
          accessibilityLabel="Apply for On-Duty"
        >
          <Text style={styles.applyButtonText}>+ Apply for On-Duty</Text>
        </Pressable>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading applications...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadData} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No On-Duty Records</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'pending'
                ? 'No pending On-Duty applications awaiting review.'
                : 'You have not submitted any On-Duty applications yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((r) => {
              const statusCfg = getStatusBadge(r.status);
              const isOwn = r.employeeId === user?.employeeId;
              const canReviewThis =
                (user?.role === 'HOD' && r.status === 'PENDING' && !isOwn) ||
                (isPrincipal && (r.status === 'PENDING' || r.status === 'RECOMMENDED'));

              return (
                <View key={r.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {CATEGORY_LABELS[r.category] || r.category}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardVenue}>📍 {r.venue}</Text>

                  <View style={styles.infoRow}>
                    <Text style={styles.dateText}>
                      📅 {r.startDate} to {r.endDate}
                    </Text>
                    <Text style={styles.daysBadge}>{r.totalDays} working days</Text>
                  </View>

                  {r.employee && (
                    <Text style={styles.facultySub}>
                      Faculty: {r.employee.firstName} {r.employee.lastName} ({r.employee.employeeCode}) · {r.employee.department?.code}
                    </Text>
                  )}

                  <Text style={styles.descText} numberOfLines={2}>
                    {r.description}
                  </Text>

                  {/* Attendance Certificate Badge */}
                  {r.attendanceCertificateUrl ? (
                    <View style={styles.certBadge}>
                      <Text style={styles.certBadgeText}>✓ Valuation Certificate Uploaded</Text>
                    </View>
                  ) : null}

                  {/* Actions Bar */}
                  <View style={styles.cardActions}>
                    {canReviewThis && (
                      <Pressable
                        style={styles.reviewBtn}
                        onPress={() => {
                          setSelectedRequest(r);
                          setDecision(user?.role === 'HOD' ? 'RECOMMEND' : 'APPROVE');
                          setShowReviewModal(true);
                        }}
                      >
                        <Text style={styles.reviewBtnText}>
                          {user?.role === 'HOD' ? 'Recommend / Review' : 'Final Approval'}
                        </Text>
                      </Pressable>
                    )}

                    {isOwn && r.status === 'PENDING' && (
                      <Pressable style={styles.cancelBtn} onPress={() => handleCancel(r.id)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </Pressable>
                    )}

                    {isOwn && r.status === 'APPROVED' && !r.attendanceCertificateUrl && (
                      <Pressable
                        style={styles.certBtn}
                        onPress={() => {
                          setSelectedRequest(r);
                          setShowCertModal(true);
                        }}
                      >
                        <Text style={styles.certBtnText}>+ Upload Certificate</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODAL: APPLY FOR ON-DUTY */}
      <Modal visible={showApplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply for Official On-Duty</Text>
            <Text style={styles.modalSubtitle}>Valuation, external examiner, or academic duty.</Text>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.inputLabel}>Duty Category</Text>
              <View style={styles.pickerRow}>
                {(['UNIVERSITY_VALUATION', 'EXTERNAL_EXAMINER', 'CONFERENCE_SEMINAR', 'BOS_BOE_MEETING'] as OnDutyCategory[]).map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Duty Title / Assignment *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. VTU 5th Sem CS Board Valuation"
                placeholderTextColor={theme.colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Venue / Institution *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. KLE Tech University, Hubballi"
                placeholderTextColor={theme.colors.mutedForeground}
                value={venue}
                onChangeText={setVenue}
              />

              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.input}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>End Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Details & Order Reference *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide official appointment letter reference or details..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowApplyModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmit, submitting && styles.btnDisabled]}
                onPress={handleApply}
                disabled={submitting}
              >
                <Text style={styles.modalSubmitText}>
                  {submitting ? 'Submitting...' : 'Submit OD'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: REVIEW / APPROVE */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {user?.role === 'HOD' ? 'HOD Recommendation' : 'Principal Final Approval'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedRequest?.title} · {selectedRequest?.totalDays} working days
            </Text>

            <View style={styles.decisionRow}>
              {user?.role === 'HOD' ? (
                <>
                  <Pressable
                    style={[styles.decisionBtn, decision === 'RECOMMEND' && styles.decisionBtnActive]}
                    onPress={() => setDecision('RECOMMEND')}
                  >
                    <Text style={[styles.decisionBtnText, decision === 'RECOMMEND' && styles.decisionBtnTextActive]}>
                      ✓ Recommend
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.decisionBtn, decision === 'REJECT' && styles.decisionRejectActive]}
                    onPress={() => setDecision('REJECT')}
                  >
                    <Text style={[styles.decisionBtnText, decision === 'REJECT' && styles.decisionBtnTextActive]}>
                      ✕ Reject
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={[styles.decisionBtn, decision === 'APPROVE' && styles.decisionBtnActive]}
                    onPress={() => setDecision('APPROVE')}
                  >
                    <Text style={[styles.decisionBtnText, decision === 'APPROVE' && styles.decisionBtnTextActive]}>
                      ✓ Approve OD
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.decisionBtn, decision === 'REJECT' && styles.decisionRejectActive]}
                    onPress={() => setDecision('REJECT')}
                  >
                    <Text style={[styles.decisionBtnText, decision === 'REJECT' && styles.decisionBtnTextActive]}>
                      ✕ Reject
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            <Text style={styles.inputLabel}>Review Remarks / Comments</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add official notes or conditions..."
              placeholderTextColor={theme.colors.mutedForeground}
              multiline
              numberOfLines={3}
              value={reviewNote}
              onChangeText={setReviewNote}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowReviewModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmit, submitting && styles.btnDisabled]}
                onPress={handleReview}
                disabled={submitting}
              >
                <Text style={styles.modalSubmitText}>
                  {submitting ? 'Saving...' : 'Confirm Decision'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: UPLOAD ATTENDANCE CERTIFICATE */}
      <Modal visible={showCertModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Upload Attendance Certificate</Text>
            <Text style={styles.modalSubtitle}>Attach verification certificate issued by evaluation center.</Text>

            <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Certificate Document URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. https://campushr-docs.jcet.edu/certificates/od-valuation-01.pdf"
              placeholderTextColor={theme.colors.mutedForeground}
              value={certificateUrl}
              onChangeText={setCertificateUrl}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowCertModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmit, submitting && styles.btnDisabled]}
                onPress={handleUploadCert}
                disabled={submitting}
              >
                <Text style={styles.modalSubmitText}>
                  {submitting ? 'Uploading...' : 'Save Certificate'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  metricLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 10,
    color: theme.colors.mutedForeground,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  segmentWrapper: {
    marginBottom: theme.spacing.md,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  applyButtonText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingWrapper: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.mutedForeground,
  },
  errorBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.coralContainer,
    borderRadius: 12,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.coralInk,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  retryBtnText: {
    color: theme.colors.coralInk,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  emptySub: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.foreground,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginTop: 2,
  },
  cardVenue: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  dateText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
  },
  daysBadge: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.brandBlue,
  },
  facultySub: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
    marginTop: 4,
  },
  descText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: theme.colors.mutedForeground,
    marginTop: 6,
  },
  certBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.mintContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  certBadgeText: {
    color: theme.colors.mintInk,
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  reviewBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.muted,
  },
  cancelBtnText: {
    color: theme.colors.coralInk,
    fontSize: 12,
    fontWeight: '600',
  },
  certBtn: {
    backgroundColor: theme.colors.mintContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  certBtnText: {
    color: theme.colors.mintInk,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  modalSubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalScrollContent: {
    gap: theme.spacing.sm,
  },
  inputLabel: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: theme.colors.muted,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 11,
    color: theme.colors.foreground,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
  },
  decisionBtnActive: {
    backgroundColor: theme.colors.mintContainer,
    borderColor: theme.colors.mintInk,
  },
  decisionRejectActive: {
    backgroundColor: theme.colors.coralContainer,
    borderColor: theme.colors.coralInk,
  },
  decisionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  decisionBtnTextActive: {
    color: theme.colors.foreground,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.muted,
  },
  modalCancelText: {
    fontSize: 14,
    color: theme.colors.foreground,
    fontWeight: '500',
  },
  modalSubmit: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  modalSubmitText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
