import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BloodStock } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { ProgressFill } from '../common/Motion';
import {
  BLOOD_COMPONENTS,
  BloodGroup,
  compatibleAlternatives,
  groupLevel,
  groupTotal,
  LEVEL_META,
  stockLevel,
} from './bloodBank';
import { ButtonRow } from './OpsUI';
import { plural } from './utils';

interface Props {
  visible: boolean;
  onClose: () => void;
  stock?: BloodStock;
  allStock: BloodStock[];
  onDonate: (group: BloodGroup) => void;
  onRequest: (group: BloodGroup) => void;
}

/** Stock detail for one group with par levels and compatible red-cell donors. */
export const BloodGroupSheet: React.FC<Props> = ({ visible, onClose, stock, allStock, onDonate, onRequest }) => {
  if (!stock) return null;
  const level = groupLevel(stock);
  const alternatives = compatibleAlternatives(allStock, 'PRBC', stock.group);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`${stock.group} blood stock`}
      subtitle={`${plural(groupTotal(stock), 'unit')} • ${LEVEL_META[level].label}`}
      footer={
        <ButtonRow>
          <Button title="Add donation" variant="outline" onPress={() => onDonate(stock.group)} style={styles.flex} />
          <Button
            title={`Request ${stock.group}`}
            onPress={() => onRequest(stock.group)}
            style={styles.flex}
            icon={<Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />}
          />
        </ButtonRow>
      }
    >
      {BLOOD_COMPONENTS.map((c, i) => {
        const units = stock[c.key];
        const l = stockLevel(units);
        const meta = LEVEL_META[l];
        return (
          <View key={c.key} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowTitle}>
                <Text style={styles.rowLabel}>{c.label}</Text>
                <Text style={styles.rowSub}>{c.shelfLife}</Text>
              </View>
              <View style={[styles.levelPill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.levelText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={[styles.rowUnits, { color: meta.text }]}>
                {units}
                <Text style={styles.rowTarget}> / {c.target}</Text>
              </Text>
            </View>
            <ProgressFill progress={units / c.target} color={meta.color} height={6} delay={i * 70} />
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>Compatible red cells in stock</Text>
      <Text style={styles.sectionHint}>For a {stock.group} recipient if {stock.group} PRBC runs short</Text>
      {alternatives.length ? (
        <View style={styles.altWrap}>
          {alternatives.map((a) => (
            <View key={a.group} style={styles.altChip}>
              <Text style={styles.altGroup}>{a.group}</Text>
              <Text style={styles.altUnits}>{plural(a.units, 'unit')}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.none}>No compatible substitute groups in stock.</Text>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowTitle: {
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  rowSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  levelText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  rowUnits: {
    minWidth: 56,
    textAlign: 'right',
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extraBold,
  },
  rowTarget: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  sectionHint: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  altWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  altChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
  },
  altGroup: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.danger,
  },
  altUnits: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.dangerText,
    fontWeight: typography.fontWeights.medium,
  },
  none: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
});
