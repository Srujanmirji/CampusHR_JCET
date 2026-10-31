import { Alert } from '../../lib/dialogs';
import { useReducedMotion } from 'react-native-reanimated';
import React, { useRef, useState } from 'react';
import {
  Modal,
  Switch,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { DateField } from '../ui/DateField';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useRouter } from 'expo-router';
import { Input } from '../ui/Input';
import {
  applyForLeave,
  getLeaveRequests,
  leaveInputSchema,
  uncertainLeaveWrite,
  type LeaveTypeDto,
  type LeaveRequestDto,
} from '../../lib/leave-api';
import { getSession } from '../../lib/session';
import { leaveDates, LeaveStatus } from './LeavePresentation';
import {
  findRecordedLeaveIntent,
  isAmbiguousLeaveIntent,
  leaveSubmissionFingerprint,
  leaveSubmissionIntent,
  retainAmbiguousLeaveIntent,
  type LeaveSubmissionIntent,
} from './leave-submission-recovery';
import { campusClock } from '../../lib/home-api';
import { committedFeedback } from '../../lib/feedback';
import { theme } from '../../lib/theme';

interface LeaveApplyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (
    request: LeaveRequestDto,
    source?: 'submitted' | 'existing',
  ) => void;
  token: string | null;
  currentUser: {
    id: string;
    name?: string;
    employeeCode?: string;
    role: string;
  };
  leaveTypes: LeaveTypeDto[];
}

