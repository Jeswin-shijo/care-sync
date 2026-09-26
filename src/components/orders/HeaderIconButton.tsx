import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import { useBump } from './hooks';

interface HeaderIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  /** Count badge; hidden at 0. Springs when it changes. */
  badge?: number;
  badgeColor?: string;
}

/** Round header action with an optional animated count badge (cart, schedule…). */
export const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({ icon, onPress, accessibilityLabel, badge = 0, badgeColor = colors.primary }) => {
  const bump = useBump(badge, 1.45);
  const iconBump = useBump(badge, 1.12);
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      haptic
      style={styles.button}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${accessibilityLabel}, ${badge}` : accessibilityLabel}
    >
      <Animated.View style={{ transform: [{ scale: iconBump }] }}>
        <Ionicons name={icon} size={21} color={colors.text} />
      </Animated.View>
      {badge > 0 && (
        <Animated.View style={[styles.badge, { backgroundColor: badgeColor, transform: [{ scale: bump }] }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </Animated.View>
      )}
    </PressableScale>
  );
};

/** Wraps several header actions in a row. */
export const HeaderActions: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.row}>{children}</View>;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: typography.fontWeights.bold },
});
