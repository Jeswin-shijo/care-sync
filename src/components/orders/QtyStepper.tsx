import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';
import { useBump } from './hooks';

interface QtyStepperProps {
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** + is disabled (e.g. all available stock is already in the cart). */
  maxReached?: boolean;
  label: string;
  /** Show a trash icon on − when qty is 1 (the next tap removes the line). */
  trashAtOne?: boolean;
  compact?: boolean;
}

/** − qty + control. */
export const QtyStepper: React.FC<QtyStepperProps> = ({ qty, onIncrement, onDecrement, maxReached, label, trashAtOne, compact }) => {
  const bump = useBump(qty, 1.25);
  const size = compact ? 32 : 36;
  return (
    <View style={[styles.stepper, { height: size }]}>
      <TouchableOpacity
        onPress={onDecrement}
        style={[styles.stepBtn, { width: size, height: size }]}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 2 }}
        accessibilityRole="button"
        accessibilityLabel={qty <= 1 && trashAtOne ? `Remove ${label}` : `Decrease ${label}`}
      >
        <Ionicons name={qty <= 1 && trashAtOne ? 'trash-outline' : 'remove'} size={16} color="#FFFFFF" />
      </TouchableOpacity>
      <Animated.Text style={[styles.qty, { transform: [{ scale: bump }] }]} accessibilityLabel={`${qty} in cart`}>
        {qty}
      </Animated.Text>
      <TouchableOpacity
        onPress={onIncrement}
        disabled={maxReached}
        style={[styles.stepBtn, { width: size, height: size }, maxReached && styles.stepBtnDisabled]}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 4 }}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!maxReached }}
        accessibilityLabel={`Increase ${label}`}
      >
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

interface AddStepperProps extends Omit<QtyStepperProps, 'trashAtOne'> {
  onAdd: () => void;
  /** When set the item can't be added and this reason is shown instead ("Out of stock"). */
  blockedReason?: string;
}

/** "Add" pill that morphs into a − qty + stepper once the item is in the cart. */
export const AddStepper: React.FC<AddStepperProps> = ({ qty, onAdd, onIncrement, onDecrement, maxReached, label, blockedReason }) => {
  const reduced = useReducedMotion();
  const inCart = qty > 0;
  const morph = useRef(new Animated.Value(inCart ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      morph.setValue(inCart ? 1 : 0);
      return;
    }
    const anim = Animated.spring(morph, { toValue: inCart ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 8 });
    anim.start();
    return () => anim.stop();
  }, [inCart]);

  if (blockedReason && !inCart) {
    return (
      <View style={styles.blocked} accessibilityLabel={`${label}: ${blockedReason}`}>
        <Ionicons name="ban-outline" size={13} color={colors.textMuted} />
        <Text style={styles.blockedText} numberOfLines={1}>
          {blockedReason}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.morphBox}>
      <Animated.View
        pointerEvents={inCart ? 'none' : 'auto'}
        style={[
          StyleSheet.absoluteFill,
          styles.center,
          {
            opacity: morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ scale: morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.addBtn}
          onPress={onAdd}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        pointerEvents={inCart ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFill,
          styles.center,
          {
            opacity: morph,
            transform: [{ scale: morph.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          },
        ]}
      >
        <QtyStepper qty={qty} onIncrement={onIncrement} onDecrement={onDecrement} maxReached={maxReached} label={label} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  stepBtn: { alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.35 },
  qty: {
    minWidth: 26,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
  },
  morphBox: { width: 104, height: 38 },
  center: { alignItems: 'flex-end', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  addText: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.primary },
  blocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    maxWidth: 120,
  },
  blockedText: { fontSize: 11.5, fontWeight: typography.fontWeights.semiBold, color: colors.textMuted, flexShrink: 1 },
});