export function LeaveApplyModal({
  visible,
  onClose,
  onSuccess,
  token,
  currentUser,
  leaveTypes,
}: LeaveApplyModalProps) {
  const { fontScale } = useWindowDimensions();
  const router = useRouter();
  const [typesOpen, setTypesOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reduceMotion = useReducedMotion();
  const today = campusClock().date;
  const [tomorrow] = useState(
    () => campusClock(new Date(Date.now() + 86400000)).date,
  );

  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(
    leaveTypes[0]?.id,
  );
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<'FIRST' | 'SECOND'>(
    'FIRST',
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType =
    leaveTypes.find((t) => t.id === selectedTypeId) || leaveTypes[0];
  const busy = useRef(false);
  const [blockedIntents, setBlockedIntents] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const blockedIntentsRef = useRef<ReadonlySet<string>>(new Set());
  const [recoveryIntent, setRecoveryIntent] =
    useState<LeaveSubmissionIntent | null>(null);
  const [recoveryCheck, setRecoveryCheck] = useState<{
    fingerprint: string;
    record?: LeaveRequestDto;
    message: string;
  } | null>(null);
  const draftIntent = selectedType
    ? leaveSubmissionIntent(currentUser.id, {
        leaveTypeId: selectedType.id,
        startDate,
        endDate,
        halfDay: isHalfDay && selectedType.allowHalfDay ? halfDaySession : null,
        reason,
      })
    : null;
  const activeRecovery =
    recoveryIntent ??
    (draftIntent && isAmbiguousLeaveIntent(blockedIntents, draftIntent)
      ? draftIntent
      : null);
  const blocked = !!activeRecovery;
  const working = loading || checking;
  const checkedRecovery =
    activeRecovery &&
    recoveryCheck?.fingerprint === leaveSubmissionFingerprint(activeRecovery)
      ? recoveryCheck
      : null;

  async function handleSubmit() {
    if (busy.current || activeRecovery) return;
    setError(null);
    setFieldErrors({});
    const value = leaveInputSchema.safeParse({
      leaveTypeId: selectedType?.id,
      startDate,
      endDate,
      halfDay: isHalfDay && selectedType?.allowHalfDay ? halfDaySession : null,
      reason,
    });
    if (!value.success) {
      setError(value.error.issues[0].message);
      setFieldErrors(
        Object.fromEntries(
          value.error.issues
            .filter((issue) => issue.path.length)
            .map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    if (!selectedType?.active) {
      setError('Choose an active leave type.');
      return;
    }
    const intent = leaveSubmissionIntent(currentUser.id, value.data);
    if (isAmbiguousLeaveIntent(blockedIntentsRef.current, intent)) {
      setRecoveryIntent(intent);
      setError(
        'This exact request has an unknown submission outcome. Check its history before proceeding.',
      );
      return;
    }
    busy.current = true;
    setLoading(true);
    try {
      const result = await applyForLeave(token, value.data, currentUser);
      committedFeedback();
      // Reset form
      setReason('');
      setIsHalfDay(false);
      onSuccess(result, 'submitted');
      onClose();
    } catch (err) {
      if (uncertainLeaveWrite(err)) {
        const guarded = retainAmbiguousLeaveIntent(
          blockedIntentsRef.current,
          intent,
        );
        blockedIntentsRef.current = guarded;
        setBlockedIntents(guarded);
        setRecoveryIntent(intent);
        setRecoveryCheck(null);
        setError(
          'Submission outcome unknown. Your draft is retained. Check request history before proceeding. This exact request will stay protected against another submission.',
        );
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Failed to submit leave request.',
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function checkRequestHistory() {
    if (!activeRecovery || busy.current) return;
    const intent = activeRecovery;
    const fingerprint = leaveSubmissionFingerprint(intent);
    const accountId = getSession().user?.id;
    if (
      !accountId ||
      getSession().user?.employeeId !== intent.employeeId ||
      currentUser.id !== intent.employeeId
    ) {
      setRecoveryCheck({
        fingerprint,
        message:
          'Your session changed. Reopen Leave with the original account to check this request.',
      });
      return;
    }
    busy.current = true;
    setChecking(true);
    try {
      const records = await getLeaveRequests(token, {
        employeeId: intent.employeeId,
        year: Number(intent.startDate.slice(0, 4)),
      });
      if (
        getSession().user?.id !== accountId ||
        getSession().user?.employeeId !== intent.employeeId
      )
        return;
      const record = findRecordedLeaveIntent(intent, records);
      if (record) {
        setRecoveryCheck({
          fingerprint,
          record,
          message:
            'A matching request is already recorded. This check does not establish whether the earlier submission created it. Open the record to review its status.',
        });
        onSuccess(record, 'existing');
      } else {
        setRecoveryCheck({
          fingerprint,
          message: `No exact match was found in the returned history${records.length === 500 ? ' (limited to the newest 500 matching records)' : ''}. The earlier outcome remains unknown. This exact request is still blocked; you can check again or discard this draft and start a different request.`,
        });
      }
    } catch (err) {
      if (getSession().user?.id !== accountId) return;
      setRecoveryCheck({
        fingerprint,
        message: `Request history could not be checked. ${err instanceof Error ? err.message : 'Try checking again.'} The earlier outcome remains unknown, and this exact request stays blocked.`,
      });
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }

  function startDifferentRequest() {
    if (working) return;
    Alert.alert(
      'Discard this draft?',
      'The previous request may already be recorded. Its exact details will remain protected against resubmission. You can start a different request.',
      [
        { text: 'Keep draft', style: 'cancel' },
        {
          text: 'Start different request',
          onPress: () => {
            setSelectedTypeId(leaveTypes[0]?.id);
            setStartDate(today);
            setEndDate(today);
            setIsHalfDay(false);
            setHalfDaySession('FIRST');
            setReason('');
            setRecoveryIntent(null);
            setRecoveryCheck(null);
            setError(null);
            setFieldErrors({});
            setTypesOpen(false);
          },
        },
      ],
    );
  }

  function close() {
    if (working) return;
    if (reason.trim() || blocked)
      Alert.alert(
        'Close leave request?',
        blocked
          ? 'The outcome is unknown. Check your request history before submitting again.'
          : 'Your unfinished request will remain here until you leave this screen.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Close', onPress: onClose },
        ],
      );
    else onClose();
  }
  return (
    <Modal
      visible={visible}
      presentationStyle="fullScreen"
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={() => {
        if (!working) close();
      }}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.screen}
          >
            <View style={styles.headerRow}>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                Apply for leave
              </Text>
              <Button
                variant="text"
                accessibilityLabel="Close leave application"
                disabled={working}
                onPress={close}
              >
                <Icon name="close" />
              </Button>
            </View>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
            >
              {!!activeRecovery && (
                <View style={styles.recovery}>
                  <Text accessibilityRole="header" style={styles.sectionLabel}>
                    Check your earlier request
                  </Text>
                  <Text style={styles.detail}>
                    {leaveTypes.find(
                      (type) => type.id === activeRecovery.leaveTypeId,
                    )?.name ?? 'Leave request'}{' '}
                    ·{' '}
                    {leaveDates(
                      activeRecovery.startDate,
                      activeRecovery.endDate,
                    )}
                    {activeRecovery.halfDay
                      ? ` · ${activeRecovery.halfDay === 'FIRST' ? 'First' : 'Second'} half`
                      : ''}
                  </Text>
                  <Text style={styles.body}>{activeRecovery.reason}</Text>
                  <Text accessibilityLiveRegion="polite" style={styles.detail}>
                    This exact request may already be recorded. Submitting it
                    again stays disabled, including after you close and reopen
                    this form.
                  </Text>
                  <Button
                    variant="secondary"
                    onPress={() => void checkRequestHistory()}
                    loading={checking}
                    disabled={working}
                  >
                    Check request history
                  </Button>
                  {!!checkedRecovery && (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={styles.detail}
                    >
                      {checkedRecovery.message}
                    </Text>
                  )}
                  {!!checkedRecovery?.record && (
                    <>
                      <LeaveStatus status={checkedRecovery.record.status} />
                      <Button
                        variant="outline"
                        disabled={working}
                        onPress={() => {
                          onClose();
                          router.push({
                            pathname: '/leave/[id]',
                            params: { id: checkedRecovery.record!.id },
                          });
                        }}
                      >
                        View recorded request
                      </Button>
                    </>
                  )}
                  <Button
                    variant="text"
                    disabled={working}
                    onPress={startDifferentRequest}
                  >
                    Start a different request
                  </Button>
                </View>
              )}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Leave type</Text>
                <Button
                  variant="outline"
                  disabled={working}
                  accessibilityLabel={`Leave type: ${selectedType?.name ?? 'Choose a leave type'}. ${typesOpen ? 'Hide options' : 'Show options'}`}
                  onPress={() => setTypesOpen(!typesOpen)}
                >
                  <Icon name="leave" color={theme.colors.violet} />
                  <Text style={[styles.body, styles.grow]}>
                    {selectedType?.name ?? 'Choose a leave type'}
                  </Text>
                  <Icon
                    name="next"
                    color={theme.colors.mutedForeground}
                    size={theme.spacing.lg}
                  />
                </Button>
                {typesOpen && (
                  <View style={styles.typeOptions}>
                    {leaveTypes.map((type) => (
                      <Button
                        key={type.id}
                        variant={
                          type.id === selectedType?.id ? 'secondary' : 'text'
                        }
                        disabled={working}
                        accessibilityLabel={`${type.name}, ${type.code}${type.id === selectedType?.id ? ', selected' : ''}`}
                        onPress={() => {
                          setSelectedTypeId(type.id);
                          setTypesOpen(false);
                          if (!type.allowHalfDay) setIsHalfDay(false);
                        }}
                      >
                        {type.code} · {type.name}
                      </Button>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.shortcutsRow}>
                <Text style={styles.detail}>Quick dates</Text>
                <Button
                  variant="text"
                  disabled={working}
                  onPress={() => {
                    setStartDate(today);
                    setEndDate(today);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="text"
                  disabled={working}
                  onPress={() => {
                    setStartDate(tomorrow);
                    setEndDate(tomorrow);
                  }}
                >
                  Tomorrow
                </Button>
              </View>
              <View
                style={[styles.dateInputsRow, fontScale > 1.3 && styles.column]}
              >
                <View style={styles.dateCol}>
                  <DateField
                    disabled={working}
                    label="Start date"
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>
                <View style={styles.dateCol}>
                  <DateField
                    disabled={working}
                    label="End date"
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
              </View>
              {selectedType?.allowHalfDay && (
                <View style={styles.section}>
                  <View style={styles.halfDayRow}>
                    <View style={styles.grow}>
                      <Text style={styles.sectionLabel}>Half day</Text>
                      <Text style={styles.detail}>
                        Mark this if applying for half a day.
                      </Text>
                    </View>
                    <Switch
                      value={isHalfDay}
                      disabled={working}
                      onValueChange={setIsHalfDay}
                      accessibilityLabel="Apply for half-day leave"
                      hitSlop={theme.spacing.sm}
                      trackColor={{ true: theme.colors.violet }}
                    />
                  </View>
                  {isHalfDay &&
                    (working ? (
                      <Text style={styles.detail}>
                        {halfDaySession === 'FIRST'
                          ? 'First half'
                          : 'Second half'}
                      </Text>
                    ) : (
                      <SegmentedControl
                        options={[
                          { value: 'FIRST', label: 'First half' },
                          { value: 'SECOND', label: 'Second half' },
                        ]}
                        value={halfDaySession}
                        onChange={setHalfDaySession}
                        label="Half-day session"
                      />
                    ))}
                </View>
              )}
              <Input
                disabled={working}
                multiline
                maxLength={500}
                autoCapitalize="sentences"
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Tell your reviewer why you need leave"
                error={fieldErrors.reason}
                helperText="At least 3 characters. Your reason is recorded with the request."
              />
              <View style={styles.impact}>
                <Icon name="school" color={theme.colors.primary} />
                <View style={styles.grow}>
                  <Text style={styles.impactTitle}>Academic impact</Text>
                  <Text style={styles.impactDetail}>
                    Dated class impact and coverage are confirmed after final
                    approval. Review your timetable before submitting.
                  </Text>
                </View>
              </View>
              {!!error && (
                <View style={styles.errorBox}>
                  <Text
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={styles.errorText}
                  >
                    {error}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.footer}>
              <Button
                variant="accent"
                onPress={() => void handleSubmit()}
                loading={loading}
                disabled={working || blocked}
              >
                Submit request
              </Button>
              <Text style={styles.footerNote}>
                {currentUser.role === 'FACULTY'
                  ? 'Sends to HOD, then HR · Sundays excluded'
                  : 'Follows your approval chain · Sundays excluded'}
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
  headerRow: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.page,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  modalTitle: {
    flex: 1,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.title,
    color: theme.colors.foreground,
  },
  scrollContent: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    padding: theme.spacing.page,
    gap: theme.spacing.page,
  },
  section: { gap: theme.spacing.sm },
  recovery: {
    padding: theme.spacing.section,
    gap: theme.spacing.md,
    borderRadius: theme.radius.field,
    backgroundColor: theme.colors.muted,
  },
  sectionLabel: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.label,
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
  grow: { flex: 1, gap: theme.spacing.xs },
  typeOptions: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.field,
    padding: theme.spacing.xs,
  },
  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dateInputsRow: { flexDirection: 'row', gap: theme.spacing.md },
  dateCol: { flex: 1 },
  column: { flexDirection: 'column' },
  halfDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.sizes.tapTarget,
    gap: theme.spacing.md,
  },
  impact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    padding: theme.spacing.section,
    backgroundColor: theme.colors.blueContainer,
    borderRadius: theme.radius.field,
  },
  impactTitle: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  impactDetail: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.primary,
  },
  errorBox: {
    backgroundColor: theme.colors.coralContainer,
    borderRadius: theme.radius.field,
    padding: theme.spacing.section,
  },
  errorText: {
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  footerNote: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
});
