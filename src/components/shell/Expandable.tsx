import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { FadeInView, PressableScale, useReducedMotion } from '../common/Motion';

interface ExpandableProps {
  header: React.ReactNode;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/** Card whose body slides open under its header; the chevron turns with it. */
export const Expandable: React.FC<ExpandableProps> = ({ header, children, expanded, onToggle, accessibilityLabel, style }) => {
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      turn.setValue(expanded ? 1 : 0);
      return;
    }
    Animated.timing(turn, { toValue: expanded ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [expanded, reduced]);

  return (
    <View style={[styles.card, expanded && styles.cardOpen, style]}>
      <PressableScale
        onPress={onToggle}
        scaleTo={0.99}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.headerContent}>{header}</View>
        <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={18} color={expanded ? colors.primary : colors.textMuted} />
        </Animated.View>
      </PressableScale>
      {expanded && (
        <FadeInView offset={-8} duration={260} style={styles.body}>
          {children}
        </FadeInView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardOpen: {
    borderColor: '#CFE0FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 56,
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
