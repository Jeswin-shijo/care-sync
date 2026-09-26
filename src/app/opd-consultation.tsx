import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { Appointment, Patient } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ROLE_ACTOR } from '../logic/hospital';
import type { SafetyAlert } from '../logic/safety';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { clockToMinutes, formatDisplayDate, isoDaysFromToday, todayISO } from '../utils/dates';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { Avatar } from '../components/common/Avatar';
import { Badge, statusVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { formScrollProps, KeyboardAwareContainer } from '../components/common/KeyboardAware';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { FadeInView, PressableScale, PulseDot, TypingDots } from '../components/common/Motion';
import { AccessGate } from '../components/clinical/AccessGate';
import { AllergyBanner } from '../components/clinical/AllergyBanner';
import { ChoiceChips } from '../components/clinical/ChoiceChips';
import { ClinicalCard } from '../components/clinical/ClinicalCard';
import { FieldInput, FormField } from '../components/clinical/FormField';
import { PrescriptionBuilder, PrescriptionBuilderHandle } from '../components/clinical/PrescriptionBuilder';
import { SafetyAction, SafetyAlertCard } from '../components/clinical/SafetyAlertCard';
import { VitalsStrip } from '../components/clinical/VitalsStrip';
import { defaultsFor, linesForAlert, parseAlternative, RxLine, rxDrugLabel } from '../components/clinical/rx';
import { friendlyDate, plural } from '../components/clinical/format';
import { alertAfterClose } from '../components/clinical/alerts';
import { AiDraft, buildAiDraft } from '../components/clinical/aiDraft';
import { useLeaveGuard } from '../components/clinical/useLeaveGuard';
import { useReturnToPatient } from '../components/clinical/useReturnToPatient';

const FOLLOW_UPS = [
  { value: 'none', label: 'None', days: 0 },
  { value: '3d', label: '3 days', days: 3 },
  { value: '1w', label: '1 week', days: 7 },
  { value: '2w', label: '2 weeks', days: 14 },
  { value: '1m', label: '1 month', days: 30 },
] as const;
type FollowUpKey = (typeof FOLLOW_UPS)[number]['value'];

type AiState = { status: 'idle' } | { status: 'thinking' } | { status: 'ready'; draft: AiDraft } | { status: 'empty' };

const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 } as const;

export default function OpdConsultationRoute() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <OpdConsultationScreen />
    </SafeAreaView>
  );
}

