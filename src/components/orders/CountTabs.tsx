import React from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';

export interface CountTab {
  key: string;
  label: string;
  count?: number;
}

interface CountTabsProps {
  tabs: CountTab[];
  active: string;
  onChange: (key: string) => void;
  /** `fill` spreads the tabs across the row (segmented), `scroll` lets them scroll horizontally. */
  variant?: 'fill' | 'scroll';
  style?: StyleProp<ViewStyle>;
}

/** Filter tabs that carry a live count, e.g. "Low Stock 5". */
export const CountTabs: React.FC<CountTabsProps> = ({ tabs, active, onChange, variant = 'scroll', style }) => {
  const fill = variant === 'fill';

  const items = tabs.map((tab) => {
    const isActive = tab.key === active;
    return (
      <PressableScale
        key={tab.key}
        scaleTo={0.95}
        onPress={() => {
          if (tab.key === active) return;
          Haptics.selectionAsync().catch(() => {});
          onChange(tab.key);
        }}
        style={[styles.tab, fill && styles.tabFill, isActive ? styles.tabActive : styles.tabIdle]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={typeof tab.count === 'number' ? `${tab.label}, ${tab.count}` : tab.label}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
          {tab.label}
        </Text>
        {typeof tab.count === 'number' &&
          (fill ? (
            // Equal-width segments: the count rides on the corner so long labels ("Follow Up") still fit.
            <View style={[styles.corner, isActive ? styles.cornerActive : styles.cornerIdle]}>
              <Text style={[styles.cornerText, isActive && styles.cornerTextActive]}>{tab.count}</Text>
            </View>
          ) : (
            <View style={[styles.count, isActive ? styles.countActive : styles.countIdle]}>
              <Text style={[styles.countText, isActive && styles.countTextActive]}>{tab.count}</Text>
            </View>
          ))}
      </PressableScale>
    );
  });

  if (fill) {
    return (
      <View style={[styles.fillRow, style]} accessibilityRole="tablist">
        {items}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollRow}
      style={[styles.scroll, style]}
      keyboardShouldPersistTaps="handled"
      accessibilityRole="tablist"
    >
      {items}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginHorizontal: -spacing.base },
  scrollRow: { paddingHorizontal: spacing.base, gap: spacing.sm, paddingVertical: 2 },
  fillRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: 7, paddingRight: 4 },
  tab: {
    height: 38,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  tabFill: {
    flex: 1,
    paddingHorizontal: 6,
    borderRadius: radius.md,
  },
  tabIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    elevation: 3,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  labelActive: { color: '#FFFFFF' },
  count: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countIdle: { backgroundColor: colors.cardMuted },
  countActive: { backgroundColor: 'rgba(255,255,255,0.24)' },
  countText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  countTextActive: { color: '#FFFFFF' },
  corner: {
    position: 'absolute',
    top: -8,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  cornerIdle: { backgroundColor: colors.border },
  cornerActive: { backgroundColor: colors.primaryDark },
  cornerText: { fontSize: 10.5, fontWeight: typography.fontWeights.bold, color: colors.textSecondary },
  cornerTextActive: { color: '#FFFFFF' },
});
