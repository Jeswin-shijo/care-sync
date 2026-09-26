import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { Invoice, Patient } from '../data/mockData';
import { PaymentMode, useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { ageFromDob, parseDob } from '../utils/dates';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { Badge, statusVariant } from '../components/common/Badge';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { formScrollProps, KeyboardAwareContainer, useKeyboardHeight } from '../components/common/KeyboardAware';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { FadeInView, useReducedMotion } from '../components/common/Motion';
import { AccessGate } from '../components/clinical/AccessGate';
import { AllergyBanner } from '../components/clinical/AllergyBanner';
import { CheckItem } from '../components/clinical/CheckItem';
import { ChoiceChips } from '../components/clinical/ChoiceChips';
import { ClinicalCard, KeyValueRow } from '../components/clinical/ClinicalCard';
import { FieldInput, FormField } from '../components/clinical/FormField';
import { SegmentedControl } from '../components/clinical/SegmentedControl';
import { SlideIn, Stepper } from '../components/clinical/Stepper';
import { digitsOnly, formatMobile, friendlyDate, isValidMobile, localMobile } from '../components/clinical/format';
import { useLeaveGuard } from '../components/clinical/useLeaveGuard';

type Gender = Patient['gender'];
type Mode = 'new' | 'existing';

const STEPS = ['Personal', 'Contact', 'Medical', 'Summary'] as const;
const GENDERS: Gender[] = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const INSURERS = ['Self Pay', 'Star Health', 'HDFC ERGO', 'Care Health', 'Niva Bupa', 'ICICI Lombard', 'CGHS', 'Other'];
const ALLERGY_OPTIONS = [
  { value: 'Penicillin', label: 'Penicillin' },
  { value: 'Sulfa drugs', label: 'Sulfa' },
  { value: 'NSAIDs', label: 'NSAIDs' },
  { value: 'Iodinated contrast', label: 'Iodinated contrast' },
];
const CONDITION_OPTIONS = [
  { value: 'Diabetes Mellitus', label: 'Diabetes' },
  { value: 'Hypertension', label: 'Hypertension' },
  { value: 'Asthma', label: 'Asthma' },
  { value: 'Chronic Kidney Disease', label: 'CKD' },
  { value: 'Thyroid disorder', label: 'Thyroid' },
];
const REGISTRATION_FEE = 500;
const NONE = 'None';

interface RegForm {
  name: string;
  dob: string;
  gender: Gender | null;
  phone: string;
  email: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  bloodGroup: string;
  insurer: string;
  insurerOther: string;
  policyNo: string;
  allergies: string[];
  nkda: boolean;
  allergyOther: string;
  conditions: string[];
  conditionOther: string;
  paymentMode: PaymentMode;
  consent: boolean;
}

const EMPTY_FORM: RegForm = {
  name: '',
  dob: '',
  gender: null,
  phone: '',
  email: '',
  address: '',
  emergencyName: '',
  emergencyPhone: '',
  bloodGroup: 'Unknown',
  insurer: 'Self Pay',
  insurerOther: '',
  policyNo: '',
  allergies: [],
  nkda: false,
  allergyOther: '',
  conditions: [],
  conditionOther: '',
  paymentMode: 'UPI',
  consent: false,
};

type FieldKey = 'name' | 'dob' | 'gender' | 'phone' | 'email' | 'address' | 'emergencyPhone' | 'insurer' | 'allergies' | 'consent';
const STEP_FIELDS: FieldKey[][] = [
  ['name', 'dob', 'gender'],
  ['phone', 'email', 'address', 'emergencyPhone'],
  ['insurer', 'allergies'],
  ['consent'],
];

const splitList = (s: string) =>
  s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Types DD/MM/YYYY with the slashes inserted automatically. */
const formatDobInput = (text: string) => {
  const d = digitsOnly(text).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

/** Keeps a 10-digit local mobile number, accepting pasted "+91 98765 43210". */
const mobileInput = (text: string) => {
  const d = digitsOnly(text);
  return (d.length > 10 ? localMobile(d) : d).slice(0, 10);
};

const displayMobile = (digits: string) => (digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits);

const validate = (f: RegForm): Partial<Record<FieldKey, string>> => {
  const e: Partial<Record<FieldKey, string>> = {};
  const name = f.name.trim();
  if (!name) e.name = 'Enter the patient’s full name';
  else if (/\d/.test(name)) e.name = 'Name should not contain numbers';
  else if (name.replace(/[^a-z]/gi, '').length < 2) e.name = 'Enter a valid name';

  const dobDigits = digitsOnly(f.dob);
  if (!dobDigits) e.dob = 'Enter date of birth';
  else if (dobDigits.length < 8) e.dob = 'Enter the full date as DD/MM/YYYY';
  else {
    const d = parseDob(f.dob);
    const [dd, mm, yyyy] = f.dob.split('/').map(Number);
    const typed = new Date(yyyy, mm - 1, dd);
    if (!d && typed.getDate() === dd && typed.getMonth() === mm - 1 && typed.getTime() > Date.now()) e.dob = 'Date of birth can’t be in the future';
    else if (!d) e.dob = 'This date isn’t valid — check the day, month and year';
    else if (ageFromDob(d) > 120) e.dob = 'Age would be over 120 years — check the year';
  }
  if (!f.gender) e.gender = 'Select gender';

  if (!f.phone) e.phone = 'Enter mobile number';
  else if (!isValidMobile(f.phone)) e.phone = 'Enter a valid 10-digit mobile number (starts with 6–9)';
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (!f.address.trim()) e.address = 'Enter address';
  else if (f.address.trim().length < 6) e.address = 'Add house / street, area and city';
  if (f.emergencyPhone && !isValidMobile(f.emergencyPhone)) e.emergencyPhone = 'Enter a valid 10-digit number';

  if (f.insurer === 'Other' && !f.insurerOther.trim()) e.insurer = 'Enter the insurance provider';
  if (!f.nkda && !f.allergies.length && !splitList(f.allergyOther).length) {
    e.allergies = 'Record allergy status — pick the allergies, or “None (NKDA)” if there are none';
  }
  if (!f.consent) e.consent = 'Patient consent is required to create the record';
  return e;
};

const isDirty = (f: RegForm) =>
  !!(
    f.name.trim() ||
    f.dob ||
    f.gender ||
    f.phone ||
    f.email.trim() ||
    f.address.trim() ||
    f.emergencyName.trim() ||
    f.emergencyPhone ||
    f.bloodGroup !== 'Unknown' ||
    f.insurer !== 'Self Pay' ||
    f.allergies.length ||
    f.nkda ||
    f.allergyOther.trim() ||
    f.conditions.length ||
    f.conditionOther.trim()
  );

const allergiesOf = (f: RegForm) => (f.nkda ? [] : [...f.allergies, ...splitList(f.allergyOther)]);
const conditionsOf = (f: RegForm) => [...f.conditions, ...splitList(f.conditionOther)];
const insuranceOf = (f: RegForm) => {
  const provider = f.insurer === 'Other' ? f.insurerOther.trim() : f.insurer;
  if (!provider || provider === 'Self Pay') return 'Self Pay';
  return f.policyNo.trim() ? `${provider} • Policy ${f.policyNo.trim()}` : provider;
};
const emergencyOf = (f: RegForm) => {
  const n = f.emergencyName.trim();
  const p = f.emergencyPhone ? formatMobile(f.emergencyPhone) : '';
  return n && p ? `${n} • ${p}` : n || p || undefined;
};

export default function RegisterPatientRoute() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <RegisterPatientScreen />
    </SafeAreaView>
  );
}

