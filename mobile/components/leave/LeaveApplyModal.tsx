import { Alert } from '../../lib/dialogs';
import { useReducedMotion } from 'react-native-reanimated';
import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  JCET_RESTRICTED_HOLIDAYS,
  JCET_VACATION_PERIODS,
  OOD_DUTY_TYPES,
  ODE_DUTY_TYPES,
  applyForLeave,
  getLeaveRequests,
  leaveInputSchema,
  uncertainLeaveWrite,
  type LeaveTypeDto,
  type LeaveRequestDto,
} from '../../lib/leave-api';
import {
  getTimetableEntries,
  JCET_PERIODS,
  type TimetableEntryDto,
} from '../../lib/timetable-api';
import { getSession } from '../../lib/session';
import {
  leaveDates,
  LeaveStatus,
  LeaveTypeBadge,
} from './LeavePresentation';
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
  balances?: Array<{
    leaveType: { id: number; code: string; name: string };
    requiresOperationalCoverage?: boolean;
    employeeCategory?: string;
  }>;
}

export function LeaveApplyModal({
  visible,
  onClose,
  onSuccess,
  token,
  currentUser,
  leaveTypes,
  balances,
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

  // Dynamic Official Duty Fields (OOD / ODE)
  const [dutyType, setDutyType] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [location, setLocation] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Restricted Holiday and Vacation selections
  const [restrictedHolidayId, setRestrictedHolidayId] = useState('');
  const [vacationPeriodId, setVacationPeriodId] = useState('');
  const [holidayPickerOpen, setHolidayPickerOpen] = useState(false);
  const [vacationPickerOpen, setVacationPickerOpen] = useState(false);

  const selectedType =
    leaveTypes.find((t) => t.id === selectedTypeId) || leaveTypes[0];
  const code = selectedType?.code || '';
  const isOfficialDuty = code === 'OOD' || code === 'ODE';
  const isMedical = code === 'SPL_ML';
  const isRestrictedHoliday = code === 'RH';
  const isVacation = code === 'VL';
  const isNonTeaching = currentUser.role === 'Non-Teaching Staff';

  const selectedBalance = balances?.find((b) => b.leaveType.id === selectedType?.id);
  const requiresOperationalCoverage = Boolean(
    selectedBalance?.requiresOperationalCoverage ?? (code === 'CL' || code === 'EL' || code === 'SPL_ML'),
  );

  const timetableQuery = useQuery({
    queryKey: ['timetable', currentUser.id, 'entries'],
    queryFn: () => getTimetableEntries(token, { facultyId: currentUser.id }),
    enabled: !!token && !!currentUser.id && !isNonTeaching,
  });

  const affectedClasses = useMemo(() => {
    if (isNonTeaching || !timetableQuery.data || !startDate || !endDate || endDate < startDate)
      return [];
    const classes: {
      date: string;
      entry: TimetableEntryDto;
      periodTiming: string;
    }[] = [];
    const WEEKDAYS = [
      'SUN',
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
      'SAT',
    ] as const;
    for (
      let at = new Date(`${startDate}T00:00:00Z`);
      at <= new Date(`${endDate}T00:00:00Z`);
      at = new Date(at.getTime() + 86_400_000)
    ) {
      const day = WEEKDAYS[at.getUTCDay()];
      for (const entry of timetableQuery.data) {
        if (entry.day === day) {
          const startPeriod = JCET_PERIODS.find(
            (p) => p.number === entry.startPeriod,
          );
          const endPeriod = JCET_PERIODS.find(
            (p) => p.number === entry.endPeriod,
          );
          const periodTiming =
            startPeriod && endPeriod
              ? `${startPeriod.startTime}–${endPeriod.endTime}`
              : `Period ${entry.startPeriod}–${entry.endPeriod}`;
          classes.push({
            date: at.toISOString().slice(0, 10),
            entry,
            periodTiming,
          });
        }
      }
    }
    return classes;
  }, [timetableQuery.data, startDate, endDate, isNonTeaching]);

  const coverageRequired = isNonTeaching ? requiresOperationalCoverage : affectedClasses.length > 0;

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
      halfDay:
        isHalfDay &&
        selectedType?.allowHalfDay &&
        !isRestrictedHoliday &&
        !isVacation
          ? halfDaySession
          : null,
      reason,
      dutyType: isOfficialDuty ? dutyType : undefined,
      organisation: isOfficialDuty ? organisation : undefined,
      location: isOfficialDuty ? location : undefined,
      referenceNumber: isOfficialDuty ? referenceNumber : undefined,
      attachmentName: attachmentName || undefined,
      restrictedHolidayId: isRestrictedHoliday ? restrictedHolidayId : undefined,
      vacationPeriodId: isVacation ? vacationPeriodId : undefined,
      coverageRequired,
      operationalCoverageRole:
        isNonTeaching && coverageRequired
          ? (currentUser.role || 'Staff')
          : undefined,
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
      setDutyType('');
      setOrganisation('');
      setLocation('');
      setReferenceNumber('');
      setAttachmentName('');
      setRestrictedHolidayId('');
      setVacationPeriodId('');
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
            setDutyType('');
            setOrganisation('');
            setLocation('');
            setReferenceNumber('');
            setAttachmentName('');
            setRestrictedHolidayId('');
            setVacationPeriodId('');
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
                  <LeaveTypeBadge code={selectedType?.code || 'CL'} />
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

              {/* Dynamic Guidance Banner */}
              {isOfficialDuty && (
                <View style={styles.dynamicHelpBanner}>
                  <Icon name="check" size={16} color="#0F766E" />
                  <Text style={styles.dynamicHelpText}>
                    {code === 'OOD'
                      ? 'Use OOD for official college, VTU, university or academic assignments.'
                      : 'Use ODE for university examination, valuation, and invigilation duties.'}
                  </Text>
                </View>
              )}
              {isMedical && (
                <View style={[styles.dynamicHelpBanner, styles.medicalBanner]}>
                  <Icon name="document" size={16} color="#BE123C" />
                  <Text style={[styles.dynamicHelpText, { color: '#BE123C' }]}>
                    Supporting medical documentation may be required.
                  </Text>
                </View>
              )}
              {isRestrictedHoliday && (
                <View style={[styles.dynamicHelpBanner, styles.rhBanner]}>
                  <Icon name="clock" size={16} color="#B45309" />
                  <Text style={[styles.dynamicHelpText, { color: '#B45309' }]}>
                    Restricted Holiday — select an approved institutional holiday.
                  </Text>
                </View>
              )}
              {isVacation && (
                <View style={[styles.dynamicHelpBanner, styles.vlBanner]}>
                  <Icon name="school" size={16} color="#0369A1" />
                  <Text style={[styles.dynamicHelpText, { color: '#0369A1' }]}>
                    Vacation Leave follows JCET institutional vacation schedules.
                  </Text>
                </View>
              )}

              {/* Restricted Holiday Picker */}
              {isRestrictedHoliday && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Eligible restricted holiday</Text>
                  <Button
                    variant="outline"
                    disabled={working}
                    onPress={() => setHolidayPickerOpen(!holidayPickerOpen)}
                  >
                    <Text style={[styles.body, styles.grow]}>
                      {restrictedHolidayId
                        ? JCET_RESTRICTED_HOLIDAYS.find(
                            (h) => h.id === restrictedHolidayId,
                          )?.name
                        : 'Choose restricted holiday…'}
                    </Text>
                    <Icon
                      name="next"
                      color={theme.colors.mutedForeground}
                      size={theme.spacing.lg}
                    />
                  </Button>
                  {holidayPickerOpen && (
                    <View style={styles.typeOptions}>
                      {JCET_RESTRICTED_HOLIDAYS.map((holiday) => (
                        <Button
                          key={holiday.id}
                          variant={
                            holiday.id === restrictedHolidayId
                              ? 'secondary'
                              : 'text'
                          }
                          disabled={working}
                          onPress={() => {
                            setRestrictedHolidayId(holiday.id);
                            setStartDate(holiday.date);
                            setEndDate(holiday.date);
                            setHolidayPickerOpen(false);
                            if (!reason)
                              setReason(
                                `Restricted Holiday: ${holiday.name}`,
                              );
                          }}
                        >
                          {holiday.name} · {holiday.date}
                        </Button>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Vacation Period Picker */}
              {isVacation && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Eligible vacation period</Text>
                  <Button
                    variant="outline"
                    disabled={working}
                    onPress={() => setVacationPickerOpen(!vacationPickerOpen)}
                  >
                    <Text style={[styles.body, styles.grow]}>
                      {vacationPeriodId
                        ? JCET_VACATION_PERIODS.find(
                            (v) => v.id === vacationPeriodId,
                          )?.name
                        : 'Choose vacation period…'}
                    </Text>
                    <Icon
                      name="next"
                      color={theme.colors.mutedForeground}
                      size={theme.spacing.lg}
                    />
                  </Button>
                  {vacationPickerOpen && (
                    <View style={styles.typeOptions}>
                      {JCET_VACATION_PERIODS.map((vp) => (
                        <Button
                          key={vp.id}
                          variant={
                            vp.id === vacationPeriodId ? 'secondary' : 'text'
                          }
                          disabled={working}
                          onPress={() => {
                            setVacationPeriodId(vp.id);
                            setStartDate(vp.startDate);
                            setEndDate(vp.endDate);
                            setVacationPickerOpen(false);
                            if (!reason)
                              setReason(`Vacation Leave: ${vp.name}`);
                          }}
                        >
                          {vp.name} ({vp.startDate} to {vp.endDate})
                        </Button>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Dynamic Official Duty / Examination Duty Fields */}
              {isOfficialDuty && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    {code === 'OOD'
                      ? 'Official duty details'
                      : 'Examination duty details'}
                  </Text>
                  <Text style={styles.detail}>Duty type</Text>
                  <View style={styles.chipRow}>
                    {(code === 'OOD' ? OOD_DUTY_TYPES : ODE_DUTY_TYPES).map(
                      (duty) => (
                        <Button
                          key={duty}
                          variant={dutyType === duty ? 'secondary' : 'outline'}
                          disabled={working}
                          onPress={() => setDutyType(duty)}
                        >
                          {duty}
                        </Button>
                      ),
                    )}
                  </View>
                  <Input
                    disabled={working}
                    label="Organisation / Institution"
                    placeholder="e.g. Visvesvaraya Technological University (VTU)"
                    value={organisation}
                    onChangeText={setOrganisation}
                  />
                  <Input
                    disabled={working}
                    label="Location / Campus"
                    placeholder="e.g. Belagavi Campus / Hubballi Center"
                    value={location}
                    onChangeText={setLocation}
                  />
                  <Input
                    disabled={working}
                    label="Reference / Order number"
                    placeholder="e.g. VTU/EXAM/2026/412"
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                  />
                  <View style={styles.attachmentBox}>
                    <Icon
                      name="document"
                      size={theme.spacing.lg}
                      color={theme.colors.primary}
                    />
                    <View style={styles.grow}>
                      <Text style={styles.sectionLabel}>
                        Supporting order / document
                      </Text>
                      <Text style={styles.detail}>
                        {attachmentName || 'No document attached yet'}
                      </Text>
                    </View>
                    <Button
                      variant="outline"
                      disabled={working}
                      onPress={() => {
                        setAttachmentName(
                          code === 'OOD'
                            ? 'VTU_Official_Duty_Order.pdf'
                            : 'VTU_Exam_Duty_Order.pdf',
                        );
                      }}
                    >
                      {attachmentName ? 'Change' : 'Attach order'}
                    </Button>
                  </View>
                </View>
              )}

              {/* Medical Attachment for SPL_ML */}
              {isMedical && (
                <View style={styles.section}>
                  <View style={styles.attachmentBox}>
                    <Icon
                      name="document"
                      size={theme.spacing.lg}
                      color="#BE123C"
                    />
                    <View style={styles.grow}>
                      <Text style={styles.sectionLabel}>
                        Medical certificate / document
                      </Text>
                      <Text style={styles.detail}>
                        {attachmentName || 'Attach medical consultation note'}
                      </Text>
                    </View>
                    <Button
                      variant="outline"
                      disabled={working}
                      onPress={() => {
                        setAttachmentName('Medical_Certificate_Hospital.pdf');
                      }}
                    >
                      {attachmentName ? 'Change' : 'Attach certificate'}
                    </Button>
                  </View>
                </View>
              )}

              {!isRestrictedHoliday && !isVacation && (
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
              )}

              <View
                style={[styles.dateInputsRow, fontScale > 1.3 && styles.column]}
              >
                <View style={styles.dateCol}>
                  <DateField
                    disabled={working || isRestrictedHoliday || isVacation}
                    label="Start date"
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>
                <View style={styles.dateCol}>
                  <DateField
                    disabled={working || isRestrictedHoliday || isVacation}
                    label="End date"
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
              </View>

              {selectedType?.allowHalfDay && !isRestrictedHoliday && !isVacation && (
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

              {/* Real-time Workforce Impact Detection */}
              <View style={styles.impact}>
                <Icon name={isNonTeaching ? 'coverage' : 'school'} color={theme.colors.primary} />
                <View style={styles.grow}>
                  <Text style={styles.impactTitle}>
                    {isNonTeaching ? 'Operational Coverage Impact' : 'Academic Impact'}
                  </Text>
                  {isNonTeaching ? (
                    <>
                      <Text style={styles.impactCount}>
                        {requiresOperationalCoverage
                          ? 'Operational staff coverage required'
                          : 'No operational coverage needed'}
                      </Text>
                      <Text style={styles.affectedMeta}>
                        {requiresOperationalCoverage
                          ? 'Does not affect teaching classes. Operational staff responsibilities routed to HR Admin and supervisor.'
                          : 'Non-teaching leave type exempt from operational coverage requirements.'}
                      </Text>
                      <View style={styles.coverageBadge}>
                        <Text style={styles.coverageBadgeText}>
                          {requiresOperationalCoverage
                            ? 'Operational coverage required'
                            : 'No coverage needed'}
                        </Text>
                      </View>
                    </>
                  ) : affectedClasses.length > 0 ? (
                    <>
                      <Text style={styles.impactCount}>
                        {affectedClasses.length} scheduled{' '}
                        {affectedClasses.length === 1
                          ? 'class is'
                          : 'classes are'}{' '}
                        affected.
                      </Text>
                      <View style={styles.affectedList}>
                        {affectedClasses.slice(0, 4).map((item, idx) => (
                          <View
                            key={`${item.date}-${item.entry.id}-${idx}`}
                            style={styles.affectedItem}
                          >
                            <Text style={styles.affectedTime}>
                              {item.periodTiming}
                            </Text>
                            <Text style={styles.affectedSubject}>
                              {item.entry.subject.code} ·{' '}
                              {item.entry.subject.name}
                            </Text>
                            <Text style={styles.affectedMeta}>
                              Sem {item.entry.semester}
                              {item.entry.section} · {item.entry.room.name}
                            </Text>
                          </View>
                        ))}
                        {affectedClasses.length > 4 && (
                          <Text style={styles.detail}>
                            +{affectedClasses.length - 4} more scheduled
                            classes
                          </Text>
                        )}
                      </View>
                      <View style={styles.coverageBadge}>
                        <Text style={styles.coverageBadgeText}>
                          Coverage required
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.noImpactText}>
                      No scheduled classes affected
                    </Text>
                  )}
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
  impactCount: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
  },
  affectedList: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  affectedItem: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.control,
    gap: 2,
  },
  affectedTime: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  affectedSubject: {
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  affectedMeta: {
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  coverageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.control,
    marginTop: theme.spacing.xs,
  },
  coverageBadgeText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: '#B45309',
  },
  noImpactText: {
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
    marginTop: 2,
  },
  dynamicHelpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: '#CCFBF1',
    borderRadius: theme.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#99F6E4',
  },
  dynamicHelpText: {
    flex: 1,
    fontSize: theme.typography.caption,
    color: '#0F766E',
    fontWeight: '500',
    lineHeight: theme.typography.captionLineHeight,
  },
  medicalBanner: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  rhBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  vlBanner: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
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
