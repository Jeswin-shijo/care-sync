import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PrescriptionReviewItem } from '../../data/mockData';
import type { SafetyAlert } from '../../logic/safety';
import { colors, radius, spacing, typography } from '../../constants/theme';

export type CheckState = 'pass' | 'fail' | 'warn' | 'info';

export interface SafetyCheck {
  key: 'interaction' | 'allergy' | 'dose' | 'alternative';
  label: string;
  state: CheckState;
  detail: string;
  rule?: string;
}

/** Stored dose note without any override remark appended at dispense time. */
export const doseNote = (rx: PrescriptionReviewItem) => rx.dosageValidation.split(' • Override by ')[0];

/** "Neethu George: reason" when the prescription was dispensed with an override. */
export const overrideNote = (rx: PrescriptionReviewItem) => rx.dosageValidation.split(' • Override by ')[1] ?? null;

const shorten = (text: string, max = 90) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * The four pharmacist checks for a prescription, combining what the review
 * recorded with a live re-screen by the rules engine (`engine`).
 */
export const computeSafetyChecks = (rx: PrescriptionReviewItem, engine: SafetyAlert[]): SafetyCheck[] => {
  const interaction = engine.filter((a) => a.kind === 'interaction');
  const allergy = engine.filter((a) => a.kind === 'allergy');
  const organ = engine.filter((a) => a.kind === 'renal' || a.kind === 'hepatic');
  const duplicate = engine.filter((a) => a.kind === 'duplicate');
  const note = doseNote(rx);

  const interactionFail = !!rx.interactionAlert || interaction.length > 0;
  const allergyFail = !!rx.allergyAlert || allergy.length > 0;
  const doseFail = /contraindicat/i.test(note);
  const doseWarn = !doseFail && (organ.length > 0 || duplicate.length > 0 || /avoid|reduce|halve|caution|lowest effective|adjust/i.test(note));
  const flagged = interactionFail || allergyFail || doseFail || rx.safetyStatus !== 'Safe';
  const alternative = rx.alternativeSuggestion ?? (allergy[0] ?? interaction[0])?.suggestion;

  return [
    {
      key: 'interaction',
      label: 'Drug Interaction Check',
      state: interactionFail ? 'fail' : 'pass',
      detail: interactionFail
        ? shorten(interaction[0]?.title ?? rx.interactionAlert ?? 'Interaction flagged')
        : 'No major interactions',
      rule: interaction[0]?.rule,
    },
    {
      key: 'allergy',
      label: 'Allergy Check',
      state: allergyFail ? 'fail' : 'pass',
      detail: allergyFail ? shorten(allergy[0]?.title ?? rx.allergyAlert ?? 'Allergy conflict') : 'No allergy conflict',
      rule: allergy[0]?.rule,
    },
    {
      key: 'dose',
      label: 'Dose Validation',
      state: doseFail ? 'fail' : doseWarn ? 'warn' : 'pass',
      detail: doseFail || doseWarn ? shorten(organ[0]?.detail ?? duplicate[0]?.title ?? note) : 'Within standard adult range',
      rule: organ[0]?.rule ?? duplicate[0]?.rule,
    },
    {
      key: 'alternative',
      label: 'Alternative Suggestions',
      state: !flagged ? 'pass' : alternative ? 'info' : 'warn',
      detail: !flagged ? 'Not needed' : alternative ? shorten(alternative, 80) : 'None on file — ask the prescriber',
    },
  ];
};

const STATE_UI: Record<CheckState, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  pass: { icon: 'checkmark-circle', color: colors.success, bg: colors.successLight },
  fail: { icon: 'close-circle', color: colors.danger, bg: colors.dangerLight },
  warn: { icon: 'alert-circle', color: colors.warning, bg: colors.warningLight },
  info: { icon: 'bulb', color: colors.primary, bg: colors.primaryLight },
};

/** 2 × 2 grid of pass / fail results, matching the design's four pharmacy checks. */
export const SafetyChecksRow: React.FC<{ checks: SafetyCheck[] }> = ({ checks }) => (
  <View style={styles.grid}>
    {checks.map((c) => {
      const ui = STATE_UI[c.state];
      return (
        <View
          key={c.key}
          style={[styles.tile, { backgroundColor: ui.bg, borderColor: ui.color + '33' }]}
          accessible
          accessibilityLabel={`${c.label}: ${c.state === 'pass' ? 'passed' : c.state === 'fail' ? 'failed' : c.state === 'warn' ? 'caution' : 'suggestion'}. ${c.detail}`}
        >
          <View style={styles.tileTop}>
            <Ionicons name={ui.icon} size={16} color={ui.color} />
            <Text style={styles.label} numberOfLines={2}>
              {c.label}
            </Text>
          </View>
          <Text style={[styles.detail, c.state !== 'pass' && { color: c.state === 'fail' ? colors.dangerText : c.state === 'warn' ? colors.warningText : colors.infoText }]} numberOfLines={2}>
            {c.detail}
          </Text>
          {!!c.rule && <Text style={[styles.rule, { color: ui.color }]}>{c.rule}</Text>}
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  label: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  detail: {
    fontSize: typography.fontSizes.xs - 0.5,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 15,
  },
  rule: {
    fontSize: 9.5,
    fontWeight: typography.fontWeights.bold,
    marginTop: 3,
    letterSpacing: 0.3,
  },
});
