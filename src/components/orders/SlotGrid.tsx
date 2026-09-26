import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import { clockToMinutes } from '../../utils/dates';

export type SlotReason = 'booked' | 'past' | 'day-off' | 'busy';

export interface GridSlot {
  time: string;
  available: boolean;
  reason?: SlotReason;
}

const REASON_LABEL: Record<SlotReason, string> = {
  booked: 'Booked',
  past: 'Past',
  'day-off': 'Off',
  busy: 'Clash',
};

const PERIODS: Array<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap; test: (m: number) => boolean }> = [
  { key: 'morning', label: 'Morning', icon: 'sunny-outline', test: (m) => m < 12 * 60 },
  { key: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline', test: (m) => m >= 12 * 60 && m < 17 * 60 },
  { key: 'evening', label: 'Evening', icon: 'moon-outline', test: (m) => m >= 17 * 60 },
];

interface SlotGridProps {
  slots: GridSlot[];
  selected: string | null;
  onSelect: (time: string) => void;
  columns?: number;
}

/** Time-slot picker grouped by part of day. Unavailable slots stay visible with the reason. */
export const SlotGrid: React.FC<SlotGridProps> = ({ slots, selected, onSelect, columns = 4 }) => {
  const [width, setWidth] = useState(0);
  const gap = spacing.sm;
  const slotW = width ? Math.floor((width - gap * (columns - 1)) / columns) : undefined;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {PERIODS.map((period) => {
        const list = slots.filter((s) => period.test(clockToMinutes(s.time)));
        if (!list.length) return null;
        const open = list.filter((s) => s.available).length;
        return (
          <View key={period.key} style={styles.period}>
            <View style={styles.periodHeader}>
              <Ionicons name={period.icon} size={14} color={colors.textSecondary} />
              <Text style={styles.periodLabel}>{period.label}</Text>
              <Text style={styles.periodMeta}>{open ? `${open} open` : 'Full'}</Text>
            </View>
            <View style={[styles.grid, { gap }]}>
              {list.map((slot) => {
                const isSelected = slot.time === selected;
                const reason = slot.reason ? REASON_LABEL[slot.reason] : undefined;
                return (
                  <PressableScale
                    key={slot.time}
                    disabled={!slot.available}
                    scaleTo={0.93}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      onSelect(slot.time);
                    }}
                    style={[
                      styles.slot,
                      slotW ? { width: slotW } : styles.slotFallback,
                      isSelected && styles.slotSelected,
                      !slot.available && styles.slotDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: !slot.available }}
                    accessibilityLabel={`${slot.time}${reason ? `, ${reason}` : ', available'}`}
                  >
                    <Text
                      style={[styles.time, isSelected && styles.timeSelected, !slot.available && styles.timeDisabled]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {slot.time}
                    </Text>
                    {!slot.available && reason ? (
                      <Text style={[styles.reason, slot.reason === 'busy' && { color: colors.warning }]}>{reason}</Text>
                    ) : isSelected ? (
                      <Ionicons name="checkmark-circle" size={12} color={colors.primary} style={styles.check} />
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  period: { marginBottom: spacing.md },
  periodHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  periodLabel: { fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.semiBold, color: colors.textSecondary },
  periodMeta: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginLeft: 'auto' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  slotFallback: { width: '23%' },
  slotSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  slotDisabled: { backgroundColor: colors.cardMuted, borderColor: colors.cardMuted },
  time: { fontSize: 12.5, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  timeSelected: { color: colors.primary, fontWeight: typography.fontWeights.bold },
  timeDisabled: { color: colors.textMuted, textDecorationLine: 'line-through' },
  reason: { fontSize: 9.5, fontWeight: typography.fontWeights.semiBold, color: colors.textMuted, marginTop: 1 },
  check: { marginTop: 2 },
});
