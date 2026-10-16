import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuth } from '../../lib/auth-context';
import { theme } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  function validate() {
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      errors.identifier = 'Enter your employee ID or college email.';
    }
    if (!password) {
      errors.password = 'Enter your password.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await login(identifier, password, remember);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      {/* College Institutional Branding Header */}
      <View style={styles.brandingHeader}>
        <Image
          source={require('../../assets/jcet-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="JCET institutional logo"
        />
        <View style={styles.institutionDetails}>
          <Text style={styles.institutionName}>Jain College of Engineering and Technology</Text>
          <Text style={styles.institutionLocation}>Hubballi, Karnataka · CET Code: E265</Text>
        </View>
      </View>

      {/* Main Login Card */}
      <Card style={styles.loginCard}>
        <View style={styles.productBadgeContainer}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              Campus<Text style={styles.badgeAccent}>HR</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.cardHeading}>Welcome back</Text>
        <Text style={styles.cardSubtitle}>Sign in to your campus workspace.</Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Input
            label="Employee ID or College Email"
            placeholder="JCET-CSE-021 or name@jcethbl.edu.in"
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (fieldErrors.identifier) {
                setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
              }
            }}
            error={fieldErrors.identifier}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            isPassword
            error={fieldErrors.password}
          />
        </View>

        <View style={styles.optionsRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
            onPress={() => setRemember(!remember)}
            style={styles.rememberOption}
          >
            <View style={[styles.checkbox, remember && styles.checkboxActive]}>
              {remember && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </Pressable>

          <Pressable onPress={() => setShowForgotModal(true)}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </View>

        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.loginButton}
        >
          Login
        </Button>
      </Card>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          CampusHR · Faculty & Staff Portal
        </Text>
        <Text style={styles.footerSubtext}>
          Jain College of Engineering and Technology, Hubballi
        </Text>
      </View>

      {/* Forgot Password Assistance Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Password Assistance</Text>
            <Text style={styles.modalBody}>
              Please contact the HR office at JCET to reset your CampusHR account password.
            </Text>
            <Button
              variant="primary"
              onPress={() => setShowForgotModal(false)}
              style={styles.modalButton}
            >
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: theme.spacing.section,
    paddingVertical: theme.spacing.xl,
  },
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.section,
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  logo: {
    width: 54,
    height: 54,
  },
  institutionDetails: {
    flex: 1,
    gap: 2,
  },
  institutionName: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.body,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  institutionLocation: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.mutedForeground,
  },
  loginCard: {
    padding: theme.spacing.page,
    gap: theme.spacing.section,
  },
  productBadgeContainer: {
    alignSelf: 'flex-start',
  },
  badgePill: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.primary,
  },
  badgeAccent: {
    color: theme.colors.accent,
  },
  cardHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.heading,
    color: theme.colors.primary,
  },
  cardSubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.mutedForeground,
    marginTop: -8,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
  },
  errorBannerText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.error,
    lineHeight: 20,
  },
  formGroup: {
    gap: theme.spacing.section,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.label,
    color: theme.colors.foreground,
  },
  forgotPasswordText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.accent,
  },
  loginButton: {
    marginTop: theme.spacing.xs,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.md,
  },
  footerText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.label,
    color: theme.colors.mutedForeground,
  },
  footerSubtext: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    color: theme.colors.input,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 31, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.page,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.modal,
    padding: theme.spacing.page,
    gap: theme.spacing.section,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.subheading,
    color: theme.colors.primary,
  },
  modalBody: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    color: theme.colors.foreground,
    lineHeight: 22,
  },
  modalButton: {
    alignSelf: 'flex-end',
    minWidth: 100,
  },
});
