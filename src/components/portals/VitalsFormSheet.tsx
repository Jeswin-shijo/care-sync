import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VitalsRecord } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { VitalFlag, vitalsFlags } from '../../logic/clinical';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { useKeyboardHeight } from '../common/KeyboardAware';
import { timeAgoLabel, useNow } from './useNow';

type FieldKey = 'sys' | 'dia' | 'pulse' | 'spo2' | 'temp' | 'respRate' | 'sugar';
type VitalsProbe = Parameters<typeof vitalsFlags>[0];

interface FieldDef {
  label: string;
  unit: string;
  /** Plausible entry range — catches typos, not clinical abnormality. */
  min: number;
  max: number;
  decimal?: boolean;
  optional?: boolean;
  /** Hint that mirrors the early-warning thresholds in logic/clinical. */
  normal: string;
  vital: VitalFlag['field'];
}

const FIELDS: Record<FieldKey, FieldDef> = {
  sys: { label: 'BP systolic', unit: 'mmHg', min: 50, max: 260, normal: 'Normal 90–139', vital: 'bp' },
  dia: { label: 'BP diastolic', unit: 'mmHg', min: 30, max: 160, normal: 'Normal below 90', vital: 'bp' },
  pulse: { label: 'Pulse', unit: 'bpm', min: 20, max: 250, normal: 'Normal 55–100', vital: 'pulse' },
  spo2: { label: 'SpO₂', unit: '%', min: 50, max: 100, normal: 'Normal 95 or above', vital: 'spo2' },
  temp: { label: 'Temperature', unit: '°F', min: 90, max: 110, decimal: true, normal: 'Normal below 100.4', vital: 'temp' },
  respRate: { label: 'Resp. rate', unit: '/min', min: 4, max: 60, normal: 'Normal 8–20', vital: 'respRate' },
  sugar: { label: 'Blood sugar', unit: 'mg/dL', min: 20, max: 600, optional: true, normal: 'Optional • normal 60–179', vital: 'sugar' },
};

const ORDER: FieldKey[] = ['sys', 'dia', 'pulse', 'spo2', 'temp', 'respRate', 'sugar'];
const ROWS: FieldKey[][] = [
  ['sys', 'dia'],
  ['pulse', 'spo2'],
  ['temp', 'respRate'],
  ['sugar'],
];
const EMPTY: Record<FieldKey, string> = { sys: '', dia: '', pulse: '', spo2: '', temp: '', respRate: '', sugar: '' };
const NEUTRAL: VitalsProbe = { bp: '120/78', pulse: 80, spo2: 98, temp: 98.4 };
const SCREEN_H = Dimensions.get('window').height;

const toNumber = (text: string) => Number(text.trim().replace(',', '.'));

const validate = (key: FieldKey, text: string): string | null => {
  const def = FIELDS[key];
  const t = text.trim();
  if (!t) return def.optional ? null : 'Required';
  const n = toNumber(t);
  if (!Number.isFinite(n)) return 'Enter a number';
  if (!def.decimal && !Number.isInteger(n)) return 'Whole numbers only';
  if (n < def.min || n > def.max) return `Check value (${def.min}–${def.max})`;
  return null;
};

/** Severity of one reading on its own, using the shared early-warning rules. */
const severityOf = (key: FieldKey, n: number): VitalFlag['severity'] | undefined => {
  const probe: VitalsProbe = { ...NEUTRAL };
  switch (key) {
    case 'sys':
      probe.bp = `${n}/78`;
      break;
    case 'dia':
      probe.bp = `120/${n}`;
      break;
    case 'pulse':
      probe.pulse = n;
      break;
    case 'spo2':
      probe.spo2 = n;
      break;
    case 'temp':
      probe.temp = n;
      break;
    case 'respRate':
      probe.respRate = n;
      break;
    case 'sugar':
      probe.sugar = n;
      break;
  }
  return vitalsFlags(probe).find((f) => f.field === FIELDS[key].vital)?.severity;
};

interface VitalsFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-selects the patient (e.g. opened from a vitals task). */
  initialPatientId?: string | null;
  onSaved?: (record: VitalsRecord, flags: VitalFlag[]) => void;
}

