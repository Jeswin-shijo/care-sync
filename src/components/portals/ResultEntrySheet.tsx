import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LabParameter, LabSample } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { parameterFlag } from '../../logic/clinical';
import { ROLE_ACTOR } from '../../logic/hospital';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { useKeyboardHeight } from '../common/KeyboardAware';

const SCREEN_H = Dimensions.get('window').height;

interface Row extends LabParameter {
  text: string;
  analyzer: number;
}

const toNumber = (text: string) => Number(text.trim().replace(',', '.'));
const group = (n: number) => (n >= 1000 ? n.toLocaleString('en-IN') : String(n));
/** Reference interval in the analyzer's raw units (what the tech types). */
const rawRef = (p: LabParameter) => {
  const unit = p.unit ? ` ${p.unit}` : '';
  if (typeof p.low === 'number' && typeof p.high === 'number') return `${group(p.low)}–${group(p.high)}${unit}`;
  if (typeof p.high === 'number') return `< ${group(p.high)}${unit}`;
  if (typeof p.low === 'number') return `> ${group(p.low)}${unit}`;
  return 'No reference range';
};
const rowError = (text: string) => {
  const t = text.trim();
  if (!t) return 'Required';
  const n = toNumber(t);
  if (!Number.isFinite(n)) return 'Enter a number';
  if (n < 0) return 'Cannot be negative';
  return null;
};

interface ResultEntrySheetProps {
  visible: boolean;
  sample: LabSample | null;
  onClose: () => void;
  /** Called with the signed sample after release. */
  onReleased: (sample: LabSample) => void;
}

