import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WardInfo } from '../../data/mockData';
import { colors, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { PressableScale, ProgressFill } from '../common/Motion';
import { occupancyColor, wardIcon } from './beds';
import { cardStyle } from './OpsUI';

interface Props {
  ward: WardInfo;
  selected: boolean;
  onPress: () => void;
  delay?: number;
}

/** Selectable ward "tab": occupancy bar, free beds and daily rate. */
export const WardCard: React.FC<Props> = ({ ward, selected, onPress, delay = 0 }) => {
  const pct = ward.totalBeds ? ward.occupied / ward.totalBeds : 0;
  const tone = occupancyColor(pct, colors);
  return (
    <PressableScale
      onPress={onPress}
      haptic
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${ward.name}: ${ward.occupied} of ${ward.totalBeds} beds occupied, ${ward.available} available`}
    >
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: selected ? colors.primary : colors.primaryLight }]}>
          <Ionicons name={wardIcon(ward)} size={14} color={selected ? '#FFFFFF' : colors.primary} />
        </View>
        <Text style={[styles.name, selected && { color: colors.primaryDark }]} numberOfLines={2}>
          {ward.name}
        </Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
        <Text style={styles.beds}>
          {ward.occupied}/{ward.totalBeds} beds
        </Text>
      </View>
      <ProgressFill progress={pct} color={tone} height={5} delay={delay} trackColor={selected ? '#FFFFFF' : colors.cardMuted} />
      <View style={styles.footer}>
        <Text style={[styles.free, { color: ward.available ? colors.successText : colors.danger }]}>
          {ward.available ? `${ward.available} free` : 'Full'}
        </Text>
        <Text style={styles.rate}>{ward.dailyRate ? `${formatCurrency(ward.dailyRate)}/day` : '—'}</Text>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    flex: 1,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 34,
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    lineHeight: 15,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  pct: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  beds: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  free: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  rate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
});
