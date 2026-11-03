import React, { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { ProfileListRow } from './ProfileListRow';
import { theme } from '../../lib/theme';

const HELPDESK_CATEGORIES = [
  'Attendance',
  'Leave',
  'Profile correction',
  'Documents',
  'Account',
  'IT',
  'Other',
] as const;

type TicketStatus = 'Open' | 'In progress' | 'Resolved';

interface HelpdeskTicket {
  id: string;
  category: (typeof HELPDESK_CATEGORIES)[number];
  subject: string;
  status: TicketStatus;
  createdAt: string;
}

const INITIAL_TICKETS: HelpdeskTicket[] = [
  {
    id: 'HD-1042',
    category: 'Documents',
    subject: 'FDP Certificate verification for NBA file',
    status: 'In progress',
    createdAt: '22 Oct 2026',
  },
  {
    id: 'HD-1018',
    category: 'Attendance',
    subject: 'Biometric terminal sync during VTU valuation',
    status: 'Resolved',
    createdAt: '14 Oct 2026',
  },
];

export function restoreAccountFocus(element: View | null) {
  if (!element) return;
  element.focus();
  if (Platform.OS !== 'web') {
    const node = findNodeHandle(element);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }
}

/** One support presentation shared by signed-out and signed-in account flows. */
export function AccountSupportSheet({
  visible,
  onClose,
  returnFocusRef,
  passwordHelp = false,
}: {
  visible: boolean;
  onClose: () => void;
  returnFocusRef: React.RefObject<View | null>;
  passwordHelp?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<View>(null);
  const [notice, setNotice] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof HELPDESK_CATEGORIES)[number]>('Attendance');
  const [ticketSubject, setTicketSubject] = useState('');
  const [tickets, setTickets] = useState<HelpdeskTicket[]>(INITIAL_TICKETS);
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');
  const [ticketFeedback, setTicketFeedback] = useState('');

  function close() {
    onClose();
    if (Platform.OS !== 'ios') {
      requestAnimationFrame(() => restoreAccountFocus(returnFocusRef.current));
    }
  }
  async function contact(url: string, fallback: string) {
    setNotice('');
    try {
      await Linking.openURL(url);
    } catch {
      setNotice(fallback);
    }
  }
  function createTicket() {
    const trimmed = ticketSubject.trim();
    if (trimmed.length < 4) {
      setTicketFeedback('Describe your request in at least 4 characters.');
      return;
    }
    const nextTicket: HelpdeskTicket = {
      id: `HD-${1043 + tickets.length}`,
      category: selectedCategory,
      subject: trimmed,
      status: 'Open',
      createdAt: 'Today',
    };
    setTickets([nextTicket, ...tickets]);
    setTicketSubject('');
    setTicketFeedback(`Ticket ${nextTicket.id} created under ${selectedCategory}.`);
  }

  const filteredTickets = tickets.filter(
    (t) => statusFilter === 'All' || t.status === statusFilter,
  );

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={close}
      onDismiss={() => restoreAccountFocus(returnFocusRef.current)}
      onShow={() => {
        setNotice('');
        setTicketFeedback('');
        if (Platform.OS === 'web') headingRef.current?.focus();
        else {
          const node = findNodeHandle(headingRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }
      }}
    >
      <SafeAreaView
        style={styles.sheet}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ScrollView
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.toolbar}>
            <Text style={styles.context}>
              {passwordHelp ? 'JCET account support' : 'HR Helpdesk & Support'}
            </Text>
            <Button
              variant="text"
              accessibilityLabel="Close account support"
              onPress={close}
            >
              <Icon
                name="close"
                color={theme.colors.primary}
                size={theme.spacing.lg}
              />
            </Button>
          </View>
          <View style={styles.symbol}>
            <Icon
              name={passwordHelp ? 'lock' : 'help'}
              color={theme.colors.primary}
              size={theme.spacing.xl}
            />
          </View>
          <View
            ref={headingRef}
            tabIndex={-1}
            accessible
            accessibilityRole="header"
          >
            <Text style={styles.title}>
              {passwordHelp ? 'Need help signing in?' : 'HR Helpdesk'}
            </Text>
          </View>
          <Text style={styles.body}>
            {passwordHelp
              ? 'JCET administration manages faculty and staff accounts. Contact the college office to ask for account assistance or a password reset.'
              : 'Raise a support request with JCET HR & Administration or track existing tickets.'}
          </Text>

          {!passwordHelp && (
            <View style={{ gap: theme.spacing.md }}>
              <Text style={styles.context}>Create ticket · Select category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {HELPDESK_CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSelectedCategory(cat)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: theme.radius.control,
                        backgroundColor: active
                          ? theme.colors.blueContainer
                          : theme.colors.surface,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: active
                          ? theme.colors.primary
                          : theme.colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: theme.typography.caption,
                          fontWeight: active ? '600' : '500',
                          color: active
                            ? theme.colors.primary
                            : theme.colors.foreground,
                        }}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Input
                label="Issue summary"
                placeholder={`Describe your ${selectedCategory.toLowerCase()} query`}
                value={ticketSubject}
                onChangeText={setTicketSubject}
              />
              {!!ticketFeedback && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    fontSize: theme.typography.secondary,
                    color: theme.colors.mintInk,
                    fontWeight: '500',
                  }}
                >
                  {ticketFeedback}
                </Text>
              )}
              <Button variant="secondary" onPress={createTicket}>
                Create ticket
              </Button>

              <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                <Text style={styles.context}>Track tickets</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(['All', 'Open', 'In progress', 'Resolved'] as const).map(
                    (st) => {
                      const active = statusFilter === st;
                      return (
                        <Pressable
                          key={st}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => setStatusFilter(st)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: theme.radius.full,
                            backgroundColor: active
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: active
                              ? theme.colors.primary
                              : theme.colors.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: theme.typography.caption,
                              fontWeight: '600',
                              color: active
                                ? theme.colors.surface
                                : theme.colors.mutedForeground,
                            }}
                          >
                            {st}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
                <View style={styles.contacts}>
                  {filteredTickets.map((t, index) => (
                    <View
                      key={t.id}
                      style={{
                        padding: theme.spacing.section,
                        gap: 4,
                        borderBottomWidth:
                          index < filteredTickets.length - 1
                            ? StyleSheet.hairlineWidth
                            : 0,
                        borderBottomColor: theme.colors.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: theme.typography.caption,
                            fontWeight: '600',
                            color: theme.colors.primary,
                          }}
                        >
                          {t.id} · {t.category}
                        </Text>
                        <Text
                          style={{
                            fontSize: theme.typography.caption,
                            fontWeight: '600',
                            color:
                              t.status === 'Resolved'
                                ? theme.colors.mintInk
                                : t.status === 'In progress'
                                  ? theme.colors.amberInk
                                  : theme.colors.primary,
                          }}
                        >
                          {t.status}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: theme.typography.body,
                          fontWeight: '500',
                          color: theme.colors.foreground,
                        }}
                      >
                        {t.subject}
                      </Text>
                      <Text style={styles.caption}>Logged {t.createdAt}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={styles.contacts}>
            <ProfileListRow
              label="Call the college office"
              detail="0836-2002117"
              icon="phone"
              onPress={() =>
                void contact(
                  'tel:08362002117',
                  'The phone app could not be opened. Call the college office at 0836-2002117.',
                )
              }
            />
            <ProfileListRow
              label="Email the college office"
              detail="contactus@jcethbl.edu.in"
              icon="mail"
              last
              onPress={() =>
                void contact(
                  'mailto:contactus@jcethbl.edu.in',
                  'The email app could not be opened. Write to contactus@jcethbl.edu.in.',
                )
              }
            />
          </View>
          <Text style={styles.caption}>
            These are general college contacts. Ask for faculty account support.
          </Text>
          {!!notice && (
            <Text accessibilityRole="alert" style={styles.error}>
              {notice}
            </Text>
          )}
          <Button fullWidth onPress={close}>
            Done
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: theme.colors.surface },
  content: {
    width: '100%',
    maxWidth: theme.sizes.contentMax,
    alignSelf: 'center',
    padding: theme.spacing.page,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  context: {
    flex: 1,
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.secondary,
    fontFamily: theme.typography.bodyFamily,
  },
  symbol: {
    width: theme.sizes.tapTarget + theme.spacing.page,
    height: theme.sizes.tapTarget + theme.spacing.page,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.blueContainer,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: theme.spacing.page,
  },
  title: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.greeting,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.body,
    lineHeight: theme.typography.body + theme.spacing.sm,
    textAlign: 'center',
  },
  contacts: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  caption: {
    color: theme.colors.mutedForeground,
    fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.caption,
    lineHeight: theme.typography.caption + theme.spacing.sm,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.errorInk,
    fontSize: theme.typography.secondary,
    lineHeight: theme.typography.secondary + theme.spacing.sm,
  },
});
