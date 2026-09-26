import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LabSample } from '../../data/mockData';
import { formatParamValue, parameterFlag, referenceText } from '../../logic/clinical';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Badge, statusVariant } from '../common/Badge';
import { PressableScale } from '../common/Motion';
import { friendlyDate } from './format';

interface LabResultCardProps {
  sample: LabSample;
  onPress?: () => void;
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** A lab report with structured parameters and High / Low flags. */
export const LabResultCard: React.FC<LabResultCardProps> = ({ sample, onPress, actionLabel = 'Analyse in Copilot', style }) => {
  const params = sample.parameters ?? [];
  const abnormal = params.some((p) => parameterFlag(p));
  const content = (
    <>
      <View style={styles.head}>
        <View style={[styles.icon, abnormal && { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="flask" size={16} color={abnormal ? colors.danger : colors.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {sample.testName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {friendlyDate(sample.date)} • {sample.sampleCode}
            {sample.orderedBy ? ` • ${sample.orderedBy}` : ''}
          </Text>
        </View>
        <Badge label={sample.status} variant={statusVariant(sample.status)} size="sm" />
      </View>

      {params.length > 0 ? (
        <View style={styles.table}>
          {params.map((p, i) => {
            const flag = parameterFlag(p);
            return (
              <View key={p.name} style={[styles.paramRow, i < params.length - 1 && styles.paramDivider]}>
                <Text style={styles.paramName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.paramRef} numberOfLines={1}>
                  {referenceText(p)}
                </Text>
                <Text style={[styles.paramValue, flag && { color: colors.danger }]} numberOfLines={1}>
                  {formatParamValue(p)} <Text style={styles.paramUnit}>{p.unit}</Text>
                </Text>
                <View style={[styles.flag, flag === 'H' && styles.flagHigh, flag === 'L' && styles.flagLow]}>
                  {flag ? (
                    <Text style={[styles.flagText, { color: flag === 'H' ? colors.danger : colors.info }]}>{flag}</Text>
                  ) : (
                    <Ionicons name="checkmark" size={11} color={colors.success} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.pending}>{sample.resultValue ?? `Awaiting result • ${sample.turnaroundTime}`}</Text>
      )}

      {!!sample.flag && abnormal && (
        <View style={styles.note}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.noteText}>{sample.flag}</Text>
        </View>
      )}
      {onPress && (
        <View style={styles.footer}>
          <Ionicons name="sparkles" size={13} color={colors.purple} />
          <Text style={styles.footerText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.purple} />
        </View>
      )}
    </>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.card, style]} accessibilityRole="button" accessibilityLabel={`${sample.testName} report`}>
        {content}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  meta: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  table: {
    marginTop: spacing.md,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  paramRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: spacing.sm },
  paramDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  paramName: { flex: 1.3, fontSize: typography.fontSizes.sm - 1, color: colors.text, fontWeight: typography.fontWeights.medium },
  paramRef: { flex: 1, fontSize: 10.5, color: colors.textMuted, textAlign: 'right' },
  paramValue: { flex: 1.1, fontSize: typography.fontSizes.sm - 1, fontWeight: typography.fontWeights.bold, color: colors.text, textAlign: 'right' },
  paramUnit: { fontSize: 10, fontWeight: typography.fontWeights.medium, color: colors.textMuted },
  flag: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagHigh: { backgroundColor: colors.dangerLight },
  flagLow: { backgroundColor: colors.infoLight },
  flagText: { fontSize: 10.5, fontWeight: typography.fontWeights.extraBold },
  pending: { marginTop: spacing.sm, fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: spacing.sm },
  noteText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.dangerText, fontWeight: typography.fontWeights.semiBold },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerText: { flex: 1, fontSize: typography.fontSizes.sm - 1, fontWeight: typography.fontWeights.semiBold, color: colors.purple },
});
