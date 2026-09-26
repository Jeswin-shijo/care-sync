import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { AnimatedNumber, FadeInView, PressableScale, stagger } from '../common/Motion';

/**
 * Small UI building blocks shared by the operations screens
 * (blood bank, ambulance, beds, inventory, documents).
 */

export type IconName = keyof typeof Ionicons.glyphMap;

// -------------------------------------------------------------
// KPI tiles
// -------------------------------------------------------------
export interface KpiItem {
  key: string;
  label: string;
  value: number;
  icon: IconName;
  color: string;
  bg: string;
  sub?: string;
  format?: (n: number) => string;
  onPress?: () => void;
}

export const KpiTile: React.FC<{ item: KpiItem; style?: StyleProp<ViewStyle> }> = ({ item, style }) => {
  const body = (
    <>
      <View style={[styles.kpiIcon, { backgroundColor: item.bg }]}>
        <Ionicons name={item.icon} size={16} color={item.color} />
      </View>
      <AnimatedNumber value={item.value} format={item.format} style={[styles.kpiValue, { color: item.color }]} />
      <Text style={styles.kpiLabel} numberOfLines={2}>
        {item.label}
      </Text>
      {!!item.sub && (
        <Text style={styles.kpiSub} numberOfLines={1}>
          {item.sub}
        </Text>
      )}
    </>
  );
  if (item.onPress) {
    return (
      <PressableScale
        style={[styles.kpi, style]}
        onPress={item.onPress}
        haptic
        accessibilityRole="button"
        accessibilityLabel={`${item.label}: ${item.value}${item.sub ? `, ${item.sub}` : ''}`}
      >
        {body}
      </PressableScale>
    );
  }
  return (
    <View style={[styles.kpi, style]} accessible accessibilityLabel={`${item.label}: ${item.value}${item.sub ? `, ${item.sub}` : ''}`}>
      {body}
    </View>
  );
};

/** A row of equally sized KPI tiles that fade in one after another. */
export const KpiRow: React.FC<{ items: KpiItem[]; style?: StyleProp<ViewStyle> }> = ({ items, style }) => (
  <View style={[styles.kpiRow, style]}>
    {items.map((item, i) => (
      <FadeInView key={item.key} delay={stagger(i)} style={styles.kpiCell}>
        <KpiTile item={item} style={styles.kpiFill} />
      </FadeInView>
    ))}
  </View>
);

// -------------------------------------------------------------
// Chips & segmented tabs
// -------------------------------------------------------------
export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  count?: number;
  /** Fill colour while selected (default primary). */
  tone?: string;
  disabled?: boolean;
}

interface ChoiceChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Single horizontal scrolling row instead of wrapping. */
  scroll?: boolean;
  /** With `scroll`, lets the row run edge to edge past a padded parent. */
  bleed?: number;
  style?: StyleProp<ViewStyle>;
}