/** Enter / verify analyzer values, see live H/L flags and sign the report. */
export const ResultEntrySheet: React.FC<ResultEntrySheetProps> = ({ visible, sample, onClose, onReleased }) => {
  const { analyzerResultsFor, enterLabResults } = useApp();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [rows, setRows] = useState<Row[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyzer = () => {
    if (!sample) return;
    setRows(analyzerResultsFor(sample.testName).map((p) => ({ ...p, text: String(p.value), analyzer: p.value })));
    setSubmitted(false);
    setError(null);
  };

  useEffect(() => {
    if (!visible || !sample) return;
    loadAnalyzer();
    setSaving(false);
    setConfirmDiscard(false);
  }, [visible, sample?.id]);

  const parsed = useMemo(
    () =>
      rows.map((r) => {
        const err = rowError(r.text);
        const value = err ? null : toNumber(r.text);
        const flag = value === null ? null : parameterFlag({ ...r, value });
        return { err, value, flag };
      }),
    [rows]
  );
  const valid = rows.length > 0 && parsed.every((p) => !p.err);
  const flagged = parsed.filter((p) => p.flag).length;
  const edited = rows.some((r) => r.text.trim() !== String(r.analyzer));

  const finishClose = () => {
    Keyboard.dismiss();
    setConfirmDiscard(false);
    onClose();
  };

  const requestClose = () => {
    if (saving) return;
    if (edited) {
      Keyboard.dismiss();
      setConfirmDiscard(true);
      return;
    }
    finishClose();
  };

  const sign = () => {
    if (!sample || saving) return;
    setSubmitted(true);
    if (!valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setSaving(true);
    const params: LabParameter[] = rows.map(({ text, analyzer: _a, ...p }) => ({ ...p, value: toNumber(text) }));
    const updated = enterLabResults(sample.id, params);
    setSaving(false);
    if (!updated) {
      setError('This sample is no longer in the worklist.');
      return;
    }
    finishClose();
    onReleased(updated);
  };

  const maxHeight = keyboard ? Math.max(0.45, (SCREEN_H - keyboard - insets.top - 12) / SCREEN_H) : 0.88;
  const analyzerName = sample?.category === 'Hematology' ? 'Hematology analyzer' : sample?.category === 'Biochemistry' ? 'Biochemistry analyzer' : 'LIS interface';

  const footer = confirmDiscard ? (
    <View>
      <Text style={styles.discardTitle}>Discard your edits to these results?</Text>
      <View style={styles.footerRow}>
        <Button title="Keep editing" variant="outline" onPress={() => setConfirmDiscard(false)} style={styles.flex} />
        <Button title="Discard" variant="danger" onPress={finishClose} style={styles.flex} />
      </View>
    </View>
  ) : (
    <View>
      <Button
        title="Sign & release"
        onPress={sign}
        loading={saving}
        disabled={saving || !sample}
        fullWidth
        icon={<Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />}
      />
      <Text style={styles.signedAs}>Signed as {ROLE_ACTOR.lab} • Lab Technician</Text>
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={requestClose}
      title="Enter results"
      subtitle={sample ? `${sample.testName} • ${sample.sampleCode}` : undefined}
      footer={footer}
      maxHeight={maxHeight}
    >
      {sample && (
        <>
          <View style={styles.patientRow}>
            <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.patientText} numberOfLines={1}>
              {sample.patientName} • {sample.uhid}
              {sample.orderedBy ? ` • ${sample.orderedBy}` : ''}
            </Text>
          </View>
          <View style={styles.sourceRow}>
            <Ionicons name="hardware-chip-outline" size={14} color={colors.primary} />
            <Text style={styles.sourceText}>Values fetched from {analyzerName} — verify before signing</Text>
            {edited && (
              <TouchableOpacity onPress={loadAnalyzer} hitSlop={10} accessibilityRole="button" accessibilityLabel="Reset to analyzer values">
                <Text style={styles.reset}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          {rows.map((r, i) => {
            const { err, flag } = parsed[i] ?? { err: null, flag: null };
            const showErr = !!err && submitted;
            const tone = showErr || flag ? colors.danger : null;
            return (
              <View key={`${r.name}-${i}`} style={styles.paramRow}>
                <View style={styles.paramInfo}>
                  <Text style={styles.paramName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.paramRef}>Ref {rawRef(r)}</Text>
                  {showErr && <Text style={styles.errorText}>{err}</Text>}
                </View>
                <View style={[styles.inputWrap, tone ? { borderColor: tone, backgroundColor: colors.dangerLight } : null]}>
                  <TextInput
                    value={r.text}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^0-9.,]/g, '');
                      setRows((prev) => prev.map((x, j) => (j === i ? { ...x, text: clean } : x)));
                      setError(null);
                    }}
                    keyboardType="decimal-pad"
                    maxLength={9}
                    style={[styles.input, tone ? { color: colors.danger } : null]}
                    accessibilityLabel={`${r.name} value${r.unit ? ` in ${r.unit}` : ''}`}
                  />
                  {!!r.unit && <Text style={styles.unit}>{r.unit}</Text>}
                </View>
                <View style={[styles.flag, flag ? styles.flagBad : styles.flagOk]}>
                  {flag ? (
                    <>
                      <Ionicons name={flag === 'H' ? 'arrow-up' : 'arrow-down'} size={11} color={colors.danger} />
                      <Text style={[styles.flagText, { color: colors.danger }]}>{flag}</Text>
                    </>
                  ) : (
                    <Ionicons name="checkmark" size={13} color={colors.success} />
                  )}
                </View>
              </View>
            );
          })}

          {valid && (
            <View style={[styles.summary, flagged ? styles.summaryBad : styles.summaryOk]}>
              <Ionicons name={flagged ? 'alert-circle' : 'checkmark-circle'} size={18} color={flagged ? colors.danger : colors.success} />
              <Text style={[styles.summaryText, { color: flagged ? colors.dangerText : colors.successText }]}>
                {flagged
                  ? `${flagged} value${flagged > 1 ? 's' : ''} out of range — the result will be released as Abnormal and ${sample.orderedBy ?? 'the ordering doctor'} alerted.`
                  : 'All values within the reference range — the report will be released as Completed.'}
              </Text>
            </View>
          )}
          {error && <Text style={[styles.errorText, { marginTop: spacing.sm }]}>{error}</Text>}
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sourceText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.infoText,
    fontWeight: typography.fontWeights.medium,
  },
  reset: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paramInfo: {
    flex: 1,
  },
  paramName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  paramRef: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  inputWrap: {
    width: 128,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    paddingVertical: 6,
  },
  unit: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
    maxWidth: 44,
  },
  flag: {
    width: 34,
    height: 26,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  flagOk: {
    backgroundColor: colors.successLight,
  },
  flagBad: {
    backgroundColor: colors.dangerLight,
  },
  flagText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.extraBold,
  },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryOk: {
    backgroundColor: colors.successLight,
    borderColor: colors.success + '40',
  },
  summaryBad: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger + '50',
  },
  summaryText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    lineHeight: 17,
    fontWeight: typography.fontWeights.semiBold,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  signedAs: {
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 6,
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
