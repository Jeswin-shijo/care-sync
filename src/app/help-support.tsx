import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { HELP_FAQS } from '../data/mockData';
import { ROLE_ACTOR } from '../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SectionHeader } from '../components/common/SectionHeader';
import { SearchBar } from '../components/common/SearchBar';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { KeyboardAwareContainer, formScrollProps } from '../components/common/KeyboardAware';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { ChoiceChips } from '../components/shell/Controls';
import { Expandable } from '../components/shell/Expandable';
import { FormField } from '../components/shell/FormField';
import { APP_VERSION_LABEL } from '../components/shell/appInfo';
import { useScrollBottomPadding } from '../components/shell/layout';
import { relativeTime, useNow } from '../components/shell/time';

type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
type Category = 'Technical' | 'Billing' | 'Clinical' | 'Access';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: Priority;
  category: Category;
  status: 'Open' | 'Resolved';
  createdAt: number;
  raisedBy: string;
}

const PRIORITIES: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'Low', label: 'Low', color: '#64748B' },
  { value: 'Medium', label: 'Medium', color: colors.primary },
  { value: 'High', label: 'High', color: '#D97706' },
  { value: 'Urgent', label: 'Urgent', color: colors.danger },
];

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: 'Technical', label: 'Technical' },
  { value: 'Billing', label: 'Billing' },
  { value: 'Clinical', label: 'Clinical workflow' },
  { value: 'Access', label: 'Login & access' },
];

const SLA: Record<Priority, string> = {
  Low: '2 business days',
  Medium: '1 business day',
  High: '4 hours',
  Urgent: '30 minutes',
};

const PRIORITY_VARIANT = { Low: 'default', Medium: 'info', High: 'warning', Urgent: 'danger' } as const;

const SEED_TICKETS: Ticket[] = [
  {
    id: 'TKT-1041',
    subject: 'Receipt printer offline at OPD counter 2',
    description: 'Thermal printer shows paper jam light after every receipt.',
    priority: 'High',
    category: 'Technical',
    status: 'Resolved',
    createdAt: Date.now() - 26 * 3600000,
    raisedBy: 'Fathima S',
  },
];

