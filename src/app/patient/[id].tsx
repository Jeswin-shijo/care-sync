import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { Patient } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { pendingInvoices } from '../../logic/billing';
import { ROLE_ACTOR } from '../../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { exportDocument } from '../../utils/pdfGenerator';
import { goToTab } from '../../utils/navigation';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { Badge, statusVariant } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { BottomSheet } from '../../components/common/BottomSheet';
import { FadeInView, PressableScale } from '../../components/common/Motion';
import { AllergyBanner } from '../../components/clinical/AllergyBanner';
import { AnimatedTabs } from '../../components/clinical/AnimatedTabs';
import { plural, stayDay, telHref } from '../../components/clinical/format';
import { alertAfterClose } from '../../components/clinical/alerts';
import { buildPatientSummaryDoc } from '../../components/clinical/documents';
import { HistoryTab, OverviewTab, ReportsTab, VisitsTab } from '../../components/clinical/PatientRecordTabs';
import type { IconName } from '../../components/clinical/types';

const TABS = ['Overview', 'Medical History', 'Visits', 'Reports'] as const;
type Tab = (typeof TABS)[number];

export default function PatientDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = Array.isArray(id) ? id[0] : id;
  const { getPatient } = useApp();
  const patient = pid ? getPatient(pid) : undefined;

  if (!patient) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="Patient Details" />
        <EmptyState
          icon="person-remove-outline"
          title="Patient not found"
          description={`No patient record matches ${pid ? `“${pid}”` : 'this link'}. It may have been merged or the link is out of date.`}
          actionTitle="Go to Patients"
          onActionPress={() => goToTab('patients')}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }
  return <PatientRecord patient={patient} />;
}

interface MenuItem {
  key: string;
  icon: IconName;
  label: string;
  sub?: string;
  color: string;
  run: () => void;
}

