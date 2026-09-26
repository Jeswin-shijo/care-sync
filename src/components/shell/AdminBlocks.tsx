import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale, ProgressFill } from '../common/Motion';

type IconName = keyof typeof Ionicons.glyphMap;
export type ActionTone = 'danger' | 'warning' | 'info' | 'success';

const TONE: Record<ActionTone, { color: string; bg: string }> = {
  danger: { color: colors.danger, bg: colors.dangerLight },
  warning: { color: '#D97706', bg: colors.warningLight },
  info: { color: colors.primary, bg: colors.primaryLight },
  success: { color: '#059669', bg: colors.successLight },
};

export const occupancyTone = (pct: number) => (pct >= 90 ? colors.danger : pct >= 75 ? colors.warning : colors.success);

interface PendingActionRowProps {
  icon: IconName;
  title: string;
  detail: string;
  count: string;
  tone: ActionTone;
  onPress: () => void;
  divider?: boolean;
}

/** One item in the admin's "needs attention" list. */
export const PendingActionRow: React.FC<PendingActionRowProps> = ({ icon, title, detail, count, tone, onPress, divider }) => {
  const t = TONE[tone];
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.actionRow, divider && styles.divider]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${count}. ${detail}`}
    >
      <View style={[styles.actionIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={18} color={t.color} />
      </View>
      <View style={styles.actionBody}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <View style={[styles.countPill, { backgroundColor: t.bg }]}>
        <Text style={[styles.countText, { color: t.color }]}>{count}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </PressableScale>
  );
};

interface BarRowProps {
  label: string;
  value: string;
  sub?: string;
  progress: number;
  color: string;
  delay?: number;
  onPress?: () => void;
  divider?: boolean;
  accessibilityLabel?: string;
}

/** Label + value over an animated bar (ward occupancy, department load). */
export const BarRow: React.FC<BarRowProps> = ({ label, value, sub, progress, color, delay, onPress, divider, accessibilityLabel }) => {
  const content = (
    <>
      <View style={styles.barTop}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <ProgressFill progress={progress} color={color} height={7} delay={delay} />
      {!!sub && <Text style={styles.barSub}>{sub}</Text>}
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.barRow, divider && styles.divider]} accessible accessibilityLabel={accessibilityLabel ?? `${label}: ${value}${sub ? `, ${sub}` : ''}`}>
        {content}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.barRow, divider && styles.divider]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}${sub ? `, ${sub}` : ''}`}
    >
      {content}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  actionDetail: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  countPill: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  countText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
  },
  barRow: {
    paddingVertical: spacing.sm + 2,
  },
  barTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: 6,
  },
  barLabel: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  barValue: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  barSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 4,
  },
});
