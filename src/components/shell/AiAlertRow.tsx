import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiAlert } from '../../logic/clinical';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';

export const SEVERITY_STYLE: Record<AiAlert['severity'], { color: string; bg: string; label: string }> = {
  critical: { color: colors.danger, bg: colors.dangerLight, label: 'Critical' },
  warning: { color: '#D97706', bg: colors.warningLight, label: 'Warning' },
  info: { color: colors.primary, bg: colors.primaryLight, label: 'Info' },
};

const KIND_ICON: Record<AiAlert['kind'], keyof typeof Ionicons.glyphMap> = {
  'Abnormal lab': 'flask',
  'Prescription safety': 'medkit',
  'Follow-up due': 'calendar',
  Vitals: 'pulse',
  'Risk flag': 'alert-circle',
};

interface AiAlertRowProps {
  alert: AiAlert;
  onPress: () => void;
  /** Hairline above the row (for stacked rows inside one card). */
  divider?: boolean;
}

/** One MediOS AI alert: severity colour, kind, what happened, and the record it came from. */
export const AiAlertRow: React.FC<AiAlertRowProps> = ({ alert, onPress, divider }) => {
  const sev = SEVERITY_STYLE[alert.severity];
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.row, divider && styles.divider]}
      accessibilityRole="button"
      accessibilityLabel={`${sev.label} ${alert.kind}: ${alert.title} for ${alert.patientName}. ${alert.detail}. Source: ${alert.source}`}
    >
      <View style={[styles.stripe, { backgroundColor: sev.color }]} />
      <View style={[styles.icon, { backgroundColor: sev.bg }]}>
        <Ionicons name={KIND_ICON[alert.kind] ?? 'alert-circle'} size={18} color={sev.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={[styles.kind, { color: sev.color }]} numberOfLines={1}>
            {alert.kind.toUpperCase()}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.patient} numberOfLines={1}>
            {alert.patientName}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {alert.title}
        </Text>
        <Text style={styles.detail} numberOfLines={2}>
          {alert.detail}
        </Text>
        <View style={styles.sourceRow}>
          <Ionicons name="document-text-outline" size={11} color={colors.textMuted} />
          <Text style={styles.source} numberOfLines={1}>
            {alert.source}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.md + 2,
    backgroundColor: '#FFFFFF',
    minHeight: 64,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kind: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.4,
    flexShrink: 0,
  },
  metaDot: {
    fontSize: 10,
    color: colors.textMuted,
  },
  patient: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
    flexShrink: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  detail: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  source: {
    fontSize: 10.5,
    color: colors.textMuted,
    flexShrink: 1,
  },
});
