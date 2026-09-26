import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PrescriptionReviewItem } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { overrideNote } from './SafetyChecksRow';

/**
 * Human-readable catalogue of the rules in src/logic/safety.ts. The engine
 * keeps its tables private, so this mirrors them (ids, members, thresholds).
 */
const ALLERGY_RULES = [
  { id: 'ALG-PENICILLIN', title: 'Penicillin / beta-lactam', members: 'Amoxicillin, ampicillin, penicillin, piperacillin, Augmentin, cloxacillin', alt: 'Ciprofloxacin 500mg BD or Clindamycin 300mg TDS' },
  { id: 'ALG-NSAID', title: 'NSAID', members: 'Diclofenac, ibuprofen, aceclofenac, naproxen, ketorolac, aspirin 300', alt: 'Paracetamol 650mg TDS' },
  { id: 'ALG-SULFONAMIDE', title: 'Sulfonamide', members: 'Sulfamethoxazole, cotrimoxazole, Septran, sulfasalazine', alt: 'Nitrofurantoin or Ciprofloxacin (per indication)' },
];

const INTERACTION_RULES: Array<{ id: string; severity: 'critical' | 'warning'; pair: string; detail: string }> = [
  { id: 'DDI-014', severity: 'critical', pair: 'Statins + clarithromycin / erythromycin / azoles', detail: 'CYP3A4 inhibition — myopathy / rhabdomyolysis risk.' },
  { id: 'DDI-022', severity: 'warning', pair: 'Clopidogrel + omeprazole / esomeprazole', detail: 'Reduced clopidogrel activation (CYP2C19) — prefer pantoprazole.' },
  { id: 'DDI-031', severity: 'critical', pair: 'Antiplatelet / anticoagulant + NSAID', detail: 'High GI bleeding risk — use paracetamol, add PPI cover.' },
  { id: 'DDI-040', severity: 'warning', pair: 'Metformin + iodinated contrast', detail: 'Hold metformin 48 h around contrast (lactic acidosis).' },
  { id: 'DDI-052', severity: 'warning', pair: 'ARB / ACE inhibitor + spironolactone / KCl', detail: 'Additive hyperkalaemia — check potassium within 72 h.' },
];

const ORGAN_RULES = [
  { id: 'RENAL-DOSE', title: 'Renal dosing (latest eGFR)', lines: ['Metformin — contraindicated below eGFR 30; halve at 30–45', 'Diclofenac / ibuprofen — avoid below eGFR 60 (AKI risk)', 'Ciprofloxacin — reduce dose below eGFR 50'] },
  { id: 'HEP-CAUTION', title: 'Hepatic caution (ALT above range)', lines: ['Paracetamol 1g, isoniazid, methotrexate, ketoconazole, valproate — lowest effective dose'] },
  { id: 'DUP-THERAPY', title: 'Therapeutic duplication', lines: ['The same molecule prescribed twice in one prescription'] },
];

interface SafetyEngineSheetProps {
  visible: boolean;
  onClose: () => void;
  reviews: PrescriptionReviewItem[];
}

/** Explains what the pharmacy safety engine checks and how flagged prescriptions are handled. */
export const SafetyEngineSheet: React.FC<SafetyEngineSheetProps> = ({ visible, onClose, reviews }) => {
  const flagged = reviews.filter((r) => r.safetyStatus !== 'Safe').length;
  const overrides = reviews.filter((r) => !!overrideNote(r)).length;
  return (
    <BottomSheet visible={visible} onClose={onClose} title="MediOS Safety Engine" subtitle="Rules run on every prescription before dispensing" maxHeight={0.9}>
      <View style={styles.stats}>
        <Stat label="Screened" value={reviews.length} color={colors.primary} />
        <Stat label="Flagged" value={flagged} color={colors.danger} />
        <Stat label="Overrides" value={overrides} color={colors.warning} />
      </View>

      <Text style={styles.intro}>
        Each prescription is checked against the patient's documented allergies, current medications, latest eGFR and ALT. A flagged
        prescription cannot be dispensed until a safer alternative is applied, the prescriber clarifies it, or a pharmacist records an
        override with a reason (kept in the audit log).
      </Text>

      <Section icon="alert-circle-outline" title="Allergy & class contraindications" color={colors.danger}>
        {ALLERGY_RULES.map((r) => (
          <View key={r.id} style={styles.rule}>
            <Text style={styles.ruleId}>{r.id}</Text>
            <View style={styles.flex}>
              <Text style={styles.ruleTitle}>{r.title}</Text>
              <Text style={styles.ruleText}>{r.members}</Text>
              <Text style={styles.ruleAlt}>Alternative: {r.alt}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section icon="git-compare-outline" title="Drug–drug interactions" color={colors.warning}>
        {INTERACTION_RULES.map((r) => (
          <View key={r.id} style={styles.rule}>
            <Text style={styles.ruleId}>{r.id}</Text>
            <View style={styles.flex}>
              <View style={styles.ruleHead}>
                <Text style={[styles.ruleTitle, styles.flex]}>{r.pair}</Text>
                <View style={[styles.sev, { backgroundColor: r.severity === 'critical' ? colors.dangerLight : colors.warningLight }]}>
                  <Text style={[styles.sevText, { color: r.severity === 'critical' ? colors.danger : colors.warningText }]}>{r.severity}</Text>
                </View>
              </View>
              <Text style={styles.ruleText}>{r.detail}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section icon="water-outline" title="Organ function & duplication" color={colors.primary}>
        {ORGAN_RULES.map((r) => (
          <View key={r.id} style={styles.rule}>
            <Text style={styles.ruleId}>{r.id}</Text>
            <View style={styles.flex}>
              <Text style={styles.ruleTitle}>{r.title}</Text>
              {r.lines.map((l) => (
                <Text key={l} style={styles.ruleText}>
                  • {l}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </Section>
    </BottomSheet>
  );
};

const Stat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Section: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string; color: string; children: React.ReactNode }> = ({ icon, title, color, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <View style={[styles.sectionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
  },
  statValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
  },
  statLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  intro: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rule: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  ruleId: {
    width: 104,
    fontSize: 10.5,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primaryDark,
    letterSpacing: 0.3,
    paddingTop: 1,
  },
  ruleHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  ruleTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  ruleText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  ruleAlt: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.successText,
    marginTop: 3,
    fontWeight: typography.fontWeights.medium,
  },
  sev: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  sevText: {
    fontSize: 9.5,
    fontWeight: typography.fontWeights.bold,
    textTransform: 'uppercase',
  },
});
