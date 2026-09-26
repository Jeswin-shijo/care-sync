import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import { formatDayMonth, todayISO, weekdayShort } from '../../utils/dates';

export interface StripDay {
  /** ISO date (YYYY-MM-DD). */
  iso: string;
  disabled?: boolean;
  /** Small caption under the date: "Off", "3 slots", "Full"… */
  note?: string;
  noteTone?: 'muted' | 'danger' | 'success';
  /** Appointment count — rendered as up to three dots. */
  count?: number;
}

interface WeekStripProps {
  days: StripDay[];
  selected: string;
  onSelect: (iso: string) => void;
  style?: StyleProp<ViewStyle>;
  /** Horizontal padding inside the scroller (matches the parent's gutter). */
  inset?: number;
}

const CHIP_W = 62;
const GAP = spacing.sm;

/** Horizontal day picker: "Sat / 26 Sep", with Today marked and disabled days greyed out. */
export const WeekStrip: React.FC<WeekStripProps> = ({ days, selected, onSelect, style, inset = spacing.base }) => {
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const didInitialScroll = useRef(false);
  const today = todayISO();

  // Keep the selected day in view (centered) whenever it changes.
  useEffect(() => {
    if (!width) return;
    const index = days.findIndex((d) => d.iso === selected);
    if (index < 0) return;
    const x = inset + index * (CHIP_W + GAP) - (width - CHIP_W) / 2;
    scroller.current?.scrollTo({ x: Math.max(0, x), animated: didInitialScroll.current });
    didInitialScroll.current = true;
  }, [selected, width, days.length]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, style]}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      keyboardShouldPersistTaps="handled"
    >
      {days.map((day) => {
        const isSelected = day.iso === selected;
        const isToday = day.iso === today;
        const dots = Math.min(3, day.count ?? 0);
        return (
          <PressableScale
            key={day.iso}
            disabled={day.disabled}
            scaleTo={0.94}
            onPress={() => {
              if (isSelected) return;
              Haptics.selectionAsync().catch(() => {});
              onSelect(day.iso);
            }}
            style={[
              styles.chip,
              isToday && !isSelected && styles.chipToday,
              isSelected && styles.chipSelected,
              day.disabled && styles.chipDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: !!day.disabled }}
            accessibilityLabel={`${isToday ? 'Today, ' : ''}${weekdayShort(day.iso)} ${formatDayMonth(day.iso)}${day.note ? `, ${day.note}` : ''}${
              day.count ? `, ${day.count} appointments` : ''
            }`}
          >
            <Text style={[styles.weekday, isToday && styles.weekdayToday, isSelected && styles.textSelected]} numberOfLines={1}>
              {isToday ? 'Today' : weekdayShort(day.iso)}
            </Text>
            <Text style={[styles.date, isSelected && styles.textSelected]} numberOfLines={1}>
              {formatDayMonth(day.iso)}
            </Text>
            <View style={styles.footer}>
              {day.note ? (
                <Text
                  style={[
                    styles.note,
                    day.noteTone === 'danger' && { color: colors.danger },
                    day.noteTone === 'success' && { color: colors.success },
                    isSelected && styles.noteSelected,
                  ]}
                  numberOfLines={1}
                >
                  {day.note}
                </Text>
              ) : (
                Array.from({ length: dots }).map((_, i) => (
                  <View key={i} style={[styles.dot, isSelected && styles.dotSelected]} />
                ))
              )}
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: GAP, paddingVertical: spacing.xs },
  chip: {
    width: CHIP_W,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipToday: { borderColor: colors.primary + '55', backgroundColor: colors.primaryLight },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  chipDisabled: { opacity: 0.45 },
  weekday: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  weekdayToday: { color: colors.primary },
  date: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  textSelected: { color: '#FFFFFF' },
  footer: { height: 12, marginTop: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  note: { fontSize: 9.5, fontWeight: typography.fontWeights.semiBold, color: colors.textMuted },
  noteSelected: { color: 'rgba(255,255,255,0.85)' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary + '99' },
  dotSelected: { backgroundColor: '#FFFFFF' },
});
