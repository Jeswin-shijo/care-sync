import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useReducedMotion } from '../common/Motion';

interface ExitCollapseProps {
  /** Start the exit: show the overlay, then collapse the row to zero height. */
  exiting: boolean;
  /** Called once the row has fully collapsed — remove it from the list here. */
  onExited: () => void;
  /** Shown over the row while it exits (e.g. a "Dispensed ✓" stamp). */
  overlay?: React.ReactNode;
  /** Space below the row; it collapses together with the row. */
  spacing?: number;
  /** How long the overlay stays before collapsing (ms). */
  hold?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * List-row wrapper that animates an item out when it leaves the current
 * filter (dispensed, completed, moved on) instead of letting it vanish.
 * Height/opacity run on the JS driver on the outer view; the overlay runs
 * on the native driver on its own view, so the two never share a node.
 */
export const ExitCollapse: React.FC<ExitCollapseProps> = ({
  exiting,
  onExited,
  overlay,
  spacing = 0,
  hold = 650,
  children,
  style,
}) => {
  const reduced = useReducedMotion();
  const measured = useRef(0);
  const height = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const stamp = useRef(new Animated.Value(0)).current;
  const [collapsing, setCollapsing] = useState(false);
  const exitedRef = useRef(onExited);
  exitedRef.current = onExited;

  useEffect(() => {
    if (!exiting) {
      if (collapsing) {
        setCollapsing(false);
        fade.setValue(1);
      }
      stamp.setValue(0);
      return;
    }
    let cancelled = false;
    if (reduced) {
      stamp.setValue(1);
      const t = setTimeout(() => !cancelled && exitedRef.current(), hold);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    Animated.spring(stamp, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 9 }).start();
    const t = setTimeout(() => {
      if (cancelled) return;
      height.setValue(measured.current);
      fade.setValue(1);
      setCollapsing(true);
      Animated.parallel([
        Animated.timing(height, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: false }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) exitedRef.current();
      });
    }, hold);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [exiting]);

  return (
    <Animated.View
      style={[style, collapsing && { height, opacity: fade, overflow: 'hidden' }]}
      onLayout={(e) => {
        if (!collapsing) measured.current = e.nativeEvent.layout.height;
      }}
    >
      <View style={{ paddingBottom: spacing }}>
        {children}
        {exiting && overlay ? (
          // Absorbs taps so the exiting row's buttons can't be pressed twice.
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { bottom: spacing },
              {
                opacity: stamp,
                transform: [{ scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
              },
            ]}
          >
            {overlay}
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
};
