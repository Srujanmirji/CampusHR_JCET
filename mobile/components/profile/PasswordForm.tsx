import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError, changeOwnPassword } from '../../lib/session';
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
        Use at least 12 characters, up to 72 UTF-8 bytes. Your current session
        stays signed in.
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
      <Input
        autoComplete="new-password"
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        error={
          notice === 'The new passwords do not match.' ? notice : undefined
        }
        isPassword
        disabled={busy || uncertain}
      />
      <Button onPress={() => void save()} loading={busy} disabled={uncertain}>
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
    </View>
  );
}
