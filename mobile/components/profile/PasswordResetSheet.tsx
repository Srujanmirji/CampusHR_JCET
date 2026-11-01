import { passwordIsValid, passwordProblem } from '@campushr/password-policy';
import { PasswordRequirements } from './PasswordRequirements';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { theme } from '../../lib/theme';
import {
  passwordResetOptions,
  requestPasswordReset,
  confirmPasswordReset,
} from '../../lib/password-reset-api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { restoreAccountFocus } from './AccountSupportSheet';

export function PasswordResetSheet({
  visible,
  onClose,
  returnFocusRef,
  onComplete,
}: {
  visible: boolean;
  onClose: () => void;
  returnFocusRef: React.RefObject<View | null>;
  onComplete: (email: string) => void;
}) {
  const generation = useRef({ active: false });
  const reduced = useReducedMotion(),
    busyRef = useRef(false),
    titleRef = useRef<View>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null),
    [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState(''),
    [challenge, setChallenge] = useState(''),
    [code, setCode] = useState(''),
    [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [seconds, setSeconds] = useState(0);
  const canConfirm =
    /^\d{6}$/.test(code) && passwordIsValid(password) && password === repeat;
  function reset() {
    setStep('email');
    setChallenge('');
    setCode('');
    setPassword('');
    setRepeat('');
    setError('');
    setSeconds(0);
  }
  function close() {
    if (busyRef.current) return;
    generation.current.active = false;
    reset();
    setEnabled(null);
    onClose();
    if (Platform.OS !== 'ios')
      requestAnimationFrame(() => restoreAccountFocus(returnFocusRef.current));
  }
  async function options() {
    const epoch = generation.current;
    setEnabled(null);
    setError('');
    try {
      const result = await passwordResetOptions();
      if (epoch.active) setEnabled(result.enabled);
    } catch {
      if (epoch.active) {
        setEnabled(false);
        setError('Could not check email recovery. Please retry.');
      }
    }
  }
  useEffect(() => {
    if (!visible) return;
    const lifetime = { active: true };
    generation.current = lifetime;
    let active = true;
    void passwordResetOptions()
      .then((r) => {
        if (active) setEnabled(r.enabled);
      })
      .catch(() => {
        if (active) {
          setEnabled(false);
          setError('Could not check email recovery. Please retry.');
        }
      });
    return () => {
      active = false;
      lifetime.active = false;
    };
  }, [visible]);
  useEffect(() => {
    if (!visible || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [visible, seconds]);
  function focusTitle() {
    if (Platform.OS === 'web') {
      titleRef.current?.focus();
      return;
    }
    const node = findNodeHandle(titleRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }
  useEffect(() => {
    if (visible) focusTitle();
  }, [visible, step]);
  async function perform(action: 'request' | 'confirm') {
    if (busyRef.current) return;
    setError('');
    if (
      action === 'request' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setError('Enter the email registered with CampusHR.');
      return;
    }
    if (
      action === 'confirm' &&
      (!/^\d{6}$/.test(code) ||
        !passwordIsValid(password) ||
        password !== repeat)
    ) {
      setError(
        !/^\d{6}$/.test(code)
          ? 'Enter the six-digit code.'
          : !passwordIsValid(password)
            ? passwordProblem(password)
            : 'The passwords do not match.',
      );
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      if (action === 'request') {
        const r = await requestPasswordReset(email.trim());
        setEmail(email.trim());
        setChallenge(r.challengeId);
        setCode('');
        setSeconds(r.resendAfter);
        setStep('code');
      } else {
        await confirmPasswordReset({
          challengeId: challenge,
          code,
          newPassword: password,
        });
        setCode('');
        setPassword('');
        setRepeat('');
        setStep('done');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Password recovery could not be completed.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType={reduced ? 'none' : 'slide'}
      onShow={focusTitle}
      onRequestClose={close}
      onDismiss={() => restoreAccountFocus(returnFocusRef.current)}
    >
      <SafeAreaView
        style={styles.screen}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            contentContainerStyle={styles.content}
          >
            <View style={styles.bar}>
              <Text style={styles.caption}>JCET account recovery</Text>
              <Button
                variant="text"
                accessibilityLabel="Close password reset"
                disabled={busy}
                onPress={close}
              >
                Close
              </Button>
            </View>
            <View ref={titleRef} accessible accessibilityRole="header">
              <Text style={styles.title}>
                {step === 'done'
                  ? 'Password updated'
                  : step === 'code'
                    ? 'Check your email'
                    : 'Reset your password'}
              </Text>
            </View>
            <Text style={styles.body}>
              {step === 'done'
                ? 'Use your new password on the website or mobile app.'
                : step === 'code'
                  ? `If ${email} belongs to an active account, a code will arrive shortly. Check your spam folder too. Codes expire after 10 minutes.`
                  : 'Enter the email registered with CampusHR to request a six-digit verification code.'}
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            {step === 'done' ? (
              <Button
                fullWidth
                onPress={() => {
                  onComplete(email);
                  close();
                }}
              >
                Back to sign in
              </Button>
            ) : enabled === null ? (
              <Text accessibilityLiveRegion="polite" style={styles.body}>
                Checking email recovery…
              </Text>
            ) : !enabled ? (
              <View style={styles.form}>
                <Text style={styles.body}>
                  Email recovery is temporarily unavailable. Contact the college
                  office for account support.
                </Text>
                <Button variant="outline" onPress={() => void options()}>
                  Check again
                </Button>
              </View>
            ) : (
              <View style={styles.form}>
                {step === 'email' ? (
                  <Input
                    label="Registered email"
                    value={email}
                    onChangeText={setEmail}
                    autoComplete="email"
                    keyboardType="email-address"
                    maxLength={254}
                    disabled={busy}
                  />
                ) : (
                  <>
                    <Input
                      label="Verification code"
                      value={code}
                      onChangeText={(value) => {
                        setCode(value.replace(/\D/g, ''));
                        setError('');
                      }}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      maxLength={6}
                      disabled={busy}
                    />
                    <Input
                      label="New password"
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setError('');
                      }}
                      autoComplete="new-password"
                      isPassword
                      maxLength={72}
                      disabled={busy}
                    />
                    <PasswordRequirements password={password} />
                    <Input
                      label="Repeat new password"
                      value={repeat}
                      onChangeText={(value) => {
                        setRepeat(value);
                        setError('');
                      }}
                      helperText={
                        repeat.length === 0
                          ? 'Enter the same password again.'
                          : password === repeat
                            ? 'Passwords match.'
                            : 'Passwords do not match yet.'
                      }
                      autoComplete="new-password"
                      isPassword
                      maxLength={72}
                      disabled={busy}
                    />
                  </>
                )}
                <Button
                  fullWidth
                  disabled={busy || (step === 'code' && !canConfirm)}
                  loading={busy}
                  onPress={() =>
                    void perform(step === 'email' ? 'request' : 'confirm')
                  }
                >
                  {step === 'email'
                    ? 'Send verification code'
                    : 'Update password'}
                </Button>
                {step === 'code' && (
                  <>
                    <Button
                      variant="text"
                      disabled={busy || seconds > 0}
                      onPress={() => void perform('request')}
                    >
                      {seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
                    </Button>
                    <Button variant="text" disabled={busy} onPress={reset}>
                      Use another email
                    </Button>
                  </>
                )}
              </View>
            )}
            {step !== 'done' && (
              <Button
                variant="text"
                disabled={busy}
                onPress={() => {
                  void Linking.openURL('mailto:contactus@jcethbl.edu.in').catch(
                    () =>
                      setError(
                        'Email contactus@jcethbl.edu.in for account support.',
                      ),
                  );
                }}
              >
                Contact the college office
              </Button>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.page, gap: theme.spacing.lg },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    color: theme.colors.foreground,
    fontWeight: '700',
  },
  body: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: theme.typography.body + theme.spacing.sm,
    color: theme.colors.mutedForeground,
  },
  caption: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  error: { fontSize: theme.typography.secondary, color: theme.colors.errorInk },
  form: { gap: theme.spacing.lg },
});
