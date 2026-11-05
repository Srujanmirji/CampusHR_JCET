import { passwordIsValid, passwordProblem } from '@campushr/password-policy';
import { PasswordRequirements } from './PasswordRequirements';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError, changeOwnPassword } from '../../lib/session';
import { theme } from '../../lib/theme';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { styles } from './ProfileDetails';
export function PasswordForm() {
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [sessionsNotice, setSessionsNotice] = useState('');
  const [otherSignedOut, setOtherSignedOut] = useState(false);
  const guard = useRef(false),
    generation = useRef(0);
  const clear = useCallback(() => {
    setCurrent('');
    setNext('');
    setConfirm('');
  }, []);
  useFocusEffect(
    useCallback(
      () => () => {
        generation.current++;
        if (guard.current) {
          setUncertain(true);
          setNotice(
            'Password change may still be processing. Check sign-in before another attempt.',
          );
        }
        clear();
      },
      [clear],
    ),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        generation.current++;
        if (guard.current) {
          setUncertain(true);
          setNotice(
            'Password change may still be processing. Check sign-in before another attempt.',
          );
        }
        clear();
      }
    });
    return () => listener.remove();
  }, [clear]);
  async function save() {
    if (guard.current || uncertain) return;
    if (!passwordIsValid(next)) {
      setNotice(passwordProblem(next));
      return;
    }
    if (next === current) {
      setNotice('Choose a password different from your current one.');
      return;
    }
    if (next !== confirm) {
      setNotice('The new passwords do not match.');
      return;
    }
    const own = generation.current;
    guard.current = true;
    setBusy(true);
    setNotice('');
    try {
      await changeOwnPassword(current, next);
      if (own === generation.current) {
        clear();
        setNotice(
          'Password changed. Your other sessions have been signed out.',
        );
      }
    } catch (error) {
      if (own !== generation.current) return;
      const unknown =
        !(error instanceof ApiError) ||
        error.status >= 500 ||
        error.status === 0;
      setUncertain(unknown);
      clear();
      setNotice(
        unknown
          ? 'Password change was not confirmed. Check sign-in with the new password before another attempt.'
          : error.message,
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>
        Change password
      </Text>
      <Text style={styles.text}>
        Use lowercase, uppercase, a number and a special symbol. Your current
        session stays signed in.
      </Text>
      <Input
        autoComplete="current-password"
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        isPassword
        disabled={busy || uncertain}
      />
      <Input
        autoComplete="new-password"
        label="New password"
        value={next}
        onChangeText={setNext}
        isPassword
        disabled={busy || uncertain}
      />
      <PasswordRequirements password={next} />
      <Input
        autoComplete="new-password"
        label="Confirm new password"
        helperText={
          next && next === current
            ? 'Choose a password different from your current one.'
            : confirm
              ? next === confirm
                ? 'Passwords match.'
                : 'Passwords do not match yet.'
              : 'Enter the same new password again.'
        }
        value={confirm}
        onChangeText={setConfirm}
        error={
          notice === 'The new passwords do not match.' ? notice : undefined
        }
        isPassword
        disabled={busy || uncertain}
      />
      <Button
        onPress={() => void save()}
        loading={busy}
        disabled={
          uncertain ||
          !current ||
          !passwordIsValid(next) ||
          next !== confirm ||
          next === current
        }
      >
        {busy ? 'Changing password…' : 'Change password'}
      </Button>
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {notice}
        </Text>
      )}
      {uncertain && (
        <Button
          variant="outline"
          onPress={() => {
            clear();
            setUncertain(false);
            setNotice(
              'Enter the current password only after checking your sign-in.',
            );
          }}
        >
          Clear password form
        </Button>
      )}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          Device authentication
        </Text>
        <View style={styles.recordGroup}>
          <View
            style={[
              styles.recordRow,
              styles.divider,
              {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: theme.spacing.md, gap: 2 }}>
              <Text style={styles.body}>Biometric login</Text>
              <Text style={styles.groupLabel}>
                Unlock CampusHR with Face ID / Touch ID
              </Text>
            </View>
            <Switch
              accessibilityLabel="Biometric login"
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
            />
          </View>
          <View style={styles.recordRow}>
            <Text style={styles.groupLabel}>Last login</Text>
            <Text style={styles.body}>
              Today, 09:05 AM IST · JCET Campus Network
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.groupLabel}>
          Active sessions
        </Text>
        <View style={styles.recordGroup}>
          <View style={[styles.recordRow, !otherSignedOut && styles.divider]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={[styles.body, { fontWeight: '600' }]}>
                This device · CampusHR Mobile
              </Text>
              <Text
                style={{
                  fontSize: theme.typography.caption,
                  fontWeight: '600',
                  color: theme.colors.mintInk,
                }}
              >
                Current
              </Text>
            </View>
            <Text style={styles.groupLabel}>
              Hubballi, KA · Active right now
            </Text>
          </View>
          {!otherSignedOut && (
            <View style={styles.recordRow}>
              <Text style={styles.body}>Desktop Web · Chrome on macOS</Text>
              <Text style={styles.groupLabel}>
                JCET CSE Department Lab · Yesterday, 04:40 PM
              </Text>
            </View>
          )}
        </View>
        {!!sessionsNotice && (
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {sessionsNotice}
          </Text>
        )}
        <Button
          variant="outline"
          disabled={otherSignedOut}
          onPress={() => {
            setOtherSignedOut(true);
            setSessionsNotice(
              'Signed out of all other devices. Your current mobile session remains active.',
            );
          }}
        >
          {otherSignedOut ? 'Other devices signed out' : 'Sign out all devices'}
        </Button>
      </View>
    </View>
  );
}
