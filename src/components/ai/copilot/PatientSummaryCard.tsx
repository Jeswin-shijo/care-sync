import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vitalsFlags, VitalFlag } from '../../../logic/clinical';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { Avatar } from '../../common/Avatar';
import { Badge, statusVariant } from '../../common/Badge';
import { FadeInView } from '../../common/Motion';
import { formatDayMonth } from '../../../utils/dates';
import { PatientContext, recordedAgo } from '../copilotEngine';

interface PatientSummaryCardProps {
  ctx: PatientContext;
  onChangePatient: () => void;
  onOpenRecord: () => void;
}

const SEVERITY_COLOR: Record<VitalFlag['severity'], string> = { critical: colors.danger, warning: '#D97706' };

/** Who the copilot is reasoning about: identity, allergy banner, problem list, last visit and live vitals. */
export const PatientSummaryCard = React.memo(function PatientSummaryCard({ ctx, onChangePatient, onOpenRecord }: PatientSummaryCardProps) {
  const { patient, profile, vitals, visits } = ctx;
  const flags = vitals ? vitalsFlags(vitals) : [];
  const flagFor = (field: VitalFlag['field']) => flags.find((f) => f.field === field);
  const lastVisit = visits[0];

  const vitalItems: Array<{ key: VitalFlag['field']; label: string; value: string; unit: string }> = vitals
    ? [
        { key: 'bp', label: 'BP', value: vitals.bp, unit: 'mmHg' },
        { key: 'pulse', label: 'Pulse', value: String(vitals.pulse), unit: 'bpm' },
        { key: 'spo2', label: 'SpO₂', value: `${vitals.spo2}`, unit: '%' },
        { key: 'temp', label: 'Temp', value: `${vitals.temp}`, unit: '°F' },
        ...(typeof vitals.respRate === 'number' ? [{ key: 'respRate' as const, label: 'Resp.', value: String(vitals.respRate), unit: '/min' }] : []),
        ...(typeof vitals.sugar === 'number' ? [{ key: 'sugar' as const, label: 'RBS', value: String(vitals.sugar), unit: 'mg/dL' }] : []),
      ]
    : [];
  const cellWidth = vitalItems.length > 4 ? '33.33%' : '25%';

  return (
    <FadeInView key={patient.id} offset={10} style={styles.card}>
      <View style={styles.top}>
        <Avatar name={patient.name} size={48} />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {patient.name}
            </Text>
            <Badge label={patient.status} variant={statusVariant(patient.status)} size="sm" />
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {patient.age}y • {patient.gender} • UHID {patient.uhid}
          </Text>
          <Text style={styles.meta2} numberOfLines={1}>
            {patient.status === 'Admitted'
              ? `${patient.room ?? 'Ward'} • ${patient.attendingDoctor ?? patient.department ?? ''}`
              : `${patient.department ?? 'OPD'} • Blood ${patient.bloodGroup}`}
          </Text>
        </View>
      </View>

      {profile?.allergies.length ? (
        <View style={styles.allergy} accessibilityRole="alert">
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={styles.allergyText}>
            <Text style={styles.allergyStrong}>Allergy: </Text>
            {profile.allergies.join(', ')}
          </Text>
        </View>
      ) : (
        <View style={styles.nkda}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.nkdaText}>No known drug allergies (NKDA)</Text>
        </View>
      )}

      {!!profile?.conditions.length && (
        <View style={styles.problems}>
          {profile.conditions.slice(0, 4).map((c) => (
            <View key={c} style={styles.problem}>
              <Text style={styles.problemText} numberOfLines={1}>
                {c}
              </Text>
            </View>
          ))}
        </View>
      )}

      {profile?.riskFlags.slice(0, 2).map((f) => (
        <View key={f} style={styles.risk}>
          <Ionicons name="flag" size={12} color="#D97706" />
          <Text style={styles.riskText} numberOfLines={2}>
            {f}
          </Text>
        </View>
      ))}

      <Text style={styles.lastVisit} numberOfLines={2}>
        <Text style={styles.lastVisitLabel}>Last visit: </Text>
        {lastVisit ? `${lastVisit.type} • ${formatDayMonth(lastVisit.date)} • ${lastVisit.doctorName} — ${lastVisit.diagnosis}` : 'First encounter at City Care.'}
      </Text>

      {vitals ? (
        <View style={styles.vitalsBox}>
          <View style={styles.vitalsGrid}>
            {vitalItems.map((item) => {
              const flag = flagFor(item.key);
              const tint = flag ? SEVERITY_COLOR[flag.severity] : colors.text;
              return (
                <View
                  key={item.key}
                  style={[styles.vital, { width: cellWidth }]}
                  accessibilityLabel={`${item.label} ${item.value} ${item.unit}${flag ? `, ${flag.severity === 'critical' ? 'critical' : 'out of range'}` : ''}`}
                >
                  <Text style={styles.vitalLabel}>{item.label}</Text>
                  <View style={styles.vitalValueRow}>
                    {flag && <Ionicons name={flag.severity === 'critical' ? 'alert-circle' : 'arrow-up-circle'} size={11} color={tint} />}
                    <Text style={[styles.vitalValue, { color: tint }]} numberOfLines={1}>
                      {item.value}
                    </Text>
                  </View>
                  <Text style={styles.vitalUnit}>{item.unit}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.recorded}>
            Recorded {recordedAgo(vitals.date, vitals.time)} by {vitals.recordedBy}
            {flags.length ? ` • ${flags.length} out of range` : ' • all within range'}
          </Text>
        </View>
      ) : (
        <View style={[styles.vitalsBox, styles.noVitals]}>
          <Ionicons name="pulse-outline" size={16} color={colors.textMuted} />
          <Text style={styles.recorded}>No vitals charted yet for this patient.</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable onPress={onOpenRecord} style={styles.action} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Open ${patient.name}'s full record`}>
          <Ionicons name="folder-open-outline" size={15} color={colors.primary} />
          <Text style={styles.actionText}>Full record</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={onChangePatient} style={styles.action} hitSlop={6} accessibilityRole="button" accessibilityLabel="Change patient">
          <Ionicons name="swap-horizontal" size={15} color={colors.primary} />
          <Text style={styles.actionText}>Change patient</Text>
        </Pressable>
      </View>
    </FadeInView>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  meta2: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  allergy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  allergyText: {
    flex: 1,
    fontSize: typography.fontSizes.sm - 1,
    color: colors.dangerText,
    lineHeight: 18,
  },
  allergyStrong: {
    fontWeight: typography.fontWeights.extraBold,
  },
  nkda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nkdaText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.successText,
    fontWeight: typography.fontWeights.semiBold,
  },
  problems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  problem: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  problemText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  risk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  riskText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.warningText,
    lineHeight: 16,
  },
  lastVisit: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  lastVisitLabel: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  vitalsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  noVitals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  vital: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  vitalLabel: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  vitalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  vitalValue: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
  },
  vitalUnit: {
    fontSize: 9,
    color: colors.textMuted,
  },
  recorded: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
  },
  actionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.borderLight,
  },
});
