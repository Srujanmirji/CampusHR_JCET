import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { LeaveApplyModal } from '../../components/leave/LeaveApplyModal';
import { LeaveDecisionModal } from '../../components/leave/LeaveDecisionModal';
import { useAuth } from '../../lib/auth-context';
import {
  cancelLeaveRequest,
  getLeaveBalances,
  getLeaveRequests,
  getLeaveTypes,
  type LeaveBalanceDto,
  type LeaveRequestDto,
  type LeaveTypeDto,
} from '../../lib/leave-api';
import { theme } from '../../lib/theme';

export default function LeaveScreen() {
  const { user, accessToken } = useAuth();
  const isHod = user?.role === 'HOD';

  const [activeTab, setActiveTab] = useState<'MY_LEAVES' | 'HOD_APPROVALS'>(
    isHod ? 'HOD_APPROVALS' : 'MY_LEAVES'
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [types, setTypes] = useState<LeaveTypeDto[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceDto[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequestDto[]>([]);
  const [hodPendingRequests, setHodPendingRequests] = useState<LeaveRequestDto[]>([]);

  // Filter state for My Requests
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [decisionModalConfig, setDecisionModalConfig] = useState<{
    visible: boolean;
    request: LeaveRequestDto | null;
    mode: 'APPROVE' | 'REJECT';
  }>({
    visible: false,
    request: null,
    mode: 'APPROVE',
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [fetchedTypes, fetchedBalances, allRequests] = await Promise.all([
        getLeaveTypes(accessToken),
        getLeaveBalances(accessToken, user?.employeeId || undefined),
        getLeaveRequests(accessToken),
      ]);

      setTypes(fetchedTypes);
      setBalances(fetchedBalances);

      // Separate personal requests and HOD department approvals
      if (isHod) {
        const myEmpId = user?.employeeId || user?.id;
        const pendingForHod = allRequests.filter(
          (r) =>
            r.status === 'PENDING' &&
            r.pendingRole === 'HOD' &&
            r.employee.id !== myEmpId &&
            r.employee.id !== user?.id
        );
        setHodPendingRequests(pendingForHod);
        setMyRequests(
          allRequests.filter(
            (r) =>
              r.employee.id === myEmpId ||
              r.employee.id === user?.id ||
              (!!user?.employeeCode &&
                r.employee.employeeCode.trim().toLowerCase() === user.employeeCode.trim().toLowerCase())
          )
        );
      } else {
        setMyRequests(allRequests);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [accessToken, user?.role]);

  async function handleCancelRequest(request: LeaveRequestDto) {
    Alert.alert(
      'Cancel Leave Request',
      `Are you sure you want to cancel your ${request.leaveType.name} request for ${request.startDate}?`,
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelLeaveRequest(accessToken, request.id);
              await loadData();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel request.');
            }
          },
        },
      ]
    );
  }

  const filteredMyRequests = myRequests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <ScreenContainer>
      {/* Page Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Leave Management</Text>
          <Text style={styles.pageSubtitle}>
            {isHod ? 'Department Approvals & Personal Quotas' : 'JCET Faculty Leave Portal'}
          </Text>
        </View>

        <Pressable onPress={loadData} style={styles.refreshBtn} accessibilityLabel="Refresh leave data">
          <Text style={styles.refreshBtnText}>↻</Text>
        </Pressable>
      </View>

      {/* Role Segments for HOD */}
      {isHod && (
        <View style={styles.tabSegments}>
          <Pressable
            onPress={() => setActiveTab('HOD_APPROVALS')}
            style={[styles.segmentBtn, activeTab === 'HOD_APPROVALS' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, activeTab === 'HOD_APPROVALS' && styles.segmentTextActive]}>
              Department Approvals
            </Text>
            {hodPendingRequests.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{hodPendingRequests.length}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('MY_LEAVES')}
            style={[styles.segmentBtn, activeTab === 'MY_LEAVES' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, activeTab === 'MY_LEAVES' && styles.segmentTextActive]}>
              My Leave Records
            </Text>
          </Pressable>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>Loading leave balances and history…</Text>
        </View>
      ) : activeTab === 'HOD_APPROVALS' ? (
        /* =================== HOD APPROVALS VIEW =================== */
        <View style={styles.tabContent}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Requests Awaiting Recommendation</Text>
            <Badge
              label={`${hodPendingRequests.length} Pending`}
              variant={hodPendingRequests.length > 0 ? 'warning' : 'secondary'}
            />
          </View>

          {hodPendingRequests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>
                There are no pending leave requests from department faculty waiting for your decision.
              </Text>
            </Card>
          ) : (
            hodPendingRequests.map((req) => (
              <Card key={req.id} style={styles.approvalCard}>
                <View style={styles.approvalHeader}>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>{req.employee.name}</Text>
                    <Text style={styles.applicantCode}>
                      {req.employee.employeeCode} · {req.department.code} Dept.
                    </Text>
                  </View>
                  <Badge label="PENDING HOD" variant="warning" />
                </View>

                <View style={styles.leaveDetailsBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{req.leaveType.name} ({req.leaveType.code})</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>
                      {req.startDate} {req.startDate !== req.endDate ? `to ${req.endDate}` : ''} ({req.days} {req.days === 1 ? 'day' : 'days'})
                    </Text>
                  </View>
                  {req.halfDay && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Session:</Text>
                      <Text style={styles.detailValue}>{req.halfDay} Half</Text>
                    </View>
                  )}
                  <View style={styles.reasonBlock}>
                    <Text style={styles.reasonHeading}>Faculty Reason:</Text>
                    <Text style={styles.reasonBody}>"{req.reason}"</Text>
                  </View>
                </View>

                {/* HOD Action Buttons */}
                <View style={styles.approvalActionsRow}>
                  <Button
                    variant="danger"
                    onPress={() =>
                      setDecisionModalConfig({
                        visible: true,
                        request: req,
                        mode: 'REJECT',
                      })
                    }
                    style={styles.decisionBtn}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    onPress={() =>
                      setDecisionModalConfig({
                        visible: true,
                        request: req,
                        mode: 'APPROVE',
                      })
                    }
                    style={styles.decisionBtn}
                  >
                    Approve Request
                  </Button>
                </View>
              </Card>
            ))
          )}
        </View>
      ) : (
        /* =================== FACULTY / MY LEAVES VIEW =================== */
        <View style={styles.tabContent}>
          {/* Leave Balances Carousel / Grid */}
          <Text style={styles.sectionTitle}>Available Leave Balances ({new Date().getFullYear()})</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceScroll}>
            {balances.map((b) => (
              <Card key={b.leaveType.id} style={styles.balanceCard}>
                <View style={styles.balanceCardHeader}>
                  <Text style={styles.balanceCode}>{b.leaveType.code}</Text>
                  <Badge label="Active" variant="secondary" />
                </View>
                <Text style={styles.balanceName} numberOfLines={1}>
                  {b.leaveType.name}
                </Text>
                <Text style={styles.balanceRemaining}>{b.remaining ?? '∞'}</Text>
                <Text style={styles.balanceMeta}>
                  {b.entitled !== null ? `Entitled: ${b.entitled} · Used: ${b.used}` : 'No limit quota'}
                </Text>
              </Card>
            ))}
          </ScrollView>

          {/* Primary Action Button */}
          <Button
            variant="primary"
            onPress={() => setShowApplyModal(true)}
            style={styles.applyBtn}
          >
            + Apply for New Leave
          </Button>

          {/* Request History Section */}
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionTitle}>My Leave Applications</Text>
            {/* Filter Tabs */}
            <View style={styles.filterPills}>
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  style={[styles.filterPill, statusFilter === filter && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, statusFilter === filter && styles.filterPillTextActive]}>
                    {filter === 'ALL' ? 'All' : filter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {filteredMyRequests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Leave Applications Found</Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === 'ALL'
                  ? 'You have not submitted any leave requests yet.'
                  : `You have no leave requests with status ${statusFilter}.`}
              </Text>
            </Card>
          ) : (
            filteredMyRequests.map((req) => {
              const statusVariant =
                req.status === 'APPROVED'
                  ? 'success'
                  : req.status === 'PENDING'
                  ? 'warning'
                  : req.status === 'REJECTED'
                  ? 'default'
                  : 'secondary';

              return (
                <Card key={req.id} style={styles.requestCard}>
                  <View style={styles.requestCardHeader}>
                    <View>
                      <Text style={styles.requestType}>{req.leaveType.name} ({req.leaveType.code})</Text>
                      <Text style={styles.requestDates}>
                        {req.startDate} {req.startDate !== req.endDate ? `to ${req.endDate}` : ''} ({req.days} {req.days === 1 ? 'day' : 'days'})
                      </Text>
                    </View>
                    <Badge label={req.status} variant={statusVariant} />
                  </View>

                  <View style={styles.requestBody}>
                    <Text style={styles.requestReasonLabel}>Reason:</Text>
                    <Text style={styles.requestReasonText}>"{req.reason}"</Text>
                  </View>

                  {/* Decision Remarks from Approver */}
                  {req.decisions.length > 0 && (
                    <View style={styles.decisionsList}>
                      {req.decisions.map((dec, idx) => (
                        <View key={idx} style={styles.decisionItem}>
                          <Text style={styles.decisionAuthor}>
                            {dec.role} Decision: {dec.approved ? '✓ Approved' : '✕ Rejected'}
                          </Text>
                          {dec.note && <Text style={styles.decisionNote}>"{dec.note}"</Text>}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Cancel Button if Still Pending */}
                  {req.status === 'PENDING' && (
                    <View style={styles.requestFooter}>
                      <Text style={styles.pendingHint}>Waiting for: {req.pendingRole || 'HOD'}</Text>
                      <Pressable
                        onPress={() => handleCancelRequest(req)}
                        style={styles.cancelRequestBtn}
                      >
                        <Text style={styles.cancelRequestText}>Cancel Request</Text>
                      </Pressable>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* Leave Application Modal */}
      <LeaveApplyModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={loadData}
        token={accessToken}
        currentUser={{
          id: user?.employeeId || user?.id || 'demo-faculty-021',
          name: user?.name || 'Prof. Asha Patil',
          employeeCode: user?.employeeCode || 'JCET-CSE-021',
          role: user?.role || 'FACULTY',
        }}
        leaveTypes={types}
      />

      {/* HOD Decision Modal */}
      <LeaveDecisionModal
        visible={decisionModalConfig.visible}
        request={decisionModalConfig.request}
        mode={decisionModalConfig.mode}
        onClose={() =>
          setDecisionModalConfig({
            visible: false,
            request: null,
            mode: 'APPROVE',
          })
        }
        onSuccess={loadData}
        token={accessToken}
        deciderName={user?.name}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.section,
  },
  pageTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    color: theme.colors.primary,
  },
  pageSubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 18,
    color: theme.colors.primary,
  },
  tabSegments: {
    flexDirection: 'row',
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.control,
    padding: 4,
    marginBottom: theme.spacing.section,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.control - 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  segmentText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  segmentTextActive: {
    fontFamily: theme.typography.headingFamily,
    color: theme.colors.primary,
  },
  countBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: theme.colors.surface,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: theme.radius.control,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.section,
  },
  errorText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.error,
  },
  loaderCenter: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loaderText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  tabContent: {
    gap: theme.spacing.section,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.title,
    color: theme.colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceScroll: {
    gap: theme.spacing.md,
    paddingVertical: 4,
  },
  balanceCard: {
    width: 155,
    padding: theme.spacing.md,
    gap: 2,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceCode: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.primary,
  },
  balanceName: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
  balanceRemaining: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 26,
    color: theme.colors.foreground,
    marginVertical: 4,
  },
  balanceMeta: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  applyBtn: {
    marginVertical: theme.spacing.xs,
  },
  historyHeaderRow: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  filterPills: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.muted,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
  },
  filterPillText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  filterPillTextActive: {
    fontFamily: theme.typography.headingFamily,
    color: theme.colors.surface,
  },
  emptyCard: {
    padding: theme.spacing.page,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.primary,
  },
  emptySubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  approvalCard: {
    padding: theme.spacing.section,
    gap: theme.spacing.md,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  applicantInfo: {
    gap: 2,
  },
  applicantName: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  applicantCode: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  leaveDetailsBox: {
    backgroundColor: '#F8FAFC',
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  reasonBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  reasonHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  reasonBody: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
    fontStyle: 'italic',
    marginTop: 2,
  },
  approvalActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  decisionBtn: {
    flex: 1,
  },
  requestCard: {
    padding: theme.spacing.section,
    gap: theme.spacing.sm,
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestType: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
  },
  requestDates: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
  requestBody: {
    backgroundColor: '#F8FAFC',
    padding: theme.spacing.sm,
    borderRadius: 6,
  },
  requestReasonLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10,
    color: theme.colors.mutedForeground,
  },
  requestReasonText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
    fontStyle: 'italic',
    marginTop: 1,
  },
  decisionsList: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  decisionItem: {
    gap: 2,
  },
  decisionAuthor: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
  },
  decisionNote: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.foreground,
    fontStyle: 'italic',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pendingHint: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11,
    color: theme.colors.accent,
  },
  cancelRequestBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelRequestText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11,
    color: theme.colors.error,
  },
});
