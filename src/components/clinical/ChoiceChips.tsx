import React from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import type { IconName } from './types';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** Small count bubble, e.g. filter totals. */
  count?: number;
  disabled?: boolean;
  /** Overrides the group tone for this chip (e.g. a green "None" among red allergies). */
  tone?: Tone;
  /** Extra text for screen readers. */
  accessibilityHint?: string;
}

type Tone = 'primary' | 'danger' | 'success';

const TONES: Record<Tone, { accent: string; light: string }> = {
  primary: { accent: colors.primary, light: colors.primaryLight },
  danger: { accent: colors.danger, light: colors.dangerLight },
  success: { accent: colors.success, light: colors.successLight },
};

interface CommonProps<T extends string> {
  options: ReadonlyArray<ChoiceOption<T>>;
  /** Horizontal scroll instead of wrapping. */
  scroll?: boolean;
  /** "danger" is used for allergy chips. */
  tone?: Tone;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  /** Horizontal padding of the scroll content (default 0). */
  scrollInset?: number;
}

type SingleProps<T extends string> = CommonProps<T> & {
  multi?: false;
  value: T | null;
  onChange: (value: T) => void;
};

type MultiProps<T extends string> = CommonProps<T> & {
  multi: true;
  value: T[];
  onChange: (value: T[]) => void;
};

export type ChoiceChipsProps<T extends string> = SingleProps<T> | MultiProps<T>;

/** Single- or multi-select chip group with tactile press feedback. */
export function ChoiceChips<T extends string>(props: ChoiceChipsProps<T>) {
  const { options, scroll, tone = 'primary', size = 'md', style, scrollInset = 0 } = props;

  const isSelected = (v: T) => (props.multi ? props.value.includes(v) : props.value === v);

  const toggle = (v: T) => {
    if (props.multi) {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
    }
  };

  const chips = options.map((opt) => {
    const selected = isSelected(opt.value);
    const filled = selected && !props.multi;
    const { accent, light: accentLight } = TONES[opt.tone ?? tone];
    return (
      <PressableScale
        key={opt.value}
        onPress={() => toggle(opt.value)}
        disabled={opt.disabled}
        haptic
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityRole={props.multi ? 'checkbox' : 'radio'}
        accessibilityState={{ checked: selected, selected, disabled: !!opt.disabled }}
        accessibilityLabel={opt.count !== undefined ? `${opt.label}, ${opt.count}` : opt.label}
        accessibilityHint={opt.accessibilityHint}
        style={[
          styles.chip,
          size === 'sm' && styles.chipSm,
          selected && { borderColor: accent, backgroundColor: filled ? accent : accentLight },
        ]}
      >
        {props.multi && selected ? (
          <Ionicons name="checkmark" size={14} color={accent} />
        ) : opt.icon ? (
          <Ionicons name={opt.icon} size={14} color={filled ? '#FFFFFF' : selected ? accent : colors.textSecondary} />
        ) : null}
        <Text
          style={[
            styles.label,
            size === 'sm' && styles.labelSm,
            selected && { color: filled ? '#FFFFFF' : accent, fontWeight: typography.fontWeights.bold },
          ]}
          numberOfLines={1}
        >
          {opt.label}
        </Text>
        {opt.count !== undefined && (
          <View style={[styles.count, filled && styles.countFilled]}>
            <Text style={[styles.countText, filled && { color: accent }]}>{opt.count}</Text>
          </View>
        )}
      </PressableScale>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.scroll, style]}
        contentContainerStyle={[styles.row, { paddingHorizontal: scrollInset }]}
        keyboardShouldPersistTaps="handled"
      >
        {chips}
      </ScrollView>
    );
  }
  return <View style={[styles.row, styles.wrap, style]}>{chips}</View>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wrap: { flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  chipSm: {
    minHeight: 34,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  labelSm: { fontSize: typography.fontSizes.xs + 1 },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countFilled: { backgroundColor: '#FFFFFF' },
  countText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
});
