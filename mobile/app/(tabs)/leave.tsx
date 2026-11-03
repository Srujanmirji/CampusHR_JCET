import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import {
  FacultyInitials,
  LeaveStatus,
  LeaveTypeBadge,
  OfficialDutyBadge,
  formatEntitlement,
  formatRemaining,
  getLeaveBadgeTheme,
  leaveDates,
} from '../../components/leave/LeavePresentation';
import { Input } from '../../components/ui/Input';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { LeaveApplyModal } from '../../components/leave/LeaveApplyModal';
import { LeaveDecisionModal } from '../../components/leave/LeaveDecisionModal';
import { useAuth } from '../../lib/auth-context';
import { canReadHome, campusClock, homeUnavailable } from '../../lib/home-api';
import { getSession } from '../../lib/session';
import {
  cancelLeaveRequest,
  getLeaveBalances,
  getLeaveRequests,
  getLeaveRequest,
  getLeaveTypes,
  uncertainLeaveWrite,
  type LeaveRequestDto,
} from '../../lib/leave-api';
import { CoveragePanel } from '../../components/substitution/CoveragePanel';
import { coverageUnavailable } from '../../lib/substitution-api';
import { theme } from '../../lib/theme';

export default function LeaveScreen() {
  const { user, accessToken } = useAuth();
  // Account changes discard drafts and any uncertain-action guard together.
  return (
    <LeaveRecords
      key={user?.id ?? 'signed-out'}
      user={user}
      token={accessToken}
    />
  );
}
function LeaveRecords({
  user,
  token,
}: {
  user: ReturnType<typeof useAuth>['user'];
  token: string | null;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const [showYear, setShowYear] = useState(false);
  const [search, setSearch] = useState('');
  const client = useQueryClient();
  const path = usePathname();
  const params = useLocalSearchParams<{ personal?: string }>();
  const inApprovals = path.endsWith('/approvals');
  const unavailable = homeUnavailable(user, token, 'leave.read');
  const live = !!user && !!token && !token.startsWith('demo-');
  const approvals =
    live &&
    user.role === 'HOD' &&
    user.departmentId !== null &&
    canReadHome(user, 'leave.read') &&
    canReadHome(user, 'leave.approve');
  const [tab, setTab] = useState<'mine' | 'approvals' | 'coverage'>(
    inApprovals && approvals && params.personal !== '1' ? 'approvals' : 'mine',
  );
  const canCover = !coverageUnavailable(user, token);
  const [approvalCategory, setApprovalCategory] = useState<
    'LEAVE' | 'ATTENDANCE' | 'OOD'
  >('LEAVE');
  const [approvalFilter, setApprovalFilter] = useState('PENDING');
  const [attendanceCorrections, setAttendanceCorrections] = useState([
    {
      id: 'att-corr-1',
      faculty: 'Prof. Asha Patil',
      employeeCode: 'JCET-CSE-021',
      date: '2026-10-22',
      currentRecord: '09:12 AM – Not recorded',
      requestedCorrection: '09:12 AM – 04:45 PM · Present',
      reason:
        'Evening DBMS lab session extended for VTU internal assessment viva.',
      status: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED',
    },
    {
      id: 'att-corr-2',
      faculty: 'Dr. Rahul Deshpande',
      employeeCode: 'JCET-CSE-014',
      date: '2026-10-19',
      currentRecord: 'Not recorded',
      requestedCorrection: '09:00 AM – 04:30 PM · Official Duty',
      reason: 'Deputed for VTU BoS syllabus review meeting at Belagavi.',
      status: 'APPROVED' as 'PENDING' | 'APPROVED' | 'REJECTED',
    },
  ]);
  const [year, setYear] = useState(String(campusClock().year));
  const validYear = /^20\d{2}$/.test(year) || year === '2100';
  const [filter, setFilter] = useState('ALL');
  const [apply, setApply] = useState(false);
  const [decision, setDecision] = useState<{
    request: LeaveRequestDto;
    mode: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [cancel, setCancel] = useState<LeaveRequestDto | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const types = useQuery({
    queryKey: ['leave', user?.id, 'types'],
    queryFn: () => getLeaveTypes(token),
    enabled: live && canReadHome(user, 'leave.read'),
  });
  const balances = useQuery({
    queryKey: ['leave', user?.id, 'balances', year],
    queryFn: () => getLeaveBalances(token, user!.employeeId!, Number(year)),
    enabled: !unavailable && validYear,
  });
  const mine = useQuery({
    queryKey: ['leave', user?.id, 'mine', year],
    queryFn: () =>
      getLeaveRequests(token, {
        employeeId: user!.employeeId!,
        year: Number(year),
      }),
    enabled: !unavailable && validYear,
  });
  const queue = useQuery({
    queryKey: ['leave', user?.id, 'awaiting', approvalFilter],
    queryFn: async () => {
      const records = await getLeaveRequests(
        token,
        approvalFilter === 'PENDING'
          ? { awaitingMe: true }
          : { status: approvalFilter },
      );
      if (
        records.some(
          (r) =>
            (approvalFilter === 'PENDING' &&
              r.employee.id === user?.employeeId) ||
            r.department.id !== user?.departmentId ||
            (approvalFilter === 'PENDING' &&
              (r.pendingRole !== 'HOD' || r.status !== 'PENDING')),
        )
      )
        throw new Error(
          'The approval queue returned requests outside your department or step.',
        );
      return records.filter((r) => r.employee.id !== user?.employeeId);
    },
    enabled: approvals,
  });
  const refresh = useCallback(
    () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['leave', user?.id] }),
        client.invalidateQueries({ queryKey: ['coverage', user?.id] }),
      ]),
    [client, user?.id],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => listener.remove();
  }, [refresh]);
  function changed(request?: LeaveRequestDto, submitted = false) {
    if (getSession().user?.id !== user?.id) return;
    void refresh();
    void client.invalidateQueries({ queryKey: ['home'] });
    void client.invalidateQueries({ queryKey: ['notifications'] });
    if (request)
      setNotice(
        request.status === 'PENDING'
          ? submitted
            ? `Leave request submitted. Waiting for ${request.pendingRole}.`
            : `Recommendation recorded. Waiting for ${request.pendingRole}.`
          : `Request ${request.status.toLowerCase()}.`,
      );
  }
  async function confirmCancel() {
    if (!cancel || busy.current || blocked === cancel.id) return;
    busy.current = true;
    setSending(true);
    setNotice('');
    try {
      const result = await cancelLeaveRequest(token, cancel.id);
      changed(result);
      setCancel(null);
    } catch (error) {
      if (uncertainLeaveWrite(error)) setBlocked(cancel.id);
      setNotice(
        uncertainLeaveWrite(error)
          ? 'Cancellation outcome unknown. Refresh request history before doing anything else.'
          : error instanceof Error
            ? error.message
            : 'Could not cancel request.',
      );
      void refresh();
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  async function checkCancellation() {
    if (!cancel || busy.current) return;
    busy.current = true;
    setSending(true);
    try {
      const record = await getLeaveRequest(token, cancel.id);
      if (record.employee.id !== user?.employeeId)
        throw new Error('Leave response belongs to another employee.');
      if (getSession().user?.id !== user?.id) return;
      setBlocked(null);
      if (record.status === 'CANCELLED') {
        changed(record);
        setCancel(null);
      } else {
        setCancel(record.status === 'PENDING' ? record : null);
        setNotice(
          record.status === 'PENDING'
            ? 'The request is still pending. You can try cancellation again.'
            : `Request is now ${record.status.toLowerCase()}.`,
        );
        void refresh();
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not check cancellation.',
      );
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  const activeTypes = (types.data ?? []).filter((type) => type.active);
  const records = tab === 'approvals' && approvals ? queue : mine;
  const personal = tab !== 'approvals' || !approvals;
  const visibleRecords = (records.data ?? []).filter((request) => {
    if (personal) return filter === 'ALL' || request.status === filter;
    if (
      approvalCategory === 'OOD' &&
      request.leaveType.code !== 'OOD' &&
      request.leaveType.code !== 'ODE'
    ) {
      return false;
    }
    const needle = search.trim().toLocaleLowerCase();
    return (
      !needle ||
      [
        request.employee.name,
        request.employee.employeeCode,
        request.leaveType.name,
        request.leaveType.code,
        request.department.name,
      ].some((value) => value.toLocaleLowerCase().includes(needle))
    );
  });
  const visibleCorrections = attendanceCorrections.filter((corr) => {
    if (corr.status !== approvalFilter) return false;
    const needle = search.trim().toLocaleLowerCase();
    return (
      !needle ||
      [corr.faculty, corr.employeeCode, corr.reason, corr.date].some((val) =>
        val.toLocaleLowerCase().includes(needle),
      )
    );
  });
  return (
    <ScreenContainer
      testID="leave-screen"
      refreshControl={
        <RefreshControl
          refreshing={records.isRefetching}
          onRefresh={() => void refresh()}
        />
      }
      contentContainerStyle={styles.stack}
    >
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text accessibilityRole="header" style={styles.title}>
            {tab === 'coverage'
              ? 'Class coverage'
              : personal
                ? 'Leave'
                : 'Approvals'}
          </Text>
          <Text style={styles.subtitle}>
            {tab === 'coverage'
              ? 'Keep teaching on track.'
              : personal
                ? 'Time for what matters.'
                : queue.isSuccess && approvalFilter === 'PENDING'
                  ? `${queue.data.length} ${queue.data.length === 1 ? 'request needs' : 'requests need'} your attention`
                  : 'Your department’s leave requests.'}
          </Text>
        </View>
        <Button
          variant="text"
          accessibilityLabel="Refresh leave records"
          onPress={() => void refresh()}
        >
          <Icon name="refresh" color={theme.colors.primary} />
        </Button>
      </View>
      {!live && (
        <Text style={styles.subtitle}>
          Sign in with a real account to view leave records. Demo leave actions
          are unavailable here.
        </Text>
      )}
      {(approvals || canCover) && (
        <View style={styles.navigation}>
          {approvals && (
            <Button
              variant="text"
              onPress={() => setTab(personal ? 'approvals' : 'mine')}
            >
              {personal ? 'Department approvals' : 'My leave'}
            </Button>
          )}
          {canCover && (
            <Button
              variant="text"
              onPress={() =>
                setTab(
                  tab === 'coverage'
                    ? inApprovals
                      ? 'approvals'
                      : 'mine'
                    : 'coverage',
                )
              }
            >
              {tab === 'coverage'
                ? inApprovals
                  ? 'Back to approvals'
                  : 'Back to my leave'
                : 'Class coverage'}
            </Button>
          )}
        </View>
      )}
      {tab === 'coverage' && canCover ? (
        <CoveragePanel user={user!} token={token!} />
      ) : (
        <>
          {!!notice && !cancel && (
            <View style={styles.notice}>
              <Text accessibilityLiveRegion="polite" style={styles.text}>
                {notice}
              </Text>
            </View>
          )}
          {personal ? (
            <>
              {!!unavailable && (
                <Text style={styles.subtitle}>{unavailable}</Text>
              )}
              {!unavailable && (
                <>
                  <View style={styles.balanceSection}>
                    <View style={styles.row}>
                      <Text
                        accessibilityRole="header"
                        style={[styles.sectionTitle, styles.grow]}
                      >
                        Your balances — {year}
                      </Text>
                      <Button
                        variant="text"
                        onPress={() => setShowYear(!showYear)}
                        accessibilityLabel={
                          showYear
                            ? 'Hide leave year control'
                            : 'Change leave year'
                        }
                      >
                        {showYear ? 'Done' : 'Year'}
                      </Button>
                    </View>
                    {showYear && (
                      <Input
                        label="Leave year"
                        value={year}
                        onChangeText={setYear}
                        keyboardType="number-pad"
                        error={
                          !validYear
                            ? 'Choose a year from 2000 to 2100.'
                            : undefined
                        }
                      />
                    )}
                    {!validYear && !showYear && (
                      <Text style={styles.error}>
                        Choose a year from 2000 to 2100.
                      </Text>
                    )}
                    {balances.isFetching && (
                      <Text style={styles.subtitle}>Loading balances…</Text>
                    )}
                    {balances.isError ? (
                      <Text accessibilityRole="alert" style={styles.error}>
                        Balances unavailable. {balances.error.message}
                      </Text>
                    ) : (
                      validYear &&
                      balances.isSuccess && (
                        <View style={styles.balances}>
                          {balances.data.length === 0 && (
                            <Text style={styles.subtitle}>
                              No leave balances for this year.
                            </Text>
                          )}
                          {balances.data.map((balance) => {
                            const badgeTheme = getLeaveBadgeTheme(
                              balance.leaveType.code,
                            );
                            const isOfficialDuty =
                              balance.leaveType.code === 'OOD' ||
                              balance.leaveType.code === 'ODE';
                            const isPolicyBased =
                              balance.entitled === null ||
                              balance.remaining === null;

                            return (
                              <View
                                key={balance.leaveType.id}
                                style={[
                                  styles.balance,
                                  fontScale > 1.3 && styles.balanceLarge,
                                  {
                                    borderLeftWidth: 3,
                                    borderLeftColor: badgeTheme.ink,
                                  },
                                ]}
                              >
                                <View style={styles.balanceHeader}>
                                  <LeaveTypeBadge
                                    code={balance.leaveType.code}
                                  />
                                  {isOfficialDuty && <OfficialDutyBadge />}
                                  {!balance.active && (
                                    <Text style={styles.inactiveTag}>
                                      Inactive
                                    </Text>
                                  )}
                                </View>
                                <Text style={styles.balanceName}>
                                  {balance.leaveType.name}
                                </Text>
                                <Text
                                  style={[
                                    styles.balanceValue,
                                    isPolicyBased && styles.policyValue,
                                    {
                                      color: isPolicyBased
                                        ? theme.colors.textSecondary
                                        : badgeTheme.ink,
                                    },
                                  ]}
                                >
                                  {isPolicyBased
                                    ? 'As per policy'
                                    : `${balance.remaining} remaining`}
                                </Text>
                                <View style={styles.balanceStats}>
                                  <Text style={styles.statLine}>
                                    {balance.entitled !== null
                                      ? `${balance.entitled} entitled`
                                      : 'As per policy'}
                                  </Text>
                                  <Text style={styles.statLine}>
                                    {balance.used} used · {balance.pending}{' '}
                                    pending
                                    {balance.carriedIn > 0
                                      ? ` · ${balance.carriedIn} carried`
                                      : ''}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )
                    )}
                  </View>
                  {types.isError && (
                    <Text accessibilityRole="alert" style={styles.error}>
                      Leave types unavailable. {types.error.message}
                    </Text>
                  )}
                  {canReadHome(user, 'leave.apply') && (
                    <Button
                      variant="accent"
                      disabled={!types.isSuccess || activeTypes.length === 0}
                      onPress={() => setApply(true)}
                    >
                      Apply for leave
                    </Button>
                  )}
                  {types.isSuccess && activeTypes.length === 0 && (
                    <Text style={styles.subtitle}>
                      No active leave types are available.
                    </Text>
                  )}
                  <View style={styles.requestHeading}>
                    <Text
                      accessibilityRole="header"
                      style={styles.sectionTitle}
                    >
                      Your requests
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filterScroll}
                    >
                      <View style={styles.personalFilters}>
                        <SegmentedControl
                          label="Filter your leave requests"
                          options={[
                            { value: 'ALL', label: 'All' },
                            { value: 'PENDING', label: 'Pending' },
                            { value: 'APPROVED', label: 'Approved' },
                            { value: 'REJECTED', label: 'Rejected' },
                            { value: 'CANCELLED', label: 'Cancelled' },
                          ]}
                          value={filter}
                          onChange={setFilter}
                        />
                      </View>
                    </ScrollView>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={styles.queueTools}>
              <SegmentedControl
                label="Approval category"
                options={[
                  { value: 'LEAVE', label: 'Leave' },
                  { value: 'ATTENDANCE', label: 'Attendance' },
                  { value: 'OOD', label: 'OOD' },
                ]}
                value={approvalCategory}
                onChange={(val) =>
                  setApprovalCategory(val as 'LEAVE' | 'ATTENDANCE' | 'OOD')
                }
              />
              <SegmentedControl
                label="Filter department requests"
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
                value={approvalFilter}
                onChange={setApprovalFilter}
              />
              <Input
                label="Search requests"
                placeholder="Faculty name or leave type"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          )}
          {!personal && approvals && approvalCategory === 'ATTENDANCE' ? (
            <View style={styles.requestList}>
              {visibleCorrections.length === 0 ? (
                <View style={styles.empty}>
                  <Icon
                    name="attendance"
                    color={theme.colors.mintInk}
                    size={theme.spacing.xl}
                  />
                  <Text style={styles.sectionTitle}>You’re up to date</Text>
                  <Text style={styles.subtitle}>
                    No attendance correction requests match this status.
                  </Text>
                </View>
              ) : (
                visibleCorrections.map((corr) => (
                  <View key={corr.id} style={styles.requestRow}>
                    <FacultyInitials name={corr.faculty} />
                    <View style={styles.requestBody}>
                      <View style={styles.requestMeta}>
                        <Text style={[styles.requestTitle, styles.grow]}>
                          {corr.faculty}
                        </Text>
                        <LeaveStatus status={corr.status} />
                      </View>
                      <Text style={styles.caption}>
                        CSE · {corr.employeeCode} · {corr.date}
                      </Text>
                      <Text style={styles.text}>
                        Current record: {corr.currentRecord}
                      </Text>
                      <Text style={[styles.text, { fontWeight: '600' }]}>
                        Requested correction: {corr.requestedCorrection}
                      </Text>
                      <Text style={styles.caption}>{corr.reason}</Text>
                      {corr.status === 'PENDING' && (
                        <View style={styles.rowActions}>
                          <Button
                            onPress={() => {
                              setAttendanceCorrections((prev) =>
                                prev.map((item) =>
                                  item.id === corr.id
                                    ? { ...item, status: 'APPROVED' }
                                    : item,
                                ),
                              );
                              setNotice(
                                `Approved attendance correction for ${corr.faculty}.`,
                              );
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onPress={() => {
                              setAttendanceCorrections((prev) =>
                                prev.map((item) =>
                                  item.id === corr.id
                                    ? { ...item, status: 'REJECTED' }
                                    : item,
                                ),
                              );
                              setNotice(
                                `Rejected attendance correction for ${corr.faculty}.`,
                              );
                            }}
                          >
                            Reject
                          </Button>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            ((!personal && approvals) || (!unavailable && validYear)) && (
              <View style={styles.requestList}>
                {records.isFetching && (
                  <Text style={styles.subtitle}>Loading leave requests…</Text>
                )}
                {records.isError ? (
                  <View style={styles.stack}>
                    <Text accessibilityRole="alert" style={styles.error}>
                      Requests unavailable. {records.error.message}
                    </Text>
                    <Button variant="secondary" onPress={() => void refresh()}>
                      Retry requests
                    </Button>
                  </View>
                ) : (
                  records.isSuccess && (
                  <>
                    {visibleRecords.length === 0 && (
                      <View style={styles.empty}>
                        <Icon
                          name="leave"
                          color={theme.colors.violet}
                          size={theme.spacing.xl}
                        />
                        <Text style={styles.sectionTitle}>
                          {search.trim() && !personal
                            ? 'No matching requests'
                            : personal
                              ? 'No requests here yet'
                              : 'You’re up to date'}
                        </Text>
                        <Text style={styles.subtitle}>
                          {search.trim() && !personal
                            ? 'Try a different faculty name or leave type.'
                            : personal
                              ? 'Your leave requests will appear here for this selection.'
                              : 'No department requests match this status.'}
                        </Text>
                      </View>
                    )}
                    {records.data.length === 500 && (
                      <Text style={styles.caption}>
                        Showing the newest 500 matching requests. Older records
                        may be omitted by the API.
                      </Text>
                    )}
                    {visibleRecords.map((request) => {
                      const isOfficialDuty =
                        request.leaveType.code === 'OOD' ||
                        request.leaveType.code === 'ODE';
                      return (
                        <View key={request.id} style={styles.requestRow}>
                          {!personal && (
                            <FacultyInitials name={request.employee.name} />
                          )}
                          <View style={styles.requestBody}>
                            <View style={styles.requestMeta}>
                              <LeaveTypeBadge code={request.leaveType.code} />
                              <Text style={[styles.requestTitle, styles.grow]}>
                                {personal
                                  ? request.leaveType.name
                                  : request.employee.name}
                              </Text>
                              <LeaveStatus status={request.status} />
                            </View>
                            {!personal && (
                              <Text style={styles.caption}>
                                {request.department.code} ·{' '}
                                {request.employee.employeeCode}
                              </Text>
                            )}
                            {isOfficialDuty && (
                              <View style={styles.officialDutyNote}>
                                <OfficialDutyBadge />
                                {!!request.dutyType && (
                                  <Text style={styles.dutyDetail}>
                                    {request.dutyType}
                                    {request.organisation
                                      ? ` · ${request.organisation}`
                                      : ''}
                                  </Text>
                                )}
                              </View>
                            )}
                            <Text style={styles.text}>
                              {leaveDates(request.startDate, request.endDate)} ·{' '}
                              {request.days} {request.days === 1 ? 'day' : 'days'}
                              {request.halfDay
                                ? ` · ${request.halfDay === 'FIRST' ? 'First' : 'Second'} half`
                                : ''}
                            </Text>
                            <Text style={styles.caption}>{request.reason}</Text>
                            {request.coverageRequired && (
                              <View style={styles.coverageRequiredBadge}>
                                <Text style={styles.coverageRequiredText}>
                                  Coverage required
                                </Text>
                              </View>
                            )}
                            {!!request.pendingRole && personal && (
                              <Text style={styles.caption}>
                                Awaiting {request.pendingRole}
                              </Text>
                            )}
                            <View style={styles.rowActions}>
                              {personal ? (
                                <Button
                                  variant="text"
                                  onPress={() =>
                                    router.push({
                                      pathname: '/leave/[id]',
                                      params: { id: request.id },
                                    })
                                  }
                                >
                                  View details
                                </Button>
                              ) : (
                                <Button
                                  onPress={() =>
                                    setDecision({ request, mode: 'APPROVE' })
                                  }
                                >
                                  Review
                                </Button>
                              )}
                              {personal &&
                                request.status === 'PENDING' &&
                                canReadHome(user, 'leave.cancel') && (
                                  <Button
                                    variant="text"
                                    onPress={() => setCancel(request)}
                                  >
                                    Cancel request
                                  </Button>
                                )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )
              )}
              </View>
            )
          )}
          {cancel && (
            <Modal
              visible
              transparent
              animationType={reduceMotion ? 'none' : 'fade'}
              onRequestClose={() => {
                if (!sending) setCancel(null);
              }}
            >
              <View style={styles.cancelOverlay}>
                <SafeAreaView
                  edges={['bottom']}
                  style={styles.cancelPanel}
                  accessibilityViewIsModal
                >
                  <ScrollView contentContainerStyle={styles.cancelContent}>
                    <Text style={styles.sectionTitle}>
                      Cancel leave for{' '}
                      {leaveDates(cancel.startDate, cancel.endDate)}?
                    </Text>
                    <Text style={styles.subtitle}>
                      Only a pending request can be cancelled.
                    </Text>
                    {!!notice && (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={styles.text}
                      >
                        {notice}
                      </Text>
                    )}
                    {blocked === cancel.id && (
                      <Button
                        onPress={() => void checkCancellation()}
                        disabled={sending}
                      >
                        Check cancellation status
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onPress={() => void confirmCancel()}
                      loading={sending}
                      disabled={sending || blocked === cancel.id}
                    >
                      Confirm cancellation
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={sending}
                      onPress={() => setCancel(null)}
                    >
                      Keep request
                    </Button>
                  </ScrollView>
                </SafeAreaView>
              </View>
            </Modal>
          )}
        </>
      )}
      {!!user && (
        <LeaveApplyModal
          visible={apply}
          onClose={() => setApply(false)}
          onSuccess={(request, source) => {
            if (source === 'existing') {
              changed();
              setNotice(
                `Matching leave request already recorded · ${request.status.toLowerCase()}. Review the existing record before starting another request.`,
              );
            } else changed(request, true);
          }}
          token={token}
          currentUser={{
            id: user.employeeId ?? '',
            name: user.name,
            employeeCode: user.employeeCode,
            role: user.role,
          }}
          leaveTypes={activeTypes}
        />
      )}
      <LeaveDecisionModal
        key={decision?.request.id ?? 'none'}
        visible={!!decision}
        request={decision?.request ?? null}
        mode={decision?.mode ?? 'APPROVE'}
        onClose={() => {
          setDecision(null);
          void refresh();
        }}
        onSuccess={changed}
        token={token}
        deciderName={user?.name}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  grow: { flex: 1 },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.heading,
    color: theme.colors.foreground,
  },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.mutedForeground,
  },
  sectionTitle: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.title,
    color: theme.colors.foreground,
  },
  text: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.foreground,
  },
  caption: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
  },
  error: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.errorInk,
  },
  navigation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  balanceSection: { gap: theme.spacing.section },
  balances: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.section,
    paddingBottom: theme.spacing.sm,
  },
  balance: {
    flexGrow: 1,
    flexBasis: '42%',
    gap: theme.spacing.xs,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  balanceLarge: { flexBasis: '100%' },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  balanceName: {
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  balanceValue: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  policyValue: {
    fontSize: theme.typography.body,
    fontWeight: '600',
  },
  balanceStats: {
    gap: 2,
    marginTop: theme.spacing.xs,
  },
  statLine: {
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    lineHeight: theme.typography.captionLineHeight,
  },
  inactiveTag: {
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
    fontStyle: 'italic',
  },
  officialDutyNote: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginVertical: 2,
  },
  dutyDetail: {
    fontSize: theme.typography.caption,
    color: '#0F766E',
    fontWeight: '500',
  },
  coverageRequiredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.control,
    backgroundColor: '#FEF3C7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FDE68A',
    marginTop: 2,
  },
  coverageRequiredText: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: '#B45309',
  },
  unlimited: { fontSize: theme.typography.title },
  balanceCode: {
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.violet,
  },
  requestHeading: { gap: theme.spacing.xs, paddingTop: theme.spacing.section },
  filterScroll: { flexGrow: 1 },
  personalFilters: { minWidth: theme.sizes.tapTarget * 10, flex: 1 },
  queueTools: { gap: theme.spacing.sm },
  requestList: {
    gap: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.spacing.section,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  requestBody: { flex: 1, gap: theme.spacing.sm },
  requestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  requestTitle: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  typeIcon: {
    minWidth: theme.spacing.xl,
    minHeight: theme.spacing.xl,
    backgroundColor: theme.colors.violetContainer,
    borderRadius: theme.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveType: {
    fontSize: theme.typography.caption,
    color: theme.colors.violet,
    fontWeight: '500',
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  empty: { gap: theme.spacing.md, paddingVertical: theme.spacing.xl },
  notice: {
    backgroundColor: theme.colors.blueContainer,
    borderRadius: theme.radius.field,
    padding: theme.spacing.section,
  },
  cancelPanel: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    maxHeight: '90%',
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.modal,
    borderTopRightRadius: theme.radius.modal,
  },
  cancelOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.scrim,
  },
  cancelContent: { padding: theme.spacing.page, gap: theme.spacing.section },
});
