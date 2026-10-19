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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jcetLogo = require('../../assets/jcet-logo.png');

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
      {/* College Institutional Branding Header Box */}
      <View style={styles.brandingHeader}>
        <View style={styles.logoContainer}>
          <Image
            source={jcetLogo}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="JCET institutional logo"
          />
        </View>
        <View style={styles.institutionDetails}>
          <Text style={styles.institutionName}>Jain College of Engineering & Technology</Text>
          <View style={styles.institutionSubRow}>
            <Text style={styles.institutionLocation}>Hubballi, Karnataka</Text>
            <View style={styles.cetBadge}>
              <Text style={styles.cetBadgeText}>CET: E265</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Login Card Box */}
      <Card style={styles.loginCard}>
        {/* Product Brand Badge */}
        <View style={styles.productBadgeContainer}>
          <View style={styles.badgePill}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>
              Campus<Text style={styles.badgeAccent}>HR</Text>
            </Text>
            <Text style={styles.badgeDivider}>·</Text>
            <Text style={styles.badgeTag}>FACULTY PORTAL</Text>
          </View>
        </View>

        <View style={styles.headingBlock}>
          <Text style={styles.cardHeading}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your campus workspace.</Text>
        </View>

        {/* Error Banner Box */}
        {error && (
          <View style={styles.errorBanner}>
            <View style={styles.errorIconBadge}>
              <Text style={styles.errorIconText}>!</Text>
            </View>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Form Input Boxes */}
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

        {/* Options Row: Checkbox Box & Forgot Password Button */}
        <View style={styles.optionsRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
            accessibilityLabel="Remember me on this device"
            onPress={() => setRemember(!remember)}
            style={styles.rememberOption}
            hitSlop={6}
          >
            <View style={[styles.checkbox, remember && styles.checkboxActive]}>
              {remember && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowForgotModal(true)}
            style={styles.forgotBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Primary Login Button Box */}
        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.loginButton}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </Button>
      </Card>

      {/* Footer Security Box */}
      <View style={styles.footer}>
        <View style={styles.securityPill}>
          <Text style={styles.securityPillIcon}>🔒</Text>
          <Text style={styles.securityPillText}>Secure Institutional Gateway</Text>
        </View>
        <Text style={styles.footerSubtext}>
          CampusHR · Jain College of Engineering and Technology, Hubballi
        </Text>
      </View>

      {/* Forgot Password Assistance Modal Box */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBox}>
                <Text style={styles.modalIconText}>🔑</Text>
              </View>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>Password Assistance</Text>
                <Text style={styles.modalSubTitle}>JCET CampusHR Security</Text>
              </View>
            </View>

            <View style={styles.modalInfoBox}>
              <Text style={styles.modalBody}>
                Faculty and staff accounts are centrally managed. To reset your password or unlock your account, please reach out to the JCET administration.
              </Text>
              <View style={styles.modalContactDivider} />
              <View style={styles.modalContactRow}>
                <Text style={styles.modalContactLabel}>HR Desk:</Text>
                <Text style={styles.modalContactVal}>Admin Block, Ground Floor (Ext: 104)</Text>
              </View>
              <View style={styles.modalContactRow}>
                <Text style={styles.modalContactLabel}>Email Support:</Text>
                <Text style={styles.modalContactVal}>hr@jcethbl.edu.in</Text>
              </View>
            </View>

            <Button
              variant="primary"
              onPress={() => setShowForgotModal(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalBtnText}>Got it, Close</Text>
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
    gap: 18,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: 4,
  },

  /* Institutional Header Box */
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logo: {
    width: 38,
    height: 38,
  },
  institutionDetails: {
    flex: 1,
    gap: 3,
  },
  institutionName: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 14.5,
    color: theme.colors.primary,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  institutionSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  institutionLocation: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  cetBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  cetBadgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10.5,
    color: theme.colors.primary,
  },

  /* Main Login Card Box */
  loginCard: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 18,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  productBadgeContainer: {
    alignSelf: 'flex-start',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: '#D0DCFF',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  badgeText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 13,
    color: theme.colors.primary,
  },
  badgeAccent: {
    color: theme.colors.accent,
  },
  badgeDivider: {
    color: '#94A3B8',
    fontSize: 12,
  },
  badgeTag: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 10.5,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  headingBlock: {
    gap: 4,
  },
  cardHeading: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 25,
    color: theme.colors.primary,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 14,
    color: theme.colors.mutedForeground,
    lineHeight: 20,
  },

  /* Error Banner Box */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorBannerText: {
    flex: 1,
    fontFamily: theme.typography.bodyFamily,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },

  /* Form Inputs Container */
  formGroup: {
    gap: 16,
  },

  /* Options Row: Checkbox & Forgot Password */
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  rememberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
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
    fontSize: 13.5,
    color: '#334155',
  },
  forgotBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  forgotPasswordText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 13.5,
    color: theme.colors.accent,
  },

  /* Primary Login Button Box */
  loginButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 16,
    color: theme.colors.surface,
    letterSpacing: 0.3,
  },

  /* Footer Security Box */
  footer: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityPillIcon: {
    fontSize: 11,
  },
  securityPillText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 11.5,
    color: '#475569',
  },
  footerSubtext: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* Password Assistance Modal Box */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 31, 91, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconText: {
    fontSize: 20,
  },
  modalTitleBlock: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 18,
    color: theme.colors.primary,
  },
  modalSubTitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  modalInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  modalBody: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  modalContactDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  modalContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContactLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 12,
    color: '#64748B',
  },
  modalContactVal: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 12,
    color: theme.colors.primary,
  },
  modalButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  modalBtnText: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 14.5,
    color: theme.colors.surface,
  },
});