function RegisterPatientScreen() {
  const { registerPatient, findDuplicatePatients, patients, settings, getProfile, getVisits } = useApp();
  const [mode, setMode] = useState<Mode>('new');
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<RegForm>(EMPTY_FORM);
  const [shown, setShown] = useState<boolean[]>([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [result, setResult] = useState<{ patient: Patient; invoice: Invoice } | null>(null);
  const [existing, setExisting] = useState<Patient | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const barSpace = useBottomBarSpace(84);
  // Give the form the room while typing — the New/Existing switch hides behind the keyboard.
  const keyboardOpen = useKeyboardHeight() > 0;

  const update = (patch: Partial<RegForm>) => setForm((f) => ({ ...f, ...patch }));
  const errors = useMemo(() => validate(form), [form]);
  const errorFor = (field: FieldKey, stepIndex: number) => (shown[stepIndex] ? errors[field] ?? null : null);
  const stepValid = (i: number) => STEP_FIELDS[i].every((f) => !errors[f]);

  const dobDate = parseDob(form.dob);
  const age = dobDate ? ageFromDob(dobDate) : null;

  const duplicates = useMemo(() => {
    const phone = form.phone.length === 10 ? form.phone : '';
    const name = form.name.trim();
    if (!phone && name.length < 3) return [];
    return findDuplicatePatients(phone, name.length >= 3 ? name : undefined).slice(0, 3);
  }, [form.phone, form.name, patients, findDuplicatePatients]);

  const paymentModes = (Object.keys(settings.paymentModes) as PaymentMode[]).filter((m) => settings.paymentModes[m]);
  useEffect(() => {
    if (paymentModes.length && !paymentModes.includes(form.paymentMode)) update({ paymentMode: paymentModes[0] });
  }, [paymentModes.join(',')]);

  const goTo = (i: number) => {
    setDirection(i >= step ? 1 : -1);
    setStep(i);
    setMaxStep((m) => Math.max(m, i));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const { requestLeave } = useLeaveGuard({
    when: !result && isDirty(form),
    title: 'Discard Registration?',
    message: 'The details entered for this patient will be lost.',
    onHardwareBack: () => {
      if (result || mode === 'existing') return false;
      if (step > 0) {
        goTo(step - 1);
        return true;
      }
      return false;
    },
  });

  const next = () => {
    setShown((s) => s.map((v, i) => (i === step ? true : v)));
    if (!stepValid(step)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    goTo(step + 1);
  };

  const submit = () => {
    if (submittingRef.current || result) return;
    const firstInvalid = [0, 1, 2, 3].find((i) => !stepValid(i));
    if (firstInvalid !== undefined) {
      setShown([true, true, true, true]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      if (firstInvalid !== step) goTo(firstInvalid);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    // Brief pause so the button's progress state is visible (simulated save).
    setTimeout(() => {
      try {
        const res = registerPatient({
          name: form.name.trim().replace(/\s+/g, ' '),
          phone: form.phone,
          dob: form.dob,
          gender: form.gender!,
          address: form.address.trim(),
          bloodGroup: form.bloodGroup,
          insurance: insuranceOf(form),
          email: form.email.trim() || undefined,
          emergencyContact: emergencyOf(form),
          allergies: allergiesOf(form),
          conditions: conditionsOf(form),
          paymentMode: form.paymentMode,
        });
        setResult(res);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      } catch (err: any) {
        submittingRef.current = false;
        Alert.alert('Registration Failed', err?.message ?? 'Please try again.');
      } finally {
        setSubmitting(false);
      }
    }, 450);
  };

  const registerAnother = () => {
    submittingRef.current = false;
    setResult(null);
    setForm(EMPTY_FORM);
    setShown([false, false, false, false]);
    setStep(0);
    setMaxStep(0);
    setDirection(1);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'existing' && !existing) setTimeout(() => setPickerOpen(true), 250);
  };

  const openExisting = (p: Patient) => router.replace({ pathname: '/patient/[id]', params: { id: p.id } });

  const invalidSteps = [0, 1, 2, 3].filter((i) => i !== step && shown[i] && !stepValid(i));

  // ---------------------------------------------------------------- render helpers
  const duplicatesFor = (context: 'phone' | 'name' | 'summary') =>
    duplicates.filter((p) => {
      const samePhone = form.phone.length === 10 && localMobile(p.phone) === form.phone;
      return context === 'name' ? !samePhone : context === 'phone' ? samePhone : true;
    });

  const duplicateCard = (context: 'phone' | 'name' | 'summary') => {
    const list = duplicatesFor(context);
    if (!list.length) return null;
    return (
      <FadeInView offset={6} duration={260}>
        <View style={styles.dupCard} accessibilityRole="alert">
          <View style={styles.dupHead}>
            <Ionicons name="copy-outline" size={16} color={colors.warningText} />
            <Text style={styles.dupTitle}>
              {context === 'phone' ? 'This mobile number is already registered' : context === 'name' ? 'A patient with this name exists' : 'Possible duplicate record'}
            </Text>
          </View>
          {list.map((p) => (
            <View key={p.id} style={styles.dupRow}>
              <Avatar name={p.name} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dupName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.dupMeta} numberOfLines={1}>
                  {p.uhid} • {p.age}y {p.gender[0]} • {p.phone}
                </Text>
              </View>
              <TouchableOpacity style={styles.dupBtn} onPress={() => openExisting(p)} accessibilityRole="button" accessibilityLabel={`Open existing record of ${p.name}`}>
                <Text style={styles.dupBtnText}>Open existing</Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={styles.dupHint}>
            {context === 'name'
              ? 'Check the date of birth and mobile number before creating a second record.'
              : 'Family members may share a number — continue only if this is a different person.'}
          </Text>
        </View>
      </FadeInView>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <ClinicalCard title="Personal Information" icon="person-outline">
            <FormField label="Full Name" required error={errorFor('name', 0)}>
              <FieldInput
                value={form.name}
                onChangeText={(t) => update({ name: t })}
                placeholder="Enter patient name"
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                invalid={!!errorFor('name', 0)}
              />
            </FormField>
            {duplicateCard('name')}
            <FormField
              label="Date of Birth"
              required
              error={errorFor('dob', 0)}
              hint={age !== null ? `Age: ${age} ${age === 1 ? 'year' : 'years'}` : 'Day / month / year'}
              hintTone={age !== null ? 'success' : 'muted'}
              style={duplicatesFor('name').length ? { marginTop: spacing.base } : undefined}
            >
              <FieldInput
                value={form.dob}
                onChangeText={(t) => update({ dob: formatDobInput(t) })}
                placeholder="DD/MM/YYYY"
                keyboardType="number-pad"
                maxLength={10}
                invalid={!!errorFor('dob', 0)}
                right={<Ionicons name="calendar-outline" size={20} color={colors.textMuted} />}
                accessibilityLabel="Date of birth, day month year"
              />
            </FormField>
            <FormField label="Gender" required error={errorFor('gender', 0)} style={{ marginBottom: 0 }}>
              <ChoiceChips
                options={GENDERS.map((g) => ({
                  value: g,
                  label: g,
                  icon: g === 'Male' ? 'male-outline' : g === 'Female' ? 'female-outline' : 'transgender-outline',
                }))}
                value={form.gender}
                onChange={(g) => update({ gender: g })}
              />
            </FormField>
          </ClinicalCard>
        );
      case 1:
        return (
          <ClinicalCard title="Contact Details" icon="call-outline">
            <FormField label="Mobile Number" required error={errorFor('phone', 1)} hint="Used for appointment and report SMS / WhatsApp">
              <FieldInput
                value={displayMobile(form.phone)}
                onChangeText={(t) => update({ phone: mobileInput(t) })}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                autoComplete="tel"
                invalid={!!errorFor('phone', 1)}
                left={
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>🇮🇳 +91</Text>
                  </View>
                }
              />
            </FormField>
            {duplicateCard('phone')}
            <FormField label="Email" error={errorFor('email', 1)} style={duplicatesFor('phone').length ? { marginTop: spacing.base } : undefined}>
              <FieldInput
                value={form.email}
                onChangeText={(t) => update({ email: t })}
                placeholder="name@example.com (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                invalid={!!errorFor('email', 1)}
              />
            </FormField>
            <FormField label="Address" required error={errorFor('address', 1)}>
              <FieldInput
                value={form.address}
                onChangeText={(t) => update({ address: t })}
                placeholder="House / street, area, city"
                multiline
                invalid={!!errorFor('address', 1)}
              />
            </FormField>
            <FormField label="Emergency Contact" hint="Name and relation, e.g. Suresh (Husband)">
              <FieldInput value={form.emergencyName} onChangeText={(t) => update({ emergencyName: t })} placeholder="Name (optional)" autoCapitalize="words" />
            </FormField>
            <FormField label="Emergency Contact Number" error={errorFor('emergencyPhone', 1)} style={{ marginBottom: 0 }}>
              <FieldInput
                value={displayMobile(form.emergencyPhone)}
                onChangeText={(t) => update({ emergencyPhone: mobileInput(t) })}
                placeholder="Mobile number (optional)"
                keyboardType="phone-pad"
                invalid={!!errorFor('emergencyPhone', 1)}
                left={
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                }
              />
            </FormField>
          </ClinicalCard>
        );
      case 2:
        return (
          <View style={{ gap: spacing.md }}>
            <ClinicalCard title="Medical Information" icon="medkit-outline">
              <FormField label="Blood Group">
                <ChoiceChips size="sm" options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))} value={form.bloodGroup} onChange={(b) => update({ bloodGroup: b })} />
              </FormField>
              <FormField label="Drug Allergies" required error={errorFor('allergies', 2)}>
                <ChoiceChips
                  multi
                  tone="danger"
                  options={[...ALLERGY_OPTIONS, { value: NONE, label: 'None (NKDA)', tone: 'success' as const }]}
                  value={form.nkda ? [NONE] : form.allergies}
                  onChange={(v) => {
                    // "None" is exclusive: picking it clears allergens, picking an allergen clears it.
                    if (v.includes(NONE) && !form.nkda) update({ nkda: true, allergies: [], allergyOther: '' });
                    else update({ nkda: false, allergies: v.filter((x) => x !== NONE) });
                  }}
                />
                <FieldInput
                  containerStyle={{ marginTop: spacing.sm }}
                  value={form.allergyOther}
                  onChangeText={(t) => update({ allergyOther: t, nkda: t.trim() ? false : form.nkda })}
                  placeholder="Other allergies, comma separated"
                />
                {form.nkda && <Text style={styles.nkdaNote}>No known drug allergies — confirmed with the patient / attendant.</Text>}
              </FormField>
              <FormField label="Chronic Conditions" style={{ marginBottom: 0 }}>
                <ChoiceChips multi options={CONDITION_OPTIONS} value={form.conditions} onChange={(v) => update({ conditions: v })} />
                <FieldInput
                  containerStyle={{ marginTop: spacing.sm }}
                  value={form.conditionOther}
                  onChangeText={(t) => update({ conditionOther: t })}
                  placeholder="Other conditions, comma separated (optional)"
                />
              </FormField>
            </ClinicalCard>
            <ClinicalCard title="Insurance" icon="shield-checkmark-outline" iconColor={colors.success} meta="Optional — defaults to Self Pay">
              <FormField label="Provider" error={errorFor('insurer', 2)} style={form.insurer === 'Self Pay' ? { marginBottom: 0 } : undefined}>
                <ChoiceChips size="sm" options={INSURERS.map((i) => ({ value: i, label: i }))} value={form.insurer} onChange={(i) => update({ insurer: i })} />
                {form.insurer === 'Other' && (
                  <FieldInput
                    containerStyle={{ marginTop: spacing.sm }}
                    value={form.insurerOther}
                    onChangeText={(t) => update({ insurerOther: t })}
                    placeholder="Insurance provider name"
                    autoCapitalize="words"
                    invalid={!!errorFor('insurer', 2)}
                  />
                )}
              </FormField>
              {form.insurer !== 'Self Pay' && (
                <FormField label="Policy / TPA ID" style={{ marginBottom: 0 }}>
                  <FieldInput value={form.policyNo} onChangeText={(t) => update({ policyNo: t })} placeholder="Optional" autoCapitalize="characters" />
                </FormField>
              )}
            </ClinicalCard>
          </View>
        );
      default: {
        const allergies = allergiesOf(form);
        const conditions = conditionsOf(form);
        const section = (title: string, target: number, rows: Array<[string, string, string?]>) => (
          <ClinicalCard title={title} actionLabel="Edit" onAction={() => goTo(target)} style={{ marginBottom: spacing.md }}>
            {rows.map(([label, value, color], i) => (
              <KeyValueRow key={label} label={label} value={value} valueColor={color} last={i === rows.length - 1} />
            ))}
          </ClinicalCard>
        );
        return (
          <View>
            {duplicateCard('summary')}
            <View style={duplicates.length ? { marginTop: spacing.md } : undefined}>
              {section('Personal', 0, [
                ['Full name', form.name.trim() || '—'],
                ['Date of birth', form.dob ? `${form.dob}${age !== null ? ` • ${age} yrs` : ''}` : '—'],
                ['Gender', form.gender ?? '—'],
              ])}
              {section('Contact', 1, [
                ['Mobile', form.phone ? formatMobile(form.phone) : '—'],
                ['Email', form.email.trim() || 'Not provided'],
                ['Address', form.address.trim() || '—'],
                ['Emergency contact', emergencyOf(form) ?? 'Not provided'],
              ])}
              {section('Medical & Insurance', 2, [
                ['Blood group', form.bloodGroup],
                ['Allergies', form.nkda ? 'No known drug allergies' : allergies.length ? allergies.join(', ') : 'Not recorded', allergies.length ? colors.danger : undefined],
                ['Chronic conditions', conditions.length ? conditions.join(', ') : 'None'],
                ['Insurance', insuranceOf(form)],
              ])}
            </View>
            <ClinicalCard title="Registration Fee" icon="card-outline" meta="Includes Smart UHID card">
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Amount payable</Text>
                <Text style={styles.feeValue}>{formatCurrency(REGISTRATION_FEE, { decimals: 2 })}</Text>
              </View>
              <Text style={styles.payLabel}>Payment mode</Text>
              <ChoiceChips
                size="sm"
                options={paymentModes.map((m) => ({
                  value: m,
                  label: m,
                  icon: m === 'UPI' ? 'phone-portrait-outline' : m === 'Cash' ? 'cash-outline' : m === 'Card' ? 'card-outline' : 'globe-outline',
                }))}
                value={form.paymentMode}
                onChange={(m) => update({ paymentMode: m })}
              />
              <View style={styles.divider} />
              <CheckItem
                label="Patient consent (DPDP Act, 2023)"
                description="I confirm the patient / guardian consents to City Care storing and processing their personal and health data for treatment, billing and insurance."
                checked={form.consent}
                onToggle={() => update({ consent: !form.consent })}
                invalid={!!errorFor('consent', 3)}
              />
              {!!errorFor('consent', 3) && (
                <View style={styles.consentError}>
                  <Ionicons name="alert-circle" size={13} color={colors.danger} />
                  <Text style={styles.consentErrorText}>{errorFor('consent', 3)}</Text>
                </View>
              )}
            </ClinicalCard>
          </View>
        );
      }
    }
  };

  // ---------------------------------------------------------------- layout
  if (result) {
    return (
      <>
        <Header title="Patient Registered" showBack onBackPress={requestLeave} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SuccessCard
            patient={result.patient}
            invoice={result.invoice}
            onViewProfile={() => router.replace({ pathname: '/patient/[id]', params: { id: result.patient.id } })}
            onViewReceipt={() => router.replace({ pathname: '/receipt/[id]', params: { id: result.invoice.id } })}
            onBook={() => router.replace({ pathname: '/book-appointment', params: { patientId: result.patient.id } })}
            onRegisterAnother={registerAnother}
          />
        </ScrollView>
      </>
    );
  }

  const selectedProfile = existing ? getProfile(existing.id) : undefined;
  const lastVisit = existing ? getVisits(existing.id)[0] : undefined;

  return (
    <>
      <Header title="Patient Registration" showBack onBackPress={requestLeave} />
      <AccessGate module="register-patient" purpose="Patient registration">
        <KeyboardAwareContainer>
          <View style={[styles.modeWrap, keyboardOpen && mode === 'new' && styles.hidden]}>
            <SegmentedControl
              segments={[
                { value: 'new', label: 'New Patient', icon: 'person-add-outline' },
                { value: 'existing', label: 'Existing Patient', icon: 'search-outline' },
              ]}
              value={mode}
              onChange={switchMode}
            />
          </View>

          {mode === 'new' ? (
            <>
              <Stepper
                steps={STEPS}
                current={step}
                maxReached={maxStep}
                invalidSteps={invalidSteps}
                onStepPress={goTo}
                style={styles.stepper}
              />
              <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: barSpace + spacing.base }]}
                {...formScrollProps}
              >
                <SlideIn key={step} from={direction * 28}>
                  {renderStep()}
                </SlideIn>
              </ScrollView>
              <BottomActionBar style={styles.bar}>
                {step > 0 && (
                  <Button title="Back" variant="outline" onPress={() => goTo(step - 1)} style={styles.barBack} disabled={submitting} />
                )}
                {step < STEPS.length - 1 ? (
                  <Button
                    title="Next"
                    onPress={next}
                    size="lg"
                    style={styles.barMain}
                    icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
                    iconPosition="right"
                  />
                ) : (
                  <Button
                    title={`Register • ${formatCurrency(REGISTRATION_FEE)}`}
                    onPress={submit}
                    size="lg"
                    loading={submitting}
                    disabled={submitting}
                    style={styles.barMain}
                    icon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
                  />
                )}
              </BottomActionBar>
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} {...formScrollProps}>
              <FadeInView>
                <PatientSelectorBar patient={existing} onPress={() => setPickerOpen(true)} label="Existing patient" />
                {!existing ? (
                  <Text style={styles.existingHint}>Search by name, UHID or mobile number to open a returning patient’s record instead of registering them again.</Text>
                ) : (
                  <FadeInView key={existing.id} offset={10}>
                    <ClinicalCard style={{ marginTop: spacing.md }}>
                      <View style={styles.existingRow}>
                        <Avatar name={existing.name} size={52} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.existingName} numberOfLines={1}>
                            {existing.name}
                          </Text>
                          <Text style={styles.existingMeta}>UHID: {existing.uhid}</Text>
                          <Text style={styles.existingMeta}>
                            {existing.age} yrs • {existing.gender} • {existing.phone}
                          </Text>
                        </View>
                        <Badge label={existing.status} variant={statusVariant(existing.status)} size="sm" />
                      </View>
                      <AllergyBanner allergies={selectedProfile?.allergies} showNone={false} compact style={{ marginTop: spacing.md }} />
                      <Text style={styles.lastVisit}>
                        {lastVisit ? `Last visit: ${friendlyDate(lastVisit.date)} • ${lastVisit.type} • ${lastVisit.doctorName}` : 'No previous visits on record.'}
                      </Text>
                      <Button
                        title="Open Profile"
                        onPress={() => openExisting(existing)}
                        fullWidth
                        style={{ marginTop: spacing.md }}
                        icon={<Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />}
                      />
                      <Button
                        title="Book Appointment"
                        variant="outline"
                        onPress={() => router.replace({ pathname: '/book-appointment', params: { patientId: existing.id } })}
                        fullWidth
                        style={{ marginTop: spacing.sm }}
                        icon={<Ionicons name="calendar-outline" size={16} color={colors.primary} />}
                      />
                      <Button
                        title="Start Consultation"
                        variant="ghost"
                        onPress={() => router.replace({ pathname: '/opd-consultation', params: { patientId: existing.id } })}
                        fullWidth
                        style={{ marginTop: spacing.xs }}
                        icon={<Ionicons name="medkit-outline" size={16} color={colors.primary} />}
                      />
                    </ClinicalCard>
                  </FadeInView>
                )}
              </FadeInView>
            </ScrollView>
          )}
        </KeyboardAwareContainer>
      </AccessGate>
      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setExisting}
        selectedId={existing?.id}
        title="Find Existing Patient"
        allowRegister={false}
      />
    </>
  );
}

