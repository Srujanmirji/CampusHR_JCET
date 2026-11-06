import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DateField } from '../../components/ui/DateField';
import { Icon } from '../../components/ui/Icon';
import {
  AttendanceMonth,
  attendanceStatus,
} from '../../components/attendance/AttendanceMonth';
import {
  createCorrectionIntent,
  matchesCorrectionIntent,
  type CorrectionIntent,
} from '../../components/attendance/correction-recovery';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import { ApiError, getSession } from '../../lib/session';
import { homeUnavailable } from '../../lib/home-api';
import {
  attendanceDay,
  cancelAttendanceCorrection,
  correctionInputSchema,
  getAttendanceCorrections,
  getAttendanceHistory,
  getAttendancePolicy,
  getAttendanceToday,
  punchAttendance,
  recordedDuration,
  requestAttendanceCorrection,
  shiftMonth,
  statuses,
  uncertainWrite,
  type Correction,
  type CorrectionInput,
} from '../../lib/attendance-api';
import { committedFeedback } from '../../lib/feedback';
import { WebTopbar } from '../../components/layout/WebTopbar';
import { WebPageHeader } from '../../components/shared/WebPageHeader';
import { WebMetricCard } from '../../components/shared/WebMetricCard';
import { theme } from '../../lib/theme';

const displayTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-GB', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not recorded';

const messageOf = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.code === 'ALREADY_REQUESTED') {
      return 'A pending correction request already exists for this date. Check your requests list below.';
    }
    if (error.code === 'CONFLICTING_SCHEDULE') {
      return (
        error.message ||
        'Cannot request attendance regularisation on a date with an approved leave or On-Duty schedule.'
      );
    }
    return error.message;
  }
  return error instanceof Error
    ? error.name === 'ZodError'
      ? 'The server returned an unexpected response. Refresh or contact HR.'
      : error.message
    : 'Unable to finish. Check your connection.';
};

function ReadState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (error)
    return (
      <View style={[styles.stack, styles.readState]}>
        <Text accessibilityRole="alert" style={styles.error}>
          {messageOf(error)}
        </Text>
        <Button variant="outline" onPress={retry}>
          Retry
        </Button>
      </View>
    );
  if (pending)
    return (
      <View style={[styles.row, styles.readState]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.detail}>Loading…</Text>
      </View>
    );
  return null;
}

