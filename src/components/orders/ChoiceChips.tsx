import React from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  sublabel?: string;
  disabled?: boolean;
}

interface ChoiceChipsProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Horizontal scroller instead of wrapping rows. */
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Single-choice chips (payment mode, visit type, ordering doctor, schedule day…). */
export function ChoiceChips<T extends string>({ options, value, onChange, scroll, style, accessibilityLabel }: ChoiceChipsProps<T>) {
  const chips = options.map((opt) => {
    const active = opt.value === value;
    return (
      <PressableScale
        key={opt.value}
        disabled={opt.disabled}
        scaleTo={0.95}
        onPress={() => {
          if (active) return;
          Haptics.selectionAsync().catch(() => {});
          onChange(opt.value);
        }}
        style={[styles.chip, active && styles.chipActive]}
        accessibilityRole="radio"
        accessibilityState={{ selected: active, disabled: !!opt.disabled }}
        accessibilityLabel={opt.sublabel ? `${opt.label}, ${opt.sublabel}` : opt.label}
      >
        {opt.icon ? <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.textSecondary} /> : null}
        <View style={styles.textWrap}>
          <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
            {opt.label}
          </Text>
          {opt.sublabel ? (
            <Text style={[styles.sublabel, active && styles.sublabelActive]} numberOfLines={1}>
              {opt.sublabel}
            </Text>
          ) : null}
        </View>
      </PressableScale>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.scroll, style]}
        contentContainerStyle={styles.scrollRow}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
      >
        {chips}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.wrap, style]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scroll: { flexGrow: 0, marginHorizontal: -spacing.lg },
  scrollRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  textWrap: { flexShrink: 1 },
  label: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  labelActive: { color: colors.primary },
  sublabel: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  sublabelActive: { color: colors.primary + 'CC' },
});
