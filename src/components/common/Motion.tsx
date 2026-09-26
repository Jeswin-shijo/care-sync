import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/theme';

/**
 * Shared motion primitives built on React Native's Animated API.
 * Everything here respects the OS "reduce motion" setting and uses the
 * native driver wherever the animated property allows it.
 */

let reduceMotionCache = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotionCache = enabled;
  })
  .catch(() => {});

export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(reduceMotionCache);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionCache = enabled;
      setReduced(enabled);
    });
    return () => sub.remove();
  }, []);
  return reduced;
};

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  /** Vertical distance (px) the content slides up from. */
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fades and slides its children in once, on mount. Stagger with `delay`. */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = 380,
  offset = 14,
  style,
}) => {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/** Delay for the nth item of a staggered list, capped so long lists don't lag. */
export const stagger = (index: number, step = 60, max = 480) => Math.min(index * step, max);

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. */
  scaleTo?: number;
  haptic?: boolean;
}

/** A Pressable that springs down slightly while pressed — tactile feedback for cards and tiles. */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: toValue === 1 ? 6 : 0,
    }).start();

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        animateTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.55 }]}
    >
      {children}
    </AnimatedPressable>
  );
};

interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
}

/** Counts up (or down) to `value` whenever it changes. */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = (n) => Math.round(n).toLocaleString('en-IN'),
  duration = 900,
  delay = 0,
  style,
  ...textProps
}) => {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(reduced ? value : 0)).current;
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    return () => anim.removeListener(id);
  }, []);

  useEffect(() => {
    if (reduced) {
      anim.setValue(value);
      setDisplay(value);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [value]);

  return (
    <Text {...textProps} style={style}>
      {format(display)}
    </Text>
  );
};

interface ProgressFillProps {
  /** 0–1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Horizontal progress bar that animates to its value. */
export const ProgressFill: React.FC<ProgressFillProps> = ({
  progress,
  color = colors.primary,
  trackColor = colors.cardMuted,
  height = 6,
  delay = 0,
  style,
}) => {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, progress));
  const anim = useRef(new Animated.Value(reduced ? clamped : 0)).current;

  useEffect(() => {
    if (reduced) {
      anim.setValue(clamped);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: clamped,
      duration: 700,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [clamped]);

  return (
    <View
      style={[
        { height, borderRadius: height / 2, backgroundColor: trackColor, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
};

interface GrowColumnProps {
  /** 0–1 share of the full column height. */
  fraction: number;
  height: number;
  color: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** A vertical chart column that grows up from the baseline. */
export const GrowColumn: React.FC<GrowColumnProps> = ({ fraction, height, color, delay = 0, style }) => {
  const reduced = useReducedMotion();
  const clamped = Math.max(0.02, Math.min(1, fraction));
  const anim = useRef(new Animated.Value(reduced ? clamped : 0)).current;

  useEffect(() => {
    if (reduced) {
      anim.setValue(clamped);
      return;
    }
    const a = Animated.spring(anim, {
      toValue: clamped,
      delay,
      speed: 8,
      bounciness: 4,
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [clamped]);

  return (
    <View style={[{ height, justifyContent: 'flex-end' }, style]}>
      <Animated.View
        style={{
          height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
          borderRadius: 6,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

interface PulseDotProps {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** A small "live" indicator dot with a soft expanding halo. */
export const PulseDot: React.FC<PulseDotProps> = ({ color = colors.success, size = 8, style }) => {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduced]);

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {!reduced && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
          }}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
};

/** Three bouncing dots — "AI is thinking". */
export const TypingDots: React.FC<{ color?: string; style?: StyleProp<ViewStyle> }> = ({
  color = colors.textMuted,
  style,
}) => {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 18 }, style]}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: color,
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </View>
  );
};

/** Pulsing placeholder block for content that is "loading". */
export const Skeleton: React.FC<{ width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.border },
        { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) },
        style,
      ]}
    />
  );
};
