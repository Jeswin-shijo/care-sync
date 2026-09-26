import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { Appointment, Doctor, Invoice, Patient } from '../data/mockData';
import { useApp } from '../context/AppContext';
import type { PaymentMode } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { BottomSheet } from '../components/common/BottomSheet';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { KeyboardAwareContainer, formScrollProps } from '../components/common/KeyboardAware';
import { WeekStrip, StripDay } from '../components/orders/WeekStrip';
import { GridSlot, SlotGrid } from '../components/orders/SlotGrid';
import { ChoiceChips } from '../components/orders/ChoiceChips';
import { DetailRow, LinkRow, OrderSuccessCard } from '../components/orders/OrderSuccessCard';
import { PAYMENT_MODE_ICON, plural, useMinuteTick, useMountedRef, usePaymentModes } from '../components/orders/hooks';
import { RoleLockScreen } from '../components/orders/RoleLock';
import { canAccess } from '../logic/access';
import { formatCurrency } from '../utils/formatters';
import { daysFromToday, formatDisplayDate, fromISODate, isoDaysFromToday, relativeDayLabel, weekdayShort } from '../utils/dates';

type VisitType = 'OPD' | 'Follow Up';

const SPECIALTIES: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = [
  { key: 'General Medicine', icon: 'people-outline', color: '#1E6BFF', bg: '#E8F1FF' },
  { key: 'Cardiology', icon: 'heart-outline', color: '#EF4444', bg: '#FEF0F2' },
  { key: 'Orthopedics', icon: 'body-outline', color: '#7C3AED', bg: '#F3EEFF' },
  { key: 'Gynecology', icon: 'woman-outline', color: '#A855F7', bg: '#F8F0FF' },
  { key: 'Pediatrics', icon: 'happy-outline', color: '#F59E0B', bg: '#FFF7E6' },
  { key: 'Dermatology', icon: 'water-outline', color: '#0EA5E9', bg: '#EAF6FE' },
  { key: 'ENT', icon: 'ear-outline', color: '#0D9488', bg: '#E6F7F5' },
  { key: 'Others', icon: 'ellipsis-horizontal', color: '#EC4899', bg: '#FDEEF6' },
];
const MAIN_SPECIALTIES = SPECIALTIES.slice(0, 7).map((s) => s.key);

/** Plain-language search terms → department. */
const SYNONYMS: Array<[RegExp, string]> = [
  [/skin|rash|derma|hair|acne/, 'Dermatology'],
  [/heart|cardi|chest pain|bp/, 'Cardiology'],
  [/bone|joint|knee|ortho|fracture|back pain|spine/, 'Orthopedics'],
  [/child|kid|baby|paed|pedia|infant/, 'Pediatrics'],
  [/women|pregnan|gyn|obg|period/, 'Gynecology'],
  [/ear|nose|throat|sinus|ent\b/, 'ENT'],
  [/brain|nerve|neuro|headache|seizure|stroke/, 'Neurology'],
  [/icu|critical|intensiv/, 'Critical Care'],
  [/fever|general|physician|cold|cough|diabet/, 'General Medicine'],
];

const ERROR_TEXT: Record<'SLOT_TAKEN' | 'PATIENT_BUSY' | 'UNKNOWN_PATIENT' | 'UNKNOWN_DOCTOR', string> = {
  SLOT_TAKEN: 'That slot was just booked — pick another time.',
  PATIENT_BUSY: 'This patient already has another appointment at that time. Choose a different slot.',
  UNKNOWN_PATIENT: 'This patient record could not be found — select the patient again.',
  UNKNOWN_DOCTOR: 'This doctor is no longer taking bookings.',
};

const normalizeSpecialty = (raw: string | undefined, doctors: Doctor[]): string | null => {
  if (!raw) return null;
  const r = raw
    .trim()
    .toLowerCase()
    .replace('orthopaedics', 'orthopedics')
    .replace('gynaecology', 'gynecology')
    .replace('paediatrics', 'pediatrics');
  const main = SPECIALTIES.find((s) => s.key.toLowerCase() === r);
  if (main) return main.key;
  const doc = doctors.find((d) => d.department.toLowerCase() === r || d.specialty.toLowerCase().includes(r));
  return doc ? doc.department : null;
};

