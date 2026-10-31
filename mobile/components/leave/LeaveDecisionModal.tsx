import { useReducedMotion } from 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import {
  ApprovalPath,
  FacultyInitials,
  LeaveStatus,
  leaveDates,
} from './LeavePresentation';
import {
  decideLeaveRequest,
  uncertainLeaveWrite,
  getLeaveBalances,
  getLeaveRequests,
  getLeaveRequest,
  type LeaveRequestDto,
} from '../../lib/leave-api';
import { useAuth } from '../../lib/auth-context';
import { getSession } from '../../lib/session';
import { canReadHome } from '../../lib/home-api';
import { committedFeedback } from '../../lib/feedback';
import { theme } from '../../lib/theme';

interface LeaveDecisionModalProps {
  visible: boolean;
  request: LeaveRequestDto | null;
  mode: 'APPROVE' | 'REJECT';
  onClose: () => void;
  onSuccess: (request: LeaveRequestDto) => void;
  token: string | null;
  deciderName?: string;
}

export function LeaveDecisionModal({
  visible,
  request: suppliedRequest,
  mode,
  onClose,
  onSuccess,
  token,
  deciderName,
}: LeaveDecisionModalProps) {
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const { user } = useAuth();
  const scroll = useRef<ScrollView>(null);
  const [choice, setChoice] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const [blocked, setBlocked] = useState(false);
  const current = useQuery({
    queryKey: ['leave', user?.id, 'review-current', suppliedRequest?.id],
    queryFn: async () => {
      const record = await getLeaveRequest(token, suppliedRequest!.id);
      if (
        record.employee.id !== suppliedRequest!.employee.id ||
        record.department.id !== suppliedRequest!.department.id
      )
        throw new Error(
          'The current request could not be verified. Close and refresh the queue.',
        );
      return record;
    },
    enabled: visible && !!suppliedRequest && !!token,
    retry: false,
  });
  const request = current.data ?? suppliedRequest;
  const balances = useQuery({
    queryKey: ['leave', user?.id, 'review-balance', request?.id],
    queryFn: () =>
      getLeaveBalances(
        token,
        request!.employee.id,
        Number(request!.startDate.slice(0, 4)),
      ),
    enabled: visible && !!request,
    retry: false,
  });
  const history = useQuery({
    queryKey: ['leave', user?.id, 'review-history', request?.id],
    queryFn: async () => {
      const rows = await getLeaveRequests(token, {
        employeeId: request!.employee.id,
        year: Number(request!.startDate.slice(0, 4)),
      });
      if (
        rows.some(
          (row) =>
            row.employee.id !== request!.employee.id ||
            row.department.id !== request!.department.id,
        )
      )
        throw new Error('The request history could not be verified.');
      return rows.filter((row) => row.id !== request!.id);
    },
    enabled: visible && !!request,
    retry: false,
  });
  useEffect(() => {
    if (choice)
      requestAnimationFrame(() =>
        scroll.current?.scrollToEnd({ animated: !reduceMotion }),
      );
  }, [choice, reduceMotion]);
  if (!request) return null;
  const isReject = choice === 'REJECT';
  const canDecide =
    current.isSuccess &&
    !current.isFetching &&
    request.status === 'PENDING' &&
    request.pendingRole === 'HOD' &&
    user?.role === 'HOD' &&
    user.employeeId !== request.employee.id &&
    user.departmentId === request.department.id &&
    canReadHome(user, 'leave.approve');
  const selectedBalance = balances.data?.find(
    (balance) => balance.leaveType.id === request.leaveType.id,
  );

  async function handleConfirm() {
    if (!request || !choice || busy.current || blocked || !canDecide) return;
    setError(null);
    if (isReject && note.trim().length < 3) {
      setError('Provide a rejection reason with at least 3 characters.');
      return;
    }
    if (note.trim().length > 500) {
      setError('Keep the note within 500 characters.');
      return;
    }
    busy.current = true;
    setLoading(true);
    let writeStarted = false;
    try {
      const fresh = await current.refetch({ throwOnError: true });
      if (
        fresh.data?.status !== 'PENDING' ||
        fresh.data.pendingRole !== 'HOD'
      ) {
        setError(
          'This request has changed. Review its current status before proceeding.',
        );
        return;
      }
      if (getSession().user?.id !== user?.id)
        throw new Error(
          'Your session changed. Reopen the request before deciding.',
        );
      writeStarted = true;
      const result = await decideLeaveRequest(
        token,
        request.id,
        !isReject,
        note.trim(),
        deciderName,
      );
      committedFeedback(isReject);
      setNote('');
      onSuccess(result);
      onClose();
    } catch (err) {
      if (writeStarted && uncertainLeaveWrite(err)) {
        setBlocked(true);
        setError(
          'Decision outcome unknown. Your note is retained. Close and refresh the queue before proceeding.',
        );
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${(choice ?? mode).toLowerCase()} request.`,
      );
      void current.refetch();
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      presentationStyle="fullScreen"
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={() => {
        if (!loading) onClose();
      }}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.nav}>
              <Button
                variant="text"
                disabled={loading}
                onPress={onClose}
                accessibilityLabel="Back to leave requests"
              >
                <Icon name="back" color={theme.colors.primary} />
              </Button>
              <Text accessibilityRole="header" style={styles.navTitle}>
                Leave review
              </Text>
              <View style={styles.navSpacer} />
            </View>
            <ScrollView
              ref={scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
            >
              <View style={styles.person}>
                <FacultyInitials name={request.employee.name} />
                <View style={styles.grow}>
                  <Text style={styles.title}>{request.employee.name}</Text>
                  <Text style={styles.detail}>
                    {request.department.name} · {request.employee.employeeCode}
                  </Text>
                </View>
              </View>
              <View style={styles.leaveSummary}>
                <Icon name="leave" color={theme.colors.violet} />
                <View style={styles.grow}>
                  <Text style={styles.leaveTitle}>
                    {request.leaveType.name}
                  </Text>
                  <Text style={styles.body}>
                    {leaveDates(request.startDate, request.endDate)} ·{' '}
                    {request.days} {request.days === 1 ? 'day' : 'days'}
                    {request.halfDay
                      ? ` · ${request.halfDay === 'FIRST' ? 'First' : 'Second'} half`
                      : ''}
                  </Text>
                  <LeaveStatus status={request.status} />
                </View>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Reason</Text>
                <Text style={styles.body}>{request.reason}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Icon name="school" color={theme.colors.primary} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.sectionLabel}>Academic impact</Text>
                  <Text style={styles.detail}>
                    {request.status === 'APPROVED'
                      ? 'Final leave approval is recorded. Manage dated classes from Class coverage.'
                      : 'Coverage is arranged after final approval. An HOD recommendation does not assign a substitute.'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Icon name="document" color={theme.colors.primary} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.sectionLabel}>Leave balance</Text>
                  <Text style={styles.detail}>
                    {request.leaveType.name} · {request.startDate.slice(0, 4)}
                  </Text>
                  {balances.isPending ? (
                    <Text style={styles.detail}>Loading balance…</Text>
                  ) : balances.isError ? (
                    <>
                      <Text style={styles.detail}>
                        Balance unavailable. Review the official record before
                        deciding.
                      </Text>
                      <Button
                        variant="text"
                        onPress={() => void balances.refetch()}
                      >
                        Retry balance
                      </Button>
                    </>
                  ) : selectedBalance ? (
                    <>
                      <Text style={styles.balance}>
                        {selectedBalance.remaining === null
                          ? 'Unlimited'
                          : `${selectedBalance.remaining} days remaining`}
                      </Text>
                      <Text style={styles.detail}>
                        Used {selectedBalance.used} · Pending{' '}
                        {selectedBalance.pending} · Carried{' '}
                        {selectedBalance.carriedIn}
                        {!selectedBalance.active ? ' · Inactive type' : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.detail}>
                      No balance record is available for this leave type.
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Icon name="clock" color={theme.colors.primary} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.sectionLabel}>Recent requests</Text>
                  {history.isPending ? (
                    <Text style={styles.detail}>Loading history…</Text>
                  ) : history.isError ? (
                    <>
                      <Text style={styles.detail}>History unavailable.</Text>
                      <Button
                        variant="text"
                        onPress={() => void history.refetch()}
                      >
                        Retry history
                      </Button>
                    </>
                  ) : !history.data?.length ? (
                    <Text style={styles.detail}>
                      No other requests for this year.
                    </Text>
                  ) : (
                    <>
                      {(showAllHistory
                        ? history.data
                        : history.data.slice(0, 3)
                      ).map((row) => (
                        <View key={row.id} style={styles.historyRow}>
                          <View style={styles.grow}>
                            <Text style={styles.body}>
                              {row.leaveType.name}
                            </Text>
                            <Text style={styles.detail}>
                              {leaveDates(row.startDate, row.endDate)} ·{' '}
                              {row.days} {row.days === 1 ? 'day' : 'days'}
                            </Text>
                          </View>
                          <LeaveStatus status={row.status} />
                        </View>
                      ))}
                      {history.data.length > 3 && (
                        <Button
                          variant="text"
                          onPress={() => setShowAllHistory(!showAllHistory)}
                        >
                          {showAllHistory
                            ? 'Show recent requests'
                            : 'Show all requests'}
                        </Button>
                      )}
                      {history.data.length === 499 && (
                        <Text style={styles.detail}>
                          Older requests may be omitted by the API’s 500-record
                          limit.
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Approval path</Text>
                <ApprovalPath request={request} />
              </View>
              {current.isFetching && (
                <Text style={styles.detail}>
                  Checking current request status…
                </Text>
              )}
              {current.isError && (
                <View style={styles.section}>
                  <Text accessibilityRole="alert" style={styles.error}>
                    Current status could not be checked. {current.error.message}
                  </Text>
                  <Button
                    variant="secondary"
                    onPress={() => void current.refetch()}
                  >
                    Refresh request status
                  </Button>
                </View>
              )}
              {!!error && (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={styles.error}
                >
                  {error}
                </Text>
              )}
              {choice && canDecide && (
                <Input
                  multiline
                  maxLength={500}
                  autoCapitalize="sentences"
                  label={
                    isReject
                      ? 'Rejection reason (required)'
                      : 'Recommendation note (optional)'
                  }
                  placeholder={
                    isReject
                      ? 'Explain the reason for rejection'
                      : 'Add a note for the next reviewer'
                  }
                  value={note}
                  onChangeText={setNote}
                  disabled={loading}
                  helperText={
                    isReject
                      ? 'At least 3 characters. This reason is recorded with your decision.'
                      : 'Your note follows the request through final approval.'
                  }
                />
              )}
            </ScrollView>
            <View style={styles.footer}>
              {canDecide || loading ? (
                !choice ? (
                  <View
                    style={[
                      styles.actions,
                      fontScale > 1.2 && styles.stackedActions,
                    ]}
                  >
                    <Button
                      variant="outline"
                      onPress={() => setChoice('REJECT')}
                      disabled={loading || blocked}
                      style={[
                        styles.rejectAction,
                        fontScale > 1.2 && styles.stackedAction,
                      ]}
                    >
                      Reject
                    </Button>
                    <Button
                      onPress={() => setChoice('APPROVE')}
                      disabled={loading || blocked}
                      style={[
                        styles.grow,
                        fontScale > 1.2 && styles.stackedAction,
                      ]}
                    >
                      Recommend approval
                    </Button>
                  </View>
                ) : (
                  <>
                    <Button
                      variant={isReject ? 'danger' : 'primary'}
                      onPress={() => void handleConfirm()}
                      loading={loading}
                      disabled={loading || blocked}
                    >
                      {isReject
                        ? 'Confirm rejection'
                        : 'Confirm recommendation'}
                    </Button>
                    <Button
                      variant="text"
                      onPress={() => setChoice(null)}
                      disabled={loading}
                    >
                      Keep reviewing
                    </Button>
                  </>
                )
              ) : (
                <Button variant="secondary" onPress={onClose}>
                  Back to requests
                </Button>
              )}
              <Text style={styles.footerNote}>
                {request.status === 'PENDING'
                  ? request.pendingRole === 'HOD'
                    ? 'HOD recommendation · HR final approval follows'
                    : `Awaiting ${request.pendingRole ?? 'the next reviewer'} · Final approval is still required`
                  : `Request ${request.status.toLowerCase()}`}
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  nav: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  navSpacer: { width: theme.sizes.tapTarget },
  content: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    padding: theme.spacing.page,
    gap: theme.spacing.page,
  },
  person: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
  grow: { flex: 1, gap: theme.spacing.sm },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  body: {
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
  detail: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
  },
  leaveSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.violetContainer,
    borderRadius: theme.radius.field,
  },
  leaveTitle: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.violet,
  },
  section: { gap: theme.spacing.md },
  sectionLabel: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.page,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  infoIcon: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.blueContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.mintInk,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  error: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.errorInk,
  },
  footer: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.section,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  rejectAction: { flexGrow: 1 },
  stackedActions: { flexDirection: 'column', alignItems: 'stretch' },
  stackedAction: { flex: 0, flexGrow: 0, width: '100%' },
  footerNote: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
});