export default function HelpSupportRoute() {
  const { hospitalProfile, activeRole } = useApp();
  const { showToast } = useToast();
  const now = useNow(30000);
  const bottomPad = useScrollBottomPadding();

  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [category, setCategory] = useState<Category>('Technical');
  const [touched, setTouched] = useState({ subject: false, description: false });
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(SEED_TICKETS);
  const descRef = useRef<TextInput>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HELP_FAQS.map((f, i) => ({ ...f, i })).filter((f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query]);

  const phoneDigits = hospitalProfile.phone.replace(/[^\d+]/g, '');
  const waDigits = (() => {
    const d = hospitalProfile.phone.replace(/\D/g, '');
    return d.startsWith('91') ? d : `91${d.replace(/^0+/, '')}`;
  })();

  const contacts = [
    {
      id: 'call',
      icon: 'call' as const,
      title: 'Call help desk',
      sub: '24×7 • ' + hospitalProfile.phone,
      color: colors.primary,
      bg: colors.primaryLight,
      url: `tel:${phoneDigits}`,
      fallback: `Calling isn't available on this device. Dial ${hospitalProfile.phone}.`,
    },
    {
      id: 'email',
      icon: 'mail' as const,
      title: 'Email support',
      sub: hospitalProfile.email,
      color: '#F59E0B',
      bg: colors.warningLight,
      url: `mailto:${hospitalProfile.email}?subject=${encodeURIComponent('CareSync support request')}`,
      fallback: `No email app found. Write to ${hospitalProfile.email}.`,
    },
    {
      id: 'whatsapp',
      icon: 'logo-whatsapp' as const,
      title: 'WhatsApp chat',
      sub: 'Replies in ~10 min',
      color: '#16A34A',
      bg: colors.successLight,
      url: `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello, I need help with CareSync at ${hospitalProfile.name}.`)}`,
      fallback: 'Could not open WhatsApp on this device.',
    },
  ];

  const openContact = (url: string, fallback: string) => {
    Linking.openURL(url).catch(() => showToast({ type: 'warning', message: fallback }));
  };

  const subjectError = subject.trim().length < 5 ? 'Add a short subject (at least 5 characters).' : null;
  const descriptionError = description.trim().length < 15 ? 'Describe the issue in a sentence or two (at least 15 characters).' : null;
  const showSubjectError = (touched.subject || attempted) && subjectError;
  const showDescriptionError = (touched.description || attempted) && descriptionError;

  const submit = () => {
    if (submitting) return;
    setAttempted(true);
    if (subjectError || descriptionError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    timer.current = setTimeout(() => {
      const id = `TKT-${1042 + tickets.length - SEED_TICKETS.length}`;
      const ticket: Ticket = {
        id,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
        status: 'Open',
        createdAt: Date.now(),
        raisedBy: ROLE_ACTOR[activeRole],
      };
      setTickets((list) => [ticket, ...list]);
      setSubject('');
      setDescription('');
      setPriority('Medium');
      setCategory('Technical');
      setTouched({ subject: false, description: false });
      setAttempted(false);
      setSubmitting(false);
      showToast({ type: 'success', title: `Ticket ${id} raised`, message: `${priority} priority • the help desk responds within ${SLA[priority]}.` });
    }, 600);
  };

  const resolve = (id: string) => {
    setTickets((list) => list.map((t) => (t.id === id ? { ...t, status: 'Resolved' } : t)));
    showToast({ type: 'success', message: `${id} marked as resolved` });
  };

  const openCount = tickets.filter((t) => t.status === 'Open').length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Help & Support" subtitle="CareSync help desk • 24×7" showBack />
      <KeyboardAwareContainer>
        <ScrollView
          {...formScrollProps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        >
          {/* Contact */}
          <FadeInView>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroSub}>Reach the {hospitalProfile.name} IT help desk, or raise a ticket below.</Text>
            <View style={styles.contactRow}>
              {contacts.map((c) => (
                <PressableScale
                  key={c.id}
                  onPress={() => openContact(c.url, c.fallback)}
                  scaleTo={0.95}
                  haptic
                  style={styles.contactCard}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.title}, ${c.sub}`}
                >
                  <View style={[styles.contactIcon, { backgroundColor: c.bg }]}>
                    <Ionicons name={c.icon} size={20} color={c.color} />
                  </View>
                  <Text style={styles.contactTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text style={styles.contactSub} numberOfLines={2}>
                    {c.sub}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </FadeInView>

          {/* FAQs */}
          <FadeInView delay={stagger(1)}>
            <SectionHeader title="Frequently asked" meta={`${faqs.length} of ${HELP_FAQS.length}`} />
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search help articles…" style={styles.search} />
            {faqs.length ? (
              faqs.map((f) => (
                <Expandable
                  key={f.i}
                  expanded={openFaq === f.i}
                  onToggle={() => setOpenFaq(openFaq === f.i ? null : f.i)}
                  accessibilityLabel={f.q}
                  header={
                    <View style={styles.faqHeader}>
                      <Ionicons name="help-circle" size={18} color={colors.primary} />
                      <Text style={styles.faqQ}>{f.q}</Text>
                    </View>
                  }
                >
                  <Text style={styles.faqA}>{f.a}</Text>
                </Expandable>
              ))
            ) : (
              <View style={styles.noFaq}>
                <Text style={styles.noFaqText}>No answers match “{query.trim()}”. Raise a ticket and the help desk will get back to you.</Text>
              </View>
            )}
          </FadeInView>

          {/* Ticket form */}
          <FadeInView delay={stagger(2)}>
            <SectionHeader title="Raise a ticket" />
            <View style={styles.card}>
              <FormField
                label="Subject"
                required
                value={subject}
                onChangeText={setSubject}
                onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
                error={showSubjectError || null}
                placeholder="e.g. Lab report PDF not downloading"
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => descRef.current?.focus()}
                submitBehavior="submit"
                editable={!submitting}
              />
              <FormField
                ref={descRef}
                label="Description"
                required
                value={description}
                onChangeText={setDescription}
                onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                error={showDescriptionError || null}
                placeholder="What happened, where, and for which patient or receipt (no clinical details needed)."
                multiline
                maxLength={500}
                showCount
                editable={!submitting}
              />
              <Text style={styles.label}>Category</Text>
              <ChoiceChips options={CATEGORIES} value={category} onChange={setCategory} disabled={submitting} style={styles.chips} />
              <Text style={styles.label}>Priority</Text>
              <ChoiceChips options={PRIORITIES} value={priority} onChange={setPriority} disabled={submitting} style={styles.chips} />
              <Text style={styles.sla}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} /> Expected response: {SLA[priority]}
              </Text>
              <Button
                title="Submit Ticket"
                onPress={submit}
                loading={submitting}
                disabled={submitting}
                fullWidth
                icon={<Ionicons name="send" size={16} color="#FFFFFF" />}
                style={styles.submit}
              />
            </View>
          </FadeInView>

          {/* Tickets */}
          <FadeInView delay={stagger(3)}>
            <SectionHeader title="Your tickets" meta={openCount ? `${openCount} open` : 'None open'} />
            <View style={styles.cardList}>
              {tickets.map((t, i) => (
                <FadeInView key={t.id} offset={8}>
                  <View style={[styles.ticketRow, i > 0 && styles.divider]}>
                    <View style={styles.ticketTop}>
                      <Text style={styles.ticketId}>{t.id}</Text>
                      <Badge label={t.status} variant={t.status === 'Open' ? 'warning' : 'success'} size="sm" />
                    </View>
                    <Text style={styles.ticketSubject}>{t.subject}</Text>
                    <Text style={styles.ticketMeta}>
                      {t.category} • raised by {t.raisedBy} • {relativeTime(t.createdAt, now)}
                    </Text>
                    <View style={styles.ticketBottom}>
                      <Badge label={`${t.priority} priority`} variant={PRIORITY_VARIANT[t.priority]} size="sm" />
                      {t.status === 'Open' && <Button title="Mark resolved" variant="ghost" size="sm" onPress={() => resolve(t.id)} />}
                    </View>
                  </View>
                </FadeInView>
              ))}
            </View>
          </FadeInView>

          <View style={styles.versionFooter}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.versionText}>{APP_VERSION_LABEL}</Text>
          </View>
          <Text style={styles.versionSub}>Demo environment with sample hospital data</Text>
        </ScrollView>
      </KeyboardAwareContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  heroTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  heroSub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 112,
    ...shadows.sm,
  },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  contactTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  contactSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  search: {
    marginBottom: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  faqQ: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    lineHeight: 19,
  },
  faqA: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 19,
    paddingLeft: 26,
  },
  noFaq: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  noFaqText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chips: {
    marginBottom: spacing.md,
  },
  sla: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.xs,
  },
  cardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  ticketRow: {
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketId: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  ticketSubject: {
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 4,
  },
  ticketMeta: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ticketBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    minHeight: 32,
  },
  versionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  versionText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  versionSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});
