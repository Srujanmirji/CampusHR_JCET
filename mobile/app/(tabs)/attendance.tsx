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
import { getSession } from '../../lib/session';
import { homeUnavailable } from '../../lib/home-api';
import {
  attendanceDay,
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
import { theme } from '../../lib/theme';

const displayTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-GB', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not recorded';
const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.name === 'ZodError'
      ? 'The server returned an unexpected response. Refresh or contact HR.'
      : error.message
    : 'Unable to finish. Check your connection.';
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
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    const intent = createCorrectionIntent(user.employeeId, parsed.data);
    if (blockedCorrectionFingerprints.current.has(intent.fingerprint)) {
      setUncertainCorrection(intent);
      setExistingCorrection(null);
      setCorrectionRecovery(null);
      setWriteError(
        'This correction has an earlier unconfirmed submission. Check corrections or start a different correction; the same details will not be sent again.',
      );
      return;
    }
    sending.current = true;
    setPending('correction');
    setFields({});
    setFeedback(null);
    setWriteError(null);
    try {
      await requestAttendanceCorrection(user, accessToken, parsed.data);
      if (getSession().user?.id !== user?.id) return;
      setFeedback(
        'Correction request received. It is pending review; attendance has not been changed.',
      );
      setForm((current) => ({ ...current, reason: '' }));
      setPage(1);
      refresh();
    } catch (error) {
      if (getSession().user?.id !== user?.id) return;
      const uncertain = uncertainWrite(error);
      if (uncertain) {
        blockedCorrectionFingerprints.current.add(intent.fingerprint);
        setUncertainCorrection(intent);
        setExistingCorrection(null);
        setCorrectionRecovery(null);
      }
      setWriteError(
        uncertain
          ? 'Submission not confirmed. Your input is preserved. Check corrections to look for this request, or discard the draft to start a different correction. The same unconfirmed details will not be sent again.'
          : messageOf(error),
      );
    } finally {
      sending.current = false;
      setPending(null);
    }
  }
  async function checkCorrections() {
    const intent = ownUncertainCorrection;
    if (sending.current || !intent || unavailable || correctionUnavailable)
      return;
    sending.current = true;
    setPending('correction-check');
    setCorrectionRecovery(null);
    try {
      // Begin at page one so an unrelated selected history page cannot hide the request.
      let totalPages = 1;
      for (let checkPage = 1; checkPage <= totalPages; checkPage += 1) {
        const result = await getAttendanceCorrections(
          user,
          accessToken,
          checkPage,
        );
        if (getSession().user?.id !== user?.id) return;
        client.setQueryData([...key, 'corrections', checkPage], result);
        if (checkPage === 1) totalPages = result.meta.totalPages;
        const match = result.data.find((item) =>
          matchesCorrectionIntent(intent, item),
        );
        if (match) {
          setExistingCorrection(match);
          setUncertainCorrection(null);
          setCorrectionRecovery(
            'These exact details are already in your correction requests. Review the existing request below; no new submission was made by this check.',
          );
          setWriteError(null);
          setPage(checkPage);
          return;
        }
      }
      setCorrectionRecovery(
        'No exact matching request was found. The submission outcome is still unknown. Check again or contact HR, or discard this draft to start a different correction.',
      );
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
  function startDifferentCorrection() {
    if (sending.current || pending) return;
    // Clearing a draft neither cancels a received request nor removes its replay guard.
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
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.row}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Attendance
          </Text>
          <Text style={styles.supporting}>
            {dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <Button
          variant="text"
          onPress={refresh}
          accessibilityLabel="Refresh attendance"
          style={styles.iconButton}
        >
          <Icon name="refresh" color={theme.colors.primary} />
        </Button>
      </View>
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
          <View style={styles.punchFeature}>
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
                      color={theme.colors.onAction}
                      size={theme.spacing.page}
                    />
                  </View>
                  <View style={styles.punchCopy}>
                    <Text style={styles.punchStatus}>
                      {record?.checkOut
                        ? 'Checked out'
                        : record?.checkIn
                          ? 'Checked in'
                          : 'Not checked in'}
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
                    <Text style={styles.featureDetail}>Check-in</Text>
                    <Text style={styles.timeValue}>
                      {displayTime(record?.checkIn ?? null)}
                    </Text>
                  </View>
                  <View style={styles.timeColumn}>
                    <Text style={styles.featureDetail}>Check-out</Text>
                    <Text style={styles.timeValue}>
                      {displayTime(record?.checkOut ?? null)}
                    </Text>
                  </View>
                  <View style={styles.timeColumn}>
                    <Text style={styles.featureDetail}>Duration</Text>
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
                  <Text style={styles.featureDetail}>
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
              <Text style={styles.featureDetail}>
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
              {policy.data.halfDayHours}h / full day {policy.data.fullDayHours}
              h.
            </Text>
          )}
          <View style={styles.section}>
            <View style={styles.row}>
              <Text accessibilityRole="header" style={styles.subtitle}>
                {dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.monthActions}>
                <Button
                  variant="secondary"
                  style={styles.iconButton}
                  accessibilityLabel="Previous attendance month"
                  onPress={() => setMonth((value) => shiftMonth(value, -1))}
                >
                  <Icon
                    name="back"
                    color={theme.colors.foreground}
                    size={theme.spacing.lg}
                  />
                </Button>
                <Button
                  variant="secondary"
                  style={styles.iconButton}
                  accessibilityLabel="Next attendance month"
                  onPress={() => setMonth((value) => shiftMonth(value, 1))}
                >
                  <Icon
                    name="next"
                    color={theme.colors.foreground}
                    size={theme.spacing.lg}
                  />
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
          <View style={styles.section}>
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
                        size={theme.spacing.lg}
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
          {!correctionUnavailable && (
            <View style={styles.section}>
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
                  style={styles.iconButton}
                >
                  <Icon
                    name={correctionFormOpen ? 'close' : 'next'}
                    color={theme.colors.primary}
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
                  <Button
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
          <View style={styles.section}>
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
  readState: { gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  recovery: {
    gap: theme.spacing.md,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.amberContainer,
    borderRadius: theme.radius.card,
  },
  container: {
    gap: theme.spacing.section,
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  heading: { flex: 1, gap: theme.spacing.xs },
  stack: { gap: theme.spacing.md },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '700',
    fontSize: theme.typography.heading,
    color: theme.colors.foreground,
  },
  subtitle: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.title,
    color: theme.colors.foreground,
  },
  label: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
  },
  body: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.foreground,
  },
  supporting: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.mutedForeground,
  },
  detail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  error: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.errorInk,
  },
  success: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    color: theme.colors.mintInk,
  },
  pending: { color: theme.colors.amberInk },
  notice: { paddingVertical: theme.spacing.section },
  iconButton: { paddingHorizontal: theme.spacing.md },
  punchFeature: {
    backgroundColor: theme.colors.mintContainer,
    borderRadius: theme.radius.hero,
    padding: theme.spacing.section,
    gap: theme.spacing.section,
    marginTop: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  punchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  checkIcon: {
    minWidth: theme.spacing.xl + theme.spacing.sm,
    minHeight: theme.spacing.xl + theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.mintInk,
    borderRadius: theme.radius.full,
  },
  punchCopy: {
    flex: 1,
    minWidth: theme.sizes.tapTarget * 2,
    gap: theme.spacing.xs,
  },
  punchStatus: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  punchTime: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.mintInk,
    fontVariant: ['tabular-nums'],
  },
  featureDetail: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mintInk,
  },
  punchAction: { paddingHorizontal: theme.spacing.md },
  punchTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.mintInk,
    paddingTop: theme.spacing.md,
  },
  timeColumn: {
    flex: 1,
    minWidth: theme.sizes.tapTarget,
    gap: theme.spacing.xs,
  },
  timeValue: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  section: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.section,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  monthActions: { flexDirection: 'row', gap: theme.spacing.sm },
  activityRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  activityIcon: {
    width: theme.spacing.xl + theme.spacing.sm,
    height: theme.spacing.xl + theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  activityCopy: { flex: 1, gap: theme.spacing.xs },
  activityStatus: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
  },
  form: { gap: theme.spacing.section, paddingTop: theme.spacing.section },
  record: {
    gap: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.section,
  },
  statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  option: {
    minHeight: theme.sizes.tapTarget,
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  focusedOption: { borderColor: theme.colors.foreground },
  pressedOption: { opacity: 0.75 },
  optionText: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.secondary,
    color: theme.colors.foreground,
  },
  selectedText: { color: theme.colors.onAction },
});
