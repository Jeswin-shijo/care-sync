import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A filled check bubble that springs in when it mounts (e.g. on a dispensed card). */
export const CheckPop: React.FC<{ size?: number; color?: string; delay?: number }> = ({ size = 32, color = colors.success, delay = 120 }) => {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const a = Animated.spring(pop, { toValue: 1, delay, speed: 14, bounciness: 14, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pop,
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
      }}
    >
      <Ionicons name="checkmark" size={Math.round(size * 0.56)} color="#FFFFFF" />
    </Animated.View>
  );
};

/** Checkbox that "pops" when ticked, with a 44 pt touch target and haptic feedback. */
export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({
  checked,
  onToggle,
  accessibilityLabel,
  size = 24,
  color = colors.success,
  disabled = false,
  style,
}) => {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const tick = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (reduced) {
      tick.setValue(checked ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: checked ? 1.28 : 0.86,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, speed: 18, bounciness: 14, useNativeDriver: true }),
      ]),
      Animated.timing(tick, { toValue: checked ? 1 : 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [checked]);

  return (
    <Pressable
      onPress={() => {
        if (checked) Haptics.selectionAsync().catch(() => {});
        else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onToggle();
      }}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          borderWidth: 1.5,
          borderColor: checked ? color : colors.border,
          backgroundColor: checked ? color : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <Animated.View style={{ opacity: tick, transform: [{ scale: tick }] }}>
          <Ionicons name="checkmark" size={Math.round(size * 0.72)} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};
