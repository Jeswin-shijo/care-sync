import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';

interface AnimatedTabsProps<T extends string> {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  /** Optional count bubbles per tab. */
  counts?: Partial<Record<T, number>>;
  style?: StyleProp<ViewStyle>;
}

type Layout = { x: number; width: number };

/** Underlined tab strip whose indicator slides to the active tab. */
export function AnimatedTabs<T extends string>({ tabs, active, onChange, counts, style }: AnimatedTabsProps<T>) {
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Partial<Record<T, Layout>>>({});
  const left = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const positioned = useRef(false);

  useEffect(() => {
    const l = layouts[active];
    if (!l) return;
    const inset = Math.min(14, l.width * 0.18);
    const toLeft = l.x + inset;
    const toWidth = Math.max(12, l.width - inset * 2);
    if (!positioned.current || reduced) {
      left.setValue(toLeft);
      width.setValue(toWidth);
      positioned.current = true;
      return;
    }
    const anim = Animated.parallel([
      Animated.spring(left, { toValue: toLeft, useNativeDriver: false, speed: 18, bounciness: 5 }),
      Animated.spring(width, { toValue: toWidth, useNativeDriver: false, speed: 18, bounciness: 5 }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [active, layouts, reduced]);

  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      <View style={styles.row}>
        {tabs.map((tab) => {
          const isActive = tab === active;
          const count = counts?.[tab];
          return (
            <Pressable
              key={tab}
              onPress={() => onChange(tab)}
              onLayout={(e) => {
                const { x, width: w } = e.nativeEvent.layout;
                setLayouts((prev) => (prev[tab]?.x === x && prev[tab]?.width === w ? prev : { ...prev, [tab]: { x, width: w } }));
              }}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={count !== undefined ? `${tab}, ${count}` : tab}
              hitSlop={{ top: 6, bottom: 6 }}
            >
              <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                {tab}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.count, isActive && styles.countActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Animated.View style={[styles.indicator, { left, width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  row: { flexDirection: 'row' },
  tab: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countActive: { backgroundColor: colors.primaryLight },
  countText: { fontSize: 10, fontWeight: typography.fontWeights.bold, color: colors.textSecondary },
  countTextActive: { color: colors.primary },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: colors.primary,
  },
});
