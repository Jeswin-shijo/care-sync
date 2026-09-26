import React, { useEffect, useState } from 'react';
import { Dimensions, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PrescriptionReviewItem } from '../../data/mockData';
import type { DispenseResult } from '../../logic/hospital';
import { ROLE_ACTOR } from '../../logic/hospital';
import type { SafetyAlert } from '../../logic/safety';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { useKeyboardHeight } from '../common/KeyboardAware';
import { AnimatedCheckbox } from './AnimatedCheckbox';

const SCREEN_H = Dimensions.get('window').height;
const MIN_REASON = 10;

const QUICK_REASONS = [
  'Prescriber confirmed by phone — benefit outweighs the risk',
  'Patient has tolerated this drug before without reaction',
  'No suitable alternative available; close monitoring advised',
];

interface OverrideSheetProps {
  visible: boolean;
  rx: PrescriptionReviewItem | null;
  /** Live rules-engine alerts for this prescription. */
  alerts: SafetyAlert[];
  onClose: () => void;
  /** Dispenses with the override; the sheet shows any error inline. */
  onSubmit: (reason: string) => DispenseResult;
}

/** Documented pharmacist override: a reason (≥ 10 chars) and an explicit confirmation are required. */
export const OverrideSheet: React.FC<OverrideSheetProps> = ({ visible, rx, alerts, onClose, onSubmit }) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setReason('');
    setConfirmed(false);
    setSubmitted(false);
    setSaving(false);
    setError(null);
  }, [visible, rx?.id]);

  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= MIN_REASON;
  const canSubmit = reasonOk && confirmed && !saving;

  const blocking = alerts.filter((a) => a.kind === 'allergy' || a.kind === 'interaction' || a.severity === 'critical');
  const lines = blocking.length
    ? blocking.map((a) => ({ title: a.title, detail: a.detail, rule: a.rule }))
    : [rx?.allergyAlert, rx?.interactionAlert].filter((x): x is string => !!x).map((d) => ({ title: 'Safety alert', detail: d, rule: undefined as string | undefined }));

  const submit = () => {
    if (!rx || saving) return;
    setSubmitted(true);
    if (!reasonOk || !confirmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    const res = onSubmit(trimmed);
    setSaving(false);
    if (res.ok) return;
    if (res.error === 'OUT_OF_STOCK') setError(`Insufficient stock: ${(res.shortages ?? []).join(', ')}. Raise an indent or ask the prescriber for an alternative.`);
    else if (res.error === 'ALREADY_DISPENSED') setError('This prescription has already been dispensed.');
    else setError('This prescription could not be dispensed. Refresh the queue and try again.');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const maxHeight = keyboard ? Math.max(0.45, (SCREEN_H - keyboard - insets.top - 12) / SCREEN_H) : 0.9;

  return (
    <BottomSheet
      visible={visible}
      onClose={() => !saving && onClose()}
      title="Override & dispense"
      subtitle={rx ? `${rx.prescriptionCode} • ${rx.patientName}` : undefined}
      maxHeight={maxHeight}
      footer={
        <View>
          <Button
            title="Override & dispense"
            variant="danger"
            onPress={submit}
            loading={saving}
            disabled={saving}
            // Stays pressable so a tap explains what is still missing.
            style={!canSubmit ? styles.dimmed : undefined}
            fullWidth
            icon={<Ionicons name="warning" size={17} color="#FFFFFF" />}
          />
          <Text style={styles.signed}>Recorded in the audit log as {ROLE_ACTOR.pharmacy} (Pharmacist)</Text>
        </View>
      }
    >
      <View style={styles.danger}>
        <Ionicons name="alert-circle" size={20} color={colors.danger} />
        <View style={styles.flex}>
          <Text style={styles.dangerTitle}>You are overriding a patient-safety alert</Text>
          {lines.map((l, i) => (
            <View key={i} style={styles.alertLine}>
              <Text style={styles.alertTitle}>
                {l.title}
                {l.rule ? <Text style={styles.rule}>  {l.rule}</Text> : null}
              </Text>
              <Text style={styles.alertDetail}>{l.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.label}>Clinical reason for override</Text>
      <TextInput
        value={reason}
        onChangeText={(t) => {
          setReason(t);
          setError(null);
        }}
        placeholder="Why is it safe to dispense despite the alert?"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={300}
        textAlignVertical="top"
        style={[styles.input, submitted && !reasonOk && styles.inputError]}
        accessibilityLabel="Reason for override"
      />
      <View style={styles.helperRow}>
        <Text style={[styles.helper, submitted && !reasonOk && styles.helperError]}>
          {submitted && !reasonOk ? `Enter at least ${MIN_REASON} characters` : `Minimum ${MIN_REASON} characters`}
        </Text>
        <Text style={[styles.counter, reasonOk && { color: colors.success }]}>
          {trimmed.length}/{MIN_REASON}
        </Text>
      </View>
      <View style={styles.quick}>
        {QUICK_REASONS.map((q) => (
          <TouchableOpacity key={q} style={styles.quickChip} onPress={() => setReason(q)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`Use reason: ${q}`}>
            <Text style={styles.quickText} numberOfLines={2}>
              {q}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.confirm, submitted && !confirmed && styles.confirmError]}>
        <AnimatedCheckbox
          checked={confirmed}
          onToggle={() => setConfirmed((c) => !c)}
          color={colors.danger}
          accessibilityLabel="I have discussed this risk with the prescriber and will counsel the patient"
        />
        <Text style={styles.confirmText} onPress={() => setConfirmed((c) => !c)}>
          I have discussed this risk with {rx?.doctorName ?? 'the prescriber'} and will counsel the patient before handing over the medicines.
        </Text>
      </View>
      {submitted && !confirmed && <Text style={styles.helperError}>Tick the confirmation to continue</Text>}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="close-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dimmed: { opacity: 0.55 },
  danger: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dangerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.dangerText,
  },
  alertLine: {
    marginTop: 6,
  },
  alertTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  rule: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.danger,
  },
  alertDetail: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.dangerText,
    lineHeight: 16,
    marginTop: 1,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 88,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: colors.danger,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  helper: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  helperError: {
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
    fontWeight: typography.fontWeights.medium,
  },
  counter: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  quick: {
    gap: 6,
    marginTop: spacing.sm,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    minHeight: 40,
    justifyContent: 'center',
  },
  quickText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingRight: spacing.md,
    paddingVertical: 2,
  },
  confirmError: {
    borderColor: colors.danger,
  },
  confirmText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    lineHeight: 17,
    paddingVertical: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.dangerText,
    lineHeight: 17,
  },
  signed: {
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 6,
  },
});
