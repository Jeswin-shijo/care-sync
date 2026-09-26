import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { Patient, WardInfo } from '../data/mockData';
import { PaymentMode, RoomType, useApp } from '../context/AppContext';
import { bedLabel, ROLE_ACTOR, wardForRoomType } from '../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { formatDisplayDate, isoDaysFromToday } from '../utils/dates';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { formScrollProps, KeyboardAwareContainer } from '../components/common/KeyboardAware';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { FadeInView, PressableScale, ProgressFill } from '../components/common/Motion';
import { AccessGate } from '../components/clinical/AccessGate';
import { AllergyBanner } from '../components/clinical/AllergyBanner';
import { ChoiceChips } from '../components/clinical/ChoiceChips';
import { ClinicalCard, KeyValueRow } from '../components/clinical/ClinicalCard';
import { FieldInput, FormField } from '../components/clinical/FormField';
import { friendlyDate } from '../components/clinical/format';
import type { IconName } from '../components/clinical/types';
import { useReturnToPatient } from '../components/clinical/useReturnToPatient';

type AdmissionType = 'New Admission' | 'Re-admission';

const ROOM_TYPES: Array<{ type: RoomType; icon: IconName; desc: string }> = [
  { type: 'General Ward', icon: 'bed-outline', desc: 'Shared ward • 24h nursing station' },
  { type: 'ICU', icon: 'pulse-outline', desc: 'Critical care • continuous monitoring' },
  { type: 'Private', icon: 'home-outline', desc: 'Deluxe suite • attendant bed' },
];
const STAY_OPTIONS = [1, 3, 5, 7];
const ADMISSION_CHARGE = 1000;

const roomTypeFrom = (value?: string): RoomType | undefined =>
  (['General Ward', 'ICU', 'Private'] as RoomType[]).find((r) => r.toLowerCase() === value?.toLowerCase());

const defaultAdmissionType = (p?: Patient): AdmissionType => (p && p.admittedOn && p.status !== 'Admitted' ? 'Re-admission' : 'New Admission');

const roomTypeForWard = (w: WardInfo): RoomType => (w.type === 'ICU' ? 'ICU' : w.type === 'Deluxe' ? 'Private' : 'General Ward');

export default function IpdAdmissionRoute() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <IpdAdmissionScreen />
    </SafeAreaView>
  );
}