export function ChoiceChips<T extends string>({ options, value, onChange, scroll = false, bleed = 0, style }: ChoiceChipsProps<T>) {
  const chips = options.map((o) => {
    const active = o.value === value;
    const tone = o.tone ?? colors.primary;
    return (
      <TouchableOpacity
        key={o.value}
        activeOpacity={0.8}
        disabled={o.disabled}
        hitSlop={4}
        onPress={() => {
          if (!active) Haptics.selectionAsync().catch(() => {});
          onChange(o.value);
        }}
        style={[styles.chip, active && { backgroundColor: tone, borderColor: tone }, o.disabled && styles.chipDisabled]}
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled: !!o.disabled }}
        accessibilityLabel={o.count !== undefined ? `${o.label}, ${o.count}` : o.label}
      >
        {!!o.icon && <Ionicons name={o.icon} size={14} color={active ? '#FFFFFF' : tone} />}
        <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
          {o.label}
        </Text>
        {o.count !== undefined && (
          <View style={[styles.chipCount, active && styles.chipCountActive]}>
            <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{o.count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={[styles.chipScroll, bleed ? { marginHorizontal: -bleed } : null]}
        contentContainerStyle={[styles.chipRow, bleed ? { paddingHorizontal: bleed } : null, style]}
      >
        {chips}
      </ScrollView>
    );
  }
  return <View style={[styles.chipWrap, style]}>{chips}</View>;
}

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string; icon?: IconName; badge?: number; tone?: string }>;
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** Equal-width tabs in a pill track (Medicines | Supplies, Routine | Emergency…). */
export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  // Three or more options get tighter padding/type so labels fit a 360dp phone.
  const compact = options.length >= 3;
  return (
    <View style={[styles.segment, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        const tone = o.tone ?? colors.primary;
        return (
          <TouchableOpacity
            key={o.value}
            activeOpacity={0.85}
            style={[styles.segmentItem, compact && styles.segmentItemCompact, active && styles.segmentItemActive]}
            onPress={() => {
              if (!active) Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.badge ? `${o.label}, ${o.badge}` : o.label}
          >
            {!!o.icon && <Ionicons name={o.icon} size={15} color={active ? tone : colors.textMuted} />}
            <Text style={[styles.segmentText, compact && styles.segmentTextCompact, active && { color: tone }]} numberOfLines={1}>
              {o.label}
            </Text>
            {!!o.badge && (
              <View style={[styles.segmentBadge, { backgroundColor: active ? tone : colors.border }]}>
                <Text style={[styles.segmentBadgeText, !active && { color: colors.textSecondary }]}>{o.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// -------------------------------------------------------------
// Quantity stepper
// -------------------------------------------------------------
interface QtyStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  style?: StyleProp<ViewStyle>;
}

/** − [ n ] + with direct numeric entry; always clamped to [min, max]. */
export const QtyStepper: React.FC<QtyStepperProps> = ({ value, onChange, min = 1, max = 9999, step = 1, unit, style }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const bump = (dir: 1 | -1) => {
    const next = clamp(value + dir * step);
    if (next === value) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={[styles.stepper, style]}>
      <TouchableOpacity
        style={[styles.stepBtn, atMin && styles.stepBtnDisabled]}
        onPress={() => bump(-1)}
        disabled={atMin}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={20} color={atMin ? colors.textMuted : colors.primary} />
      </TouchableOpacity>
      <View style={styles.stepValueWrap}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            const digits = t.replace(/[^0-9]/g, '');
            setText(digits);
            if (!digits) return;
            const n = Number(digits);
            if (n > max) {
              onChange(max);
              setText(String(max));
            } else if (n >= min) {
              onChange(n);
            }
          }}
          onBlur={() => setText(String(value))}
          keyboardType="number-pad"
          maxLength={String(max).length}
          selectTextOnFocus
          style={styles.stepInput}
          accessibilityLabel={unit ? `Quantity in ${unit}` : 'Quantity'}
        />
        {!!unit && (
          <Text style={styles.stepUnit} numberOfLines={1}>
            {unit}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
        onPress={() => bump(1)}
        disabled={atMax}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={20} color={atMax ? colors.textMuted : colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

// -------------------------------------------------------------
// Form fields
// -------------------------------------------------------------
interface FieldProps {
  label: string;
  required?: boolean;
  /** Red helper text under the field. */
  error?: string | null;
  hint?: string | null;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Field: React.FC<FieldProps> = ({ label, required, error, hint, right, children, style }) => (
  <View style={[styles.field, style]}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {right}
    </View>
    {children}
    {error ? (
      <View style={styles.fieldErrorRow} accessibilityLiveRegion="polite">
        <Ionicons name="alert-circle" size={13} color={colors.danger} />
        <Text style={styles.fieldError}>{error}</Text>
      </View>
    ) : hint ? (
      <Text style={styles.fieldHint}>{hint}</Text>
    ) : null}
  </View>
);

export const Input: React.FC<TextInputProps & { invalid?: boolean; icon?: IconName; containerStyle?: StyleProp<ViewStyle> }> = ({
  invalid,
  icon,
  style,
  containerStyle,
  ...rest
}) => (
  <View style={[styles.inputWrap, invalid && styles.inputInvalid, containerStyle]}>
    {!!icon && <Ionicons name={icon} size={18} color={invalid ? colors.danger : colors.textMuted} style={styles.inputIcon} />}
    <TextInput placeholderTextColor={colors.textMuted} style={[styles.input, style]} {...rest} />
  </View>
);

// -------------------------------------------------------------
// Rows, notices, misc
// -------------------------------------------------------------
export const InfoRow: React.FC<{
  label: string;
  value: string;
  icon?: IconName;
  valueColor?: string;
  last?: boolean;
  multiline?: boolean;
}> = ({ label, value, icon, valueColor, last, multiline }) => (
  <View style={[styles.infoRow, last && styles.infoRowLast, multiline && styles.infoRowTop]}>
    {!!icon && <Ionicons name={icon} size={15} color={colors.textMuted} style={styles.infoIcon} />}
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]} numberOfLines={multiline ? undefined : 2}>
      {value}
    </Text>
  </View>
);

const NOTICE_TONES = {
  info: { color: colors.primary, bg: colors.primaryLight, icon: 'information-circle' as IconName },
  success: { color: colors.success, bg: colors.successLight, icon: 'checkmark-circle' as IconName },
  warning: { color: colors.warningText, bg: colors.warningLight, icon: 'warning' as IconName },
  danger: { color: colors.dangerText, bg: colors.dangerLight, icon: 'alert-circle' as IconName },
};

export const Notice: React.FC<{
  tone: keyof typeof NOTICE_TONES;
  message: string;
  title?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}> = ({ tone, message, title, icon, action, style }) => {
  const t = NOTICE_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }, style]}>
      <Ionicons name={icon ?? t.icon} size={18} color={t.color} style={styles.noticeIcon} />
      <View style={styles.noticeBody}>
        {!!title && <Text style={[styles.noticeTitle, { color: t.color }]}>{title}</Text>}
        <Text style={[styles.noticeText, { color: t.color }]}>{message}</Text>
      </View>
      {!!action && (
        <TouchableOpacity onPress={action.onPress} hitSlop={10} style={styles.noticeAction} accessibilityRole="button">
          <Text style={[styles.noticeActionText, { color: t.color }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** Round icon-only button (≥44px target) — always pass an accessibilityLabel. */
export const IconAction: React.FC<{
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  bg?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ icon, onPress, accessibilityLabel, color = colors.primary, bg = colors.primaryLight, size = 44, style }) => (
  <PressableScale
    onPress={onPress}
    haptic
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}
  >
    <Ionicons name={icon} size={Math.round(size * 0.45)} color={color} />
  </PressableScale>
);

export const LegendItem: React.FC<{ label: string; color: string; outline?: boolean }> = ({ label, color, outline }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendSwatch, outline ? { borderColor: color, borderWidth: 1.5, backgroundColor: '#FFFFFF' } : { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

/** Two buttons side by side for BottomSheet / BottomActionBar footers. */
export const ButtonRow: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => (
  <View style={[styles.buttonRow, style]}>{children}</View>
);

export const cardStyle: ViewStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.borderLight,
  ...shadows.sm,
};

const styles = StyleSheet.create({
  // KPI
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpiCell: {
    flex: 1,
  },
  kpiFill: {
    flex: 1,
  },
  kpi: {
    ...cardStyle,
    padding: spacing.md,
    minHeight: 104,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontSize: typography.fontSizes.xxl - 2,
    fontWeight: typography.fontWeights.extraBold,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.xs + 1,
    lineHeight: 15,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 1,
  },
  kpiSub: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Chips
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipCountText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  chipCountTextActive: {
    color: '#FFFFFF',
  },

  // Segmented
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md + 2,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md - 2,
    paddingHorizontal: spacing.sm,
  },
  segmentItemCompact: {
    paddingHorizontal: 4,
    gap: 4,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  segmentText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  segmentTextCompact: {
    fontSize: typography.fontSizes.xs + 1,
  },
  segmentBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#FFFFFF',
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  stepBtn: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.5,
  },
  stepValueWrap: {
    minWidth: 76,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  stepInput: {
    minWidth: 28,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    padding: 0,
  },
  stepUnit: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },

  // Fields
  field: {
    marginBottom: spacing.base,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  fieldError: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.danger,
    fontWeight: typography.fontWeights.medium,
  },
  fieldHint: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
  },
  inputInvalid: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.text,
    paddingVertical: 10,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  infoRowTop: {
    alignItems: 'flex-start',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 18,
  },
  infoLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    minWidth: 96,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
  },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeBody: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  noticeText: {
    fontSize: typography.fontSizes.xs + 1,
    lineHeight: 17,
    fontWeight: typography.fontWeights.medium,
  },
  noticeAction: {
    alignSelf: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  noticeActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },

  // Legend
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