function OpdConsultationScreen() {
  const params = useLocalSearchParams<{ patientId: string; appointmentId: string }>();
  const app = useApp();
  const { appointments, doctors, medicines, clinicalProfiles, labSamples } = app;
  const { showToast } = useToast();
  const barSpace = useBottomBarSpace(84);
  const returnToPatient = useReturnToPatient();

  const paramApt = params.appointmentId ? appointments.find((a) => a.id === params.appointmentId) : undefined;
  const [initialPid] = useState<string | null>(
    () => paramApt?.patientId ?? (params.patientId && app.getPatient(params.patientId) ? params.patientId : null)
  );
  const [patientId, setPatientId] = useState<string | null>(initialPid);
  const patient = patientId ? app.getPatient(patientId) : undefined;
  const profile = patientId ? app.getProfile(patientId) : undefined;
  const vitals = patientId ? app.getLatestVitals(patientId) : undefined;

  const isOpen = (a: Appointment) => a.status !== 'Completed' && a.status !== 'Cancelled';
  // The appointment this visit closes: the one in the link, else the patient's open one today.
  const liveAppointment: Appointment | undefined = useMemo(() => {
    if (!patientId) return undefined;
    if (paramApt && paramApt.patientId === patientId && isOpen(paramApt)) return paramApt;
    return appointments
      .filter((a) => a.patientId === patientId && a.date === todayISO() && isOpen(a))
      .sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time))[0];
  }, [patientId, appointments, paramApt]);
  // Once saved, keep showing the appointment that was closed (the live one flips to Completed).
  const savedAptRef = useRef<Appointment | undefined>(undefined);

  const [savedState, setSavedState] = useState(false);
  const linkedAppointment = savedState ? savedAptRef.current : liveAppointment;
  const closedParamApt = paramApt && paramApt.patientId === patientId && !isOpen(paramApt) && !linkedAppointment ? paramApt : undefined;

  const defaultDoctor = doctors.find((d) => d.name === ROLE_ACTOR.doctor) ?? doctors[0];
  const doctor = (linkedAppointment && doctors.find((d) => d.id === linkedAppointment.doctorId)) || defaultDoctor;
  const department = linkedAppointment?.department ?? doctor.department;

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [lines, setLines] = useState<RxLine[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpKey>('none');
  const [ai, setAi] = useState<AiState>({ status: 'idle' });
  const [usedAi, setUsedAi] = useState(false);
  const [errors, setErrors] = useState<{ patient?: string; diagnosis?: string }>({});
  const [saving, setSaving] = useState(false);
  const saved = savedState;
  const savingRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const builderRef = useRef<PrescriptionBuilderHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const aiPatientRef = useRef<string | null>(null);

  useEffect(() => {
    if (params.appointmentId && !paramApt) showToast({ type: 'warning', message: 'Appointment in the link was not found — recording as a new visit.' });
    else if (params.patientId && !initialPid) showToast({ type: 'warning', message: 'Patient in the link was not found — please select the patient.' });
    if (!initialPid) {
      const t = setTimeout(() => setPickerOpen(true), 450);
      return () => clearTimeout(t);
    }
  }, []);

  const dirty = !!(symptoms.trim() || diagnosis.trim() || advice.trim() || lines.length || followUp !== 'none');
  const { requestLeave } = useLeaveGuard({
    when: dirty && !saved,
    title: 'Discard Consultation?',
    message: 'Notes, diagnosis and prescription for this visit will be lost.',
  });

  // ---------------------------------------------------------------- live safety
  const drugLabels = useMemo(() => lines.map(rxDrugLabel), [lines]);
  const alerts: SafetyAlert[] = useMemo(
    () => (patientId && drugLabels.length ? app.checkDrugsForPatient(patientId, drugLabels) : []),
    [patientId, drugLabels, clinicalProfiles, labSamples]
  );
  const flagged = useMemo(() => {
    const map: Record<string, SafetyAlert['severity']> = {};
    alerts.forEach((a) =>
      linesForAlert(a, lines).forEach((l) => {
        if (!map[l.key] || SEVERITY_RANK[a.severity] > SEVERITY_RANK[map[l.key]]) map[l.key] = a.severity;
      })
    );
    return map;
  }, [alerts, lines]);
  const criticalKey = alerts
    .filter((a) => a.severity === 'critical')
    .map((a) => `${a.rule}|${a.title}`)
    .join('~');
  const prevCritical = useRef<Set<string>>(new Set());
  useEffect(() => {
    const keys = criticalKey ? criticalKey.split('~') : [];
    if (keys.some((k) => !prevCritical.current.has(k))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    prevCritical.current = new Set(keys);
  }, [criticalKey]);

  const swapLine = (target: RxLine, alt: NonNullable<ReturnType<typeof parseAlternative>>) => {
    const d = defaultsFor(alt.medicine);
    setLines((cur) =>
      cur.map((l) =>
        l.key === target.key
          ? { ...l, name: alt.name, medicineId: alt.medicine?.id, frequency: alt.frequency ?? l.frequency, dose: alt.medicine ? d.dose : l.dose }
          : l
      )
    );
    showToast({ type: 'success', title: 'Safer alternative applied', message: `${target.name} → ${alt.name}` });
  };

  const actionsFor = (alert: SafetyAlert): SafetyAction[] => {
    const involved = linesForAlert(alert, lines);
    if (!involved.length) return [];
    const target = involved[involved.length - 1];
    const actions: SafetyAction[] = [];
    if (alert.kind === 'allergy' || alert.kind === 'interaction') {
      const alt = parseAlternative(alert.suggestion, medicines);
      if (alt && alt.name.toLowerCase() !== target.name.toLowerCase()) {
        actions.push({ label: `Switch to ${alt.name}`, icon: 'swap-horizontal', primary: true, onPress: () => swapLine(target, alt) });
      }
    }
    actions.push({ label: `Remove ${target.name.split(' ')[0]}`, icon: 'trash-outline', onPress: () => builderRef.current?.removeLine(target.key) });
    return actions;
  };

  // ---------------------------------------------------------------- follow-up
  const followUpPlan = useMemo(() => {
    const days = FOLLOW_UPS.find((f) => f.value === followUp)?.days ?? 0;
    if (!days) return null;
    // Doctors don't consult every day — land on the first OPD day with a free slot.
    for (let extra = 0; extra <= 7; extra++) {
      const iso = isoDaysFromToday(days + extra);
      const slot = app.getAvailableSlots(doctor.id, iso).find((s) => s.available);
      if (slot) return { iso, time: slot.time as string | undefined, shifted: extra > 0 };
    }
    return { iso: isoDaysFromToday(days), time: undefined as string | undefined, shifted: false };
  }, [followUp, doctor.id, appointments]);

  // ---------------------------------------------------------------- AI draft
  const runAiDraft = () => {
    if (!patient) {
      setErrors((e) => ({ ...e, patient: 'Select a patient to draft notes from their record' }));
      setPickerOpen(true);
      return;
    }
    aiPatientRef.current = patient.id;
    setAi({ status: 'thinking' });
    const results = app.getLabResults(patient.id);
    setTimeout(() => {
      if (aiPatientRef.current !== patient.id) return;
      const draft = buildAiDraft(profile, vitals, results);
      setAi(draft ? { status: 'ready', draft } : { status: 'empty' });
    }, 900);
  };

  const insertDraft = (part: 'symptoms' | 'diagnosis' | 'all') => {
    if (ai.status !== 'ready') return;
    const { draft } = ai;
    if ((part === 'symptoms' || part === 'all') && draft.symptoms) {
      setSymptoms((cur) => (cur.trim() ? `${cur.trim()}\n${draft.symptoms}` : draft.symptoms!));
    }
    if ((part === 'diagnosis' || part === 'all') && draft.diagnosis) {
      setDiagnosis((cur) => (cur.trim() ? `${cur.trim()}; ${draft.diagnosis}` : draft.diagnosis!));
      setErrors((e) => ({ ...e, diagnosis: undefined }));
    }
    setUsedAi(true);
    if (part === 'all') setAi({ status: 'idle' });
    showToast({ type: 'info', title: 'AI draft inserted', message: 'Review and edit before saving — you remain responsible for the note.' });
  };

  // ---------------------------------------------------------------- patient change
  const applyPatient = (p: Patient, clear: boolean) => {
    setPatientId(p.id);
    setErrors((e) => ({ ...e, patient: undefined }));
    setAi({ status: 'idle' });
    aiPatientRef.current = null;
    if (clear) {
      setSymptoms('');
      setDiagnosis('');
      setAdvice('');
      setLines([]);
      setFollowUp('none');
      setUsedAi(false);
    }
  };

  const selectPatient = (p: Patient) => {
    if (p.id === patientId) return;
    if (patient && dirty) {
      alertAfterClose('Confirm Patient Change', `Switch to ${p.name}? Notes, diagnosis and prescription entered for ${patient.name} will be cleared.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch Patient', style: 'destructive', onPress: () => applyPatient(p, true) },
      ]);
      return;
    }
    applyPatient(p, false);
  };

  // ---------------------------------------------------------------- save
  const commit = () => {
    if (savingRef.current || !patient) return;
    savingRef.current = true;
    setSaving(true);
    setTimeout(() => {
      try {
        const res = app.saveConsultation({
          patientId: patient.id,
          appointmentId: linkedAppointment?.id,
          doctorName: doctor.name,
          department,
          symptoms: symptoms.trim(),
          diagnosis: diagnosis.trim(),
          prescription: lines.map(({ key: _key, medicineId: _med, ...line }) => line),
          advice: advice.trim() || undefined,
          // Only book when a free slot exists — otherwise the follow-up is booked manually.
          followUpDate: followUpPlan?.time ? followUpPlan.iso : undefined,
          source: usedAi ? 'AI draft (reviewed by doctor)' : undefined,
        });
        savedAptRef.current = linkedAppointment;
        setSavedState(true);
        setSaving(false);
        const bullets: string[] = [];
        if (res.review) {
          bullets.push(
            `• ${res.review.prescriptionCode} sent to pharmacy — ${
              res.review.safetyStatus === 'Safe' ? 'safety check passed' : `flagged: ${res.review.safetyStatus}`
            }`
          );
        } else {
          bullets.push('• No medicines prescribed');
        }
        if (linkedAppointment) bullets.push(`• Token ${linkedAppointment.tokenNo} (${linkedAppointment.time}) marked Completed`);
        if (res.followUp) {
          bullets.push(`• Follow-up booked: ${friendlyDate(res.followUp.date)} at ${res.followUp.time} (Token ${res.followUp.tokenNo})`);
        } else if (followUpPlan) {
          bullets.push('• Follow-up not booked — no free slot; book it from Appointments');
        }
        if (res.invoice) bullets.push(`• Walk-in bill ${res.invoice.invoiceNo} • ${formatCurrency(res.invoice.amount)} pending at the counter`);
        const toPatient = () => returnToPatient(patient.id);
        const invoice = res.invoice;
        Alert.alert(
          'Consultation Saved',
          `${patient.name} • ${doctor.name}\n${bullets.join('\n')}`,
          invoice
            ? [
                { text: 'View Bill', onPress: () => router.replace({ pathname: '/receipt/[id]', params: { id: invoice.id } }) },
                { text: 'Done', onPress: toPatient },
              ]
            : [{ text: 'Open Patient Record', onPress: toPatient }],
          { cancelable: false }
        );
      } catch (err: any) {
        savingRef.current = false;
        setSaving(false);
        Alert.alert('Save Failed', err?.message ?? 'Please try again.');
      }
    }, 400);
  };

  const save = () => {
    if (savingRef.current || saved) return;
    const errs: { patient?: string; diagnosis?: string } = {};
    if (!patient) errs.patient = 'Select the patient for this consultation';
    if (!diagnosis.trim()) errs.diagnosis = 'Diagnosis is required';
    setErrors(errs);
    if (errs.patient || errs.diagnosis) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      if (errs.patient) scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const critical = alerts.filter((a) => a.severity === 'critical');
    if (critical.length) {
      Alert.alert(
        'Confirm Critical Alerts',
        `${plural(critical.length, 'critical safety alert')} on this prescription:\n${critical.map((a) => `• ${a.title}`).join('\n')}\n\nSave anyway? The pharmacist will see it flagged before dispensing.`,
        [
          { text: 'Review', style: 'cancel' },
          { text: 'Save Anyway', style: 'destructive', onPress: () => setTimeout(commit, 250) },
        ]
      );
      return;
    }
    commit();
  };

  // ---------------------------------------------------------------- render
  const worst = alerts.some((a) => a.severity === 'critical') ? 'critical' : alerts.some((a) => a.severity === 'warning') ? 'warning' : null;
  const safetyPill = !lines.length ? null : alerts.length === 0 ? (
    <View style={[styles.safetyPill, { backgroundColor: colors.successLight }]}>
      <PulseDot color={colors.success} size={6} />
      <Text style={[styles.safetyPillText, { color: colors.successText }]}>Safe</Text>
    </View>
  ) : (
    <View style={[styles.safetyPill, { backgroundColor: worst === 'critical' ? colors.dangerLight : worst === 'warning' ? colors.warningLight : colors.infoLight }]}>
      <Ionicons name="warning" size={12} color={worst === 'critical' ? colors.danger : worst === 'warning' ? colors.warning : colors.info} />
      <Text style={[styles.safetyPillText, { color: worst === 'critical' ? colors.dangerText : worst === 'warning' ? colors.warningText : colors.infoText }]}>
        {plural(alerts.length, 'alert')}
      </Text>
    </View>
  );

  const currentMeds = profile?.currentMedications ?? [];

  return (
    <>
      <Header
        title="OPD Consultation"
        subtitle={linkedAppointment ? `Token ${linkedAppointment.tokenNo} • ${linkedAppointment.time}` : patient ? 'Walk-in visit' : undefined}
        onBackPress={requestLeave}
      />
      <AccessGate module="opd-consultation" purpose="Recording OPD consultations">
        <KeyboardAwareContainer>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: barSpace + spacing.base }]}
            {...formScrollProps}
          >
            {/* Doctor */}
            <FadeInView>
              <View style={styles.doctorCard}>
                <Avatar name={doctor.name} size={50} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSpec}>{doctor.specialty}</Text>
                  <Text style={styles.doctorMeta} numberOfLines={1}>
                    {doctor.room} • {doctor.timing}
                  </Text>
                </View>
                <View style={styles.livePill}>
                  <PulseDot color={colors.success} size={6} />
                  <Text style={styles.liveText}>In OPD</Text>
                </View>
              </View>
            </FadeInView>

            {/* Patient */}
            <FadeInView delay={50}>
              <Text style={styles.sectionLabel}>Patient</Text>
              <PatientSelectorBar
                patient={patient}
                onPress={() => setPickerOpen(true)}
                label={patient ? `${patient.age} yrs • ${patient.gender}${patient.room ? ` • ${patient.room}` : ''}` : 'Patient'}
                style={errors.patient ? styles.selectorError : undefined}
              />
              {!!errors.patient && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={13} color={colors.danger} />
                  <Text style={styles.errorText}>{errors.patient}</Text>
                </View>
              )}
            </FadeInView>

            {patient && (
              <FadeInView key={patient.id} delay={80} style={{ gap: spacing.md }}>
                <AllergyBanner allergies={profile?.allergies} />
                {linkedAppointment ? (
                  <View style={styles.aptCard}>
                    <View style={styles.token}>
                      <Text style={styles.tokenLabel}>TOKEN</Text>
                      <Text style={styles.tokenValue}>{linkedAppointment.tokenNo}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aptTitle}>
                        {linkedAppointment.time} • {linkedAppointment.type === 'Follow Up' ? 'Follow-up' : linkedAppointment.type}
                      </Text>
                      <Text style={styles.aptReason} numberOfLines={2}>
                        {linkedAppointment.reason ?? linkedAppointment.department}
                      </Text>
                    </View>
                    <Badge label={linkedAppointment.status} variant={statusVariant(linkedAppointment.status)} size="sm" />
                  </View>
                ) : (
                  <View style={styles.walkIn}>
                    <Ionicons name="walk-outline" size={16} color={colors.primary} />
                    <Text style={styles.walkInText}>
                      {closedParamApt
                        ? `That appointment is already ${closedParamApt.status.toLowerCase()} — this is recorded as a new visit. `
                        : 'No appointment today — walk-in visit. '}
                      A consultation bill of {formatCurrency(doctor.fee)} is raised on save (collect at the counter).
                    </Text>
                  </View>
                )}
                <ClinicalCard title="Latest Vitals" icon="pulse" iconColor={colors.danger}>
                  <VitalsStrip vitals={vitals} />
                  {currentMeds.length > 0 && (
                    <View style={styles.meds}>
                      <Ionicons name="medical-outline" size={13} color={colors.teal} />
                      <Text style={styles.medsText} numberOfLines={3}>
                        <Text style={styles.medsLabel}>Current meds: </Text>
                        {currentMeds.join(' • ')}
                      </Text>
                    </View>
                  )}
                </ClinicalCard>
              </FadeInView>
            )}

            {/* Notes & diagnosis */}
            <FadeInView delay={110}>
              <ClinicalCard
                title="Clinical Notes"
                icon="create-outline"
                right={
                  <PressableScale
                    style={[styles.aiChip, ai.status === 'thinking' && { opacity: 0.7 }]}
                    onPress={runAiDraft}
                    disabled={ai.status === 'thinking'}
                    haptic
                    accessibilityRole="button"
                    accessibilityLabel="Draft notes with AI"
                  >
                    <Ionicons name="sparkles" size={14} color={colors.purple} />
                    <Text style={styles.aiChipText}>AI draft</Text>
                  </PressableScale>
                }
              >
                {ai.status !== 'idle' && (
                  <FadeInView offset={6} duration={240} style={styles.aiCard}>
                    {ai.status === 'thinking' ? (
                      <View style={styles.aiThinking}>
                        <TypingDots color={colors.purple} />
                        <Text style={styles.aiMuted}>Reading history, vitals and recent labs…</Text>
                      </View>
                    ) : ai.status === 'empty' ? (
                      <View style={styles.aiThinking}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.purple} />
                        <Text style={[styles.aiMuted, { flex: 1 }]}>Not enough history for a draft yet — type your notes.</Text>
                        <TouchableOpacity onPress={() => setAi({ status: 'idle' })} hitSlop={10} accessibilityLabel="Dismiss">
                          <Ionicons name="close" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ gap: spacing.sm }}>
                        <View style={styles.aiHead}>
                          <Ionicons name="sparkles" size={14} color={colors.purple} />
                          <Text style={styles.aiTitle}>AI suggestion — review before use</Text>
                          <TouchableOpacity onPress={() => setAi({ status: 'idle' })} hitSlop={10} accessibilityLabel="Dismiss AI draft">
                            <Ionicons name="close" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                        {!!ai.draft.symptoms && (
                          <View style={styles.aiBlock}>
                            <Text style={styles.aiLabel}>Symptoms draft</Text>
                            <Text style={styles.aiText}>{ai.draft.symptoms}</Text>
                            <TouchableOpacity onPress={() => insertDraft('symptoms')} style={styles.aiUse} accessibilityRole="button">
                              <Text style={styles.aiUseText}>Use in notes</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {!!ai.draft.diagnosis && (
                          <View style={styles.aiBlock}>
                            <Text style={styles.aiLabel}>Suggested diagnosis (not final)</Text>
                            <Text style={styles.aiText}>{ai.draft.diagnosis}</Text>
                            <TouchableOpacity onPress={() => insertDraft('diagnosis')} style={styles.aiUse} accessibilityRole="button">
                              <Text style={styles.aiUseText}>Use as diagnosis</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <Text style={styles.aiSources}>Sources: {ai.draft.sources.join(' • ') || 'Patient record'}</Text>
                        <Button title="Insert all" size="sm" variant="secondary" onPress={() => insertDraft('all')} />
                      </View>
                    )}
                  </FadeInView>
                )}
                <FormField label="Symptoms / Notes">
                  <FieldInput value={symptoms} onChangeText={setSymptoms} placeholder="Enter consultation notes…" multiline />
                </FormField>
                <FormField label="Diagnosis" required error={errors.diagnosis} style={{ marginBottom: 0 }}>
                  <FieldInput
                    value={diagnosis}
                    onChangeText={(t) => {
                      setDiagnosis(t);
                      if (errors.diagnosis && t.trim()) setErrors((e) => ({ ...e, diagnosis: undefined }));
                    }}
                    placeholder="Enter diagnosis…"
                    invalid={!!errors.diagnosis}
                  />
                </FormField>
              </ClinicalCard>
            </FadeInView>

            {/* Prescription */}
            <FadeInView delay={150}>
              <ClinicalCard title="Prescription" icon="medkit-outline" iconColor={colors.teal} meta={lines.length ? plural(lines.length, 'medicine') : 'Live allergy & interaction check'} right={safetyPill}>
                <PrescriptionBuilder
                  ref={builderRef}
                  lines={lines}
                  onChange={setLines}
                  medicines={medicines}
                  flagged={flagged}
                  disabled={!patient}
                  disabledHint="Select the patient first — safety checks use their allergies, current medicines and labs."
                />
                {alerts.length > 0 && (
                  <View style={styles.alerts}>
                    {alerts.map((a, i) => (
                      <SafetyAlertCard key={`${a.rule}-${a.title}`} alert={a} actions={actionsFor(a)} delay={i * 60} />
                    ))}
                  </View>
                )}
              </ClinicalCard>
            </FadeInView>

            {/* Advice & follow-up */}
            <FadeInView delay={190}>
              <ClinicalCard title="Advice & Follow-up" icon="calendar-outline" iconColor={colors.primary}>
                <FormField label="Advice to patient">
                  <FieldInput value={advice} onChangeText={setAdvice} placeholder="e.g. Oral fluids, rest; review if fever persists (optional)" multiline />
                </FormField>
                <FormField
                  label="Follow-up"
                  style={{ marginBottom: 0 }}
                  hint={
                    followUpPlan
                      ? followUpPlan.time
                        ? `With ${doctor.name} on ${friendlyDate(followUpPlan.iso)} (${formatDisplayDate(followUpPlan.iso)}) • ${followUpPlan.time}${
                            followUpPlan.shifted ? ' — next OPD day' : ''
                          } • no charge`
                        : `${doctor.name} has no free slot that week — book it from Appointments.`
                      : 'No follow-up will be booked.'
                  }
                  hintTone={followUpPlan ? (followUpPlan.time ? 'success' : 'warning') : 'muted'}
                >
                  <ChoiceChips scroll options={FOLLOW_UPS.map((f) => ({ value: f.value, label: f.label }))} value={followUp} onChange={setFollowUp} />
                </FormField>
              </ClinicalCard>
            </FadeInView>
          </ScrollView>

          <BottomActionBar>
            <Button
              title={saved ? 'Consultation Saved' : 'Save Consultation'}
              onPress={save}
              loading={saving}
              disabled={saving || saved}
              fullWidth
              size="lg"
              icon={<Ionicons name={saved ? 'checkmark-done' : 'save-outline'} size={18} color="#FFFFFF" />}
            />
          </BottomActionBar>
        </KeyboardAwareContainer>
      </AccessGate>
      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={selectPatient}
        selectedId={patientId}
        title="Consultation for"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.base, gap: spacing.md },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  doctorName: { fontSize: typography.fontSizes.md + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  doctorSpec: { fontSize: typography.fontSizes.sm - 1, color: colors.primary, fontWeight: typography.fontWeights.semiBold, marginTop: 2 },
  doctorMeta: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveText: { fontSize: 10.5, fontWeight: typography.fontWeights.bold, color: colors.successText },
  sectionLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  selectorError: { borderColor: colors.danger, borderStyle: 'solid', backgroundColor: '#FFFBFB' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  errorText: { fontSize: typography.fontSizes.xs + 1, color: colors.danger, fontWeight: typography.fontWeights.medium },
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  token: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenLabel: { fontSize: 9, fontWeight: typography.fontWeights.bold, color: '#FFFFFFCC', letterSpacing: 1 },
  tokenValue: { fontSize: 20, fontWeight: typography.fontWeights.extraBold, color: '#FFFFFF' },
  aptTitle: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  aptReason: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  walkIn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  walkInText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.primaryDark, lineHeight: 18 },
  meds: { flexDirection: 'row', gap: 6, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  medsText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, lineHeight: 18 },
  medsLabel: { fontWeight: typography.fontWeights.bold, color: colors.text },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.purpleLight,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.purple + '44',
    paddingHorizontal: 12,
    minHeight: 34,
  },
  aiChipText: { fontSize: typography.fontSizes.sm - 1, fontWeight: typography.fontWeights.bold, color: colors.purple },
  aiCard: {
    backgroundColor: colors.purpleLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.purple + '33',
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  aiThinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiMuted: { fontSize: typography.fontSizes.sm - 1, color: colors.textSecondary },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitle: { flex: 1, fontSize: typography.fontSizes.sm - 1, fontWeight: typography.fontWeights.bold, color: colors.purple },
  aiBlock: { backgroundColor: '#FFFFFF', borderRadius: radius.sm + 2, padding: spacing.sm + 2, gap: 4 },
  aiLabel: { fontSize: 10.5, fontWeight: typography.fontWeights.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  aiText: { fontSize: typography.fontSizes.sm, color: colors.text, lineHeight: 19 },
  aiUse: { alignSelf: 'flex-start', marginTop: 2, paddingVertical: 4 },
  aiUseText: { fontSize: typography.fontSizes.sm - 1, fontWeight: typography.fontWeights.bold, color: colors.primary },
  aiSources: { fontSize: 10.5, color: colors.textMuted },
  safetyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  safetyPillText: { fontSize: 11, fontWeight: typography.fontWeights.bold },
  alerts: { gap: spacing.sm, marginTop: spacing.md },
});