/** Bedside vitals entry for admitted patients — saves to the chart and alerts the doctor on abnormal values. */
export const VitalsFormSheet: React.FC<VitalsFormSheetProps> = ({ visible, onClose, initialPatientId, onSaved }) => {
  const { patients, nurseTasks, recordVitals, getLatestVitals } = useApp();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const now = useNow(60000);

  const [patientId, setPatientId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<FieldKey, string>>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputs = useRef<Partial<Record<FieldKey, TextInput | null>>>({});

  const admitted = useMemo(
    () => patients.filter((p) => p.status === 'Admitted').sort((a, b) => (a.room ?? '').localeCompare(b.room ?? '')),
    [patients]
  );

  useEffect(() => {
    if (!visible) return;
    setValues(EMPTY);
    setTouched({});
    setSubmitted(false);
    setSaving(false);
    setConfirmDiscard(false);
    setSaveError(null);
    setPatientId(initialPatientId && admitted.some((p) => p.id === initialPatientId) ? initialPatientId : null);
  }, [visible, initialPatientId]);

  const patient = admitted.find((p) => p.id === patientId) ?? null;
  const last = patient ? getLatestVitals(patient.id) : undefined;

  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    ORDER.forEach((k) => {
      const msg = validate(k, values[k]);
      if (msg) e[k] = msg;
    });
    if (!e.sys && !e.dia && values.sys && values.dia && toNumber(values.dia) >= toNumber(values.sys)) {
      e.dia = 'Must be lower than systolic';
    }
    return e;
  }, [values]);

  const severities = useMemo(() => {
    const s: Partial<Record<FieldKey, VitalFlag['severity']>> = {};
    ORDER.forEach((k) => {
      if (!values[k].trim() || validate(k, values[k])) return;
      const sev = severityOf(k, toNumber(values[k]));
      if (sev) s[k] = sev;
    });
    return s;
  }, [values]);

  const complete = Object.keys(errors).length === 0;
  const input = complete
    ? {
        bp: `${toNumber(values.sys)}/${toNumber(values.dia)}`,
        pulse: toNumber(values.pulse),
        spo2: toNumber(values.spo2),
        temp: toNumber(values.temp),
        respRate: toNumber(values.respRate),
        sugar: values.sugar.trim() ? toNumber(values.sugar) : undefined,
      }
    : null;
  const flags = input ? vitalsFlags(input) : [];
  const critical = flags.some((f) => f.severity === 'critical');
  const dirty = ORDER.some((k) => values[k].trim() !== '');

  const finishClose = () => {
    Keyboard.dismiss();
    setConfirmDiscard(false);
    onClose();
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) {
      Keyboard.dismiss();
      setConfirmDiscard(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    finishClose();
  };

  const setField = (k: FieldKey, text: string) => {
    setValues((v) => ({ ...v, [k]: text.replace(/[^0-9.,]/g, '') }));
    setSaveError(null);
  };

  const focusNext = (k: FieldKey) => {
    const next = ORDER[ORDER.indexOf(k) + 1];
    if (next) inputs.current[next]?.focus();
    else Keyboard.dismiss();
  };

  const save = () => {
    if (saving) return;
    setSubmitted(true);
    if (!patient || !input) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setSaving(true);
    try {
      const openTask = nurseTasks.find((t) => t.patientId === patient.id && t.category === 'Vitals' && !t.completed);
      const result = recordVitals(patient.id, input);
      finishClose();
      const taskNote = openTask ? ` • "${openTask.title}" marked done` : '';
      if (result.flags.length) {
        showToast({
          type: 'warning',
          title: `Doctor notified — ${patient.name}`,
          message: `${result.flags.map((f) => f.label).join(' • ')}${taskNote}`,
          action: {
            label: 'Copilot',
            onPress: () => router.push({ pathname: '/doctor-copilot', params: { patientId: patient.id, tab: 'Summarize' } }),
          },
          duration: 4500,
        });
      } else {
        showToast({
          type: 'success',
          title: `Vitals saved — ${patient.name}`,
          message: `BP ${result.record.bp} • Pulse ${result.record.pulse} • SpO₂ ${result.record.spo2}%${taskNote}`,
        });
      }
      onSaved?.(result.record, result.flags);
    } catch {
      setSaveError('Could not save these vitals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Keep the whole sheet above the keyboard (Android edge-to-edge doesn't resize the window).
  const maxHeight = keyboard ? Math.max(0.45, (SCREEN_H - keyboard - insets.top - 12) / SCREEN_H) : 0.9;

  const footer = confirmDiscard ? (
    <View>
      <Text style={styles.discardTitle}>Discard the readings you entered?</Text>
      <View style={styles.footerRow}>
        <Button title="Keep editing" variant="outline" onPress={() => setConfirmDiscard(false)} style={styles.flex} />
        <Button title="Discard" variant="danger" onPress={finishClose} style={styles.flex} />
      </View>
    </View>
  ) : (
    <Button
      title={flags.length ? 'Save & notify doctor' : 'Save vitals'}
      variant={critical ? 'danger' : 'primary'}
      onPress={save}
      loading={saving}
      disabled={saving}
      fullWidth
      icon={<Ionicons name={flags.length ? 'notifications' : 'checkmark-done'} size={18} color="#FFFFFF" />}
    />
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={requestClose}
      title="Record vitals"
      subtitle={patient ? `${patient.name} • ${patient.room ?? patient.uhid}` : 'Choose an admitted patient'}
      footer={footer}
      maxHeight={maxHeight}
    >
      <Text style={styles.sectionLabel}>Patient</Text>
      {admitted.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBleed} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {admitted.map((p) => {
            const selected = p.id === patientId;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  setPatientId(p.id);
                  setSaveError(null);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${p.name}, ${p.room ?? ''}`}
              >
                <Avatar name={p.name} size={28} />
                <View style={styles.chipText}>
                  <Text style={[styles.chipName, selected && styles.chipNameSelected]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.chipRoom} numberOfLines={1}>
                    {p.room ?? p.uhid}
                  </Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.muted}>No patients are admitted right now.</Text>
      )}
      {submitted && !patient && <Text style={styles.errorText}>Select the patient these readings belong to.</Text>}

      {last && (
        <View style={styles.lastBox}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.lastText} numberOfLines={2}>
            Last: BP {last.bp} • P {last.pulse} • SpO₂ {last.spo2}% • {last.temp}°F{typeof last.respRate === 'number' ? ` • RR ${last.respRate}` : ''} — {timeAgoLabel(last.date, last.time, now)}
          </Text>
        </View>
      )}

      <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Readings</Text>
      {ROWS.map((row) => (
        <View key={row.join('-')} style={styles.fieldRow}>
          {row.map((k) => {
            const def = FIELDS[k];
            const error = errors[k];
            const showError = !!error && (submitted || !!touched[k]);
            const sev = severities[k];
            const tone = showError ? colors.danger : sev === 'critical' ? colors.danger : sev === 'warning' ? colors.warning : null;
            const helper = showError
              ? error
              : sev === 'critical'
                ? 'Critical — escalate now'
                : sev === 'warning'
                  ? 'Out of range — doctor will be alerted'
                  : def.normal;
            return (
              <View key={k} style={styles.field}>
                <Text style={styles.fieldLabel}>{def.label}</Text>
                <View style={[styles.inputWrap, tone ? { borderColor: tone, backgroundColor: tone === colors.warning ? colors.warningLight : colors.dangerLight } : null]}>
                  <TextInput
                    ref={(r) => {
                      inputs.current[k] = r;
                    }}
                    value={values[k]}
                    onChangeText={(t) => setField(k, t)}
                    onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
                    onSubmitEditing={() => focusNext(k)}
                    keyboardType={def.decimal ? 'decimal-pad' : 'number-pad'}
                    returnKeyType={k === 'sugar' ? 'done' : 'next'}
                    submitBehavior={k === 'sugar' ? 'blurAndSubmit' : 'submit'}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    maxLength={def.decimal ? 5 : 3}
                    style={[styles.input, tone ? { color: tone === colors.warning ? colors.warningText : colors.danger } : null]}
                    accessibilityLabel={`${def.label} in ${def.unit}${def.optional ? ', optional' : ''}`}
                  />
                  <Text style={styles.unit}>{def.unit}</Text>
                </View>
                <Text style={[styles.helper, tone ? { color: tone === colors.warning ? colors.warningText : colors.danger } : null]} numberOfLines={2}>
                  {helper}
                </Text>
              </View>
            );
          })}
          {row.length === 1 && <View style={styles.field} />}
        </View>
      ))}

      {input && (
        <View style={[styles.summary, flags.length ? (critical ? styles.summaryCritical : styles.summaryWarn) : styles.summaryOk]}>
          <Ionicons
            name={flags.length ? 'warning' : 'checkmark-circle'}
            size={18}
            color={flags.length ? (critical ? colors.danger : colors.warning) : colors.success}
          />
          <View style={styles.flex}>
            <Text style={[styles.summaryTitle, { color: flags.length ? (critical ? colors.dangerText : colors.warningText) : colors.successText }]}>
              {flags.length ? `${flags.length} early-warning flag${flags.length > 1 ? 's' : ''} — the doctor will be notified` : 'All readings within normal limits'}
            </Text>
            {flags.map((f) => (
              <Text key={f.field} style={styles.summaryLine}>
                • {f.label}
                {f.severity === 'critical' ? ' — critical' : ''}
              </Text>
            ))}
          </View>
        </View>
      )}
      {saveError && <Text style={styles.errorText}>{saveError}</Text>}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipsBleed: {
    marginHorizontal: -spacing.lg,
    flexGrow: 0,
  },
  chips: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    maxWidth: 220,
    minHeight: 48,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    flexShrink: 1,
  },
  chipName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  chipNameSelected: {
    color: colors.primaryDark,
  },
  chipRoom: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  muted: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  lastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lastText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  unit: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
    marginLeft: 4,
  },
  helper: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 3,
    minHeight: 14,
  },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  summaryOk: {
    backgroundColor: colors.successLight,
    borderColor: colors.success + '40',
  },
  summaryWarn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '55',
  },
  summaryCritical: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger + '55',
  },
  summaryTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  summaryLine: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    marginTop: 3,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSizes.xs + 1,
    marginTop: spacing.sm,
    fontWeight: typography.fontWeights.medium,
  },
  discardTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
