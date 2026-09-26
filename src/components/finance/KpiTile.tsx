import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { AnimatedNumber } from '../common/Motion';

/** Turns "₹4,82,500" / "78%" / "1,248" into an animatable number + formatter; null for text values. */
export const parseKpiValue = (value: string): { num: number; format?: (n: number) => string } | null => {
  const money = /^(-?)₹([\d,]+)(\.\d{1,2})?$/.exec(value.trim());
  if (money) {
    const decimals = money[3] ? 2 : 0;
    const num = Number(`${money[2].replace(/,/g, '')}${money[3] ?? ''}`) * (money[1] ? -1 : 1);
    return {
      num,
      format: (n) => formatCurrency(decimals ? Math.round(n * 100) / 100 : Math.round(n), { decimals }),
    };
  }
  const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(value.trim());
  if (percent) return { num: Number(percent[1]), format: (n) => `${Math.round(n)}%` };
  if (/^\d{1,3}(,\d{2,3})*$|^\d+$/.test(value.trim())) return { num: Number(value.replace(/,/g, '')) };
  return null;
};

interface KpiTileProps {
  label: string;
  value: string;
  color?: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** KPI card; numeric values count up with AnimatedNumber. */
export const KpiTile: React.FC<KpiTileProps> = ({ label, value, color = colors.primary, delay = 0, style }) => {
  const parsed = parseKpiValue(value);
  return (
    <View style={[styles.tile, style]} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {parsed ? (
        <AnimatedNumber value={parsed.num} format={parsed.format} delay={delay} style={styles.value} />
      ) : (
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.md + 4,
    overflow: 'hidden',
    minHeight: 78,
    ...shadows.sm,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  label: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  value: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    marginTop: 4,
  },
});
