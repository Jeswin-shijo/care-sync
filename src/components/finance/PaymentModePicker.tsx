import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentMode } from '../../logic/hospital';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import { PAYMENT_MODE_META } from './invoiceUtils';

interface PaymentModePickerProps {
  /** Only the modes enabled in Settings → Billing. */
  modes: PaymentMode[];
  value: PaymentMode | null;
  onChange: (mode: PaymentMode) => void;
  style?: StyleProp<ViewStyle>;
}

/** Two-column grid of payment modes with icons. */
export const PaymentModePicker: React.FC<PaymentModePickerProps> = ({ modes, value, onChange, style }) => (
  <View style={[styles.grid, style]} accessibilityRole="radiogroup">
    {modes.map((mode) => {
      const meta = PAYMENT_MODE_META[mode];
      const selected = value === mode;
      return (
        <PressableScale
          key={mode}
          haptic
          onPress={() => onChange(mode)}
          style={[styles.tile, selected && { borderColor: meta.color, backgroundColor: meta.color + '12' }]}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          accessibilityLabel={`Pay by ${mode}`}
        >
          <View style={[styles.icon, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <Text style={[styles.label, selected && { color: colors.text }]} numberOfLines={1}>
            {mode}
          </Text>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={selected ? meta.color : colors.border}
          />
        </PressableScale>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
});
