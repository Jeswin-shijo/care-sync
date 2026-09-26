import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';

interface ProgressRingProps {
  size: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /**
   * 0–1. Pass a number to animate to it, or an Animated.Value you drive yourself
   * (native driver friendly — only opacity and rotation are animated).
   */
  progress: number | Animated.Value;
  duration?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular progress ring built from two clipped, rotating half-rings — no SVG.
 * The right half reveals 0–50 %, the left half 50–100 %, starting at 12 o'clock.
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  size,
  thickness = 6,
  color = colors.primary,
  trackColor = colors.cardMuted,
  progress,
  duration = 800,
  children,
  style,
}) => {
  const reduced = useReducedMotion();
  const target = typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : 0;
  const internal = useRef(new Animated.Value(reduced ? target : 0)).current;
  const driven = typeof progress === 'number' ? internal : progress;

  useEffect(() => {
    if (typeof progress !== 'number') return;
    if (reduced) {
      internal.setValue(target);
      return;
    }
    const a = Animated.timing(internal, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [target, reduced]);

  const half = size / 2;
  const rightRotate = driven.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '180deg'],
    extrapolate: 'clamp',
  });
  const leftRotate = driven.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '0deg', '180deg'],
    extrapolate: 'clamp',
  });
  // Hides the anti-aliasing hairline a 0 % ring would otherwise show.
  const visible = driven.interpolate({ inputRange: [0, 0.01], outputRange: [0, 1], extrapolate: 'clamp' });
  const ring = { width: size, height: size, borderRadius: half, borderWidth: thickness, borderColor: color };

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: half, borderWidth: thickness, borderColor: trackColor }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: visible }]} pointerEvents="none">
        {/* Right half (0–50 %): a left half-ring rotating into view */}
        <View style={{ position: 'absolute', left: half, top: 0, width: half, height: size, overflow: 'hidden' }}>
          <Animated.View
            style={{ position: 'absolute', left: -half, top: 0, width: size, height: size, transform: [{ rotate: rightRotate }] }}
          >
            <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
              <View style={ring} />
            </View>
          </Animated.View>
        </View>
        {/* Left half (50–100 %): a right half-ring rotating into view */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
          <Animated.View
            style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: [{ rotate: leftRotate }] }}
          >
            <View style={{ position: 'absolute', left: half, top: 0, width: half, height: size, overflow: 'hidden' }}>
              <View style={[ring, { position: 'absolute', left: -half, top: 0 }]} />
            </View>
          </Animated.View>
        </View>
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
