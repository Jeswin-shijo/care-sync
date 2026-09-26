import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SafetyAlert } from '../../../logic/safety';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { Badge, statusVariant } from '../../common/Badge';
import { Button } from '../../common/Button';
import { FadeInView, PressableScale, stagger } from '../../common/Motion';
import type { PatientContext } from '../copilotEngine';

const SEVERITY = {
  critical: { color: colors.danger, bg: colors.dangerLight, border: '#FECACA', icon: 'alert-circle' as const, label: 'Critical' },
  warning: { color: '#D97706', bg: colors.warningLight, border: '#FDE68A', icon: 'warning' as const, label: 'Warning' },
  info: { color: colors.primary, bg: colors.primaryLight, border: '#CFE0FF', icon: 'information-circle' as const, label: 'Info' },
};

const QUICK_DRUGS = ['Amoxicillin 500mg', 'Clarithromycin 500mg', 'Diclofenac 50mg', 'Ciprofloxacin 500mg', 'Metformin 500mg'];

const AlertCard: React.FC<{ alert: SafetyAlert; index: number }> = ({ alert, index }) => {
  const s = SEVERITY[alert.severity];
  return (
    <FadeInView delay={stagger(index, 60)} offset={8} style={[styles.alert, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Ionicons name={s.icon} size={18} color={s.color} />
      <View style={{ flex: 1 }}>
        <View style={styles.alertHead}>
          <Text style={[styles.alertTitle, { color: s.color }]}>{alert.title}</Text>
        </View>
        <Text style={styles.alertDetail}>{alert.detail}</Text>
        {!!alert.suggestion && (
          <Text style={styles.alertSuggest}>
            <Text style={styles.bold}>Suggest: </Text>
            {alert.suggestion}
          </Text>
        )}
        <View style={styles.ruleRow}>
          <View style={styles.rule}>
            <Ionicons name="document-text-outline" size={10} color={colors.primaryDark} />
            <Text style={styles.ruleText}>Rule {alert.rule}</Text>
          </View>
          <Text style={[styles.sevText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>
    </FadeInView>
  );
};

interface MedReviewPanelProps {
  ctx: PatientContext;
  checkDrugs: (drugs: string[]) => SafetyAlert[];
  onOpenPharmacy: () => void;
  onApplyAlternative: (reviewId: string) => void;
}

/** "Medication Review": allergies, current regimen screened by the rules engine, pending prescriptions and a pre-prescribing check. */
export const MedReviewPanel: React.FC<MedReviewPanelProps> = ({ ctx, checkDrugs, onOpenPharmacy, onApplyAlternative }) => {
  const meds = ctx.profile?.currentMedications ?? [];
  const allergies = ctx.profile?.allergies ?? [];
  const alerts = meds.length ? checkDrugs(meds) : [];
  const [drug, setDrug] = useState('');
  const [checked, setChecked] = useState<{ drug: string; alerts: SafetyAlert[] } | null>(null);

  const runCheck = (name: string) => {
    const value = name.trim();
    if (!value) return;
    setDrug(value);
    setChecked({ drug: value, alerts: checkDrugs([value]) });
  };

  return (
    <View>
      <Text style={styles.section}>Allergies</Text>
      {allergies.length ? (
        <View style={styles.chips}>
          {allergies.map((a) => (
            <View key={a} style={styles.allergy}>
              <Ionicons name="warning" size={12} color={colors.danger} />
              <Text style={styles.allergyText}>{a}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.nkda}>No known drug allergies (NKDA)</Text>
      )}

      <Text style={[styles.section, styles.gap]}>Current medication ({meds.length})</Text>
      {!meds.length && <Text style={styles.muted}>No regular medication recorded.</Text>}
      {meds.map((m) => (
        <View key={m} style={styles.med}>
          <Ionicons name="medical-outline" size={15} color={colors.primary} />
          <Text style={styles.medText}>{m}</Text>
        </View>
      ))}

      <Text style={[styles.section, styles.gap]}>Rules engine check</Text>
      {alerts.length ? (
        alerts.map((a, i) => <AlertCard key={`${a.rule}-${a.title}`} alert={a} index={i} />)
      ) : (
        <View style={styles.safe}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.safeTitle}>{meds.length ? 'No conflicts in the current regimen' : 'Nothing to screen'}</Text>
            <Text style={styles.safeSub}>Checked allergy classes, interactions (DDI), renal & hepatic dosing and duplications.</Text>
          </View>
        </View>
      )}

      <Text style={[styles.section, styles.gap]}>Prescriptions in pharmacy review ({ctx.prescriptions.length})</Text>
      {!ctx.prescriptions.length && <Text style={styles.muted}>No prescriptions for this patient in the review queue.</Text>}
      {ctx.prescriptions.map((rx) => (
        <View key={rx.id} style={styles.rx}>
          <View style={styles.rxHead}>
            <Text style={styles.rxCode}>{rx.prescriptionCode}</Text>
            <Badge label={rx.safetyStatus} variant={statusVariant(rx.safetyStatus)} size="sm" />
            <Badge label={rx.status} variant={statusVariant(rx.status)} size="sm" />
          </View>
          <Text style={styles.rxDrugs}>{rx.drugs.join(' • ')}</Text>
          <Text style={styles.rxMeta}>
            {rx.doctorName} • {rx.source ?? 'Prescription'}
          </Text>
          {!!(rx.allergyAlert || rx.interactionAlert) && <Text style={styles.rxAlert}>{rx.allergyAlert ?? rx.interactionAlert}</Text>}
          {!!rx.alternativeSuggestion && (
            <Text style={styles.rxAlt}>
              <Text style={styles.bold}>Safer alternative: </Text>
              {rx.alternativeSuggestion}
            </Text>
          )}
          <View style={styles.rxActions}>
            {!!rx.alternativeSuggestion && rx.status !== 'Dispensed' && (
              <Button
                title="Apply safer alternative"
                size="sm"
                fullWidth
                onPress={() => onApplyAlternative(rx.id)}
                icon={<Ionicons name="swap-horizontal" size={15} color="#FFFFFF" />}
              />
            )}
            <Button
              title="Open Pharmacy Review"
              size="sm"
              variant="outline"
              fullWidth
              onPress={onOpenPharmacy}
              icon={<Ionicons name="open-outline" size={15} color={colors.primary} />}
            />
          </View>
        </View>
      ))}

      <Text style={[styles.section, styles.gap]}>Check a drug before prescribing</Text>
      <View style={styles.checkRow}>
        <TextInput
          value={drug}
          onChangeText={(t) => {
            setDrug(t);
            if (checked && t.trim() !== checked.drug) setChecked(null);
          }}
          placeholder="e.g. Amoxicillin 500mg"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={() => runCheck(drug)}
          autoCapitalize="words"
          accessibilityLabel="Drug to check"
        />
        <Button title="Check" size="sm" onPress={() => runCheck(drug)} disabled={!drug.trim()} />
      </View>
      <View style={[styles.chips, { marginTop: spacing.sm }]}>
        {QUICK_DRUGS.map((d) => (
          <PressableScale key={d} style={styles.quick} onPress={() => runCheck(d)} accessibilityRole="button" accessibilityLabel={`Check ${d}`}>
            <Text style={styles.quickText}>{d.split(' ')[0]}</Text>
          </PressableScale>
        ))}
      </View>
      {checked && (
        <View style={{ marginTop: spacing.md }}>
          {checked.alerts.length ? (
            checked.alerts.map((a, i) => <AlertCard key={`chk-${a.rule}-${i}`} alert={a} index={i} />)
          ) : (
            <FadeInView style={styles.safe}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.safeTitle}>No conflicts for {checked.drug}</Text>
                <Text style={styles.safeSub}>Screened against {ctx.patient.name.split(' ')[0]}'s allergies, current medication and latest renal/liver results.</Text>
              </View>
            </FadeInView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  gap: {
    marginTop: spacing.base,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  allergyText: {
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.dangerText,
  },
  nkda: {
    fontSize: typography.fontSizes.sm,
    color: colors.successText,
    fontWeight: typography.fontWeights.semiBold,
  },
  muted: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  med: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  medText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  alert: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  alertHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTitle: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  alertDetail: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    marginTop: 3,
    lineHeight: 17,
  },
  alertSuggest: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  bold: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
  },
  ruleText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
  },
  sevText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
    textTransform: 'uppercase',
  },
  safe: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  safeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.successText,
  },
  safeSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.successText,
    marginTop: 2,
    lineHeight: 16,
  },
  rx: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  rxHead: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  rxCode: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rxDrugs: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  rxMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  rxAlert: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.dangerText,
    lineHeight: 17,
  },
  rxAlt: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  rxActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    backgroundColor: '#F8FAFC',
  },
  quick: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
});
