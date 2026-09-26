import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import type { CopilotTab } from './copilotEngine';

export const COPILOT_ACTIONS: Array<{ tab: CopilotTab; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { tab: 'Summarize', label: 'Summarize History', icon: 'document-text', color: colors.primary },
  { tab: 'Reports', label: 'Analyze Reports', icon: 'bar-chart', color: '#0EA5E9' },
  { tab: 'Draft Notes', label: 'Draft Notes', icon: 'create', color: '#6366F1' },
  { tab: 'Med Review', label: 'Medication Review', icon: 'medkit', color: colors.danger },
  { tab: 'Insights', label: 'Clinical Insights', icon: 'bulb', color: colors.purple },
  { tab: 'Protocols', label: 'Hospital Protocols', icon: 'book', color: '#7C3AED' },
];

interface CopilotActionGridProps {
  active: CopilotTab;
  onSelect: (tab: CopilotTab) => void;
  /** Small count badges, e.g. { Insights: 3, 'Med Review': 1 }. */
  badges?: Partial<Record<CopilotTab, number>>;
}

/** The six copilot actions from the design as a 2 × 3 grid — full labels, never truncated. */
export const CopilotActionGrid = React.memo(function CopilotActionGrid({ active, onSelect, badges }: CopilotActionGridProps) {
  return (
  <View style={styles.grid} accessibilityRole="tablist">
    {COPILOT_ACTIONS.map((a) => {
      const isActive = a.tab === active;
      const badge = badges?.[a.tab];
      return (
        <PressableScale
          key={a.tab}
          onPress={() => onSelect(a.tab)}
          haptic
          style={[styles.tile, isActive && { borderColor: a.color, backgroundColor: `${a.color}0F` }]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={`${a.label}${badge ? `, ${badge} flagged` : ''}`}
        >
          <View style={[styles.icon, { backgroundColor: isActive ? a.color : `${a.color}18` }]}>
            <Ionicons name={a.icon} size={18} color={isActive ? '#FFFFFF' : a.color} />
          </View>
          <Text style={[styles.label, isActive && { color: colors.text }]} numberOfLines={2}>
            {a.label}
          </Text>
          {!!badge && (
            <View style={[styles.badge, { backgroundColor: a.tab === 'Med Review' ? colors.danger : a.color }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </PressableScale>
      );
    })}
  </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  tile: {
    width: '31.8%',
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
});