const nextLabel = (iso: string, time: string) => {
  const rel = relativeDayLabel(iso);
  return rel === 'Today' || rel === 'Tomorrow' ? `${rel} ${time}` : `${rel} • ${time}`;
};

export default function BookAppointmentRoute() {
  const params = useLocalSearchParams<{ patientId?: string; specialty?: string; doctorId?: string; mode?: string; date?: string }>();
  const { doctors, appointments, activeRole, patientAppUserId, getPatient, getAvailableSlots, scheduleAppointment } = useApp();
  const tick = useMinuteTick();
  const mounted = useMountedRef();

  // Patient app (explicit mode, or signed in as a patient): locked to that patient, never shows other records.
  const patientMode = params.mode === 'patient' || activeRole === 'patient';
  const lockedPatientId = activeRole === 'patient' ? patientAppUserId : patientMode ? params.patientId || patientAppUserId : null;
  const paymentModes = usePaymentModes({ online: patientMode });

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(() => normalizeSpecialty(params.specialty, doctors));
  const [patientId, setPatientId] = useState<string | null>(() => {
    const id = lockedPatientId ?? params.patientId;
    return id && getPatient(id) ? id : null;
  });
  const [screenPicker, setScreenPicker] = useState(false);

  // Booking sheet
  const [sheetDoctorId, setSheetDoctorId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetPicker, setSheetPicker] = useState(false);
  const [date, setDate] = useState(isoDaysFromToday(0));
  const [slot, setSlot] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<VisitType>('OPD');
  const [reason, setReason] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>(paymentModes[0]);
  const [errors, setErrors] = useState<{ patient?: string; slot?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<{ appointment: Appointment; invoice?: Invoice } | null>(null);

  const patient: Patient | undefined = getPatient(patientId);
  const sheetDoctor = sheetDoctorId ? doctors.find((d) => d.id === sheetDoctorId) : undefined;

  // ---------- Doctor list ----------
  const q = query.trim().toLowerCase();
  const synonymDept = q.length >= 3 ? SYNONYMS.find(([re]) => re.test(q))?.[1] : undefined;
  const filteredDoctors = useMemo(
    () =>
      doctors.filter((doc) => {
        const inSpecialty =
          !specialty || (specialty === 'Others' ? !MAIN_SPECIALTIES.includes(doc.department) : doc.department === specialty);
        const inQuery =
          !q ||
          doc.name.toLowerCase().includes(q) ||
          doc.department.toLowerCase().includes(q) ||
          doc.specialty.toLowerCase().includes(q) ||
          (doc.qualification ?? '').toLowerCase().includes(q) ||
          doc.department === synonymDept;
        return inSpecialty && inQuery;
      }),
    [doctors, specialty, q, synonymDept]
  );

  const nextAvailable = useMemo(() => {
    const map = new Map<string, { iso: string; time: string } | null>();
    doctors.forEach((doc) => {
      let found: { iso: string; time: string } | null = null;
      for (let i = 0; i < 7 && !found; i++) {
        const iso = isoDaysFromToday(i);
        const open = getAvailableSlots(doc.id, iso).find((s) => s.available);
        if (open) found = { iso, time: open.time };
      }
      map.set(doc.id, found);
    });
    return map;
  }, [doctors, appointments, tick]);

  const activeTile = specialty ? (MAIN_SPECIALTIES.includes(specialty) ? specialty : 'Others') : null;
  const filtered = !!specialty || !!q;
  const listTitle = q ? `Results for “${query.trim()}”` : specialty ? (specialty === 'Others' ? 'Other specialties' : specialty) : 'Top Doctors';

  // ---------- Booking sheet ----------
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDaysFromToday(i)), [tick]);

  const busyTimes = useMemo(() => {
    if (!patientId) return new Set<string>();
    return new Set(
      appointments.filter((a) => a.patientId === patientId && a.date === date && a.status !== 'Cancelled').map((a) => a.time)
    );
  }, [appointments, patientId, date]);

  const slots: GridSlot[] = useMemo(() => {
    if (!sheetDoctor) return [];
    return getAvailableSlots(sheetDoctor.id, date).map((s) =>
      s.available && busyTimes.has(s.time) ? { time: s.time, available: false, reason: 'busy' as const } : s
    );
  }, [sheetDoctor, date, appointments, busyTimes, tick]);

  const stripDays: StripDay[] = useMemo(() => {
    if (!sheetDoctor) return [];
    return weekDays.map((iso) => {
      const off = !sheetDoctor.availableDays.includes(weekdayShort(iso));
      if (off) return { iso, disabled: true, note: 'Off' };
      const open = getAvailableSlots(sheetDoctor.id, iso).filter((s) => s.available).length;
      return open ? { iso, note: `${open} open`, noteTone: 'success' as const } : { iso, note: 'Full', noteTone: 'danger' as const };
    });
  }, [sheetDoctor, weekDays, appointments, tick]);

  const openCount = slots.filter((s) => s.available).length;
  const dayOff = !!sheetDoctor && !sheetDoctor.availableDays.includes(weekdayShort(date));

  const existingWithDoctor = useMemo(() => {
    if (!patientId || !sheetDoctor) return undefined;
    return appointments
      .filter(
        (a) =>
          a.patientId === patientId &&
          a.doctorId === sheetDoctor.id &&
          daysFromToday(a.date) >= 0 &&
          a.status !== 'Cancelled' &&
          a.status !== 'Completed' &&
          a.id !== booked?.appointment.id
      )
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  }, [appointments, patientId, sheetDoctor, booked]);

  // Drop a chosen slot that has become unavailable (patient changed, time passed…).
  useEffect(() => {
    if (slot && !slots.some((s) => s.time === slot && s.available)) setSlot(null);
  }, [slots]);

  const openBooking = (doc: Doctor, preferredDate?: string) => {
    Haptics.selectionAsync().catch(() => {});
    const inWeek = (iso?: string) => !!iso && !!fromISODate(iso) && daysFromToday(iso) >= 0 && daysFromToday(iso) <= 6;
    const worksOn = (iso: string) => doc.availableDays.includes(weekdayShort(iso));
    const next = nextAvailable.get(doc.id);
    const startDate =
      preferredDate && inWeek(preferredDate) && worksOn(preferredDate)
        ? preferredDate
        : next?.iso ?? weekDays.find(worksOn) ?? weekDays[0];
    setSheetDoctorId(doc.id);
    setDate(startDate);
    setSlot(null);
    setVisitType('OPD');
    setReason('');
    setPayMode(paymentModes[0]);
    setErrors({});
    setBooked(null);
    setSubmitting(false);
    setSheetVisible(true);
  };

  // Deep link with a doctor: open the sheet once the push transition has settled.
  useEffect(() => {
    if (!params.doctorId) return;
    const doc = doctors.find((d) => d.id === params.doctorId);
    if (!doc) return;
    const t = setTimeout(() => openBooking(doc, params.date), 450);
    return () => clearTimeout(t);
  }, []);

  const closeSheet = () => {
    if (submitting) return;
    setSheetVisible(false);
    setSheetPicker(false);
  };

  const confirm = () => {
    if (!sheetDoctor) return;
    const next: typeof errors = {};
    if (!patient) next.patient = 'Select the patient this appointment is for.';
    if (!slot) next.slot = dayOff ? `${sheetDoctor.name} doesn't consult on ${weekdayShort(date)} — pick another day.` : 'Pick an available time slot.';
    if (next.patient || next.slot) {
      setErrors(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setErrors({});
    setSubmitting(true);
    setTimeout(() => {
      if (!mounted.current) return;
      const res = scheduleAppointment({
        patientId: patient!.id,
        doctorId: sheetDoctor.id,
        date,
        time: slot!,
        type: visitType,
        department: sheetDoctor.department,
        reason: reason.trim() || undefined,
        paymentMode: payMode,
      });
      setSubmitting(false);
      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        if (res.error === 'SLOT_TAKEN' || res.error === 'PATIENT_BUSY') {
          setSlot(null);
          setErrors({ slot: ERROR_TEXT[res.error] });
        } else if (res.error === 'UNKNOWN_PATIENT') {
          setPatientId(lockedPatientId);
          setErrors({ patient: ERROR_TEXT.UNKNOWN_PATIENT });
        } else {
          setErrors({ form: ERROR_TEXT[res.error] });
        }
        return;
      }
      setBooked({ appointment: res.appointment, invoice: res.invoice });
    }, 500);
  };

  const viewAppointments = () => {
    const iso = booked?.appointment.date;
    setSheetVisible(false);
    router.dismissTo(iso ? { pathname: '/appointments', params: { date: iso } } : '/appointments');
  };

  const finish = () => {
    setSheetVisible(false);
    if (patientMode) {
      router.dismissTo('/patient-portal');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const openReceipt = (invoiceId: string) => {
    setSheetVisible(false);
    router.push({ pathname: '/receipt/[id]', params: { id: invoiceId } });
  };

  const fee = visitType === 'OPD' ? sheetDoctor?.fee ?? 0 : 0;

  // ---------- Sheet footer ----------
  const footer = booked ? (
    <View style={styles.footerStack}>
      {patientMode ? (
        <Button title="Done" onPress={finish} size="lg" fullWidth />
      ) : (
        <Button
          title="View Appointments"
          onPress={viewAppointments}
          size="lg"
          fullWidth
          icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
        />
      )}
      <View style={styles.footerRow}>
        <Button title="Book another" variant="outline" onPress={closeSheet} style={styles.footerHalf} />
        {!patientMode && <Button title="Done" variant="ghost" onPress={finish} style={styles.footerHalf} />}
      </View>
    </View>
  ) : sheetDoctor ? (
    <View>
      {!!errors.form && <Text style={styles.formError}>{errors.form}</Text>}
      <Button
        title={
          visitType === 'OPD'
            ? `${patientMode ? 'Pay' : 'Confirm & Collect'} ${formatCurrency(fee)}${patientMode ? ' & Book' : ''}`
            : 'Confirm Follow-up'
        }
        onPress={confirm}
        loading={submitting}
        size="lg"
        fullWidth
        icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
      />
    </View>
  ) : undefined;

  const bookedDoctor = booked ? doctors.find((d) => d.id === booked.appointment.doctorId) : undefined;

  if (!patientMode && !canAccess(activeRole, 'appointments')) {
    return <RoleLockScreen title="Book Appointment" module="appointments" purpose="Booking OPD appointments" />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Book Appointment" subtitle={patientMode && patient ? `For ${patient.name}` : undefined} />
      <KeyboardAwareContainer>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} {...formScrollProps}>
          {patientMode ? (
            patient && (
              <View style={styles.lockedBar}>
                <Avatar name={patient.name} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedLabel}>Booking for</Text>
                  <Text style={styles.lockedName} numberOfLines={1}>
                    {patient.name} (You) • {patient.uhid}
                  </Text>
                </View>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
              </View>
            )
          ) : (
            <PatientSelectorBar patient={patient} onPress={() => setScreenPicker(true)} label="Booking for" />
          )}

          <SearchBar value={query} onChangeText={setQuery} placeholder="Search doctor, department or specialty" style={styles.search} />

          <View style={styles.grid}>
            {SPECIALTIES.map((spec, i) => {
              const active = activeTile === spec.key;
              return (
                <FadeInView key={spec.key} delay={stagger(i, 30)} offset={8} style={styles.tileWrap}>
                  <PressableScale
                    scaleTo={0.92}
                    haptic
                    onPress={() => setSpecialty(active ? null : spec.key)}
                    style={styles.tile}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${spec.key}${active ? ', selected' : ''}`}
                  >
                    <View style={[styles.tileIcon, { backgroundColor: active ? spec.color : spec.bg }, active && styles.tileIconActive]}>
                      <Ionicons name={spec.icon} size={24} color={active ? '#FFFFFF' : spec.color} />
                    </View>
                    <Text style={[styles.tileLabel, active && { color: spec.color, fontWeight: typography.fontWeights.bold }]} numberOfLines={2}>
                      {spec.key}
                    </Text>
                  </PressableScale>
                </FadeInView>
              );
            })}
          </View>

          <SectionHeader
            title={listTitle}
            meta={plural(filteredDoctors.length, 'doctor')}
            actionLabel={filtered ? 'View All' : undefined}
            onActionPress={() => {
              setSpecialty(null);
              setQuery('');
            }}
            style={styles.sectionHeader}
          />

          {filteredDoctors.length === 0 ? (
            <EmptyState
              icon="medkit-outline"
              title="No doctors found"
              description={`No doctor matches ${q ? `“${query.trim()}”` : 'this specialty'}. Try another specialty or clear the search.`}
              actionTitle="View all doctors"
              onActionPress={() => {
                setSpecialty(null);
                setQuery('');
              }}
            />
          ) : (
            <View style={styles.doctorList}>
              {filteredDoctors.map((doc, i) => {
                const next = nextAvailable.get(doc.id);
                return (
                  <FadeInView key={doc.id} delay={stagger(i, 50)} offset={12}>
                    <PressableScale
                      onPress={() => openBooking(doc, params.date)}
                      style={styles.docCard}
                      accessibilityRole="button"
                      accessibilityLabel={`${doc.name}, ${doc.specialty}, fee ${formatCurrency(doc.fee)}, ${
                        next ? `next available ${nextLabel(next.iso, next.time)}` : 'no slots this week'
                      }`}
                      accessibilityHint="Opens booking"
                    >
                      <Avatar name={doc.name} size={52} />
                      <View style={styles.docInfo}>
                        <View style={styles.docTop}>
                          <Text style={styles.docName} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <View style={styles.rating}>
                            <Ionicons name="star" size={12} color={colors.success} />
                            <Text style={styles.ratingText}>{doc.rating.toFixed(1)}</Text>
                          </View>
                        </View>
                        <Text style={styles.docSpec} numberOfLines={1}>
                          {doc.specialty} • {doc.experienceYears} yrs exp
                        </Text>
                        {!!doc.qualification && (
                          <Text style={styles.docQual} numberOfLines={1}>
                            {doc.qualification}
                          </Text>
                        )}
                        <Text style={styles.docFee} numberOfLines={1}>
                          <Text style={styles.docFeeStrong}>{formatCurrency(doc.fee)}</Text> • {doc.timing}
                        </Text>
                        <View style={styles.docBottom}>
                          <View style={[styles.nextPill, !next && styles.nextPillNone]}>
                            <Ionicons name={next ? 'time-outline' : 'close-circle-outline'} size={12} color={next ? colors.success : colors.textMuted} />
                            <Text style={[styles.nextText, !next && { color: colors.textMuted }]} numberOfLines={1}>
                              {next ? `Next available: ${nextLabel(next.iso, next.time)}` : 'Fully booked this week'}
                            </Text>
                          </View>
                          <View style={styles.bookChip}>
                            <Text style={styles.bookChipText}>Book</Text>
                          </View>
                        </View>
                      </View>
                    </PressableScale>
                  </FadeInView>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAwareContainer>

      {!patientMode && (
        <PatientPicker
          visible={screenPicker}
          onClose={() => setScreenPicker(false)}
          onSelect={(p) => setPatientId(p.id)}
          selectedId={patientId}
          title="Book for patient"
        />
      )}

      <BottomSheet
        visible={sheetVisible && !!sheetDoctor}
        onClose={closeSheet}
        dismissible={!submitting}
        title={booked ? undefined : 'Book Appointment'}
        subtitle={booked || !sheetDoctor ? undefined : 'Choose the patient, a day and an open slot'}
        footer={footer}
        maxHeight={0.92}
      >
        {sheetDoctor && booked ? (
          <OrderSuccessCard
            title={booked.appointment.type === 'Follow Up' ? 'Follow-up Booked' : 'Appointment Booked'}
            subtitle={`${booked.appointment.patientName} with ${booked.appointment.doctorName}`}
            highlight={{ label: 'Token number', value: `#${booked.appointment.tokenNo}` }}
          >
            <DetailRow icon="calendar-outline" label="Date" value={`${relativeDayLabel(booked.appointment.date)} • ${formatDisplayDate(booked.appointment.date)}`} />
            <DetailRow icon="time-outline" label="Time" value={booked.appointment.time} />
            <DetailRow icon="medkit-outline" label="Doctor" value={`${booked.appointment.doctorName}${bookedDoctor ? ` • ${bookedDoctor.room}` : ''}`} />
            <DetailRow icon="clipboard-outline" label="Visit" value={`${booked.appointment.type} • ${booked.appointment.department}`} />
            {!!booked.appointment.reason && <DetailRow icon="document-text-outline" label="Reason" value={booked.appointment.reason} />}
            <DetailRow
              icon="wallet-outline"
              label="Fee"
              value={booked.invoice ? `${formatCurrency(booked.invoice.amount)} paid • ${booked.invoice.paymentMode}` : 'No charge'}
              valueTone={booked.invoice ? 'success' : 'default'}
              last
            />
            {booked.invoice && (
              <LinkRow
                icon="receipt-outline"
                title="View fee receipt"
                subtitle={`${booked.invoice.invoiceNo} • ${formatCurrency(booked.invoice.amount)}`}
                onPress={() => openReceipt(booked.invoice!.id)}
              />
            )}
            <Text style={styles.arrive}>Please arrive 15 minutes early{bookedDoctor ? ` at ${bookedDoctor.room}` : ''}. The token is also shown in notifications.</Text>
          </OrderSuccessCard>
        ) : sheetDoctor ? (
          <View>
            <View style={styles.docBanner}>
              <Avatar name={sheetDoctor.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerName}>{sheetDoctor.name}</Text>
                <Text style={styles.bannerMeta} numberOfLines={1}>
                  {sheetDoctor.specialty} • {sheetDoctor.room}
                </Text>
                <Text style={styles.bannerMeta} numberOfLines={1}>
                  Consults {sheetDoctor.availableDays.length === 7 ? 'daily' : sheetDoctor.availableDays.join(', ')} • {sheetDoctor.timing}
                </Text>
              </View>
              <View style={styles.bannerFee}>
                <Text style={styles.bannerFeeValue}>{formatCurrency(sheetDoctor.fee)}</Text>
                <Text style={styles.bannerFeeLabel}>fee</Text>
              </View>
            </View>

            {/* Patient */}
            <Text style={styles.label}>Patient</Text>
            {patientMode ? (
              patient && (
                <View style={styles.lockedBar}>
                  <Avatar name={patient.name} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockedName} numberOfLines={1}>
                      {patient.name} • {patient.uhid}
                    </Text>
                    <Text style={styles.lockedLabel}>Signed-in patient</Text>
                  </View>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                </View>
              )
            ) : (
              <>
                <PatientSelectorBar
                  patient={patient}
                  onPress={() => setSheetPicker(true)}
                  label="Booking for"
                  style={errors.patient ? styles.fieldErrorBorder : undefined}
                />
                {!!errors.patient && <Text style={styles.fieldError}>{errors.patient}</Text>}
                {!patient && (
                  <TouchableOpacity
                    onPress={() => {
                      setSheetVisible(false);
                      router.push('/register-patient');
                    }}
                    style={styles.registerLink}
                    accessibilityRole="link"
                  >
                    <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                    <Text style={styles.registerText}>New patient? Register first</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {existingWithDoctor && (
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.infoText} />
                <Text style={styles.infoNoteText}>
                  Already booked with {sheetDoctor.name} {relativeDayLabel(existingWithDoctor.date)} at {existingWithDoctor.time} (Token #
                  {existingWithDoctor.tokenNo}).
                </Text>
              </View>
            )}

            {/* Date */}
            <Text style={styles.label}>Date</Text>
            <WeekStrip
              days={stripDays}
              selected={date}
              onSelect={(iso) => {
                setDate(iso);
                setErrors((e) => ({ ...e, slot: undefined }));
              }}
              inset={spacing.lg}
              style={styles.bleed}
            />

            {/* Time */}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Time</Text>
              {!dayOff && <Text style={styles.labelMeta}>{openCount ? `${openCount} of ${slots.length} open` : 'All slots taken'}</Text>}
            </View>
            {dayOff ? (
              <View style={styles.offDay}>
                <Ionicons name="moon-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.offDayText}>
                  {sheetDoctor.name} doesn’t consult on {weekdayShort(date)}s. Pick a highlighted day above.
                </Text>
              </View>
            ) : (
              <SlotGrid
                slots={slots}
                selected={slot}
                onSelect={(t) => {
                  setSlot(t);
                  setErrors((e) => ({ ...e, slot: undefined, form: undefined }));
                }}
              />
            )}
            {!!errors.slot && <Text style={styles.fieldError}>{errors.slot}</Text>}
            {!dayOff && openCount === 0 && (
              <Text style={styles.hint}>This day is full — try another day in the strip above.</Text>
            )}

            {/* Visit type */}
            <Text style={styles.label}>Visit type</Text>
            <ChoiceChips<VisitType>
              options={[
                { value: 'OPD', label: 'OPD consultation', sublabel: formatCurrency(sheetDoctor.fee), icon: 'medkit-outline' },
                { value: 'Follow Up', label: 'Follow-up', sublabel: 'Review • no charge', icon: 'repeat-outline' },
              ]}
              value={visitType}
              onChange={setVisitType}
              accessibilityLabel="Visit type"
            />

            {/* Reason */}
            <Text style={styles.label}>Reason for visit</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Fever for 3 days, BP review (optional)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              maxLength={200}
              accessibilityLabel="Reason for visit"
            />

            {/* Payment */}
            {visitType === 'OPD' ? (
              <>
                <Text style={styles.label}>Payment</Text>
                <ChoiceChips<PaymentMode>
                  options={paymentModes.map((m) => ({ value: m, label: m, icon: PAYMENT_MODE_ICON[m] }))}
                  value={payMode}
                  onChange={setPayMode}
                  accessibilityLabel="Payment mode"
                />
              </>
            ) : null}

            <View style={styles.feeCard}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{visitType === 'OPD' ? 'Consultation fee' : 'Follow-up review'}</Text>
                <Text style={styles.feeValue}>{visitType === 'OPD' ? formatCurrency(sheetDoctor.fee) : 'No charge'}</Text>
              </View>
              {slot && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Slot</Text>
                  <Text style={styles.feeValue}>
                    {relativeDayLabel(date)} • {slot}
                  </Text>
                </View>
              )}
              <View style={[styles.feeRow, styles.feeTotalRow]}>
                <Text style={styles.feeTotalLabel}>{visitType === 'OPD' ? `Payable now (${payMode})` : 'Payable'}</Text>
                <Text style={styles.feeTotal}>{formatCurrency(fee)}</Text>
              </View>
            </View>

            {!patientMode && (
              <PatientPicker
                visible={sheetPicker}
                onClose={() => setSheetPicker(false)}
                onSelect={(p) => {
                  setPatientId(p.id);
                  setErrors((e) => ({ ...e, patient: undefined }));
                }}
                selectedId={patientId}
                title="Book for patient"
                allowRegister={false}
              />
            )}
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },
  search: { marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.base, marginHorizontal: -4 },
  tileWrap: { width: '25%', padding: 4 },
  tile: { alignItems: 'center', paddingVertical: 6, minHeight: 96 },
  tileIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileIconActive: { ...shadows.md, shadowOpacity: 0.18 },
  tileLabel: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  sectionHeader: { marginTop: spacing.md },
  doctorList: { gap: spacing.md },
  docCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  docInfo: { flex: 1, minWidth: 0 },
  docTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  docName: { flex: 1, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
  },
  ratingText: { fontSize: 12, fontWeight: typography.fontWeights.bold, color: colors.success },
  docSpec: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  docQual: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 1 },
  docFee: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 4 },
  docFeeStrong: { color: colors.primary, fontWeight: typography.fontWeights.bold },
  docBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  nextPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.successLight,
    minWidth: 0,
  },
  nextPillNone: { backgroundColor: colors.cardMuted },
  nextText: { flexShrink: 1, fontSize: 11, fontWeight: typography.fontWeights.semiBold, color: colors.successText },
  bookChip: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: typography.fontWeights.bold },
  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  lockedLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  lockedName: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  // Sheet
  docBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
  },
  bannerName: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  bannerMeta: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary, marginTop: 2 },
  bannerFee: { alignItems: 'flex-end' },
  bannerFeeValue: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.extraBold, color: colors.primary },
  bannerFeeLabel: { fontSize: 10.5, color: colors.textSecondary },
  label: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  labelMeta: { fontSize: typography.fontSizes.xs, color: colors.textMuted, fontWeight: typography.fontWeights.semiBold },
  bleed: { marginHorizontal: -spacing.lg },
  fieldError: { color: colors.danger, fontSize: typography.fontSizes.xs + 1, marginTop: 6 },
  fieldErrorBorder: { borderColor: colors.danger, borderStyle: 'solid' },
  formError: { color: colors.danger, fontSize: typography.fontSizes.xs + 1, marginBottom: spacing.sm, textAlign: 'center' },
  hint: { color: colors.textMuted, fontSize: typography.fontSizes.xs + 0.5, marginTop: 2 },
  registerLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, alignSelf: 'flex-start', paddingVertical: 6 },
  registerText: { color: colors.primary, fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.semiBold },
  infoNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.infoLight,
  },
  infoNoteText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.infoText, lineHeight: 17 },
  offDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
  },
  offDayText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  feeCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    gap: 6,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  feeValue: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  feeTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 2 },
  feeTotalLabel: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  feeTotal: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.extraBold, color: colors.primary },
  footerStack: { gap: spacing.sm },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerHalf: { flex: 1 },
  arrive: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 17 },
});
