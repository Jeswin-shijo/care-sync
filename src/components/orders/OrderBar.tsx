import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';
import { BottomActionBar } from '../common/BottomActionBar';
import { Button } from '../common/Button';
import { AnimatedNumber, useReducedMotion } from '../common/Motion';
import { formatCurrency } from '../../utils/formatters';

interface OrderBarProps {
  /** Slides the bar away when false (empty cart, keyboard open). */
  visible: boolean;
  caption: string;
  total: number;
  decimals?: number;
  cta: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Sticky order summary: "3 tests • ₹1,600  [Book 3 Tests]". */
export const OrderBar: React.FC<OrderBarProps> = ({ visible, caption, total, decimals = 0, cta, onPress, disabled, icon }) => {
  const reduced = useReducedMotion();
  const shown = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      shown.setValue(visible ? 1 : 0);
      return;
    }
    const anim = Animated.spring(shown, { toValue: visible ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: visible ? 6 : 0 });
    anim.start();
    return () => anim.stop();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.wrap,
        {
          opacity: shown.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) }],
        },
      ]}
    >
      <BottomActionBar style={styles.bar}>
        <View style={styles.row}>
          <View style={styles.summary}>
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
            <AnimatedNumber value={total} duration={450} format={(n) => formatCurrency(n, { decimals })} style={styles.total} />
          </View>
          <Button
            title={cta}
            onPress={onPress}
            disabled={disabled}
            size="lg"
            style={styles.button}
            icon={icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : undefined}
          />
        </View>
      </BottomActionBar>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summary: { flex: 1, minWidth: 0 },
  caption: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, fontWeight: typography.fontWeights.medium },
  total: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.extraBold, color: colors.text, marginTop: 1 },
  button: { flexShrink: 0, paddingHorizontal: 20, minWidth: 150 },
});
