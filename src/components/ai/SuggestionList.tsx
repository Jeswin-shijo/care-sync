import React from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { FadeInView, PressableScale, stagger } from '../common/Motion';

export interface Suggestion {
  /** Label shown on the row/chip. */
  text: string;
  /** What gets sent to the assistant (defaults to `text`). */
  query?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Accent for the icon tile (defaults to primary). */
  color?: string;
}

interface SuggestionListProps {
  items: Suggestion[];
  onPress: (text: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Full-width prompt rows shown before the first message (design: "Find all patients with…"). */
export const SuggestionList: React.FC<SuggestionListProps> = ({ items, onPress, disabled, style }) => (
  <View style={[styles.list, style]}>
    {items.map((s, i) => {
      const tint = s.color ?? colors.primary;
      return (
        <FadeInView key={s.text} delay={stagger(i, 50)} offset={10}>
          <PressableScale
            style={styles.row}
            onPress={() => onPress(s.query ?? s.text)}
            disabled={disabled}
            haptic
            accessibilityRole="button"
            accessibilityLabel={`Ask: ${s.text}`}
          >
            <View style={[styles.rowIcon, { backgroundColor: `${tint}14` }]}>
              <Ionicons name={s.icon ?? 'sparkles-outline'} size={16} color={tint} />
            </View>
            <Text style={styles.rowText}>{s.text}</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.textMuted} />
          </PressableScale>
        </FadeInView>
      );
    })}
  </View>
);

/** Compact horizontal prompt chips that sit above the input once a chat has started. */
export const SuggestionChips: React.FC<SuggestionListProps> = ({ items, onPress, disabled, style }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    style={[styles.chipScroll, style]}
    contentContainerStyle={styles.chipRow}
  >
    {items.map((s) => (
      <PressableScale
        key={s.text}
        style={styles.chip}
        onPress={() => onPress(s.query ?? s.text)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Ask: ${s.text}`}
      >
        <Ionicons name={s.icon ?? 'sparkles-outline'} size={13} color={s.color ?? colors.primary} />
        <Text style={styles.chipText} numberOfLines={1}>
          {s.text}
        </Text>
      </PressableScale>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadows.sm,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
    lineHeight: 18,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    maxWidth: 280,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E6FF',
  },
  chipText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primaryDark,
  },
});
