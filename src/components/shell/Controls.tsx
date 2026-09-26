import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';

// -------------------------------------------------------------
// CountTabs — pill tabs with a count bubble ("Billing 2")
// -------------------------------------------------------------
interface CountTab<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface CountTabsProps<T extends string> {
  tabs: CountTab<T>[];
  active: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function CountTabs<T extends string>({ tabs, active, onChange, style }: CountTabsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.tabsScroll, style]}
      contentContainerStyle={styles.tabsContent}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label}${tab.count !== undefined ? `, ${tab.count}` : ''}`}
            hitSlop={{ top: 4, bottom: 4 }}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            {tab.count !== undefined && (
              <View style={[styles.countBubble, isActive && styles.countBubbleActive]}>
                <Text style={[styles.countText, isActive && styles.countTextActive]}>{tab.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// -------------------------------------------------------------
// SegmentedControl — equal segments with a sliding indicator
// -------------------------------------------------------------
interface SegmentedControlProps<T extends string> {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width > 0 ? (width - 6) / options.length : 0;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!segment) return;
    if (reduced) {
      x.setValue(index * segment);
      return;
    }
    Animated.spring(x, { toValue: index * segment, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [index, segment, reduced]);

  return (
    <View
      style={[styles.segment, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segment > 0 && (
        <Animated.View style={[styles.segmentIndicator, { width: segment, transform: [{ translateX: x }] }]} />
      )}
      {options.map((o) => {
        const isActive = o.key === value;
        return (
          <Pressable
            key={o.key}
            style={styles.segmentItem}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={o.label}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// -------------------------------------------------------------
// ChoiceChips — single-select chips (GST slab, priority…)
// -------------------------------------------------------------
interface ChoiceChipsProps<T extends string | number> {
  options: Array<{ value: T; label: string; color?: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ChoiceChips<T extends string | number>({ options, value, onChange, disabled, style }: ChoiceChipsProps<T>) {
  return (
    <View style={[styles.chips, style]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const isActive = o.value === value;
        const tint = o.color ?? colors.primary;
        return (
          <Pressable
            key={String(o.value)}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              isActive && { backgroundColor: tint, borderColor: tint },
              disabled && styles.chipDisabled,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive, disabled }}
            accessibilityLabel={o.label}
          >
            {isActive && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// -------------------------------------------------------------
// NoticeBanner — inline info / warning strip with optional action
// -------------------------------------------------------------
interface NoticeBannerProps {
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

const TONES = {
  info: { color: colors.primary, bg: colors.primaryLight, border: '#BFDBFE' },
  warning: { color: '#B45309', bg: colors.warningLight, border: '#FDE68A' },
  danger: { color: colors.danger, bg: colors.dangerLight, border: '#FECACA' },
  success: { color: '#047857', bg: colors.successLight, border: '#A7F3D0' },
};

export const NoticeBanner: React.FC<NoticeBannerProps> = ({ icon = 'information-circle', tone = 'info', title, message, actionLabel, onAction, style }) => {
  const t = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }, style]} accessibilityRole="summary">
      <Ionicons name={icon} size={18} color={t.color} style={styles.noticeIcon} />
      <View style={styles.noticeBody}>
        {!!title && <Text style={[styles.noticeTitle, { color: t.color }]}>{title}</Text>}
        <Text style={styles.noticeText}>{message}</Text>
        {!!actionLabel && !!onAction && (
          <Pressable onPress={onAction} hitSlop={8} style={styles.noticeAction} accessibilityRole="button">
            <Text style={[styles.noticeActionText, { color: t.color }]}>{actionLabel} ›</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingVertical: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  tabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.semiBold,
  },
  countBubble: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBubbleActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.sm + 2,
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  segmentItem: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
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
    color: colors.textSecondary,
    lineHeight: 17,
  },
  noticeAction: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  noticeActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
});
