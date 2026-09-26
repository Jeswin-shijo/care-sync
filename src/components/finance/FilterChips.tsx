import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';

export interface ChipItem {
  key: string;
  label: string;
  count?: number;
  /** Highlights the count bubble (e.g. pending invoices). */
  tone?: 'default' | 'warning';
}

interface FilterChipsProps {
  items: ChipItem[];
  active: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

/** Horizontally scrolling filter pills with live counts. Keeps the active pill in view. */
export const FilterChips: React.FC<FilterChipsProps> = ({ items, active, onChange, style }) => {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  useEffect(() => {
    const x = offsets.current[active];
    if (typeof x === 'number') scrollRef.current?.scrollTo({ x: Math.max(0, x - spacing.base), animated: true });
  }, [active]);

  return (
    <View style={style}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => {
          const selected = item.key === active;
          const warn = item.tone === 'warning' && !!item.count;
          return (
            <View key={item.key} onLayout={(e) => (offsets.current[item.key] = e.nativeEvent.layout.x)}>
              <PressableScale
                onPress={() => onChange(item.key)}
                style={[styles.chip, selected && styles.chipActive]}
                hitSlop={{ top: 4, bottom: 4 }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.label}${typeof item.count === 'number' ? `, ${item.count}` : ''}`}
              >
                <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
                {typeof item.count === 'number' && (
                  <View style={[styles.count, warn && styles.countWarn, selected && styles.countActive]}>
                    <Text style={[styles.countText, warn && styles.countTextWarn, selected && styles.countTextActive]}>
                      {item.count}
                    </Text>
                  </View>
                )}
              </PressableScale>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.base,
    paddingVertical: 2,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
    ...shadows.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.semiBold,
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countWarn: {
    backgroundColor: colors.warningLight,
  },
  countActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  countTextWarn: {
    color: colors.warningText,
  },
  countTextActive: {
    color: '#FFFFFF',
  },
});