export default function AttendanceTab() {
  const { user, accessToken } = useAuth();
  const client = useQueryClient();
  const [day, setDay] = useState(attendanceDay);
  const [month, setMonth] = useState(() => attendanceDay().slice(0, 7));
  const [page, setPage] = useState(1);
  const [correctionFormOpen, setCorrectionFormOpen] = useState(false);
  const [focusedStatus, setFocusedStatus] = useState<string | null>(null);
  const [correctionIssue, setCorrectionIssue] = useState<
    'Missed check-in' | 'Missed check-out' | 'Incorrect time' | 'Other'
  >('Missed check-in');
  const [correctionAttachment, setCorrectionAttachment] = useState<
    string | null
  >(null);
  const [form, setForm] = useState<CorrectionInput>({
    date: day,
    checkIn: '',
    checkOut: '',
    requestedStatus: 'PRESENT',
    reason: '',
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<
    'punch' | 'correction' | 'correction-check' | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [punchBlocked, setPunchBlocked] = useState(false);
  const [uncertainCorrection, setUncertainCorrection] =
    useState<CorrectionIntent | null>(null);
  const [existingCorrection, setExistingCorrection] =
    useState<Correction | null>(null);
  const [correctionRecovery, setCorrectionRecovery] = useState<string | null>(
    null,
  );
  const [cancellingCorrectionId, setCancellingCorrectionId] = useState<
    string | null
  >(null);
  const blockedCorrectionFingerprints = useRef(new Set<string>());
  const ownUncertainCorrection =
    uncertainCorrection?.employeeId === user?.employeeId
      ? uncertainCorrection
      : null;
  const ownExistingCorrection =
    existingCorrection?.employeeId === user?.employeeId
      ? existingCorrection
      : null;
  const correctionBlocked = !!ownUncertainCorrection || !!ownExistingCorrection;
  const sending = useRef(false);
  const unavailable = homeUnavailable(user, accessToken, 'attendance.read');
  const punchUnavailable = homeUnavailable(
    user,
    accessToken,
    'attendance.check_in',
  );
  const correctionUnavailable = homeUnavailable(
    user,
    accessToken,
    'attendance_correction.request',
  );
  const key = ['attendance', user?.id];

  const today = useQuery({
    queryKey: [...key, 'today', day],
    queryFn: () => getAttendanceToday(user, accessToken, day),
    enabled: !unavailable,
    retry: false,
    staleTime: 30_000,
  });

  const history = useQuery({
    queryKey: [...key, 'history', month],
    queryFn: () => getAttendanceHistory(user, accessToken, month),
    enabled: !unavailable,
    retry: false,
    staleTime: 30_000,
  });

  const corrections = useQuery({
    queryKey: [...key, 'corrections', page],
    queryFn: () => getAttendanceCorrections(user, accessToken, page),
    enabled: !unavailable,
    retry: false,
    staleTime: 30_000,
  });

  const policy = useQuery({
    queryKey: [...key, 'policy'],
    queryFn: () => getAttendancePolicy(user, accessToken),
    enabled: !unavailable,
    retry: false,
    staleTime: 30_000,
  });

  const refresh = useCallback(() => {
    setDay(attendanceDay());
    void client.invalidateQueries({ queryKey: ['attendance', user?.id] });
    void client.invalidateQueries({
      queryKey: ['home', user?.id, 'attendance'],
    });
  }, [client, user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const interval = setInterval(() => setDay(attendanceDay()), 60_000);
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      listener.remove();
    };
  }, [refresh]);

  const record = today.data;

  async function punch() {
    if (
      sending.current ||
      punchBlocked ||
      !today.isSuccess ||
      !policy.isSuccess ||
      today.isFetching ||
      record?.checkOut
    )
      return;
    sending.current = true;
    setPending('punch');
    setFeedback(null);
    setWriteError(null);
    const action = record?.checkIn ? 'CHECK_OUT' : 'CHECK_IN';
    try {
      const result = await punchAttendance(user, accessToken, action, day);
      if (getSession().user?.id !== user?.id) return;
      committedFeedback();
      client.setQueryData([...key, 'today', day], result);
      setFeedback(
        action === 'CHECK_IN'
          ? 'Check-in recorded by the server.'
          : 'Check-out recorded by the server.',
      );
      refresh();
    } catch (error) {
      setWriteError(
        uncertainWrite(error)
          ? 'Punch not confirmed. Refresh the recorded state before taking another attendance action.'
          : messageOf(error),
      );
      setPunchBlocked(true);
      refresh();
    } finally {
      sending.current = false;
      setPending(null);
    }
  }

  async function reconcilePunch() {
    const result = await today.refetch();
    if (!result.isError) {
      setPunchBlocked(false);
      setWriteError(null);
      setFeedback(
        'Attendance rechecked. Review the recorded times before choosing your next action.',
      );
    }
  }

  async function submitCorrection() {
    if (
      sending.current ||
      correctionBlocked ||
      correctionUnavailable ||
      !user?.employeeId
    )
      return;
    const parsed = correctionInputSchema.safeParse(form);
    if (!parsed.success) {
      setFields(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      return;
    }
    const submitted = parsed.data;
    const fingerprint = `${submitted.date}|${submitted.checkIn}|${submitted.checkOut}|${submitted.requestedStatus}|${submitted.reason.trim()}`;
    if (blockedCorrectionFingerprints.current.has(fingerprint)) {
      setWriteError(
        'A matching correction submission previously failed or remains uncertain. Review your pending requests before submitting these details again.',
      );
      return;
    }
    sending.current = true;
    setPending('correction');
    setFeedback(null);
    setWriteError(null);
    setCorrectionRecovery(null);
    try {
      const result = await requestAttendanceCorrection(
        user,
        accessToken,
        submitted,
      );
      if (getSession().user?.id !== user?.id) return;
      committedFeedback();
      setFeedback(
        'Correction request received. It is pending review by HR/HOD.',
      );
      setForm({
        date: attendanceDay(),
        checkIn: '',
        checkOut: '',
        requestedStatus: 'PRESENT',
        reason: '',
      });
      setFields({});
      setCorrectionFormOpen(false);
      setPage(1);
      client.setQueryData([...key, 'corrections', 1], (current: any) =>
        current
          ? {
              ...current,
              data: [
                result,
                ...current.data.filter((item: Correction) => item.id !== result.id),
              ],
            }
          : current,
      );
      refresh();
    } catch (error) {
      if (getSession().user?.id !== user?.id) return;
      blockedCorrectionFingerprints.current.add(fingerprint);
      if (uncertainWrite(error)) {
        setUncertainCorrection(
          createCorrectionIntent(user.employeeId, submitted),
        );
        setWriteError(
          'Submission not confirmed. Check correction requests before trying again.',
        );
      } else {
        setWriteError(messageOf(error));
      }
      refresh();
    } finally {
      sending.current = false;
      setPending(null);
    }
  }

  async function checkCorrections() {
    if (sending.current || !ownUncertainCorrection) return;
    sending.current = true;
    setPending('correction-check');
    setCorrectionRecovery(null);
    try {
      const result = await getAttendanceCorrections(user, accessToken, 1);
      if (getSession().user?.id !== user?.id) return;
      client.setQueryData([...key, 'corrections', 1], result);
      const match = result.data.find((item) =>
        matchesCorrectionIntent(ownUncertainCorrection, item),
      );
      if (match) {
        setUncertainCorrection(null);
        setExistingCorrection(match);
        setWriteError(null);
        setCorrectionRecovery(
          `Matching correction request found. Status: ${match.status}.`,
        );
      } else {
        setCorrectionRecovery(
          'No matching correction request found yet. The earlier submission remains unconfirmed.',
        );
      }
    } catch (error) {
      if (getSession().user?.id !== user?.id) return;
      setCorrectionRecovery(
        `Could not check corrections. ${messageOf(error)} The earlier submission remains unconfirmed.`,
      );
    } finally {
      sending.current = false;
      setPending(null);
    }
  }

  async function handleCancelCorrection(id: string) {
    if (cancellingCorrectionId || sending.current) return;
    setCancellingCorrectionId(id);
    setFeedback(null);
    setWriteError(null);
    try {
      await cancelAttendanceCorrection(user, accessToken, id);
      committedFeedback();
      setFeedback('Attendance correction request cancelled.');
      void client.invalidateQueries({ queryKey: [...key, 'corrections'] });
    } catch (error) {
      setWriteError(messageOf(error));
    } finally {
      setCancellingCorrectionId(null);
    }
  }

  function startDifferentCorrection() {
    if (sending.current || pending) return;
    setUncertainCorrection(null);
    setExistingCorrection(null);
    setCorrectionRecovery(null);
    setWriteError(null);
    setFields({});
    setForm({
      date: attendanceDay(),
      checkIn: '',
      checkOut: '',
      requestedStatus: 'PRESENT',
      reason: '',
    });
    setCorrectionFormOpen(true);
    setFeedback(
      'A new draft is ready. Clearing the previous draft did not cancel any received request. Its unconfirmed details remain protected from being sent again.',
    );
  }

  const change = (field: keyof CorrectionInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFields((current) => ({ ...current, [field]: '' }));
  };

  const dateLabel = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      ...options,
    });

  return (
    <ScreenContainer
      testID="attendance-screen"
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={[today, history, corrections, policy].some(
            (query) => query.isFetching,
          )}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <WebTopbar breadcrumb="Attendance" />

      <WebPageHeader
        title="Attendance Management"
        subtitle="Daily biometric verification, punch logs, and departmental attendance monitoring."
      >
        <Button
          variant="secondary"
          onPress={refresh}
          accessibilityLabel="Refresh attendance"
          style={styles.refreshButton}
        >
          <Icon name="refresh" color={theme.colors.primary} size={16} />
        </Button>
      </WebPageHeader>

      {unavailable ? (
        <View style={styles.notice}>
          <Text style={styles.body}>{unavailable}</Text>
        </View>
      ) : (
        <>
          {feedback && (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              {feedback}
            </Text>
          )}
          {writeError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {writeError}
            </Text>
          )}

          {/* Web-Style 2x2 Metric Cards Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricsRow}>
              <WebMetricCard
                label="Today's Status"
                value={
                  record?.checkOut
                    ? 'Checked out'
                    : record?.checkIn
                      ? 'Checked in'
                      : 'No record'
                }
                detail={
                  record?.checkIn
                    ? `${displayTime(record.checkIn)} verified`
                    : 'Ready for your day'
                }
                icon="attendance"
                accentColor="#10B981"
              />
              <WebMetricCard
                label="Check-in Time"
                value={displayTime(record?.checkIn ?? null)}
                detail="IST / UTC recorded"
                icon="clock"
                accentColor="#0071E3"
              />
            </View>

            <View style={styles.metricsRow}>
              <WebMetricCard
                label="Check-out Time"
                value={displayTime(record?.checkOut ?? null)}
                detail="IST / UTC recorded"
                icon="clock"
                accentColor="#8B5CF6"
              />
              <WebMetricCard
                label="Duration"
                value={
                  record
                    ? recordedDuration(record) ||
                      (record.checkIn ? 'In progress' : '—')
                    : '—'
                }
                detail="Recorded work hours"
                icon="workload"
                accentColor="#F59E0B"
              />
            </View>
          </View>

          {/* Punch Feature Card */}
          <View style={styles.card}>
            <ReadState
              pending={today.isPending}
              error={today.error}
              retry={() => {
                void today.refetch();
              }}
            />
            {today.isSuccess && (
              <>
                <View style={styles.punchRow}>
                  <View style={styles.checkIcon}>
                    <Icon
                      name={record?.checkIn ? 'check' : 'clock'}
                      color="#0071E3"
                      size={20}
                    />
                  </View>
                  <View style={styles.punchCopy}>
                    <Text style={styles.punchStatus}>
                      {record?.checkOut
                        ? 'Checked out'
                        : record?.checkIn
                          ? 'Checked in'
                          : 'No attendance record'}
                    </Text>
                    {!!record?.checkIn && (
                      <Text style={styles.punchTime}>
                        {displayTime(record.checkOut ?? record.checkIn)}
                      </Text>
                    )}
                    <Text style={styles.featureDetail}>
                      Recorded times · UTC
                    </Text>
                  </View>
                  {!punchUnavailable && !punchBlocked && !record?.checkOut && (
                    <Button
                      variant="primary"
                      onPress={() => {
                        void punch();
                      }}
                      loading={pending === 'punch'}
                      disabled={
                        !!pending ||
                        !today.isSuccess ||
                        !policy.isSuccess ||
                        today.isFetching
                      }
                      style={styles.punchAction}
                    >
                      {record?.checkIn ? 'Check out' : 'Check in'}
                    </Button>
                  )}
                </View>

                <View style={styles.punchTimes}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeHeader}>Check-in</Text>
                    <Text style={styles.timeValue}>
                      {displayTime(record?.checkIn ?? null)}
                    </Text>
                  </View>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeHeader}>Check-out</Text>
                    <Text style={styles.timeValue}>
                      {displayTime(record?.checkOut ?? null)}
                    </Text>
                  </View>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeHeader}>Duration</Text>
                    <Text style={styles.timeValue}>
                      {record
                        ? recordedDuration(record) ||
                          (record.checkIn
                            ? 'Awaiting check-out'
                            : 'Not recorded')
                        : 'Not recorded'}
                    </Text>
                  </View>
                </View>

                {record?.notes && (
                  <Text style={styles.supporting}>{record.notes}</Text>
                )}
                {today.dataUpdatedAt > 0 && (
                  <Text style={styles.detail}>
                    Updated{' '}
                    {new Date(today.dataUpdatedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {today.isFetching ? ' · Refreshing…' : ''}
                  </Text>
                )}
              </>
            )}

            {punchUnavailable ? (
              <Text style={styles.supporting}>
                Mobile punching is not available for your account.
              </Text>
            ) : punchBlocked ? (
              <Button
                variant="outline"
                onPress={() => {
                  void reconcilePunch();
                }}
                disabled={!!pending || today.isFetching}
              >
                Recheck recorded punches
              </Button>
            ) : record?.checkOut ? (
              <Text style={styles.detail}>
                Check-out is recorded. Use a correction request for changes.
              </Text>
            ) : null}
          </View>

          <ReadState
            pending={policy.isPending}
            error={policy.error}
            retry={() => {
              void policy.refetch();
            }}
          />
          {policy.data && !policy.isError && (
            <Text style={styles.detail}>
              Policy: {policy.data.workDayStart}–{policy.data.workDayEnd} UTC ·{' '}
              {policy.data.gracePeriodMinutes} minute grace · half day{' '}
              {policy.data.halfDayHours}h / full day {policy.data.fullDayHours}h.
            </Text>
          )}

          {/* Monthly Calendar Section */}
          <View style={styles.card}>
            <View style={styles.row}>
              <Text accessibilityRole="header" style={styles.subtitle}>
                {dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.monthActions}>
                <Button
                  variant="secondary"
                  style={styles.monthNavButton}
                  accessibilityLabel="Previous attendance month"
                  onPress={() => setMonth((value) => shiftMonth(value, -1))}
                >
                  <Icon name="back" color="#0F172A" size={16} />
                </Button>
                <Button
                  variant="secondary"
                  style={styles.monthNavButton}
                  accessibilityLabel="Next attendance month"
                  onPress={() => setMonth((value) => shiftMonth(value, 1))}
                >
                  <Icon name="next" color="#0F172A" size={16} />
                </Button>
              </View>
            </View>
            <ReadState
              pending={history.isPending}
              error={history.error}
              retry={() => {
                void history.refetch();
              }}
            />
            {history.isSuccess && (
              <AttendanceMonth
                month={month}
                records={history.data}
                today={day}
              />
            )}
            {history.isSuccess && history.data.length === 0 && (
              <Text style={styles.supporting}>
                No attendance records for this month. Choose another month or
                refresh to check for updates.
              </Text>
            )}
            {history.dataUpdatedAt > 0 && (
              <Text style={styles.detail}>
                Updated{' '}
                {new Date(history.dataUpdatedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {history.isFetching ? ' · Refreshing…' : ''}
              </Text>
            )}
          </View>

          {/* Recent Activity Section */}
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.subtitle}>
              Recent activity
            </Text>
            <Text style={styles.detail}>
              All records for the selected month · UTC
            </Text>
            {history.isSuccess && history.data.length === 0 && (
              <Text style={styles.supporting}>
                Your recorded check-ins and check-outs will appear here.
              </Text>
            )}
            {history.isSuccess &&
              [...history.data]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => (
                  <View key={item.id} style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: attendanceStatus[item.status].fill },
                      ]}
                    >
                      <Icon
                        name={
                          item.status === 'ON_LEAVE'
                            ? 'leave'
                            : item.status === 'PRESENT'
                              ? 'check'
                              : 'clock'
                        }
                        color={attendanceStatus[item.status].ink}
                        size={18}
                      />
                    </View>
                    <View style={styles.activityCopy}>
                      <View style={styles.row}>
                        <Text style={styles.label}>
                          {item.date.slice(0, 10) === day
                            ? 'Today'
                            : dateLabel(item.date, {
                                day: 'numeric',
                                month: 'short',
                              })}
                        </Text>
                        <Text
                          style={[
                            styles.activityStatus,
                            { color: attendanceStatus[item.status].ink },
                          ]}
                        >
                          {attendanceStatus[item.status].label}
                        </Text>
                      </View>
                      <Text style={styles.supporting}>
                        {displayTime(item.checkIn)} –{' '}
                        {displayTime(item.checkOut)} UTC
                      </Text>
                      <Text style={styles.detail}>
                        {recordedDuration(item) || 'No completed duration'} ·{' '}
                        {item.source}
                      </Text>
                    </View>
                  </View>
                ))}
          </View>

          {/* Need a Correction Form */}
          {!correctionUnavailable && (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.heading}>
                  <Text accessibilityRole="header" style={styles.subtitle}>
                    Need a correction?
                  </Text>
                  <Text style={styles.supporting}>
                    Send the details for review.
                  </Text>
                </View>
                <Button
                  variant="secondary"
                  accessibilityLabel={
                    correctionFormOpen
                      ? 'Close correction form'
                      : 'Request an attendance correction'
                  }
                  onPress={() => setCorrectionFormOpen((value) => !value)}
                  style={styles.refreshButton}
                >
                  <Icon
                    name={correctionFormOpen ? 'close' : 'next'}
                    color={theme.colors.primary}
                    size={16}
                  />
                </Button>
              </View>

              {correctionFormOpen && (
                <View style={styles.form}>
                  <Text accessibilityRole="header" style={styles.subtitle}>
                    Request a correction
                  </Text>
                  <Text style={styles.supporting}>
                    HR/HOD reviews your request. These times replace the day’s
                    times if approved; blank fields request removal. Enter UTC
                    times in 24-hour format.
                  </Text>

                  {correctionBlocked && (
                    <View style={styles.recovery}>
                      <Text accessibilityRole="header" style={styles.label}>
                        {ownExistingCorrection
                          ? 'Existing correction found'
                          : 'Submission unconfirmed'}
                      </Text>
                      <Text style={styles.supporting}>
                        {ownExistingCorrection
                          ? 'These details are already recorded as a correction request. Attendance changes still depend on its review status.'
                          : 'Your submitted draft is preserved. Check your requests before taking another action with these details.'}
                      </Text>
                      {ownUncertainCorrection && (
                        <Button
                          variant="outline"
                          onPress={() => {
                            void checkCorrections();
                          }}
                          loading={pending === 'correction-check'}
                          disabled={!!pending}
                        >
                          Check corrections
                        </Button>
                      )}
                      {correctionRecovery && (
                        <Text
                          accessibilityLiveRegion="polite"
                          style={styles.supporting}
                        >
                          {correctionRecovery}
                        </Text>
                      )}
                      {ownExistingCorrection && (
                        <View style={styles.stack}>
                          <Text style={styles.label}>
                            {ownExistingCorrection.date.slice(0, 10)} ·{' '}
                            {ownExistingCorrection.status}
                          </Text>
                          <Text style={styles.body}>
                            {ownExistingCorrection.reason}
                          </Text>
                          <Text style={styles.detail}>
                            {ownExistingCorrection.requestedStatus.replaceAll(
                              '_',
                              ' ',
                            )}{' '}
                            ·{' '}
                            {displayTime(
                              ownExistingCorrection.requestedCheckIn,
                            )}
                            –
                            {displayTime(
                              ownExistingCorrection.requestedCheckOut,
                            )}{' '}
                            UTC
                          </Text>
                          {ownExistingCorrection.reviewNote && (
                            <Text style={styles.supporting}>
                              Review: {ownExistingCorrection.reviewNote}
                            </Text>
                          )}
                        </View>
                      )}
                      <Button
                        variant="secondary"
                        disabled={!!pending}
                        onPress={startDifferentCorrection}
                      >
                        {ownExistingCorrection
                          ? 'Start a different correction'
                          : 'Discard draft and start different correction'}
                      </Button>
                    </View>
                  )}

                  <DateField
                    label="Attendance date (UTC)"
                    value={form.date}
                    onChangeText={(value) => change('date', value)}
                    disabled={!!pending || correctionBlocked}
                  />
                  {!!fields.date && (
                    <Text accessibilityRole="alert" style={styles.error}>
                      {fields.date}
                    </Text>
                  )}

                  <Text style={styles.label}>Issue</Text>
                  <View style={styles.statuses}>
                    {(
                      [
                        'Missed check-in',
                        'Missed check-out',
                        'Incorrect time',
                        'Other',
                      ] as const
                    ).map((issue) => (
                      <Pressable
                        key={issue}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: correctionIssue === issue,
                          disabled: !!pending || correctionBlocked,
                        }}
                        disabled={!!pending || correctionBlocked}
                        onPress={() => setCorrectionIssue(issue)}
                        style={({ pressed }) => [
                          styles.option,
                          correctionIssue === issue && styles.selected,
                          pressed && styles.pressedOption,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            correctionIssue === issue && styles.selectedText,
                          ]}
                        >
                          {issue}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Input
                    label="Requested check-in (UTC)"
                    value={form.checkIn}
                    onChangeText={(value) => change('checkIn', value)}
                    placeholder="HH:mm"
                    error={fields.checkIn}
                    disabled={!!pending || correctionBlocked}
                  />

                  <Input
                    label="Requested check-out (UTC, optional)"
                    value={form.checkOut}
                    onChangeText={(value) => change('checkOut', value)}
                    placeholder="HH:mm"
                    error={fields.checkOut}
                    disabled={!!pending || correctionBlocked}
                  />

                  <Text style={styles.label}>Requested status</Text>
                  <View accessibilityRole="radiogroup" style={styles.statuses}>
                    {statuses.map((status) => (
                      <Pressable
                        key={status}
                        accessibilityRole="radio"
                        accessibilityLabel={`Request ${status.replaceAll('_', ' ')}`}
                        accessibilityState={{
                          checked: form.requestedStatus === status,
                          disabled: !!pending || correctionBlocked,
                        }}
                        disabled={!!pending || correctionBlocked}
                        onFocus={() => setFocusedStatus(status)}
                        onBlur={() => setFocusedStatus(null)}
                        onPress={() => change('requestedStatus', status)}
                        style={({ pressed }) => [
                          styles.option,
                          form.requestedStatus === status && styles.selected,
                          focusedStatus === status && styles.focusedOption,
                          pressed && styles.pressedOption,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            form.requestedStatus === status &&
                              styles.selectedText,
                          ]}
                        >
                          {attendanceStatus[status].label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Input
                    multiline
                    maxLength={500}
                    autoCapitalize="sentences"
                    label="Reason for correction"
                    value={form.reason}
                    onChangeText={(value) => change('reason', value)}
                    placeholder="Explain what needs to change"
                    error={fields.reason}
                    disabled={!!pending || correctionBlocked}
                  />

                  <View style={styles.row}>
                    <Button
                      variant="outline"
                      disabled={!!pending || correctionBlocked}
                      onPress={() =>
                        setCorrectionAttachment((prev) =>
                          prev ? null : 'Attendance_Support_Note.pdf',
                        )
                      }
                    >
                      {correctionAttachment
                        ? `Attached: ${correctionAttachment}`
                        : 'Attach supporting document'}
                    </Button>
                  </View>

                  <Button
                    variant="primary"
                    onPress={() => {
                      void submitCorrection();
                    }}
                    loading={pending === 'correction'}
                    disabled={!!pending || correctionBlocked}
                  >
                    Submit correction request
                  </Button>
                </View>
              )}
            </View>
          )}

          {/* My Correction Requests */}
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.subtitle}>
              My correction requests
            </Text>
            <ReadState
              pending={corrections.isPending}
              error={corrections.error}
              retry={() => {
                void corrections.refetch();
              }}
            />
            {corrections.isSuccess && (
              <>
                {corrections.data.data.length === 0 && (
                  <Text style={styles.supporting}>
                    No correction requests yet.
                  </Text>
                )}
                {corrections.data.data.map((item) => (
                  <View key={item.id} style={styles.record}>
                    <View style={styles.row}>
                      <Text style={styles.label}>
                        {dateLabel(item.date, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.activityStatus,
                          item.status === 'APPROVED'
                            ? styles.success
                            : item.status === 'REJECTED'
                              ? styles.error
                              : item.status === 'CANCELLED'
                                ? styles.cancelled
                                : styles.pending,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <Text style={styles.body}>{item.reason}</Text>
                    <Text style={styles.detail}>
                      {item.requestedStatus.replaceAll('_', ' ')} ·{' '}
                      {displayTime(item.requestedCheckIn)}–
                      {displayTime(item.requestedCheckOut)} UTC
                    </Text>
                    {item.reviewNote && (
                      <Text style={styles.supporting}>
                        Review: {item.reviewNote}
                      </Text>
                    )}
                    {item.status === 'PENDING' && (
                      <View
                        style={{
                          marginTop: theme.spacing.sm,
                          alignItems: 'flex-start',
                        }}
                      >
                        <Button
                          variant="outline"
                          loading={cancellingCorrectionId === item.id}
                          disabled={!!cancellingCorrectionId}
                          onPress={() => void handleCancelCorrection(item.id)}
                        >
                          Cancel request
                        </Button>
                      </View>
                    )}
                  </View>
                ))}
                <View style={styles.row}>
                  <Button
                    variant="secondary"
                    accessibilityLabel="Previous correction page"
                    disabled={page <= 1}
                    onPress={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <Text style={styles.detail}>
                    Page {page} of {corrections.data.meta.totalPages}
                  </Text>
                  <Button
                    variant="secondary"
                    accessibilityLabel="Next correction page"
                    disabled={page >= corrections.data.meta.totalPages}
                    onPress={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </View>
              </>
            )}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 40,
  },
  refreshButton: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  monthNavButton: {
    width: 34,
    height: 34,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  metricsGrid: {
    gap: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  punchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchCopy: {
    flex: 1,
    gap: 2,
  },
  punchStatus: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  punchTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0071E3',
    fontVariant: ['tabular-nums'],
  },
  featureDetail: {
    fontSize: 12,
    color: '#6E6E73',
  },
  punchAction: {
    paddingHorizontal: 16,
  },
  punchTimes: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  timeColumn: {
    flex: 1,
    gap: 4,
  },
  timeHeader: {
    fontSize: 12,
    color: '#6E6E73',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heading: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1D1D1F',
  },
  supporting: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6E6E73',
  },
  detail: {
    fontSize: 12,
    color: '#6E6E73',
  },
  error: {
    fontSize: 13,
    color: theme.colors.errorInk,
    lineHeight: 18,
  },
  success: {
    fontSize: 13,
    color: theme.colors.mintInk,
    lineHeight: 18,
  },
  pending: {
    color: theme.colors.amberInk,
  },
  cancelled: {
    color: theme.colors.mutedForeground,
  },
  readState: {
    gap: 8,
    paddingVertical: 4,
  },
  stack: {
    gap: 10,
  },
  notice: {
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  monthActions: {
    flexDirection: 'row',
    gap: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: {
    flex: 1,
    gap: 2,
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    gap: 14,
    paddingTop: 8,
  },
  recovery: {
    gap: 10,
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  record: {
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  statuses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    backgroundColor: '#F5F5F7',
  },
  selected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  focusedOption: {
    borderColor: '#0071E3',
  },
  pressedOption: {
    opacity: 0.7,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectedText: {
    color: '#FFFFFF',
  },
});
