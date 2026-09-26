import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';
import { ProgressFill, useReducedMotion } from '../common/Motion';

interface StepperProps {
  steps: readonly string[];
  current: number;
  /** Furthest step the user has reached — steps up to it are tappable. */
  maxReached: number;
  /** Steps that currently have validation errors (shown with a red ring). */
  invalidSteps?: number[];
  onStepPress?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/** Numbered progress stepper (Personal → Contact → Medical → Summary). */
export const Stepper: React.FC<StepperProps> = ({ steps, current, maxReached, invalidSteps = [], onStepPress, style }) => (
  <View style={[styles.row, style]}>
    {steps.map((label, i) => {
      const done = i < current;
      const isCurrent = i === current;
      const reachable = i <= maxReached && !isCurrent;
      const invalid = invalidSteps.includes(i) && !isCurrent;
      return (
        <React.Fragment key={label}>
          <Pressable
            style={styles.item}
            disabled={!reachable || !onStepPress}
            onPress={() => onStepPress?.(i)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Step ${i + 1}, ${label}${done ? ', completed' : isCurrent ? ', current' : ''}`}
            accessibilityState={{ disabled: !reachable, selected: isCurrent }}
          >
            <StepDot index={i} done={done} current={isCurrent} visited={i <= maxReached} invalid={invalid} />
            <Text style={[styles.label, (isCurrent || done) && styles.labelActive, invalid && { color: colors.danger }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
          {i < steps.length - 1 && (
            <View style={styles.lineWrap}>
              <ProgressFill progress={i < current ? 1 : 0} color={colors.success} trackColor={colors.border} height={3} />
            </View>
          )}
        </React.Fragment>
      );
    })}
  </View>
);

const StepDot: React.FC<{ index: number; done: boolean; current: boolean; visited: boolean; invalid: boolean }> = ({
  index,
  done,
  current,
  visited,
  invalid,
}) => {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!current || reduced) return;
    scale.setValue(0.8);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [current]);
  return (
    <Animated.View
      style={[
        styles.dot,
        visited && !done && !current && styles.dotVisited,
        done && styles.dotDone,
        current && styles.dotCurrent,
        invalid && styles.dotInvalid,
        { transform: [{ scale }] },
      ]}
    >
      {done && !invalid ? (
        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
      ) : invalid ? (
        <Ionicons name="alert" size={15} color={colors.danger} />
      ) : (
        <Text style={[styles.dotText, current && { color: '#FFFFFF' }, visited && !current && { color: colors.primary }]}>{index + 1}</Text>
      )}
    </Animated.View>
  );
};

/** Slides + fades its content in on mount; key it by step to animate between steps. */
export const SlideIn: React.FC<{ from?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  from = 24,
  children,
  style,
}) => {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const a = Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  item: {
    alignItems: 'center',
    minWidth: 56,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  dotVisited: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotInvalid: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
  dotText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  labelActive: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  lineWrap: {
    flex: 1,
    maxWidth: 48,
    marginTop: 14,
    marginHorizontal: 2,
  },
});
