import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import type { Appointment, Invoice, PatientReminder } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useAlert } from '../context/AlertContext';
import { useToast } from '../context/ToastContext';
import { clockToMinutes, daysFromToday, formatClock, greetingForNow, relativeDayLabel, weekdayShort, fromISODate } from '../utils/dates';
import { formatCurrency } from '../utils/formatters';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge, statusVariant } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { PatientPicker } from '../components/common/PatientPicker';
import { FadeInView, PressableScale, PulseDot, stagger } from '../components/common/Motion';
import { AnimatedCheckbox } from '../components/portals/AnimatedCheckbox';
import { CardAction } from '../components/portals/CardAction';
import { HoldToCallButton } from '../components/portals/HoldToCallButton';
import { PaymentSheet } from '../components/portals/PaymentSheet';
import { ProgressRing } from '../components/portals/ProgressRing';
import { VisitDetailSheet } from '../components/portals/VisitDetailSheet';
import { minutesOfDay, useNow } from '../components/portals/useNow';

type IconName = keyof typeof Ionicons.glyphMap;
type DoseStatus = 'Taken' | 'Due now' | 'Upcoming' | 'Missed';

const SOS_REASON = 'SOS from patient app';
/** A dose counts as missed this long after its scheduled time. */
const MISSED_AFTER_MIN = 30;
const COLLAPSED_DOSES = 3;
const ASK_CHIPS = ['When is my next appointment?', 'Explain my latest report', 'My medicines today', 'Where is the laboratory?'];
const INVOICE_ICON: Record<Invoice['type'], IconName> = {
  REG: 'card-outline',
  OPD: 'medkit-outline',
  IPD: 'bed-outline',
  Pharmacy: 'medical-outline',
  Lab: 'flask-outline',
  Radiology: 'scan-outline',
  Surgery: 'cut-outline',
};

const doseStatus = (r: PatientReminder, nowMin: number): DoseStatus => {
  if (r.taken) return 'Taken';
  const t = clockToMinutes(r.time);
  if (nowMin > t + MISSED_AFTER_MIN) return 'Missed';
  if (nowMin >= t - MISSED_AFTER_MIN) return 'Due now';
  return 'Upcoming';
};
const DOSE_VARIANT = { Taken: 'success', 'Due now': 'warning', Upcoming: 'info', Missed: 'danger' } as const;

const callNumber = (number: string) =>
  Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() =>
    Alert.alert('Call failed', `This device can't place calls. Please dial ${number} from a phone.`)
  );

