import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../../constants/theme';
import { ProgressRing } from './ProgressRing';

interface HoldToCallButtonProps {
  /** Fired once the button has been held for `holdMs`. */
  onTrigger: () => void;
  holdMs?: number;
  size?: number;
  label?: string;
  disabled?: boolean;
}

/**
 * Press-and-hold emergency button: a ring fills while held and the action only
 * fires after the full hold, so an accidental tap never raises an SOS.
 * Screen-reader users can trigger it with the standard "activate" action.
 */
export const HoldToCallButton: React.FC<HoldToCallButtonProps> = ({
  onTrigger,
  holdMs = 1500,
  size = 84,
  label = 'SOS',
  disabled = false,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const pressed = useRef(false);
  const fired = useRef(false);
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 1800);
    return () => clearTimeout(t);
  }, [hint]);

  const springScale = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 30, bounciness: toValue === 1 ? 8 : 0 }).start();

  const begin = () => {
    if (disabled) return;
    pressed.current = true;
    fired.current = false;
    setHolding(true);
    setHint(false);
    springScale(0.93);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    progress.stopAnimation((current) => {
      // The value arrives asynchronously for native-driven animations —
      // never start filling if the finger already lifted.
      if (!pressed.current) return;
      running.current = Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(80, holdMs * (1 - current)),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      running.current.start(({ finished }) => {
        if (!finished || !pressed.current) return;
        fired.current = true;
        pressed.current = false;
        setHolding(false);
        springScale(1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        Animated.timing(progress, { toValue: 0, duration: 450, delay: 300, useNativeDriver: true }).start();
        onTrigger();
      });
    });
  };

  const release = () => {
    const wasHolding = pressed.current;
    pressed.current = false;
    setHolding(false);
    springScale(1);
    if (fired.current) return;
    running.current?.stop();
    running.current = null;
    if (wasHolding) setHint(true);
    Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  const inner = size - 18;
  const seconds = (holdMs / 1000).toFixed(holdMs % 1000 ? 1 : 0);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPressIn={begin}
        onPressOut={release}
        disabled={disabled}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS"
        accessibilityHint={`Press and hold for ${seconds} seconds to request emergency help`}
        accessibilityActions={[{ name: 'activate', label: 'Request emergency help' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onTrigger();
        }}
      >
        <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.5 : 1 }}>
          <ProgressRing size={size} thickness={5} color={colors.danger} trackColor={colors.dangerLight} progress={progress}>
            <View style={[styles.core, { width: inner, height: inner, borderRadius: inner / 2 }]}>
              <Ionicons name="call" size={inner * 0.28} color="#FFFFFF" />
              <Text style={styles.coreText}>{label}</Text>
            </View>
          </ProgressRing>
        </Animated.View>
      </Pressable>
      <Text style={[styles.caption, (holding || hint) && styles.captionActive]} numberOfLines={1}>
        {holding ? 'Keep holding…' : hint ? `Hold for ${seconds} s` : `Hold ${seconds} s`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  core: {
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  coreText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.extraBold,
    letterSpacing: 1,
    marginTop: 1,
  },
  caption: {
    marginTop: 6,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  captionActive: {
    color: colors.danger,
  },
});
