import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Patient } from '../../data/mockData';
import type { PaymentMode } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import { ChoiceChips } from './ChoiceChips';
import { PAYMENT_MODE_ICON } from './hooks';

export type BillingChoice = 'now' | 'pending';

interface BillingOptionsProps {
  patient: Patient | null | undefined;
  billing: BillingChoice;
  onBillingChange: (b: BillingChoice) => void;
  mode: PaymentMode;
  onModeChange: (m: PaymentMode) => void;
  modes: PaymentMode[];
}

/**
 * Payment section for orders: collect now (choose a mode) — or, for admitted
 * patients, post the charge to the running IPD bill as Pending.
 */
export const BillingOptions: React.FC<BillingOptionsProps> = ({ patient, billing, onBillingChange, mode, onModeChange, modes }) => {
  const admitted = patient?.status === 'Admitted';
  return (
    <View>
      {admitted && (
        <View style={styles.options}>
          <Option
            active={billing === 'now'}
            icon="wallet-outline"
            title="Collect payment now"
            subtitle="UPI, cash or card at the counter"
            onPress={() => onBillingChange('now')}
          />
          <Option
            active={billing === 'pending'}
            icon="bed-outline"
            title="Add to IPD bill"
            subtitle={`Pending • settle at discharge${patient?.room ? ` (${patient.room})` : ''}`}
            onPress={() => onBillingChange('pending')}
          />
        </View>
      )}
      {billing === 'now' || !admitted ? (
        <ChoiceChips
          options={modes.map((m) => ({ value: m, label: m, icon: PAYMENT_MODE_ICON[m] }))}
          value={mode}
          onChange={onModeChange}
          accessibilityLabel="Payment mode"
        />
      ) : (
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warningText} />
          <Text style={styles.noteText}>Posted to the IPD account as Pending — collect from Billing or at discharge.</Text>
        </View>
      )}
    </View>
  );
};

const Option: React.FC<{ active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }> = ({
  active,
  icon,
  title,
  subtitle,
  onPress,
}) => (
  <PressableScale
    scaleTo={0.97}
    onPress={() => {
      if (active) return;
      Haptics.selectionAsync().catch(() => {});
      onPress();
    }}
    style={[styles.option, active && styles.optionActive]}
    accessibilityRole="radio"
    accessibilityState={{ selected: active }}
    accessibilityLabel={`${title}. ${subtitle}`}
  >
    <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
    <Ionicons name={icon} size={18} color={active ? colors.primary : colors.textSecondary} />
    <View style={{ flex: 1 }}>
      <Text style={[styles.optionTitle, active && { color: colors.primary }]}>{title}</Text>
      <Text style={styles.optionSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
  </PressableScale>
);

const styles = StyleSheet.create({
  options: { gap: spacing.sm, marginBottom: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionTitle: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  optionSubtitle: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary, marginTop: 1 },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
  },
  noteText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.warningText, lineHeight: 17 },
});
