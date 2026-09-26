import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';

interface PopCheckProps {
  checked: boolean;
  size?: number;
  /** Round (radio-like) or rounded-square box. */
  round?: boolean;
  color?: string;
}

/** Checkbox whose tick "pops" in with a spring when it becomes checked. */
export const PopCheck: React.FC<PopCheckProps> = ({ checked, size = 24, round = false, color = colors.primary }) => {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      pop.setValue(checked ? 1 : 0);
      return;
    }
    const anim = checked
      ? Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 16 })
      : Animated.timing(pop, { toValue: 0, duration: 120, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [checked]);

  const r = round ? size / 2 : Math.round(size * 0.28);
  return (
    <Animated.View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: r, borderColor: checked ? color : colors.border },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.fill,
          {
            borderRadius: r - 1,
            backgroundColor: color,
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          },
        ]}
      >
        <Ionicons name="checkmark" size={size * 0.68} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { alignItems: 'center', justifyContent: 'center' },
});