// -------------------------------------------------------------
// Success
// -------------------------------------------------------------
const SuccessCard: React.FC<{
  patient: Patient;
  invoice: Invoice;
  onViewProfile: () => void;
  onViewReceipt: () => void;
  onBook: () => void;
  onRegisterAnother: () => void;
}> = ({ patient, invoice, onViewProfile, onViewReceipt, onBook, onRegisterAnother }) => {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 12 }).start();
  }, []);
  return (
    <FadeInView>
      <View style={styles.successCard}>
        <Animated.View
          style={[styles.successIcon, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }], opacity: pop }]}
        >
          <Ionicons name="checkmark" size={40} color="#FFFFFF" />
        </Animated.View>
        <Text style={styles.successTitle}>Patient Registered</Text>
        <Text style={styles.successName}>{patient.name}</Text>
        <Text style={styles.successMeta}>
          {patient.age} yrs • {patient.gender} • {patient.phone}
        </Text>

        <View style={styles.uhidBadge} accessibilityLabel={`UHID ${patient.uhid}`}>
          <Text style={styles.uhidLabel}>UHID</Text>
          <Text style={styles.uhidValue}>{patient.uhid}</Text>
          <Text style={styles.uhidHint}>Smart UHID card issued</Text>
        </View>

        <View style={styles.receiptRow}>
          <View style={styles.receiptIcon}>
            <Ionicons name="receipt-outline" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.receiptTitle}>Registration receipt • {invoice.invoiceNo}</Text>
            <Text style={styles.receiptMeta}>
              {formatCurrency(invoice.amount, { decimals: 2 })} {invoice.status === 'Paid' ? `paid via ${invoice.paymentMode}` : 'pending'} • {invoice.time}
            </Text>
          </View>
          <Badge label={invoice.status} variant={statusVariant(invoice.status)} size="sm" />
        </View>

        <Button title="View Profile" onPress={onViewProfile} fullWidth size="lg" icon={<Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />} />
        <Button
          title="View Receipt"
          variant="outline"
          onPress={onViewReceipt}
          fullWidth
          style={styles.successBtn}
          icon={<Ionicons name="receipt-outline" size={16} color={colors.primary} />}
        />
        <Button
          title="Book Appointment"
          variant="outline"
          onPress={onBook}
          fullWidth
          style={styles.successBtn}
          icon={<Ionicons name="calendar-outline" size={16} color={colors.primary} />}
        />
        <Button title="Register another patient" variant="ghost" onPress={onRegisterAnother} style={{ marginTop: spacing.xs }} />
      </View>
    </FadeInView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  modeWrap: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm },
  hidden: { display: 'none' },
  stepper: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  scrollContent: { padding: spacing.base, paddingBottom: spacing.xxl },
  bar: { flexDirection: 'row', gap: spacing.sm },
  barBack: { flex: 1 },
  barMain: { flex: 2 },
  prefix: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: spacing.sm,
    marginRight: 2,
  },
  prefixText: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  dupCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + '66',
    padding: spacing.md,
    gap: spacing.sm,
  },
  dupHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dupTitle: { flex: 1, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.warningText },
  dupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm + 2,
    padding: spacing.sm,
  },
  dupName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text },
  dupMeta: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 1 },
  dupBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    minHeight: 32,
    justifyContent: 'center',
  },
  dupBtnText: { fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.bold, color: colors.primary },
  dupHint: { fontSize: typography.fontSizes.xs, color: colors.warningText },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  feeValue: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.extraBold, color: colors.primary },
  payLabel: {
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },
  nkdaNote: { fontSize: typography.fontSizes.xs + 1, color: colors.successText, marginTop: spacing.sm },
  consentError: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 34 },
  consentErrorText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.danger, fontWeight: typography.fontWeights.medium },
  existingHint: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },
  existingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  existingName: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.text },
  existingMeta: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  lastVisit: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: spacing.md },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  successIcon: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 6,
    borderColor: colors.successLight,
  },
  successTitle: { textAlign: 'center', fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.extraBold, color: colors.text },
  successName: { textAlign: 'center', fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semiBold, color: colors.text, marginTop: spacing.xs },
  successMeta: { textAlign: 'center', fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  uhidBadge: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  uhidLabel: { fontSize: 11, fontWeight: typography.fontWeights.bold, color: colors.primary, letterSpacing: 1.5 },
  uhidValue: { fontSize: 26, fontWeight: typography.fontWeights.extraBold, color: colors.primaryDark, letterSpacing: 1.5, marginTop: 2 },
  uhidHint: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  receiptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.successText },
  receiptMeta: { fontSize: typography.fontSizes.xs + 1, color: colors.successText, marginTop: 2 },
  successBtn: { marginTop: spacing.sm },
});
