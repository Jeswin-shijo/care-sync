import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

interface SectionHeaderProps {
  title: string;
  /** Small count/label next to the title, e.g. "3 due". */
  meta?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Section title row with an optional "View All ›" style link. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, meta, actionLabel, onActionPress, style }) => (
  <View style={[styles.row, style]}>
    <View style={styles.left}>
      <Text style={styles.title}>{title}</Text>
      {!!meta && <Text style={styles.meta}>{meta}</Text>}
    </View>
    {!!actionLabel && (
      <TouchableOpacity onPress={onActionPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
        <Text style={styles.action}>{actionLabel} ›</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  action: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
});
