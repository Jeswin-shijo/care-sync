import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BloodStock } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale, ProgressFill } from '../common/Motion';
import { BLOOD_COMPONENTS, groupLevel, groupTotal, LEVEL_META, stockLevel } from './bloodBank';
import { cardStyle } from './OpsUI';

interface Props {
  stock: BloodStock;
  onPress: () => void;
  delay?: number;
}

/** One blood group: PRBC / Whole Blood / Platelets / Plasma against their par levels. */
export const BloodStockCard: React.FC<Props> = ({ stock, onPress, delay = 0 }) => {
  const level = groupLevel(stock);
  const meta = LEVEL_META[level];
  const total = groupTotal(stock);

  return (
    <PressableScale
      onPress={onPress}
      style={[styles.card, level !== 'ok' && { borderColor: meta.color + '55' }]}
      accessibilityRole="button"
      accessibilityLabel={`${stock.group}: ${total} units, ${meta.label}. PRBC ${stock.prbc}, whole blood ${stock.wholeBlood}, platelets ${stock.platelets}, plasma ${stock.plasma}`}
    >
      <View style={styles.header}>
        <View style={[styles.drop, { backgroundColor: meta.bg }]}>
          <Ionicons name="water" size={16} color={level === 'ok' ? colors.danger : meta.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.group}>{stock.group}</Text>
          <Text style={styles.total}>{total} units</Text>
        </View>
        {level !== 'ok' && (
          <View style={[styles.levelPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.levelText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        )}
      </View>

      {BLOOD_COMPONENTS.map((c, i) => {
        const units = stock[c.key];
        const l = stockLevel(units);
        const lm = LEVEL_META[l];
        return (
          <View key={c.key} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {c.component}
              </Text>
              <Text style={[styles.rowUnits, { color: lm.text }]}>{units}</Text>
            </View>
            <ProgressFill progress={units / c.target} color={lm.color} height={4} delay={delay + i * 60} />
          </View>
        );
      })}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  drop: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  group: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  total: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  levelPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  levelText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  row: {
    marginTop: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  rowUnits: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
});
