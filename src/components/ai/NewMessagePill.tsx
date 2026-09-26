import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';

interface NewMessagePillProps {
  visible: boolean;
  onPress: () => void;
  label?: string;
  bottom?: number;
}

/** Floating "↓ New message" pill shown when an answer lands while the user is scrolled up. */
export const NewMessagePill: React.FC<NewMessagePillProps> = ({ visible, onPress, label = 'New message', bottom = spacing.sm }) => {
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.wrap,
        {
          bottom,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        },
      ]}
    >
      <Pressable onPress={onPress} style={styles.pill} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${label}. Scroll to latest`}>
        <Ionicons name="arrow-down" size={14} color="#FFFFFF" />
        <Text style={styles.text}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
});