function IpdAdmissionScreen() {
  const params = useLocalSearchParams<{ patientId: string; roomType: string; department: string; wardId: string; bedNo: string }>();
  const app = useApp();
  const { wardInfo, departments, doctors, settings } = app;
  const barSpace = useBottomBarSpace(84);
  const returnToPatient = useReturnToPatient();

  const matchDept = (name?: string) => (name ? departments.find((d) => d.name.toLowerCase() === name.toLowerCase())?.name : undefined);
  const [initialPid] = useState<string | null>(() => (params.patientId && app.getPatient(params.patientId) ? params.patientId : null));
  const [patientId, setPatientId] = useState<string | null>(initialPid);
  const patient = patientId ? app.getPatient(patientId) : undefined;
  const profile = patientId ? app.getProfile(patientId) : undefined;

  const [department, setDepartment] = useState<string>(
    () => matchDept(params.department) ?? matchDept(initialPid ? app.getPatient(initialPid)?.department : undefined) ?? 'General Medicine'
  );
  const [deptTouched, setDeptTouched] = useState(!!matchDept(params.department));
  // A specific bed tapped in Bed Management (wardId + bedNo) — reserved while its room type stays selected.
  const reservedWard = params.wardId ? wardInfo.find((w) => w.id === params.wardId) : undefined;
  const bedParam = Number(params.bedNo);
  const reservedBed = reservedWard && Number.isInteger(bedParam) && bedParam >= 1 && bedParam <= reservedWard.totalBeds ? bedParam : undefined;
  const [bedTaken, setBedTaken] = useState(false);
  const [roomType, setRoomType] = useState<RoomType>(
    () => (reservedWard ? roomTypeForWard(reservedWard) : undefined) ?? roomTypeFrom(params.roomType) ?? 'General Ward'
  );
  const [admissionType, setAdmissionType] = useState<AdmissionType>(() => defaultAdmissionType(initialPid ? app.getPatient(initialPid) : undefined));
  const [stayDays, setStayDays] = useState(3);
  const [notes, setNotes] = useState('');
  const enabledModes = (Object.keys(settings.paymentModes) as PaymentMode[]).filter((m) => settings.paymentModes[m]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(enabledModes.includes('Card') ? 'Card' : enabledModes[0] ?? 'Cash');
  const [patientError, setPatientError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const submittingRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (initialPid) return;
    const t = setTimeout(() => setPickerOpen(true), 450);
    return () => clearTimeout(t);
  }, []);

  const alreadyAdmitted = !done && patient?.status === 'Admitted';

  const selectPatient = (p: Patient) => {
    setPatientId(p.id);
    setPatientError(null);
    setAdmissionType(defaultAdmissionType(p));
    if (!deptTouched) setDepartment(matchDept(p.department) ?? department);
  };

  // General wards are split by gender — a reserved bed in the other ward can't be used for this patient.
  const reservationFitsPatient =
    !reservedWard || !patient || reservedWard.type !== 'General' || wardForRoomType(wardInfo, 'General Ward', patient.gender)?.id === reservedWard.id;
  const reservation = reservedWard && roomType === roomTypeForWard(reservedWard) && reservationFitsPatient ? reservedWard : undefined;
  const reservedLabel = reservation && reservedBed && !bedTaken ? bedLabel(reservation, reservedBed) : undefined;

  const wardFor = (type: RoomType): WardInfo | undefined => {
    if (reservation && type === roomTypeForWard(reservation)) return wardInfo.find((w) => w.id === reservation.id) ?? reservation;
    if (patient) return wardForRoomType(wardInfo, type, patient.gender);
    if (type === 'General Ward') {
      // Before a patient is chosen, show both general wards together (the ward depends on gender).
      const general = wardInfo.filter((w) => w.type === 'General');
      if (!general.length) return undefined;
      return {
        id: 'general',
        name: 'General Wards A & B',
        type: 'General',
        totalBeds: general.reduce((n, w) => n + w.totalBeds, 0),
        occupied: general.reduce((n, w) => n + w.occupied, 0),
        available: general.reduce((n, w) => n + w.available, 0),
        dailyRate: general[0].dailyRate,
      };
    }
    return wardForRoomType(wardInfo, type, 'Male');
  };

  const ward = wardFor(roomType);
  const rate = ward?.dailyRate ?? 1600;
  const advance = rate + ADMISSION_CHARGE;
  const estimate = rate * stayDays + ADMISSION_CHARGE;
  const attending =
    doctors.find((d) => d.department === department)?.name ?? departments.find((d) => d.name === department)?.head ?? ROLE_ACTOR.doctor;
  const expectedIso = isoDaysFromToday(stayDays);

  const noBed = (w?: WardInfo) =>
    Alert.alert('No Bed Available', `${w?.name ?? roomType} is full right now. Choose another room type, or free a bed from Bed Management.`, [
      { text: 'OK', style: 'cancel' },
      { text: 'Bed Management', onPress: () => router.push({ pathname: '/bed-management', params: w && w.id !== 'general' ? { ward: w.id } : {} }) },
    ]);

  const alreadyAdmittedAlert = (p: Patient) =>
    Alert.alert('Already Admitted', `${p.name} is already admitted${p.room ? ` in ${p.room}` : ''}. Discharge them before a new admission.`, [
      { text: 'Close', style: 'cancel' },
      { text: 'Open Patient', onPress: () => router.replace({ pathname: '/patient/[id]', params: { id: p.id } }) },
    ]);

  const admit = () => {
    if (submittingRef.current || done) return;
    if (!patient) {
      setPatientError('Select the patient to admit');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setPickerOpen(true);
      return;
    }
    if (patient.status === 'Admitted') return alreadyAdmittedAlert(patient);
    if (!ward || ward.available <= 0) return noBed(ward);

    performAdmit(patient, !!reservedLabel);
  };

  const performAdmit = (p: Patient, useReservedBed: boolean) => {
    submittingRef.current = true;
    setSubmitting(true);
    setTimeout(() => {
      const res = app.admitPatient({
        patientId: p.id,
        roomType,
        wardId: reservation?.id,
        bedNo: useReservedBed ? reservedBed : undefined,
        department,
        admissionType,
        expectedDate: expectedIso,
        notes: notes.trim() || undefined,
        doctorName: attending,
        paymentMode,
      });
      if (!res.ok) {
        submittingRef.current = false;
        setSubmitting(false);
        if (res.error === 'ALREADY_ADMITTED') alreadyAdmittedAlert(p);
        else if (res.error === 'NO_BED') noBed(ward);
        else if (res.error === 'BED_TAKEN') {
          setBedTaken(true);
          Alert.alert(
            'Bed Already Taken',
            `${reservedLabel ?? 'That bed'} was just taken — the next free bed${reservation ? ` in ${reservation.name}` : ''} will be assigned.`,
            [
              { text: 'Cancel', style: 'cancel' },
              // Deferred: the alert closes itself after this handler, which would hide the success alert.
              { text: 'Assign Next Free Bed', onPress: () => setTimeout(() => performAdmit(p, false), 320) },
            ]
          );
        } else Alert.alert('Invalid Patient', 'This patient record could not be found. Select the patient again.');
        return;
      }
      setDone(true);
      setSubmitting(false);
      const { patient: admitted, invoice, ward: updatedWard } = res;
      Alert.alert(
        `Admitted to ${admitted.room}`,
        `${admitted.name} • ${department} under ${admitted.attendingDoctor}\n• ${updatedWard.name}: ${updatedWard.available} bed${updatedWard.available === 1 ? '' : 's'} left\n• Advance ${formatCurrency(invoice.amount)} via ${invoice.paymentMode} • ${invoice.invoiceNo}\n• Admission vitals task sent to the ward nurse\n• Expected discharge ${friendlyDate(expectedIso)}`,
        [
          { text: 'View Receipt', onPress: () => router.replace({ pathname: '/receipt/[id]', params: { id: invoice.id } }) },
          { text: 'Open Patient', onPress: () => returnToPatient(admitted.id) },
        ],
        { cancelable: false }
      );
    }, 450);
  };

  return (
    <>
      <Header title="IPD Admission" subtitle={patient ? `${patient.name} • ${patient.uhid}` : 'Admit a patient to a bed'} />
      <AccessGate module="ipd-admission" purpose="Admitting patients to IPD">
        <KeyboardAwareContainer>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: barSpace + spacing.base }]}
            {...formScrollProps}
          >
            <FadeInView>
              <Text style={styles.sectionLabel}>Patient</Text>
              <PatientSelectorBar
                patient={patient}
                onPress={() => setPickerOpen(true)}
                label={patient ? `${patient.age} yrs • ${patient.gender}` : 'Patient to admit'}
                style={patientError ? styles.selectorError : undefined}
              />
              {!!patientError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={13} color={colors.danger} />
                  <Text style={styles.errorText}>{patientError}</Text>
                </View>
              )}
            </FadeInView>

            {patient && alreadyAdmitted && (
              <FadeInView key={`adm-${patient.id}`}>
                <View style={styles.warnCard} accessibilityRole="alert">
                  <Ionicons name="bed" size={18} color={colors.warningText} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warnTitle}>Already admitted{patient.room ? ` • ${patient.room}` : ''}</Text>
                    <Text style={styles.warnText}>
                      {patient.name} has an open admission{patient.admittedOn ? ` since ${formatDisplayDate(patient.admittedOn)}` : ''}. Pick another patient or open their record.
                    </Text>
                    <View style={styles.warnActions}>
                      <Button title="Open Record" size="sm" variant="outline" onPress={() => router.replace({ pathname: '/patient/[id]', params: { id: patient.id } })} />
                      <Button title="Change Patient" size="sm" variant="ghost" onPress={() => setPickerOpen(true)} />
                    </View>
                  </View>
                </View>
              </FadeInView>
            )}

            {patient && !alreadyAdmitted && (
              <FadeInView key={`info-${patient.id}`} style={{ gap: spacing.sm }}>
                <AllergyBanner allergies={profile?.allergies} showNone={false} compact />
                {patient.admittedOn && patient.status !== 'Admitted' && (
                  <View style={styles.infoLine}>
                    <Ionicons name="time-outline" size={14} color={colors.purple} />
                    <Text style={styles.infoLineText}>
                      Previous admission {formatDisplayDate(patient.admittedOn)}
                      {patient.dischargedOn ? ` – ${formatDisplayDate(patient.dischargedOn)}` : ''} • {patient.department ?? 'General Medicine'}
                    </Text>
                  </View>
                )}
                {patient.insurance !== 'Self Pay' && (
                  <View style={styles.infoLine}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                    <Text style={styles.infoLineText}>{patient.insurance} — raise TPA pre-authorisation for cashless.</Text>
                  </View>
                )}
              </FadeInView>
            )}

            <FadeInView delay={60}>
              <ClinicalCard title="Admission Type" icon="clipboard-outline">
                <ChoiceChips
                  options={[
                    { value: 'New Admission', label: 'New Admission', icon: 'add-circle-outline' },
                    { value: 'Re-admission', label: 'Re-admission', icon: 'refresh-outline' },
                  ]}
                  value={admissionType}
                  onChange={setAdmissionType}
                />
              </ClinicalCard>
            </FadeInView>

            <FadeInView delay={100}>
              <ClinicalCard title="Department" icon="business-outline" meta={`Attending: ${attending}`}>
                <ChoiceChips
                  size="sm"
                  options={departments.map((d) => ({ value: d.name, label: d.name }))}
                  value={department}
                  onChange={(d) => {
                    setDepartment(d);
                    setDeptTouched(true);
                  }}
                />
              </ClinicalCard>
            </FadeInView>

            <FadeInView delay={140}>
              <ClinicalCard title="Room Type" icon="bed-outline" iconColor={colors.purple} meta="Live bed availability">
                <View style={{ gap: spacing.sm }}>
                  {ROOM_TYPES.map((r) => {
                    const w = wardFor(r.type);
                    const full = !w || w.available <= 0;
                    const selected = roomType === r.type;
                    const occ = w && w.totalBeds ? w.occupied / w.totalBeds : 1;
                    const occColor = occ >= 0.9 ? colors.danger : occ >= 0.75 ? colors.warning : colors.success;
                    return (
                      <PressableScale
                        key={r.type}
                        onPress={() => (full ? noBed(w) : setRoomType(r.type))}
                        haptic
                        style={[styles.room, selected && !full && styles.roomSelected, full && styles.roomFull]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: full }}
                        accessibilityLabel={`${r.type}, ${w ? `${w.available} of ${w.totalBeds} beds free` : 'unavailable'}, ${formatCurrency(w?.dailyRate ?? 0)} per day`}
                      >
                        <View style={styles.roomTop}>
                          <View style={[styles.roomIcon, selected && !full && { backgroundColor: colors.primary }]}>
                            <Ionicons name={r.icon} size={18} color={selected && !full ? '#FFFFFF' : colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.roomName}>{r.type}</Text>
                            <Text style={styles.roomDesc} numberOfLines={1}>
                              {w?.name ?? r.desc} • {formatCurrency(w?.dailyRate ?? 0)}/day
                            </Text>
                          </View>
                          {full ? (
                            <Badge label="Full" variant="danger" size="sm" />
                          ) : (
                            <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
                          )}
                        </View>
                        {reservedWard && r.type === roomTypeForWard(reservedWard) && (
                          <View style={[styles.reserved, !reservation && styles.reservedOff]}>
                            <Ionicons
                              name={reservation ? 'bookmark' : 'information-circle-outline'}
                              size={13}
                              color={reservation ? colors.primary : colors.warningText}
                            />
                            <Text style={[styles.reservedText, !reservation && { color: colors.warningText }]} numberOfLines={2}>
                              {!reservationFitsPatient
                                ? `${reservedBed ? bedLabel(reservedWard, reservedBed) : reservedWard.name} is in the ${
                                    reservedWard.id === 'ward-gen-a' ? 'male' : 'female'
                                  } ward — the next free bed in the right ward will be used`
                                : !reservation
                                  ? `Reserved ${reservedBed ? bedLabel(reservedWard, reservedBed) : reservedWard.name} — select this room type to use it`
                                  : reservedLabel
                                    ? `Reserved: ${reservedLabel}`
                                    : bedTaken
                                      ? `Reserved bed was taken — next free bed in ${reservation.name}`
                                      : `Reserved ward: ${reservation.name}`}
                            </Text>
                          </View>
                        )}
                        <View style={styles.roomBar}>
                          <ProgressFill progress={occ} color={occColor} height={5} style={{ flex: 1 }} />
                          <Text style={[styles.roomAvail, { color: full ? colors.danger : colors.textSecondary }]}>
                            {w ? `${w.available}/${w.totalBeds} free` : 'No ward'}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </ClinicalCard>
            </FadeInView>

            <FadeInView delay={180}>
              <ClinicalCard title="Expected Stay" icon="calendar-outline" iconColor={colors.teal}>
                <FormField
                  label="Expected discharge"
                  hint={`${friendlyDate(expectedIso)} (${formatDisplayDate(expectedIso)}) • estimated ${formatCurrency(estimate)} for room & admission`}
                  hintTone="muted"
                  style={{ marginBottom: 0 }}
                >
                  <ChoiceChips
                    options={STAY_OPTIONS.map((d) => ({ value: String(d), label: `${d} day${d > 1 ? 's' : ''}` }))}
                    value={String(stayDays)}
                    onChange={(v) => setStayDays(Number(v))}
                  />
                </FormField>
              </ClinicalCard>
            </FadeInView>

            <FadeInView delay={210}>
              <ClinicalCard title="Notes" icon="document-text-outline">
                <FieldInput value={notes} onChangeText={setNotes} placeholder="Reason for admission, special care, diet (optional)" multiline />
              </ClinicalCard>
            </FadeInView>

            <FadeInView delay={240}>
              <ClinicalCard title="Advance Payment" icon="card-outline" iconColor={colors.success}>
                <KeyValueRow label={`${ward?.name ?? roomType} — 1 day`} value={formatCurrency(rate)} />
                <KeyValueRow label="Admission, nursing & sanitization" value={formatCurrency(ADMISSION_CHARGE)} />
                <KeyValueRow label="Advance to collect now" value={formatCurrency(advance)} strong valueColor={colors.primary} last />
                <Text style={styles.payLabel}>Payment mode</Text>
                <ChoiceChips size="sm" options={enabledModes.map((m) => ({ value: m, label: m }))} value={paymentMode} onChange={setPaymentMode} />
              </ClinicalCard>
            </FadeInView>
          </ScrollView>

          <BottomActionBar>
            <Button
              title={done ? 'Patient Admitted' : `Admit Patient • ${formatCurrency(advance)}`}
              onPress={admit}
              loading={submitting}
              disabled={submitting || done || alreadyAdmitted}
              fullWidth
              size="lg"
              icon={<Ionicons name={done ? 'checkmark-done' : 'bed'} size={18} color="#FFFFFF" />}
            />
          </BottomActionBar>
        </KeyboardAwareContainer>
      </AccessGate>
      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={selectPatient}
        selectedId={patientId}
        filter={(p) => p.status !== 'Admitted'}
        title="Admit which patient?"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.base, gap: spacing.md },
  sectionLabel: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text, marginBottom: spacing.sm },
  selectorError: { borderColor: colors.danger, borderStyle: 'solid', backgroundColor: '#FFFBFB' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  errorText: { fontSize: typography.fontSizes.xs + 1, color: colors.danger, fontWeight: typography.fontWeights.medium },
  warnCard: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + '66',
    padding: spacing.md,
  },
  warnTitle: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.warningText },
  warnText: { fontSize: typography.fontSizes.xs + 1, color: colors.warningText, marginTop: 2, lineHeight: 18 },
  warnActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  infoLineText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary },
  room: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    ...shadows.sm,
  },
  roomSelected: { borderColor: colors.primary, backgroundColor: '#F7FAFF' },
  roomFull: { backgroundColor: colors.cardMuted, borderColor: colors.border, opacity: 0.8 },
  roomTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  roomIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomName: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  roomDesc: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  roomBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm + 2 },
  reserved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  reservedOff: { backgroundColor: colors.warningLight, borderRadius: radius.sm },
  reservedText: { flexShrink: 1, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: colors.primary },
  roomAvail: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semiBold, minWidth: 64, textAlign: 'right' },
  payLabel: {
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
});
