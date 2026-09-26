import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';

export interface CountTab<K extends string> {
  key: K;
  label: string;
  count?: number;
  /** Colour of the count bubble when the tab is not active. */
  tone?: 'default' | 'danger' | 'warning' | 'success';
}

interface CountTabsProps<K extends string> {
  tabs: CountTab<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Horizontal scroll that bleeds to the screen edges (for 4+ tabs). */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONE_BG = {
  default: colors.cardMuted,
  danger: colors.dangerLight,
  warning: colors.warningLight,
  success: colors.successLight,
};
const TONE_TEXT = {
  default: colors.textSecondary,
  danger: colors.danger,
  warning: colors.warningText,
  success: colors.successText,
};

/** Filter chips that show how many items each filter holds. */
export function CountTabs<K extends string>({ tabs, active, onChange, scrollable = false, style }: CountTabsProps<K>) {
  const items = tabs.map((t) => {
    const isActive = t.key === active;
    const tone = t.tone ?? 'default';
    return (
      <Pressable
        key={t.key}
        onPress={() => {
          if (!isActive) Haptics.selectionAsync().catch(() => {});
          onChange(t.key);
        }}
        hitSlop={{ top: 4, bottom: 4 }}
        style={({ pressed }) => [
          styles.tab,
          !scrollable && styles.tabFixed,
          isActive && styles.tabActive,
          pressed && !isActive && styles.tabPressed,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${t.label}${typeof t.count === 'number' ? `, ${t.count}` : ''}`}
      >
        <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
          {t.label}
        </Text>
        {typeof t.count === 'number' && (
          <View style={[styles.count, { backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : TONE_BG[tone] }]}>
            <Text style={[styles.countText, { color: isActive ? '#FFFFFF' : TONE_TEXT[tone] }]}>{t.count}</Text>
          </View>
        )}
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.bleed, style]}
        contentContainerStyle={styles.scrollContent}
      >
        {items}
      </ScrollView>
    );
  }
  return <View style={[styles.row, style]}>{items}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  bleed: {
    marginHorizontal: -spacing.base,
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingVertical: 2,
  },
  tab: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  tabFixed: {
    flex: 1,
    paddingHorizontal: 6,
    gap: 4,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPressed: {
    backgroundColor: colors.cardMuted,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  labelActive: {
    color: '#FFFFFF',
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
});