export default function PatientPortalRoute() {
  const {
    setActiveRole,
    patientAppUser: patient,
    setPatientAppUser,
    patientReminders,
    togglePatientReminder,
    getAppointmentsForPatient,
    getInvoicesForPatient,
    getLabResults,
    getLabOrders,
    getRadiologyOrders,
    ambulances,
    dispatchAmbulance,
    sendPatientAiMessage,
    hospitalProfile,
  } = useApp();
  const { showToast } = useToast();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const now = useNow(60000);
  const nowMin = minutesOfDay(now);

  const scrollRef = useRef<ScrollView>(null);
  const medsY = useRef(0);
  const flash = useRef(new Animated.Value(0)).current;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [medsExpanded, setMedsExpanded] = useState(false);
  const [billsExpanded, setBillsExpanded] = useState(false);
  const [visit, setVisit] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [payment, setPayment] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  // Re-asserted on every focus, so returning to this portal restores its role.
  useFocusEffect(
    useCallback(() => {
      setActiveRole('patient');
    }, [setActiveRole])
  );

  const pid = patient?.id ?? '';
  const reminders = useMemo(
    () => patientReminders.filter((r) => r.patientId === pid).sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time)),
    [patientReminders, pid]
  );
  const upcoming = useMemo(
    () =>
      (pid ? getAppointmentsForPatient(pid) : [])
        .filter((a) => {
          if (a.status === 'Completed' || a.status === 'Cancelled') return false;
          const days = daysFromToday(a.date);
          if (days !== 0) return days > 0;
          // Today: keep it until an hour after the slot (or while the patient is already at the clinic).
          return a.status === 'Waiting' || a.status === 'In Consultation' || clockToMinutes(a.time) + 60 >= nowMin;
        })
        .sort((a, b) => (a.date === b.date ? clockToMinutes(a.time) - clockToMinutes(b.time) : a.date < b.date ? -1 : 1)),
    [getAppointmentsForPatient, pid, nowMin]
  );
  const bills = useMemo(
    () =>
      (pid ? getInvoicesForPatient(pid) : []).sort(
        (a, b) => (b.dateISO ?? '').localeCompare(a.dateISO ?? '') || clockToMinutes(b.time) - clockToMinutes(a.time)
      ),
    [getInvoicesForPatient, pid]
  );

  if (!patient) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="Patient App" />
        <EmptyState
          icon="person-circle-outline"
          title="No patient signed in"
          description="Choose which patient's app to view for this demo."
          actionTitle="Choose patient"
          onActionPress={() => setPickerOpen(true)}
          style={styles.emptyFull}
        />
        <PatientPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(p) => setPatientAppUser(p.id)} allowRegister={false} title="View the app as" />
      </SafeAreaView>
    );
  }

  const first = patient.name.split(' ')[0];
  const statuses = reminders.map((r) => doseStatus(r, nowMin));
  const taken = statuses.filter((s) => s === 'Taken').length;
  const missed = statuses.filter((s) => s === 'Missed').length;
  const dueSoFar = reminders.filter((r) => r.taken || clockToMinutes(r.time) <= nowMin).length;
  const adherence = dueSoFar ? taken / dueSoFar : null;
  const ringColor = adherence === null ? colors.primary : adherence >= 0.8 ? colors.success : adherence >= 0.5 ? colors.warning : colors.danger;
  const remaining = reminders.length - taken;
  const shownDoses = medsExpanded ? reminders : reminders.slice(0, COLLAPSED_DOSES);

  const labResults = getLabResults(patient.id);
  const pendingLabs = getLabOrders(patient.id).filter((s) => s.status === 'New' || s.status === 'Processing');
  const scans = getRadiologyOrders(patient.id);
  const readyReports = labResults.length + scans.filter((s) => s.status === 'Reported').length;
  const pendingBills = bills.filter((b) => b.status === 'Pending');
  const pendingTotal = pendingBills.reduce((n, b) => n + b.amount, 0);
  const shownBills = billsExpanded ? bills : bills.slice(0, 4);
  const sosTrip = ambulances.find((a) => a.status === 'On Trip' && a.trip?.reason === SOS_REASON && a.trip.pickup === patient.address);
  const visitAppt = upcoming.find((a) => a.id === visit.id) ?? getAppointmentsForPatient(patient.id).find((a) => a.id === visit.id) ?? null;
  const payInvoice = bills.find((b) => b.id === payment.id) ?? null;

  const ask = (q: string) => {
    sendPatientAiMessage(q);
    router.push('/patient-assistant');
  };

  const goToMeds = () => {
    setMedsExpanded(true);
    scrollRef.current?.scrollTo({ y: Math.max(0, medsY.current - spacing.md), animated: true });
    flash.setValue(0);
    Animated.sequence([
      Animated.delay(250),
      Animated.timing(flash, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.timing(flash, { toValue: 0, duration: 900, useNativeDriver: false }),
    ]).start();
  };

  const toggleDose = (r: PatientReminder) => {
    togglePatientReminder(r.id);
    showToast({
      type: r.taken ? 'info' : 'success',
      message: r.taken ? `${r.medicineName} marked as not taken` : `${r.medicineName} taken at ${formatClock()}`,
      action: { label: 'Undo', onPress: () => togglePatientReminder(r.id) },
    });
  };

  const sendAmbulance = (ambulanceId: string) => {
    const amb = dispatchAmbulance(ambulanceId, { pickup: patient.address, reason: SOS_REASON, priority: 'Emergency' });
    if (amb?.trip) {
      showToast({
        type: 'success',
        icon: 'medkit',
        title: 'Ambulance on the way',
        message: `${amb.vehicleNo} (${amb.type}) • ETA ${amb.trip.etaMinutes} min • driver ${amb.driver}${amb.paramedic ? `, paramedic ${amb.paramedic}` : ''}`,
        duration: 6000,
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      showToast({
        type: 'danger',
        title: 'Could not dispatch an ambulance',
        message: 'That ambulance was just assigned elsewhere. Please call 108 now.',
        action: { label: 'Call 108', onPress: () => callNumber('108') },
        duration: 6000,
      });
    }
  };

  const handleSos = () => {
    const available = ambulances.find((a) => a.status === 'Available');
    showAlert({
      title: 'Emergency SOS',
      message: available
        ? `Call the national emergency line, or send a hospital ambulance to:\n${patient.address}`
        : 'All hospital ambulances are on other calls. Call 108 for the nearest ambulance.',
      type: 'danger',
      icon: 'medkit',
      buttons: [
        { text: 'Call 108', style: 'destructive', onPress: () => callNumber('108') },
        ...(available ? [{ text: 'Send hospital ambulance', style: 'primary' as const, onPress: () => sendAmbulance(available.id) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    });
  };

  const flashStyle = {
    borderColor: flash.interpolate({ inputRange: [0, 1], outputRange: [colors.borderLight, colors.success] }),
    backgroundColor: flash.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#F0FDF4'] }),
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        titleComponent={
          <Pressable
            onPress={() => setPickerOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Patient app, viewing as ${patient.name}. Switch patient`}
          >
            <Text style={styles.title}>Patient App</Text>
            <View style={styles.viewingRow}>
              <Text style={styles.viewing} numberOfLines={1}>
                Viewing as {patient.name}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.primary} />
            </View>
          </Pressable>
        }
      />

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {/* Greeting + AI assistant */}
        <FadeInView>
          <Text style={styles.greeting}>
            {greetingForNow(now)}, {first}
          </Text>
          <Text style={styles.greetingSub}>
            UHID {patient.uhid} • {patient.bloodGroup} • {patient.insurance}
          </Text>
          <PressableScale onPress={() => router.push('/patient-assistant')} accessibilityRole="button" accessibilityLabel="Open the AI health assistant">
            <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCard}>
              <View style={styles.aiTop}>
                <View style={styles.bot}>
                  <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.aiHi}>Hi! How can I help you today?</Text>
                  <Text style={styles.aiSub}>Your CareSync assistant • reports, medicines, visits & directions</Text>
                </View>
              </View>
              <View style={styles.fakeInput}>
                <Text style={styles.fakeInputText}>Ask anything about your care…</Text>
                <Ionicons name="send" size={16} color={colors.primary} />
              </View>
            </LinearGradient>
          </PressableScale>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBleed} contentContainerStyle={styles.chips}>
            {ASK_CHIPS.map((q) => (
              <PressableScale key={q} style={styles.askChip} onPress={() => ask(q)} accessibilityRole="button" accessibilityLabel={`Ask the assistant: ${q}`}>
                <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                <Text style={styles.askChipText}>{q}</Text>
              </PressableScale>
            ))}
          </ScrollView>
        </FadeInView>

        {/* SOS */}
        <FadeInView delay={stagger(1)}>
          {sosTrip?.trip ? (
            <View style={styles.helpCard}>
              <View style={styles.helpTop}>
                <PulseDot color={colors.danger} size={10} />
                <Text style={styles.helpTitle}>Help is on the way</Text>
              </View>
              <Text style={styles.helpText}>
                Ambulance {sosTrip.vehicleNo} ({sosTrip.type}) • ETA about {sosTrip.trip.etaMinutes} min{'\n'}Driver {sosTrip.driver}
                {sosTrip.paramedic ? ` • Paramedic ${sosTrip.paramedic}` : ''}
              </Text>
              <Text style={styles.helpTip}>Keep your phone nearby, unlock the door and keep your ID and current medicines ready.</Text>
              <View style={styles.helpActions}>
                {sosTrip.driverPhone ? (
                  <CardAction label="Call driver" icon="call-outline" variant="dangerOutline" onPress={() => callNumber(sosTrip.driverPhone!)} grow accessibilityLabel={`Call driver ${sosTrip.driver}`} />
                ) : (
                  <CardAction label="Call hospital" icon="call-outline" variant="dangerOutline" onPress={() => callNumber(hospitalProfile.phone)} grow />
                )}
                <CardAction label="Call 108" icon="call" variant="danger" onPress={() => callNumber('108')} grow />
              </View>
            </View>
          ) : (
            <View style={styles.sosCard}>
              <View style={styles.flex}>
                <Text style={styles.sosTitle}>Emergency?</Text>
                <Text style={styles.sosText}>Press and hold SOS to call 108 or send a hospital ambulance to your home address.</Text>
              </View>
              <HoldToCallButton onTrigger={handleSos} size={76} />
            </View>
          )}
        </FadeInView>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <QuickCard
            index={0}
            icon="calendar"
            color={colors.primary}
            bg={colors.infoLight}
            title="Book Appointment"
            sub={upcoming[0] ? `Next: ${relativeDayLabel(upcoming[0].date)} ${upcoming[0].time}` : 'Find a doctor & token'}
            onPress={() => router.push({ pathname: '/book-appointment', params: { patientId: patient.id, mode: 'patient' } })}
          />
          <QuickCard
            index={1}
            icon="document-text"
            color="#EC4899"
            bg="#FDF2F8"
            title="My Reports"
            sub={`${readyReports} ready${pendingLabs.length ? ` • ${pendingLabs.length} pending` : ''}`}
            onPress={() => router.push('/patient-reports')}
          />
          <QuickCard
            index={2}
            icon="alarm"
            color={colors.success}
            bg={colors.successLight}
            title="Medicine Reminder"
            sub={reminders.length ? (remaining ? `${remaining} dose${remaining > 1 ? 's' : ''} left today` : 'All doses taken today') : 'No medicines today'}
            onPress={goToMeds}
          />
          <QuickCard
            index={3}
            icon="navigate"
            color={colors.warning}
            bg={colors.warningLight}
            title="Hospital Navigation"
            sub="Indoor map & directions"
            onPress={() => router.push('/hospital-navigation')}
          />
        </View>

        {/* Today's medicines */}
        <View
          onLayout={(e) => {
            medsY.current = e.nativeEvent.layout.y;
          }}
        >
          <SectionHeader
            title="Today's Medicines"
            meta={reminders.length ? `${taken}/${reminders.length} taken` : undefined}
            actionLabel={reminders.length > COLLAPSED_DOSES ? (medsExpanded ? 'Show less' : `Show all (${reminders.length})`) : undefined}
            onActionPress={() => setMedsExpanded((v) => !v)}
          />
          <Animated.View style={[styles.medsCard, flashStyle]}>
            {reminders.length ? (
              <>
                <View style={styles.adherence}>
                  <ProgressRing size={64} thickness={7} color={ringColor} trackColor={colors.cardMuted} progress={adherence ?? 0}>
                    <Text style={[styles.ringValue, { color: ringColor }]}>{adherence === null ? '—' : `${Math.round(adherence * 100)}%`}</Text>
                  </ProgressRing>
                  <View style={styles.flex}>
                    <Text style={styles.adherenceTitle}>Adherence today</Text>
                    <Text style={styles.adherenceSub}>{adherence === null ? 'No doses were due yet' : `${taken} of ${dueSoFar} due dose${dueSoFar > 1 ? 's' : ''} taken`}</Text>
                    <View style={styles.doseStats}>
                      <DoseStat label="Taken" value={taken} color={colors.success} />
                      <DoseStat label="Due" value={reminders.length - taken - missed} color={colors.warning} />
                      <DoseStat label="Missed" value={missed} color={colors.danger} />
                    </View>
                  </View>
                </View>
                {shownDoses.map((r) => {
                  const st = doseStatus(r, nowMin);
                  return (
                    <View key={r.id} style={[styles.dose, st === 'Missed' && styles.doseMissed]}>
                      <AnimatedCheckbox checked={r.taken} onToggle={() => toggleDose(r)} accessibilityLabel={`${r.medicineName} at ${r.time}`} style={styles.doseCheck} />
                      <View style={styles.flex}>
                        <Text style={[styles.doseName, r.taken && styles.doseNameTaken]} numberOfLines={1}>
                          {r.medicineName}
                        </Text>
                        <Text style={styles.doseMeta} numberOfLines={1}>
                          {r.dosage} • {r.time}
                        </Text>
                        <Text style={styles.doseHint} numberOfLines={2}>
                          {r.instructions}
                        </Text>
                      </View>
                      <Badge label={st} variant={DOSE_VARIANT[st]} size="sm" />
                    </View>
                  );
                })}
              </>
            ) : (
              <EmptyState icon="medkit-outline" title="No medicines scheduled today" description="Reminders appear here when the pharmacy dispenses your prescription." style={styles.emptyInCard} />
            )}
          </Animated.View>
        </View>

        {/* Upcoming visits */}
        <SectionHeader title="Upcoming Visits" meta={upcoming.length ? `${upcoming.length}` : undefined} actionLabel="Book" onActionPress={() => router.push({ pathname: '/book-appointment', params: { patientId: patient.id, mode: 'patient' } })} />
        {upcoming.length ? (
          upcoming.map((a, i) => (
            <FadeInView key={a.id} delay={stagger(i)}>
              <VisitCard appt={a} onPress={() => setVisit({ open: true, id: a.id })} />
            </FadeInView>
          ))
        ) : (
          <View style={styles.card}>
            <EmptyState
              icon="calendar-outline"
              title="No upcoming visits"
              description="Book a consultation and your token appears here."
              actionTitle="Book appointment"
              onActionPress={() => router.push({ pathname: '/book-appointment', params: { patientId: patient.id, mode: 'patient' } })}
              style={styles.emptyInCard}
            />
          </View>
        )}

        {/* Bills */}
        <SectionHeader
          title="Bills & Payments"
          meta={pendingBills.length ? `${formatCurrency(pendingTotal)} due` : bills.length ? 'all paid' : undefined}
          actionLabel={bills.length > 4 ? (billsExpanded ? 'Show less' : `Show all (${bills.length})`) : undefined}
          onActionPress={() => setBillsExpanded((v) => !v)}
        />
        {bills.length ? (
          <View style={styles.card}>
            {shownBills.map((b, i) => (
              <PressableScale
                key={b.id}
                style={[styles.bill, i < shownBills.length - 1 && styles.divider]}
                onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: b.id } })}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel={`${b.title}, ${formatCurrency(b.amount)}, ${b.status}. Open receipt`}
              >
                <View style={styles.billIcon}>
                  <Ionicons name={INVOICE_ICON[b.type]} size={17} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.billTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={styles.billMeta} numberOfLines={1}>
                    {b.invoiceNo} • {b.date}
                  </Text>
                  {b.status === 'Pending' && (
                    <CardAction label="Pay now" icon="wallet-outline" onPress={() => setPayment({ open: true, id: b.id })} style={styles.payBtn} accessibilityLabel={`Pay ${formatCurrency(b.amount)} for ${b.title}`} />
                  )}
                </View>
                <View style={styles.billRight}>
                  <Text style={styles.billAmount}>{formatCurrency(b.amount)}</Text>
                  <Badge label={b.status} variant={statusVariant(b.status)} size="sm" />
                </View>
              </PressableScale>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <EmptyState icon="receipt-outline" title="No bills yet" description="Receipts for consultations, tests and medicines appear here." style={styles.emptyInCard} />
          </View>
        )}
      </ScrollView>

      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => {
          if (p.id === patient.id) return;
          setPatientAppUser(p.id);
          setMedsExpanded(false);
          setBillsExpanded(false);
          showToast({ type: 'info', message: `Now viewing the patient app as ${p.name}` });
        }}
        selectedId={patient.id}
        allowRegister={false}
        title="View the app as"
      />
      <VisitDetailSheet visible={visit.open} appointment={visitAppt} onClose={() => setVisit((v) => ({ ...v, open: false }))} />
      <PaymentSheet visible={payment.open} invoice={payInvoice} onClose={() => setPayment((p) => ({ ...p, open: false }))} />
    </SafeAreaView>
  );
}

// -------------------------------------------------------------

const QuickCard: React.FC<{ index: number; icon: IconName; color: string; bg: string; title: string; sub: string; onPress: () => void }> = ({
  index,
  icon,
  color,
  bg,
  title,
  sub,
  onPress,
}) => (
  <FadeInView delay={stagger(index + 2)} style={styles.quickCell}>
    <PressableScale style={styles.quickCard} onPress={onPress} haptic accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}>
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={styles.quickTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.quickSub} numberOfLines={1}>
        {sub}
      </Text>
    </PressableScale>
  </FadeInView>
);

const DoseStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={styles.doseStat}>
    <View style={[styles.doseDot, { backgroundColor: color }]} />
    <Text style={styles.doseStatText}>
      {value} {label}
    </Text>
  </View>
);

const VisitCard: React.FC<{ appt: Appointment; onPress: () => void }> = ({ appt, onPress }) => {
  const d = fromISODate(appt.date);
  const soon = daysFromToday(appt.date) <= 1;
  return (
    <PressableScale style={styles.visit} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${appt.doctorName}, ${relativeDayLabel(appt.date)} at ${appt.time}. Open details`}>
      <View style={[styles.dateBlock, soon && styles.dateBlockSoon]}>
        <Text style={[styles.dateDow, soon && styles.dateSoonText]}>{weekdayShort(appt.date)}</Text>
        <Text style={[styles.dateDay, soon && styles.dateSoonText]}>{d ? d.getDate() : '—'}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.visitDoctor} numberOfLines={1}>
          {appt.doctorName}
        </Text>
        <Text style={styles.visitDept} numberOfLines={1}>
          {appt.department} • {appt.type === 'Follow Up' ? 'Follow-up' : appt.type}
        </Text>
        <View style={styles.visitWhen}>
          <Ionicons name="time-outline" size={13} color={soon ? colors.primary : colors.textSecondary} />
          <Text style={[styles.visitWhenText, soon && { color: colors.primary }]}>
            {relativeDayLabel(appt.date)} • {appt.time}
          </Text>
        </View>
      </View>
      <View style={styles.visitRight}>
        <Badge label={`Token #${appt.tokenNo}`} variant="primary" size="sm" />
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  flex: { flex: 1 },
  emptyFull: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  viewingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  viewing: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    flexShrink: 1,
  },
  greeting: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  greetingSub: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  aiCard: {
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.md,
  },
  aiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHi: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
  },
  aiSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  fakeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
    minHeight: 42,
    marginTop: spacing.md,
  },
  fakeInputText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  chipsBleed: {
    marginHorizontal: -spacing.base,
    marginTop: spacing.sm,
    flexGrow: 0,
  },
  chips: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingVertical: 2,
  },
  askChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    minHeight: 38,
  },
  askChipText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primaryDark,
    fontWeight: typography.fontWeights.semiBold,
  },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sosTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.dangerText,
  },
  sosText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  helpCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: colors.danger + '66',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  helpTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  helpTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.dangerText,
  },
  helpText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 19,
    fontWeight: typography.fontWeights.medium,
  },
  helpTip: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  helpActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickCell: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  quickCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    minHeight: 112,
    ...shadows.sm,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickTitle: {
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  quickSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  medsCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    ...shadows.sm,
  },
  adherence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  ringValue: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.extraBold,
  },
  adherenceTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  adherenceSub: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 6,
  },
  doseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  doseStatText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  dose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  doseMissed: {
    backgroundColor: '#FFFAFA',
  },
  doseCheck: {
    marginLeft: -10,
  },
  doseName: {
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  doseNameTaken: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  doseMeta: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 1,
  },
  doseHint: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  emptyInCard: {
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  visit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  dateBlock: {
    width: 50,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
  },
  dateBlockSoon: {
    backgroundColor: colors.primary,
  },
  dateDow: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
  },
  dateSoonText: {
    color: '#FFFFFF',
  },
  visitDoctor: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  visitDept: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  visitWhen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  visitWhenText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  visitRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  bill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billTitle: {
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  billMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  payBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  billAmount: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
  },
});
