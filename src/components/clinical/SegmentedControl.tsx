import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, typography } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';
import type { IconName } from './types';

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** Two-to-four option switch with a sliding highlight (New / Existing patient). */
export function SegmentedControl<T extends string>({ segments, value, onChange, style }: SegmentedControlProps<T>) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const x = useRef(new Animated.Value(0)).current;
  const segW = width > 0 ? (width - 8) / segments.length : 0;

  useEffect(() => {
    if (!segW) return;
    if (reduced) {
      x.setValue(index * segW);
      return;
    }
    Animated.spring(x, { toValue: index * segW, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [index, segW, reduced]);

  return (
    <View
      style={[styles.track, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segW > 0 && <Animated.View style={[styles.thumb, { width: segW, transform: [{ translateX: x }] }]} />}
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            style={styles.segment}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(s.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {s.icon && <Ionicons name={s.icon} size={16} color={active ? '#FFFFFF' : colors.textSecondary} />}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 4,
    ...shadows.sm,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primary,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  labelActive: { color: '#FFFFFF', fontWeight: typography.fontWeights.bold },
});
