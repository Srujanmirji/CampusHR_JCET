import { Alert } from '../../lib/dialogs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  FacultyInitials,
  leaveDates,
  leaveDate,
} from '../leave/LeavePresentation';
import { Icon } from '../ui/Icon';
import { committedFeedback } from '../../lib/feedback';
import { getPeriods, formatPeriodTime } from '../../lib/timetable-api';
import { theme } from '../../lib/theme';
import { getSession, type AuthUser } from '../../lib/session';
import { uncertainLeaveWrite } from '../../lib/leave-api';
import {
  assignCoverage,
  assignmentSchema,
  getCoverageCandidates,
  getCoverageClasses,
  listCoverageLeave,
  undoCoverage,
  type AffectedClass,
} from '../../lib/substitution-api';
const slotKey = (slot: AffectedClass) => `${slot.date}:${slot.entry.id}`;
export function CoveragePanel({
  user,
  token,
}: {
  user: AuthUser;
  token: string;
}) {
  const client = useQueryClient();
  const [leaveId, setLeaveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<string | null>(null);
  const [noSubstitute, setNoSubstitute] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<{
    name: string;
    code: string;
    date: string;
    room: string;
    key: string;
    subject: string;
    section: string;
    periods: string;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [undo, setUndo] = useState<string | null>(null);
  const leaves = useQuery({
    queryKey: ['coverage', user.id, 'leaves'],
    queryFn: () => listCoverageLeave(user, token),
  });
  const detail = useQuery({
    queryKey: ['coverage', user.id, 'classes', leaveId],
    queryFn: () => getCoverageClasses(user, token, leaveId!),
    enabled: !!leaveId,
  });
  const slot = detail.data?.classes.find((item) => slotKey(item) === selected);
  const periods = useQuery({
    queryKey: ['timetable', user.id, 'coverage-periods'],
    queryFn: () => getPeriods(token),
    enabled:
      !!slot && user.permissions.some((p) => p.startsWith('timetable.read')),
    retry: false,
  });
  const candidates = useQuery({
    queryKey: ['coverage', user.id, 'candidates', leaveId, selected],
    queryFn: () =>
      getCoverageCandidates(user, token, leaveId!, slot!.entry.id, slot!.date),
    enabled: !!slot && !slot.coverage,
  });
  const refresh = useCallback(
    () => client.invalidateQueries({ queryKey: ['coverage', user.id] }),
    [client, user.id],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  function resetSelection() {
    setSelected(null);
    setCandidate(null);
    setNote('');
    setUndo(null);
    setNoSubstitute(false);
  }
  function invalidate() {
    void refresh();
    for (const key of ['dated-duties', 'home', 'timetable', 'notifications'])
      void client.invalidateQueries({ queryKey: [key] });
  }
  async function act(remove: boolean) {
    if (busy.current || uncertain || !slot || !leaveId) return;
    if (getSession().user?.id !== user.id) return;
    setNotice('');
    const payload = assignmentSchema.safeParse({
      leaveRequestId: leaveId,
      timetableEntryId: slot.entry.id,
      date: slot.date,
      substituteId: noSubstitute ? null : candidate,
      note: note.trim(),
    });
    if (!remove) {
      if (!payload.success) {
        setNotice(payload.error.issues[0].message);
        return;
      }
      if (
        !noSubstitute &&
        (!candidates.isSuccess ||
          !candidates.data.some(
            (c) => c.faculty.id === candidate && c.eligible,
          ))
      ) {
        setNotice(
          'Choose an eligible candidate from the current server results.',
        );
        return;
      }
    }
    busy.current = true;
    setSending(true);
    try {
      if (remove) {
        if (!slot.coverage || undo !== slot.coverage.id) return;
        await undoCoverage(user, token, slot.coverage.id);
      } else {
        const result = await assignCoverage(user, token, payload.data!);
        if (getSession().user?.id === user.id) {
          client.setQueryData<Awaited<ReturnType<typeof getCoverageClasses>>>(
            ['coverage', user.id, 'classes', leaveId],
            (previous) =>
              previous
                ? {
                    ...previous,
                    classes: previous.classes.map((item) =>
                      slotKey(item) === slotKey(slot)
                        ? { ...item, coverage: result }
                        : item,
                    ),
                  }
                : previous,
          );
          setSaved({
            name: result.substitute?.name ?? 'No substitute needed',
            code: slot.entry.subject.code,
            date: slot.date,
            room: slot.entry.room.name,
            key: slotKey(slot),
            subject: slot.entry.subject.name,
            section: `${slot.entry.department.code} ${slot.entry.semester}${slot.entry.section}`,
            periods: `Periods ${slot.entry.startPeriod}–${slot.entry.endPeriod}`,
          });
          committedFeedback();
        }
      }
      if (getSession().user?.id !== user.id) return;
      setNotice(
        remove
          ? 'Coverage removed. The recipient’s duty will disappear after refresh.'
          : '',
      );
      resetSelection();
      invalidate();
    } catch (error) {
      if (uncertainLeaveWrite(error)) {
        setUncertain(true);
        setNotice(
          'Outcome unknown. Your note is retained. Check recorded coverage before taking another action.',
        );
      } else
        setNotice(
          error instanceof Error ? error.message : 'Coverage action failed.',
        );
      invalidate();
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  async function reconcile() {
    if (busy.current || !leaveId) return;
    busy.current = true;
    setSending(true);
    try {
      const result = await getCoverageClasses(user, token, leaveId);
      if (getSession().user?.id !== user.id) return;
      client.setQueryData(['coverage', user.id, 'classes', leaveId], result);
      const current = result.classes.find((item) => slotKey(item) === selected);
      if (!current) {
        setNotice(
          'This class is no longer available. Contact your administrator before proceeding.',
        );
        return;
      }
      setUncertain(false);
      setUndo(null);
      invalidate();
      setNotice(
        current.coverage
          ? `Recorded coverage: ${current.coverage.substitute?.name ?? 'No substitute needed'}. Review it before further changes.`
          : 'No coverage is currently recorded. Refresh candidates before assigning.',
      );
      setCandidate(null);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not check recorded coverage.',
      );
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  const errorText = (error: Error) =>
    error.name === 'ZodError'
      ? 'Unexpected coverage response. Refresh or contact your administrator.'
      : error.message;
  const covered = detail.data?.classes.filter((item) => !!item.coverage).length;
  const remaining = detail.data?.classes.filter(
    (item) => !item.coverage,
  ).length;
  const nextClass = detail.data?.classes.find(
    (item) => !item.coverage && slotKey(item) !== saved?.key,
  );
  return (
    <View testID="coverage-panel" style={styles.stack}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text accessibilityRole="header" style={styles.heading}>
            {saved
              ? 'Coverage confirmation'
              : selected
                ? 'Find cover'
                : leaveId
                  ? 'Affected classes'
                  : 'Approved leave'}
          </Text>
          {!saved && (
            <Text style={styles.detail}>
              {selected
                ? 'Choose the right faculty member for this class.'
                : 'Dated classes for approved leave in your department.'}
            </Text>
          )}
        </View>
        <Button
          variant="text"
          accessibilityLabel="Refresh coverage"
          onPress={() => void refresh()}
          disabled={sending}
        >
          <Icon name="refresh" color={theme.colors.primary} />
        </Button>
      </View>
      {!!leaveId && (
        <Button
          variant="text"
          disabled={sending || uncertain}
          style={styles.back}
          onPress={() => {
            if (saved) setSaved(null);
            else if (selected) resetSelection();
            else setLeaveId(null);
          }}
        >
          Back to {saved || selected ? 'affected classes' : 'approved leave'}
        </Button>
      )}
      {!!saved && (
        <View style={styles.stack}>
          <View style={styles.success}>
            <View style={styles.successMark}>
              <Icon
                name="check"
                color={theme.colors.surface}
                size={theme.spacing.xxl}
              />
            </View>
            <Text
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              style={styles.successTitle}
            >
              Coverage confirmed
            </Text>
            <Text style={styles.successText}>
              {saved.name === 'No substitute needed'
                ? 'The class arrangement is recorded.'
                : `${saved.name} will cover this class.`}
            </Text>
          </View>
          <View style={styles.assignment}>
            {saved.name !== 'No substitute needed' && (
              <View style={styles.person}>
                <FacultyInitials name={saved.name} />
                <Text style={[styles.candidateName, styles.grow]}>
                  {saved.name}
                </Text>
              </View>
            )}
            <View style={styles.factRow}>
              <Icon
                name="school"
                color={theme.colors.primary}
                size={theme.spacing.lg}
              />
              <View style={styles.grow}>
                <Text style={styles.body}>{saved.code}</Text>
                <Text style={styles.detail}>{saved.subject}</Text>
              </View>
            </View>
            <View style={styles.factRow}>
              <Icon
                name="timetable"
                color={theme.colors.primary}
                size={theme.spacing.lg}
              />
              <Text style={[styles.body, styles.grow]}>
                {leaveDate(saved.date)} · {saved.periods}
              </Text>
            </View>
            <View style={styles.factRow}>
              <Icon
                name="location"
                color={theme.colors.primary}
                size={theme.spacing.lg}
              />
              <Text style={[styles.body, styles.grow]}>
                {saved.section} · {saved.room}
              </Text>
            </View>
            <View style={styles.delivery}>
              <Icon name="info" color={theme.colors.primary} />
              <View style={styles.grow}>
                <Text style={styles.deliveryTitle}>
                  Assignment saved · Delivery not confirmed
                </Text>
                <Text style={styles.deliveryText}>
                  Notification delivery has not been confirmed. Contact the
                  faculty member directly if urgent.
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.progress}>
            <Text style={styles.sectionTitle}>Coverage progress</Text>
            {detail.isFetching ? (
              <Text style={styles.detail}>Refreshing recorded coverage…</Text>
            ) : detail.isError ? (
              <>
                <Text style={styles.error}>
                  Progress could not be refreshed.
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => void detail.refetch()}
                >
                  Refresh progress
                </Button>
              </>
            ) : (
              detail.isSuccess && (
                <>
                  <Text style={styles.body}>
                    {covered} of {detail.data.classes.length} classes covered
                  </Text>
                  <Text style={styles.detail}>
                    {remaining === 0
                      ? 'All affected classes have a recorded arrangement.'
                      : `${remaining} ${remaining === 1 ? 'class still needs' : 'classes still need'} cover.`}
                  </Text>
                </>
              )
            )}
          </View>
          <Button
            disabled={detail.isFetching || detail.isError}
            onPress={() => {
              setSaved(null);
              if (nextClass) setSelected(slotKey(nextClass));
            }}
          >
            {nextClass ? 'Continue to next class' : 'View affected classes'}
          </Button>
        </View>
      )}
      {!!notice && (
        <View style={styles.notice}>
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {notice}
          </Text>
        </View>
      )}
      {uncertain && (
        <Button disabled={sending} onPress={() => void reconcile()}>
          Check recorded coverage
        </Button>
      )}
      {!leaveId && leaves.isFetching && (
        <Text style={styles.detail}>Loading approved leave…</Text>
      )}
      {!leaveId &&
        (leaves.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorText(leaves.error)}
          </Text>
        ) : (
          leaves.isSuccess && (
            <>
              {leaves.data.length === 0 && (
                <View style={styles.empty}>
                  <Icon
                    name="coverage"
                    color={theme.colors.violet}
                    size={theme.spacing.xl}
                  />
                  <Text style={styles.sectionTitle}>No classes need cover</Text>
                  <Text style={styles.detail}>
                    No approved leave with affected classes is available.
                  </Text>
                </View>
              )}
              {leaves.data.length === 300 && (
                <Text style={styles.detail}>
                  The API may omit older leave beyond its 300-record limit.
                </Text>
              )}
              {leaves.data.map((row) => (
                <View key={row.leave.id} style={styles.listRow}>
                  <View style={styles.person}>
                    <FacultyInitials name={row.leave.employee.name} />
                    <View style={styles.grow}>
                      <Text style={styles.candidateName}>
                        {row.leave.employee.name}
                      </Text>
                      <Text style={styles.detail}>
                        {row.leave.employee.employeeCode} ·{' '}
                        {row.leave.leaveType.name}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.body}>
                    {leaveDates(row.leave.startDate, row.leave.endDate)} ·{' '}
                    {row.leave.days} {row.leave.days === 1 ? 'day' : 'days'}
                    {row.leave.halfDay
                      ? ` · ${row.leave.halfDay === 'FIRST' ? 'First' : 'Second'} half`
                      : ''}
                  </Text>
                  <View style={styles.header}>
                    <Text style={[styles.detail, styles.grow]}>
                      {row.covered} of {row.classes} classes covered
                    </Text>
                    <Button
                      variant="secondary"
                      disabled={sending || uncertain}
                      accessibilityLabel={`View affected classes for ${row.leave.employee.name}`}
                      onPress={() => {
                        setLeaveId(row.leave.id);
                        resetSelection();
                        setNotice('');
                      }}
                    >
                      View classes
                    </Button>
                  </View>
                </View>
              ))}
            </>
          )
        ))}
      {leaveId && !selected && !saved && (
        <>
          {detail.isFetching && (
            <Text style={styles.detail}>Loading affected classes…</Text>
          )}
          {detail.isError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorText(detail.error)}
            </Text>
          ) : (
            detail.isSuccess && (
              <>
                <View style={styles.person}>
                  <FacultyInitials name={detail.data.leave.employee.name} />
                  <View style={styles.grow}>
                    <Text style={styles.candidateName}>
                      {detail.data.leave.employee.name}
                    </Text>
                    <Text style={styles.detail}>
                      {leaveDates(
                        detail.data.leave.startDate,
                        detail.data.leave.endDate,
                      )}
                    </Text>
                  </View>
                </View>
                {detail.data.classes.length === 0 && (
                  <Text style={styles.detail}>No affected classes remain.</Text>
                )}
                {detail.data.classes.map((item) => (
                  <View key={slotKey(item)} style={styles.listRow}>
                    <View style={styles.header}>
                      <Text style={[styles.sectionTitle, styles.grow]}>
                        {item.entry.subject.code}
                      </Text>
                      <Text
                        style={
                          item.coverage ? styles.available : styles.unavailable
                        }
                      >
                        {item.coverage ? 'Covered' : 'Needs cover'}
                      </Text>
                    </View>
                    <Text style={styles.body}>{item.entry.subject.name}</Text>
                    <Text style={styles.detail}>
                      {leaveDate(item.date)} · {item.entry.day} · Periods{' '}
                      {item.entry.startPeriod}–{item.entry.endPeriod} ·{' '}
                      {item.hours} hours
                    </Text>
                    <Text style={styles.detail}>
                      {item.entry.department.code} {item.entry.semester}
                      {item.entry.section}
                      {item.entry.batch
                        ? ` · Batch ${item.entry.batch}`
                        : ''} · {item.entry.room.name}
                    </Text>
                    {item.coverage && (
                      <>
                        <Text style={styles.body}>
                          {item.coverage.substitute?.name ??
                            'No substitute needed'}
                        </Text>
                        {!!item.coverage.note && (
                          <Text style={styles.detail}>
                            {item.coverage.note}
                          </Text>
                        )}
                      </>
                    )}
                    <Button
                      variant="secondary"
                      disabled={sending || uncertain}
                      accessibilityLabel={`Manage ${item.entry.subject.code}, ${item.date}, periods ${item.entry.startPeriod} to ${item.entry.endPeriod}`}
                      onPress={() => {
                        resetSelection();
                        setSelected(slotKey(item));
                        setNotice('');
                      }}
                    >
                      {item.coverage ? 'Review coverage' : 'Find cover'}
                    </Button>
                  </View>
                ))}
              </>
            )
          )}
        </>
      )}
      {slot && detail.isSuccess && !detail.isError && !saved && (
        <>
          <View style={styles.classContext}>
            <View style={styles.factRow}>
              <Icon name="school" color={theme.colors.violet} />
              <View style={styles.grow}>
                <Text style={styles.sectionTitle}>
                  {slot.entry.subject.code}
                </Text>
                <Text style={styles.detail}>{slot.entry.subject.name}</Text>
              </View>
            </View>
            <View style={styles.factRow}>
              <Icon
                name="timetable"
                color={theme.colors.violet}
                size={theme.spacing.lg}
              />
              <Text style={[styles.body, styles.grow]}>
                {leaveDate(slot.date)} ·{' '}
                {(() => {
                  const first = periods.data?.find(
                      (period) => period.number === slot.entry.startPeriod,
                    ),
                    last = periods.data?.find(
                      (period) => period.number === slot.entry.endPeriod,
                    );
                  return first && last
                    ? formatPeriodTime(first.startTime, last.endTime)
                    : `Periods ${slot.entry.startPeriod}–${slot.entry.endPeriod}`;
                })()}
              </Text>
            </View>
            <View style={styles.factRow}>
              <Icon
                name="location"
                color={theme.colors.violet}
                size={theme.spacing.lg}
              />
              <Text style={[styles.body, styles.grow]}>
                {slot.entry.department.code} {slot.entry.semester}
                {slot.entry.section}
                {slot.entry.batch ? ` · Batch ${slot.entry.batch}` : ''} ·{' '}
                {slot.entry.room.name}
              </Text>
            </View>
            <View style={styles.factRow}>
              <Icon
                name="profile"
                color={theme.colors.violet}
                size={theme.spacing.lg}
              />
              <Text style={[styles.detail, styles.grow]}>
                For {detail.data.leave.employee.name} · Leave approved
              </Text>
            </View>
          </View>
          {slot.coverage ? (
            <View style={styles.stack}>
              <Text style={styles.sectionTitle}>Recorded coverage</Text>
              <Text style={styles.body}>
                {slot.coverage.substitute?.name ?? 'No substitute needed'}
              </Text>
              {!!slot.coverage.note && (
                <Text style={styles.detail}>{slot.coverage.note}</Text>
              )}
              {undo === slot.coverage.id ? (
                <>
                  <Text style={styles.detail}>
                    Remove this coverage? An assigned substitute will lose this
                    dated duty.
                  </Text>
                  <Button
                    variant="danger"
                    disabled={sending || uncertain}
                    loading={sending}
                    onPress={() => void act(true)}
                  >
                    Confirm undo coverage
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={sending}
                    onPress={() => setUndo(null)}
                  >
                    Keep coverage
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  disabled={sending || uncertain}
                  onPress={() => setUndo(slot.coverage!.id)}
                >
                  Undo coverage
                </Button>
              )}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Recommended faculty
                </Text>
                <Text style={styles.detail}>
                  Suggestions use recorded subject experience, availability,
                  department and workload. Eligibility is checked again when you
                  confirm.
                </Text>
              </View>
              {candidates.isFetching && (
                <Text style={styles.detail}>Loading current candidates…</Text>
              )}
              {candidates.isError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {errorText(candidates.error)}
                </Text>
              ) : (
                candidates.isSuccess && (
                  <>
                    {candidates.data.length === 0 && (
                      <Text style={styles.detail}>
                        No candidates are currently available. You can document
                        handling without a substitute.
                      </Text>
                    )}
                    {candidates.data.map((faculty) => {
                      const chosen = candidate === faculty.faculty.id;
                      const subjectFit = faculty.points.subject > 0;
                      return (
                        <View
                          key={faculty.faculty.id}
                          style={[
                            styles.candidate,
                            chosen && styles.candidateSelected,
                          ]}
                        >
                          <View style={styles.person}>
                            <FacultyInitials name={faculty.faculty.name} />
                            <View style={styles.grow}>
                              <Text style={styles.candidateName}>
                                {faculty.faculty.name}
                              </Text>
                              <Text style={styles.detail}>
                                {faculty.faculty.designation} ·{' '}
                                {faculty.faculty.department.code}
                              </Text>
                              <Text
                                style={
                                  faculty.eligible
                                    ? styles.available
                                    : styles.unavailable
                                }
                              >
                                {faculty.eligible
                                  ? 'Available for assignment'
                                  : 'Unavailable'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.factRow}>
                            <Icon name="clock" size={theme.spacing.lg} />
                            <Text style={[styles.detail, styles.grow]}>
                              {faculty.hoursAfter} teaching hours after
                              assignment
                              {faculty.maxHours === null
                                ? ' · Maximum not set'
                                : ` / ${faculty.maxHours} maximum`}
                            </Text>
                          </View>
                          <View style={styles.factRow}>
                            <Icon name="school" size={theme.spacing.lg} />
                            <Text style={[styles.detail, styles.grow]}>
                              {subjectFit
                                ? 'Subject teaching experience recorded'
                                : 'Subject teaching experience not recorded'}
                              {faculty.points.experience > 0
                                ? ' · Faculty experience recorded'
                                : ' · Review faculty experience'}
                            </Text>
                          </View>
                          {!!faculty.reason && (
                            <Text style={styles.detail}>{faculty.reason}</Text>
                          )}
                          {!faculty.eligible && !faculty.reason && (
                            <Text style={styles.detail}>
                              This faculty member is not eligible for this dated
                              class.
                            </Text>
                          )}
                          <View style={styles.header}>
                            {subjectFit && faculty.eligible ? (
                              <Text style={[styles.subjectFit, styles.grow]}>
                                Strong subject fit
                              </Text>
                            ) : (
                              <View style={styles.grow} />
                            )}
                            <Button
                              accessibilityLabel={`${chosen ? 'Selected' : 'Select'} ${faculty.faculty.name}`}
                              variant={chosen ? 'primary' : 'outline'}
                              disabled={
                                !faculty.eligible ||
                                sending ||
                                uncertain ||
                                candidates.isFetching
                              }
                              onPress={() => {
                                setCandidate(faculty.faculty.id);
                                setNoSubstitute(false);
                              }}
                            >
                              {chosen
                                ? 'Selected'
                                : faculty.eligible
                                  ? 'Select'
                                  : 'Unavailable'}
                            </Button>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )
              )}
              <View style={styles.arrangement}>
                <Button
                  variant={noSubstitute ? 'secondary' : 'outline'}
                  disabled={sending || uncertain}
                  onPress={() => {
                    setNoSubstitute(true);
                    setCandidate(null);
                  }}
                >
                  No substitute needed{noSubstitute ? ' · Selected' : ''}
                </Button>
                <Input
                  label={
                    noSubstitute
                      ? 'Class arrangement (required)'
                      : 'Coverage note (optional)'
                  }
                  multiline
                  maxLength={500}
                  autoCapitalize="sentences"
                  value={note}
                  onChangeText={setNote}
                  disabled={sending}
                  helperText={
                    noSubstitute
                      ? 'Explain how the class will be handled in at least 3 characters.'
                      : 'A note is recorded with this dated assignment.'
                  }
                />
                <Text style={styles.detail}>
                  {noSubstitute
                    ? 'Confirm that this class can proceed without an assigned substitute.'
                    : candidate
                      ? `Selected: ${candidates.data?.find((item) => item.faculty.id === candidate)?.faculty.name ?? 'Refresh candidates'}. Confirm to assign this dated class.`
                      : 'Select an eligible candidate or document that no substitute is needed.'}
                </Text>
                <Button
                  disabled={
                    sending ||
                    uncertain ||
                    (!candidate && !noSubstitute) ||
                    (!noSubstitute &&
                      (candidates.isError || candidates.isFetching))
                  }
                  loading={sending}
                  onPress={() =>
                    Alert.alert(
                      'Confirm assignment',
                      `${noSubstitute ? 'No substitute needed' : candidates.data?.find((item) => item.faculty.id === candidate)?.faculty.name}\n${slot.entry.subject.code} · ${slot.date}\nPeriods ${slot.entry.startPeriod}–${slot.entry.endPeriod} · ${slot.entry.room.name}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Confirm assignment',
                          onPress: () => void act(false),
                        },
                      ],
                    )
                  }
                >
                  Confirm coverage
                </Button>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: theme.spacing.page },
  section: { gap: theme.spacing.sm },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  grow: { flex: 1, gap: theme.spacing.xs },
  heading: {
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.title,
    color: theme.colors.foreground,
  },
  sectionTitle: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  candidateName: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  body: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.foreground,
  },
  detail: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.mutedForeground,
  },
  error: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
    color: theme.colors.errorInk,
  },
  back: { alignSelf: 'flex-start' },
  success: {
    gap: theme.spacing.section,
    paddingVertical: theme.spacing.page,
    alignItems: 'center',
    backgroundColor: theme.colors.mintContainer,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.spacing.section,
  },
  successMark: {
    width: theme.sizes.tapTarget + theme.spacing.page,
    height: theme.sizes.tapTarget + theme.spacing.page,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.mintInk,
  },
  successTitle: {
    fontSize: theme.typography.greeting,
    fontWeight: '600',
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  successText: {
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
    color: theme.colors.mintInk,
    textAlign: 'center',
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  assignment: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.lg,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  delivery: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.section,
    borderRadius: theme.radius.field,
    backgroundColor: theme.colors.blueContainer,
  },
  deliveryTitle: {
    fontSize: theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  deliveryText: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
    color: theme.colors.primary,
  },
  progress: { gap: theme.spacing.sm },
  notice: {
    padding: theme.spacing.section,
    borderRadius: theme.radius.field,
    backgroundColor: theme.colors.muted,
  },
  empty: { paddingVertical: theme.spacing.page, gap: theme.spacing.md },
  listRow: {
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  available: {
    fontSize: theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.mintInk,
  },
  unavailable: {
    fontSize: theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.amberInk,
  },
  classContext: {
    padding: theme.spacing.section,
    gap: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.violetContainer,
  },
  candidate: {
    padding: theme.spacing.section,
    gap: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  candidateSelected: {
    borderColor: theme.colors.primary,
  },
  subjectFit: {
    fontSize: theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.mintInk,
  },
  arrangement: {
    gap: theme.spacing.section,
    paddingTop: theme.spacing.section,
  },
});
