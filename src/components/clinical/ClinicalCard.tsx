import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import type { IconName } from './types';

interface ClinicalCardProps {
  title?: string;
  icon?: IconName;
  iconColor?: string;
  /** Muted line under the title. */
  meta?: string;
  /** Right side of the title row: a link… */
  actionLabel?: string;
  onAction?: () => void;
  /** …or any element (badge, spinner). */
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** White rounded card with an optional icon title row — the clinical screens' building block. */
export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  title,
  icon,
  iconColor = colors.primary,
  meta,
  actionLabel,
  onAction,
  right,
  children,
  style,
}) => (
  <View style={[styles.card, style]}>
    {(title || actionLabel || right) && (
      <View style={styles.head}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '1A' }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
        )}
        <View style={styles.headText}>
          {!!title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          {!!meta && (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          )}
        </View>
        {right}
        {!!actionLabel && !!onAction && (
          <TouchableOpacity
            onPress={onAction}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    )}
    {children}
  </View>
);

interface InfoRowProps {
  icon: IconName;
  label: string;
  value: string;
  iconColor?: string;
  valueColor?: string;
  onPress?: () => void;
  /** Hide the divider under the last row. */
  last?: boolean;
  right?: React.ReactNode;
}

/** Icon + label + value row used for personal details and admission facts. */
export const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, iconColor = colors.primary, valueColor, onPress, last, right }) => {
  const body = (
    <>
      <View style={[styles.infoIcon, { backgroundColor: iconColor + '14' }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      </View>
      {right}
      {onPress && !right && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.infoRow, !last && styles.infoDivider]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.infoRow, !last && styles.infoDivider]}>{body}</View>;
};

/** Label / value pair on one line (bills, summaries). */
export const KeyValueRow: React.FC<{ label: string; value: string; strong?: boolean; valueColor?: string; last?: boolean }> = ({
  label,
  value,
  strong,
  valueColor,
  last,
}) => (
  <View style={[styles.kvRow, !last && styles.infoDivider]}>
    <Text style={[styles.kvLabel, strong && styles.kvStrong]}>{label}</Text>
    <Text style={[styles.kvValue, strong && styles.kvStrong, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1 },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  meta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  infoDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    marginTop: 2,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: spacing.md,
  },
  kvLabel: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  kvValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '62%',
  },
  kvStrong: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
});
