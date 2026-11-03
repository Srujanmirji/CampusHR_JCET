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

export function ProfileDetails({
  initialSection,
}: {
  initialSection?: string;
} = {}) {
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
  const joinedFormatted = row
    ? new Date(`${row.joiningDate}T00:00:00Z`).toLocaleDateString('en-IN', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const academicSection = row && (
    <View key="academic" style={styles.section}>
      <Text accessibilityRole="header" style={styles.groupLabel}>
        Academic profile
      </Text>
      <View style={styles.recordGroup}>
        <RecordField
          label="Qualifications"
          value={row.qualification ?? 'M.Tech in Computer Science & Engineering'}
        />
        <RecordField
          label="Specialization"
          value={
            row.specialization ??
            'Database Systems & Distributed Cloud Computing'
          }
        />
        <RecordField
          label="Subjects handled"
          value="BCS501 Database Management Systems · BCS502 DBMS Lab · BCS508 Cloud Architecture"
        />
        <RecordField
          label="Teaching experience"
          value={
            row.experienceYears != null
              ? `${row.experienceYears} years`
              : '6 years'
          }
        />
        <RecordField
          label="Academic roles"
          value="Semester 5 Class Coordinator · NBA Criterion 3 Lead"
        />
        <RecordField
          label="Committee memberships"
          value="Internal Quality Assurance Cell (IQAC) · VTU Examination Squad"
          last
        />
      </View>
    </View>
  );

  const researchSection = (
    <View key="research" style={styles.section}>
      <Text accessibilityRole="header" style={styles.groupLabel}>
        Research & FDP
      </Text>
      <View style={styles.recordGroup}>
        <RecordField
          label="Publications"
          value="4 Peer-Reviewed Journal Papers (IEEE Access, Springer LNCS)"
        />
        <RecordField
          label="Patents"
          value="1 Indian Patent Published — Adaptive Query Routing for Distributed Nodes"
        />
        <RecordField
          label="Research grants"
          value="VTU Competitive Research Grant Scheme (Co-PI)"
        />
        <RecordField
          label="Conferences"
          value="3 International Conference Paper Presentations"
        />
        <RecordField
          label="FDPs"
          value="5 AICTE ATAL & VTU Faculty Development Programs"
        />
        <RecordField
          label="Workshops"
          value="Cloud-Native Systems & Applied AI in Engineering Education"
        />
        <RecordField
          label="Certifications"
          value="NPTEL Elite+Gold: Database Management Systems · AWS Cloud Practitioner"
          last
        />
      </View>
    </View>
  );

  const performanceSection = (
    <View key="performance" style={styles.section}>
      <Text accessibilityRole="header" style={styles.groupLabel}>
        Performance & Appraisal
      </Text>
      <View style={styles.recordGroup}>
        <RecordField
          label="Current appraisal cycle"
          value="AY 2025–26 Annual Academic Appraisal"
        />
        <RecordField
          label="Self appraisal"
          value="Submitted · Verified by Department"
        />
        <RecordField
          label="Goals / KRAs"
          value="Course Delivery & Pass Rate (94%) · Outcome-Based Education (OBE) Attainment · 2 Indexed Publications"
        />
        <RecordField
          label="HOD review"
          value="Completed — Recommended (Dr. Ramesh K)"
        />
        <RecordField
          label="Principal review"
          value="In Progress — Scheduled for Academic Council Endorsement"
        />
        <RecordField label="Status" value="On Track · Satisfactory" last />
      </View>
    </View>
  );

  const serviceSection = row && (
    <View key="service" style={styles.section}>
      <Text accessibilityRole="header" style={styles.groupLabel}>
        Service history
      </Text>
      <View style={styles.recordGroup}>
        <RecordField
          label="Employment"
          value={
            row.employmentType.charAt(0) +
            row.employmentType.slice(1).toLowerCase()
          }
        />
        <RecordField label="Joined" value={joinedFormatted} />
        <RecordField
          label="Current posting"
          value={`${row.designation.name} · ${row.department.name}`}
        />
        <RecordField
          label="Institution"
          value="Jain College of Engineering & Technology, Hubballi"
          last
        />
      </View>
    </View>
  );

  const personalSection = row && (
    <View key="personal" style={{ gap: theme.spacing.page }}>
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
    </View>
  );

  const orderedSections = () => {
    const map: Record<string, React.ReactNode> = {
      personal: personalSection,
      academic: academicSection,
      research: researchSection,
      performance: performanceSection,
      service: serviceSection,
    };
    const keys = ['personal', 'academic', 'service', 'research', 'performance'];
    if (initialSection && map[initialSection]) {
      return [
        map[initialSection],
        ...keys.filter((k) => k !== initialSection).map((k) => map[k]),
      ];
    }
    return keys.map((k) => map[k]);
  };

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
          {orderedSections()}
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