function PatientRecord({ patient }: { patient: Patient }) {
  const app = useApp();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('Overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportsReady, setReportsReady] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const tabsY = useRef(0);

  const profile = app.getProfile(patient.id);
  const vitals = app.getLatestVitals(patient.id);
  const visits = app.getVisits(patient.id);
  const appointments = app.getAppointmentsForPatient(patient.id);
  const labResults = app.getLabResults(patient.id);
  const labOrders = app.getLabOrders(patient.id);
  const radiology = app.getRadiologyOrders(patient.id);
  const invoices = app.getInvoicesForPatient(patient.id);
  const documents = app.getDocuments(patient.id);
  const notes = app.getClinicalNotes(patient.id);
  const summary = app.getDischargeSummary(patient.id);
  const pendingBills = pendingInvoices(invoices);
  const outstanding = pendingBills.reduce((sum, i) => sum + i.amount, 0);
  const admitted = patient.status === 'Admitted';
  const day = admitted ? stayDay(patient.admittedOn) : null;

  // Reports come from the LIS/RIS — a short simulated fetch the first time the tab opens.
  useEffect(() => {
    if (tab !== 'Reports' || reportsReady) return;
    const t = setTimeout(() => setReportsReady(true), 500);
    return () => clearTimeout(t);
  }, [tab, reportsReady]);

  const push = (pathname: string, params: Record<string, string> = {}) =>
    router.push({ pathname, params: { patientId: patient.id, ...params } });

  const changeTab = (next: Tab) => {
    setTab(next);
    // Keep the tab strip in view when switching from deep in a long tab.
    if (scrollY.current > tabsY.current) scrollRef.current?.scrollTo({ y: tabsY.current, animated: true });
  };

  const callPatient = () => {
    Linking.openURL(telHref(patient.phone)).catch(() =>
      showToast({ type: 'warning', title: 'Calling unavailable', message: `Dial ${patient.phone} from a phone.` })
    );
  };

  const shareSummary = async () => {
    if (exporting) return;
    setExporting(true);
    showToast({ type: 'info', message: 'Preparing clinical summary PDF…' });
    try {
      await exportDocument(
        buildPatientSummaryDoc({
          patient,
          profile,
          vitals,
          labResults,
          visits,
          pendingBills,
          hospital: app.hospitalProfile,
          preparedBy: patient.attendingDoctor ?? ROLE_ACTOR.doctor,
        }),
        `${patient.name.replace(/\s+/g, '_')}_${patient.uhid}_Summary.pdf`,
        'share'
      );
    } finally {
      setExporting(false);
    }
  };

  const discharge = () => {
    const room = patient.room ?? 'the ward';
    Alert.alert(
      'Confirm Discharge',
      `Discharge ${patient.name} from ${room}? The bed will be released and the discharge summary finalised.${
        outstanding > 0 ? `\n\n${formatCurrency(outstanding)} is still pending on ${plural(pendingBills.length, 'bill')}.` : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discharge',
          style: 'destructive',
          onPress: () => {
            const res = app.dischargePatient(patient.id);
            if (!res.ok) {
              alertAfterClose(
                'Discharge Failed',
                res.error === 'NOT_ADMITTED' ? `${patient.name} is not currently admitted.` : 'This patient record no longer exists.'
              );
              return;
            }
            if (res.outstanding > 0) {
              const top = pendingBills[0];
              alertAfterClose(
                'Attention: Dues Pending',
                `${patient.name} has been discharged and ${room} released.\n\n${formatCurrency(res.outstanding)} is outstanding${
                  pendingBills.length ? ` on ${plural(pendingBills.length, 'bill')}` : ''
                }. Collect it before the patient leaves.`,
                top
                  ? [
                      { text: 'Later', style: 'cancel' },
                      { text: 'Open Bill', onPress: () => router.push({ pathname: '/receipt/[id]', params: { id: top.id } }) },
                    ]
                  : undefined
              );
            } else {
              showToast({
                title: 'Discharge complete',
                message: `${patient.name} discharged • ${room} released`,
                type: 'success',
                action: { label: 'Summary', onPress: () => push('/discharge-summary') },
              });
            }
          },
        },
      ]
    );
  };

  const quickActions: Array<{ key: string; label: string; icon: IconName; color: string; onPress: () => void }> = [
    { key: 'consult', label: 'Consultation', icon: 'medkit', color: colors.primary, onPress: () => push('/opd-consultation') },
    admitted
      ? { key: 'discharge', label: 'Discharge', icon: 'exit-outline', color: colors.danger, onPress: discharge }
      : { key: 'admit', label: 'Admit IPD', icon: 'bed', color: colors.purple, onPress: () => push('/ipd-admission') },
    summary
      ? { key: 'summary', label: 'Summary', icon: 'document-text', color: colors.success, onPress: () => push('/discharge-summary') }
      : { key: 'book', label: 'Appointment', icon: 'calendar', color: colors.teal, onPress: () => push('/book-appointment') },
  ];

  const closeMenuThen = (fn: () => void) => {
    setMenuOpen(false);
    // Let the sheet slide away before a new screen / share sheet opens over it.
    setTimeout(fn, 240);
  };

  const menu: MenuItem[] = [
    { key: 'book', icon: 'calendar-outline', label: 'Book appointment', sub: 'OPD or follow-up visit', color: colors.teal, run: () => push('/book-appointment') },
    { key: 'lab', icon: 'flask-outline', label: 'Order lab tests', sub: 'CBC, LFT, KFT, HbA1c…', color: colors.secondary, run: () => push('/lab') },
    { key: 'scan', icon: 'scan-outline', label: 'Order scan', sub: 'X-ray, CT, MRI, ultrasound', color: colors.purple, run: () => push('/radiology') },
    { key: 'invoice', icon: 'receipt-outline', label: 'Create invoice', sub: outstanding > 0 ? `${formatCurrency(outstanding)} currently due` : 'Bill a service', color: colors.warning, run: () => push('/create-invoice') },
    { key: 'copilot', icon: 'sparkles-outline', label: 'Open in Doctor Copilot', sub: 'AI summary, lab trends, med review', color: colors.primary, run: () => push('/doctor-copilot') },
    { key: 'docs', icon: 'folder-open-outline', label: 'Documents', sub: plural(documents.length, 'file') + ' on record', color: colors.info, run: () => push('/documents') },
    { key: 'share', icon: 'share-social-outline', label: 'Share summary PDF', sub: 'Allergies, problems, meds, labs', color: colors.success, run: shareSummary },
    { key: 'call', icon: 'call-outline', label: 'Call patient', sub: patient.phone, color: colors.success, run: callPatient },
  ];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Patient Details"
        subtitle={patient.uhid}
        rightAction={
          exporting ? (
            <View style={styles.headerBtn}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setMenuOpen(true)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="More patient actions"
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
          )
        }
      />

      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        <View style={styles.top}>
          <FadeInView>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Avatar name={patient.name} size={64} />
                <View style={styles.profileText}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={2}>
                      {patient.name}
                    </Text>
                    <Badge label={patient.status} variant={statusVariant(patient.status)} size="sm" />
                  </View>
                  <Text style={styles.uhid}>UHID: {patient.uhid}</Text>
                  {admitted && (
                    <View style={styles.roomRow}>
                      <Ionicons name="bed-outline" size={13} color={colors.purple} />
                      <Text style={styles.roomText} numberOfLines={1}>
                        {patient.room ?? 'Bed pending'}
                        {day ? ` • Day ${day}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.pills}>
                <View style={styles.pill}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.pillText}>{patient.age} Years</Text>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.pillText}>{patient.gender}</Text>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="water-outline" size={14} color={colors.danger} />
                  <Text style={styles.pillText}>{patient.bloodGroup}</Text>
                </View>
                <TouchableOpacity style={styles.pill} onPress={callPatient} accessibilityRole="button" accessibilityLabel={`Call ${patient.phone}`}>
                  <Ionicons name="call-outline" size={14} color={colors.primary} />
                  <Text style={[styles.pillText, { color: colors.primary }]}>{patient.phone}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={60}>
            <AllergyBanner allergies={profile?.allergies} showNone={false} style={styles.allergy} />
          </FadeInView>

          <FadeInView delay={110} style={styles.actions}>
            {quickActions.map((a) => (
              <PressableScale
                key={a.key}
                style={styles.actionBtn}
                onPress={a.onPress}
                haptic
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <View style={[styles.actionIcon, { backgroundColor: a.color + '16' }]}>
                  <Ionicons name={a.icon} size={18} color={a.color} />
                </View>
                <Text style={styles.actionText} numberOfLines={1}>
                  {a.label}
                </Text>
              </PressableScale>
            ))}
          </FadeInView>
        </View>

        <View
          style={styles.tabsSticky}
          onLayout={(e) => {
            tabsY.current = e.nativeEvent.layout.y;
          }}
        >
          <AnimatedTabs tabs={TABS} active={tab} onChange={changeTab} />
        </View>

        <View style={styles.tabBody}>
          <FadeInView key={tab} offset={8} duration={240}>
            {tab === 'Overview' && (
              <OverviewTab
                patient={patient}
                profile={profile}
                vitals={vitals}
                visits={visits}
                appointments={appointments}
                hasSummary={!!summary}
                onViewVisits={() => changeTab('Visits')}
                onCall={callPatient}
                onOpenSummary={() => push('/discharge-summary')}
                onOpenCopilot={() => push('/doctor-copilot', { tab: 'Summarize' })}
                onOpenAppointments={(date) => router.push({ pathname: '/appointments', params: { date } })}
              />
            )}
            {tab === 'Medical History' && <HistoryTab profile={profile} onStartConsult={() => push('/opd-consultation')} />}
            {tab === 'Visits' && (
              <VisitsTab
                visits={visits}
                appointments={appointments}
                notes={notes}
                onBook={() => push('/book-appointment')}
                onStartConsult={(appointmentId) => push('/opd-consultation', appointmentId ? { appointmentId } : {})}
                onOpenAppointments={(date) => router.push({ pathname: '/appointments', params: { date } })}
              />
            )}
            {tab === 'Reports' && (
              <ReportsTab
                ready={reportsReady}
                labResults={labResults}
                labOrders={labOrders}
                radiology={radiology}
                invoices={invoices}
                documents={documents}
                onOpenCopilot={() => push('/doctor-copilot', { tab: 'Reports' })}
                onOrderLab={() => push('/lab')}
                onOrderScan={() => push('/radiology')}
                onOpenInvoice={(invoiceId) => router.push({ pathname: '/receipt/[id]', params: { id: invoiceId } })}
                onOpenDocuments={() => push('/documents')}
              />
            )}
          </FadeInView>
        </View>
      </ScrollView>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Patient Actions" subtitle={`${patient.name} • ${patient.uhid}`}>
        {menu.map((m, i) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.menuRow, i < menu.length - 1 && styles.menuDivider]}
            onPress={() => closeMenuThen(m.run)}
            accessibilityRole="button"
            accessibilityLabel={m.label}
          >
            <View style={[styles.menuIcon, { backgroundColor: m.color + '18' }]}>
              <Ionicons name={m.icon} size={19} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{m.label}</Text>
              {!!m.sub && (
                <Text style={styles.menuSub} numberOfLines={1}>
                  {m.sub}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  name: {
    flex: 1,
    fontSize: typography.fontSizes.lg + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  uhid: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    marginTop: 3,
  },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  roomText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.purple, fontWeight: typography.fontWeights.semiBold },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cardMuted,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: radius.sm,
  },
  pillText: { fontSize: 12, color: colors.textSecondary, fontWeight: typography.fontWeights.semiBold },
  allergy: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: 72,
    ...shadows.sm,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 12, fontWeight: typography.fontWeights.bold, color: colors.text },
  tabsSticky: { backgroundColor: '#FFFFFF' },
  tabBody: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  menuSub: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 1 },
});
