import React, { useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { PasswordResetSheet } from '../../components/profile/PasswordResetSheet';
import { ProfileListRow } from '../../components/profile/ProfileListRow';
import { useAuth } from '../../lib/auth-context';
import { theme } from '../../lib/theme';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require('../../assets/jcet-logo.png');
// Existing attributed institutional architectural visual; not a campus photograph.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const campus = require('../../assets/jcet-campus.png');

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const mediaWidth = Math.max(
    0,
    Math.min(width, theme.sizes.contentMax) - theme.spacing.page * 2,
  );
  const router = useRouter();
  const { login, logout, error: sessionError } = useAuth();
  const [identifier, setIdentifier] = useState(''),
    [password, setPassword] = useState(''),
    [remember, setRemember] = useState(false),
    [loading, setLoading] = useState(false),
    [help, setHelp] = useState(false),
    [showDemos, setShowDemos] = useState(false),
    [demoNotice, setDemoNotice] = useState(''),
    [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const helpRef = useRef<View>(null);
  const submitBusy = useRef(false);
  const [invalid, setInvalid] = useState<{
    identifier?: string;
    password?: string;
  }>({});

  async function submit() {
    if (submitBusy.current) return;
    const fields = {
      identifier: identifier.trim()
        ? undefined
        : 'Enter your employee ID or college email.',
      password: password ? undefined : 'Enter your password.',
    };
    setInvalid(fields);
    if (fields.identifier || fields.password) return;
    submitBusy.current = true;
    setError('');
    setLoading(true);
    try {
      await login(identifier, password, remember);
      setPassword('');
      router.replace('/(tabs)');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Sign in failed. Please try again.',
      );
    } finally {
      submitBusy.current = false;
      setLoading(false);
    }
  }
  function selectDemo(role: 'Faculty' | 'HOD') {
    setIdentifier(
      role === 'Faculty' ? 'JCET-CSE-021' : 'hod.cse@jcethbl.edu.in',
    );
    setPassword('campus123');
    setInvalid({});
    setError('');
    setDemoNotice(`${role} demo selected. Tap Sign in to continue.`);
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <Image
          source={logo}
          style={styles.logo}
          accessibilityLabel="JCET institutional logo"
        />
        <View style={styles.identityText}>
          <Text style={styles.wordmark}>
            Campus<Text style={styles.wordmarkAccent}>HR</Text>
          </Text>
          <Text style={styles.institution}>
            Jain College of Engineering & Technology
          </Text>
          <Text style={styles.institution}>Hubballi</Text>
        </View>
      </View>
      <View style={[styles.campusFrame, { width: mediaWidth }]}>
        <Image
          source={campus}
          style={styles.campus}
          accessibilityLabel="Architectural visual of the JCET campus"
        />
      </View>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>
          Welcome back
        </Text>
        <Text style={styles.secondary}>Your teaching day, in one place.</Text>
      </View>
      {!!(error || sessionError) && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error || sessionError}
        </Text>
      )}
      {!!sessionError && (
        <Button
          variant="secondary"
          disabled={loading}
          onPress={() => void logout()}
        >
          Clear saved session
        </Button>
      )}
      <View style={styles.form}>
        <Input
          autoComplete="username"
          label="Email or employee ID"
          placeholder="JCET-CSE-021"
          value={identifier}
          onChangeText={(value) => {
            setIdentifier(value);
            setInvalid((previous) => ({ ...previous, identifier: undefined }));
          }}
          error={invalid.identifier}
          disabled={loading}
        />
        <Input
          autoComplete="current-password"
          onSubmitEditing={() => void submit()}
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setInvalid((previous) => ({ ...previous, password: undefined }));
          }}
          isPassword
          error={invalid.password}
          disabled={loading}
        />
        <View style={styles.options}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Remember me on this device"
            accessibilityState={{ checked: remember, disabled: loading }}
            onPress={() => setRemember(!remember)}
            onFocus={() => setFocused('remember')}
            onBlur={() => setFocused(null)}
            disabled={loading}
            style={({ pressed }) => [
              styles.remember,
              focused === 'remember' && styles.focused,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.checkbox, remember && styles.checked]}>
              {remember && (
                <Icon
                  name="check"
                  color={theme.colors.onAction}
                  size={theme.spacing.section}
                />
              )}
            </View>
            <Text style={styles.secondary}>Remember me</Text>
          </Pressable>
          <Pressable
            ref={helpRef}
            accessibilityRole="button"
            accessibilityLabel="Forgot password?"
            accessibilityState={{ disabled: loading }}
            onPress={() => setHelp(true)}
            onFocus={() => setFocused('help')}
            onBlur={() => setFocused(null)}
            disabled={loading}
            style={({ pressed }) => [
              styles.helpButton,
              focused === 'help' && styles.focused,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        </View>
        <Button
          accessibilityLabel="Sign in"
          onPress={() => void submit()}
          loading={loading}
          fullWidth
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </View>
      <Text style={styles.footer}>
        Secure access for JCET faculty and staff.
      </Text>
      {__DEV__ && (
        <View style={styles.demos}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore demo accounts"
            accessibilityState={{ expanded: showDemos, disabled: loading }}
            disabled={loading}
            onPress={() => setShowDemos(!showDemos)}
            onFocus={() => setFocused('demos')}
            onBlur={() => setFocused(null)}
            style={({ pressed }) => [
              styles.demoToggle,
              focused === 'demos' && styles.focused,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondary}>Explore demo accounts</Text>
            <Icon
              name={showDemos ? 'close' : 'next'}
              size={theme.spacing.section}
            />
          </Pressable>
          {showDemos && (
            <View style={styles.demoList}>
              <ProfileListRow
                disabled={loading}
                label="Faculty demo"
                detail="Prof. Asha Patil"
                icon="profile"
                onPress={() => selectDemo('Faculty')}
              />
              <ProfileListRow
                disabled={loading}
                label="HOD demo"
                detail="Dr. Ramesh K"
                icon="school"
                last
                onPress={() => selectDemo('HOD')}
              />
            </View>
          )}
          {!!demoNotice && (
            <Text accessibilityLiveRegion="polite" style={styles.secondary}>
              {demoNotice}
            </Text>
          )}
        </View>
      )}
      <PasswordResetSheet
        visible={help}
        onClose={() => setHelp(false)}
        returnFocusRef={helpRef}
        onComplete={(email) => {
          setIdentifier(email);
          setPassword('');
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: theme.spacing.section,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  identityText: { flex: 1, gap: theme.spacing.xs },
  logo: {
    width: theme.sizes.tapTarget + theme.spacing.sm,
    height: theme.sizes.tapTarget + theme.spacing.sm,
    resizeMode: 'contain',
  },
  wordmark: {
    fontSize: theme.typography.greeting,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '700',
    color: theme.colors.foreground,
    letterSpacing: -0.5,
  },
  wordmarkAccent: { color: theme.colors.primary },
  institution: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  campusFrame: {
    height: theme.sizes.avatarLarge * 2,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    backgroundColor: theme.colors.muted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  campus: { width: '100%', height: '100%', resizeMode: 'cover' },
  intro: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  title: {
    fontSize: theme.typography.heading,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '700',
    color: theme.colors.foreground,
    letterSpacing: -0.7,
  },
  secondary: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondary + theme.spacing.sm,
    color: theme.colors.mutedForeground,
  },
  form: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  error: {
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondary + theme.spacing.sm,
    color: theme.colors.errorInk,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    marginVertical: -theme.spacing.sm,
  },
  remember: {
    minHeight: theme.sizes.tapTarget,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.radius.control,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingRight: theme.spacing.xs,
  },
  checkbox: {
    width: theme.spacing.page,
    height: theme.spacing.page,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  helpButton: {
    minHeight: theme.sizes.tapTarget,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.xs,
  },
  link: {
    fontSize: theme.typography.secondary,
    fontFamily: theme.typography.headingFamily,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  focused: { borderColor: theme.colors.primary },
  pressed: { opacity: 0.7 },
  footer: {
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.caption + theme.spacing.sm,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  demos: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.sizes.tapTarget,
    borderWidth: 2,
    borderColor: theme.colors.background,
    borderRadius: theme.radius.control,
  },
  demoList: { borderRadius: theme.radius.card, overflow: 'hidden' },
});
