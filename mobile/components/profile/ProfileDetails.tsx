import { useState, useRef } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '../../lib/session';
import { useAuth } from '../../lib/auth-context';
import { homeUnavailable } from '../../lib/home-api';
import {
  getOwnProfile,
  saveOwnPhone,
  canEditPhone,
} from '../../lib/profile-api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { theme } from '../../lib/theme';

export function ProfileDetails() {
  const { user, accessToken } = useAuth(),
    client = useQueryClient();
  const unavailable = homeUnavailable(user, accessToken, 'employee.read');
  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getOwnProfile(user, accessToken),
    enabled: !unavailable,
    retry: false,
  });
  const [phone, setPhone] = useState<string | null>(null),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const guard = useRef(false);
  async function save() {
    if (guard.current || phone === null) return;
    guard.current = true;
    setBusy(true);
    setNotice('');
    try {
      const saved = await saveOwnPhone(user, accessToken, phone);
      if (getSession().user?.id !== user?.id) return;
      client.setQueryData(['profile', user?.id], saved);
      setPhone(null);
      setNotice('Phone number saved.');
    } catch (error) {
      setNotice(
        error instanceof Error && error.name !== 'ZodError'
          ? error.message
          : 'Enter a valid phone number.',
      );
      void query.refetch();
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const row = query.data;
  return (
    <View style={styles.card}>
      {unavailable ? (
        <Text style={styles.text}>
          {unavailable} Contact HR to link your employee record.
        </Text>
      ) : query.isPending ? (
        <Skeleton label="Loading employee record" />
      ) : query.isError || !row ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            Your employee record could not be loaded.
          </Text>
          <Button onPress={() => void query.refetch()}>Retry profile</Button>
        </>
      ) : (
        <>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>
              {row.firstName} {row.lastName}
            </Text>
            <Text style={styles.text}>
              {row.designation.name} · {row.department.name}
            </Text>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.groupLabel}>
              Official details
            </Text>
            <View style={styles.recordGroup}>
              <RecordField label="Employee ID" value={row.employeeCode} />
              <RecordField label="Institutional email" value={row.email} last />
            </View>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.groupLabel}>
              Academic profile
            </Text>
            <View style={styles.recordGroup}>
              <RecordField
                label="Qualification"
                value={row.qualification ?? 'Not recorded'}
              />
              <RecordField
                label="Specialization"
                value={row.specialization ?? 'Not recorded'}
                last
              />
            </View>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.groupLabel}>
              Service details
            </Text>
            <View style={styles.recordGroup}>
              <RecordField
                label="Employment"
                value={
                  row.employmentType.charAt(0) +
                  row.employmentType.slice(1).toLowerCase()
                }
              />
              <RecordField
                label="Joined"
                value={new Date(
                  `${row.joiningDate}T00:00:00Z`,
                ).toLocaleDateString('en-IN', {
                  timeZone: 'UTC',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                last
              />
            </View>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.groupLabel}>
              Contact number
            </Text>
            {canEditPhone(user) ? (
              <>
                <Input
                  label="Phone number"
                  value={phone ?? row.phone ?? ''}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  disabled={busy}
                  helperText="Only your phone number can be edited here."
                />
                <Button
                  onPress={() => void save()}
                  disabled={phone === null}
                  loading={busy}
                >
                  {busy ? 'Saving…' : 'Save phone number'}
                </Button>
              </>
            ) : (
              <Text style={styles.body}>{row.phone ?? 'Not recorded'}</Text>
            )}
          </View>
        </>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {notice}
        </Text>
      )}
    </View>
  );
}

function RecordField({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.recordRow, !last && styles.divider]}>
      <Text style={styles.groupLabel}>{label}</Text>
      <Text selectable style={styles.body}>
        {value}
      </Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { gap: theme.spacing.page, marginBottom: theme.spacing.section },
  section: { gap: theme.spacing.md },
  recordGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  recordRow: { padding: theme.spacing.section, gap: theme.spacing.xs },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  heading: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.headingFamily,
    fontWeight: '600',
    fontSize: theme.typography.subheading,
    lineHeight: theme.typography.titleLineHeight,
  },
  groupLabel: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.captionLineHeight,
  },
  body: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: theme.typography.lineHeight,
  },
  text: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
  },
  error: {
    color: theme.colors.errorInk,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondaryLineHeight,
  },
});
