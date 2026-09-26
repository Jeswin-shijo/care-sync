import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../../constants/theme';

interface QtyStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

/** − qty + control with 44pt touch targets. */
export const QtyStepper: React.FC<QtyStepperProps> = ({ value, onChange, min = 1, max, label = 'quantity' }) => {
  const canDec = value > min;
  const canInc = typeof max !== 'number' || value < max;
  const step = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(value + delta);
  };
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ now: value, min, max }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && canInc) onChange(value + 1);
        if (e.nativeEvent.actionName === 'decrement' && canDec) onChange(value - 1);
      }}
    >
      <TouchableOpacity
        style={[styles.btn, !canDec && styles.btnOff]}
        disabled={!canDec}
        onPress={() => step(-1)}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 2 }}
        accessibilityLabel={`Decrease ${label}`}
      >
        <Ionicons name="remove" size={16} color={canDec ? colors.primary : colors.textMuted} />
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity
        style={[styles.btn, !canInc && styles.btnOff]}
        disabled={!canInc}
        onPress={() => step(1)}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 4 }}
        accessibilityLabel={`Increase ${label}`}
      >
        <Ionicons name="add" size={16} color={canInc ? colors.primary : colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOff: {
    backgroundColor: colors.cardMuted,
  },
  value: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
});
