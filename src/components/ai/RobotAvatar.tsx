import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';

interface RobotAvatarProps {
  size?: number;
  /** Gentle float + blink. Off automatically with reduced motion. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The friendly MediOS assistant mascot from the design, drawn with plain Views. */
export const RobotAvatar: React.FC<RobotAvatarProps> = ({ size = 84, animated = true, style }) => {
  const reduced = useReducedMotion();
  const live = animated && !reduced;
  const float = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!live) {
      float.setValue(0);
      blink.setValue(1);
      return;
    }
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2800),
        Animated.timing(blink, { toValue: 0.15, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    blinkLoop.start();
    return () => {
      floatLoop.stop();
      blinkLoop.stop();
    };
  }, [live]);

  const head = size * 0.58;
  const eye = Math.max(4, size * 0.075);

  return (
    <View style={[{ width: size, height: size }, styles.halo, { borderRadius: size / 2 }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={{
          alignItems: 'center',
          transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] }) }],
        }}
      >
        {/* Antenna */}
        <View style={[styles.antennaDot, { width: size * 0.09, height: size * 0.09, borderRadius: size * 0.045 }]} />
        <View style={[styles.antennaStick, { height: size * 0.07 }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.ear, { width: size * 0.07, height: size * 0.16, borderRadius: size * 0.03 }]} />
          <View style={[styles.head, { width: head, height: head * 0.82, borderRadius: head * 0.3 }]}>
            <LinearGradient
              colors={['#1E3A8A', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.visor, { borderRadius: head * 0.22, width: head * 0.8, height: head * 0.5 }]}
            >
              <Animated.View style={[styles.eye, { width: eye, height: eye * 1.5, borderRadius: eye / 2, transform: [{ scaleY: blink }] }]} />
              <Animated.View style={[styles.eye, { width: eye, height: eye * 1.5, borderRadius: eye / 2, transform: [{ scaleY: blink }] }]} />
            </LinearGradient>
          </View>
          <View style={[styles.ear, { width: size * 0.07, height: size * 0.16, borderRadius: size * 0.03 }]} />
        </View>
      </Animated.View>
      <View style={[styles.spark, { right: size * 0.1, top: size * 0.12 }]}>
        <Ionicons name="sparkles" size={Math.max(10, size * 0.16)} color={colors.primary} />
      </View>
    </View>
  );
};

/** Small circular assistant badge used beside chat bubbles. */
export const AssistantBadge: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }> = ({ size = 28, style }) => (
  <LinearGradient
    colors={['#3B82F6', colors.primaryDark]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
  >
    <Ionicons name="sparkles" size={size * 0.5} color="#FFFFFF" />
  </LinearGradient>
);

const styles = StyleSheet.create({
  halo: {
    backgroundColor: '#EAF2FF',
    borderWidth: 2,
    borderColor: '#D6E6FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  antennaDot: {
    backgroundColor: colors.primary,
  },
  antennaStick: {
    width: 2,
    backgroundColor: '#93C5FD',
  },
  head: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ear: {
    backgroundColor: '#60A5FA',
  },
  visor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  eye: {
    backgroundColor: '#A5F3FC',
  },
  spark: {
    position: 'absolute',
  },
});
