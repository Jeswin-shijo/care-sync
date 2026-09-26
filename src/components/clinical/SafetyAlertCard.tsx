import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SafetyAlert } from '../../logic/safety';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { FadeInView } from '../common/Motion';
import type { IconName } from './types';

export interface SafetyAction {
  label: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
}

interface SafetyAlertCardProps {
  alert: SafetyAlert;
  actions?: SafetyAction[];
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

const TONE = {
  critical: { bg: colors.dangerLight, border: colors.danger + '66', accent: colors.danger, text: colors.dangerText, label: 'CRITICAL' },
  warning: { bg: colors.warningLight, border: colors.warning + '66', accent: colors.warning, text: colors.warningText, label: 'WARNING' },
  info: { bg: colors.infoLight, border: colors.info + '55', accent: colors.info, text: colors.infoText, label: 'NOTE' },
} as const;

const KIND_ICON: Record<SafetyAlert['kind'], IconName> = {
  allergy: 'alert-circle',
  interaction: 'git-compare-outline',
  renal: 'water-outline',
  hepatic: 'fitness-outline',
  duplicate: 'copy-outline',
};

/** One rules-engine finding: severity, reason, safer suggestion and the cited rule. */
export const SafetyAlertCard: React.FC<SafetyAlertCardProps> = ({ alert, actions = [], delay = 0, style }) => {
  const tone = TONE[alert.severity];
  return (
    <FadeInView delay={delay} offset={8} duration={260}>
      <View
        style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }, style]}
        accessibilityRole="alert"
        accessibilityLabel={`${tone.label}: ${alert.title}. ${alert.detail}${alert.suggestion ? ` Suggestion: ${alert.suggestion}` : ''}`}
      >
        <View style={styles.head}>
          <View style={[styles.icon, { backgroundColor: tone.accent }]}>
            <Ionicons name={KIND_ICON[alert.kind]} size={15} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: tone.text }]} numberOfLines={2}>
            {alert.title}
          </Text>
          <View style={[styles.pill, { borderColor: tone.accent }]}>
            <Text style={[styles.pillText, { color: tone.accent }]}>{tone.label}</Text>
          </View>
        </View>
        <Text style={[styles.detail, { color: tone.text }]}>{alert.detail}</Text>
        {!!alert.suggestion && (
          <View style={styles.suggestion}>
            <Ionicons name="bulb-outline" size={14} color={colors.primary} />
            <Text style={styles.suggestionText}>{alert.suggestion}</Text>
          </View>
        )}
        <View style={styles.footer}>
          <Text style={styles.rule}>Rule {alert.rule} • MediOS rules engine</Text>
          <View style={styles.actions}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a.label}
                onPress={a.onPress}
                style={[styles.actionBtn, a.primary ? { backgroundColor: tone.accent, borderColor: tone.accent } : { borderColor: tone.accent }]}
                accessibilityRole="button"
                hitSlop={{ top: 6, bottom: 6 }}
              >
                {a.icon && <Ionicons name={a.icon} size={13} color={a.primary ? '#FFFFFF' : tone.accent} />}
                <Text style={[styles.actionText, { color: a.primary ? '#FFFFFF' : tone.accent }]} numberOfLines={1}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </FadeInView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
  },
  pill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillText: { fontSize: 9.5, fontWeight: typography.fontWeights.extraBold, letterSpacing: 0.6 },
  detail: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: typography.fontSizes.sm - 1,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  rule: { fontSize: 10.5, color: colors.textMuted, fontWeight: typography.fontWeights.medium },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    minHeight: 34,
    maxWidth: '100%',
  },
  actionText: { fontSize: typography.fontSizes.sm - 1, fontWeight: typography.fontWeights.bold, flexShrink: 1 },
});
