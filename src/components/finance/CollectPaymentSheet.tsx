import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentMode } from '../../logic/hospital';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency, numberToWords } from '../../utils/formatters';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { PaymentModePicker } from './PaymentModePicker';

interface CollectPaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  invoiceNo: string;
  patientName: string;
  modes: PaymentMode[];
  defaultMode?: PaymentMode;
  onConfirm: (mode: PaymentMode) => void;
  /** Opens Settings → Billing when no payment mode is enabled. */
  onOpenSettings: () => void;
}

/** Choose how a pending bill is being paid, then collect it. */
export const CollectPaymentSheet: React.FC<CollectPaymentSheetProps> = ({
  visible,
  onClose,
  amount,
  invoiceNo,
  patientName,
  modes,
  defaultMode,
  onConfirm,
  onOpenSettings,
}) => {
  const pick = () => (defaultMode && modes.includes(defaultMode) ? defaultMode : modes[0] ?? null);
  const [mode, setMode] = useState<PaymentMode | null>(pick);

  useEffect(() => {
    if (visible) setMode(pick());
  }, [visible, defaultMode, modes.join('|')]);

  const noModes = modes.length === 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Collect Payment"
      subtitle={`${invoiceNo} • ${patientName}`}
      footer={
        noModes ? (
          <Button title="Open Billing Settings" onPress={onOpenSettings} fullWidth size="lg" variant="outline" />
        ) : (
          <Button
            title={`Collect ${formatCurrency(amount)}${mode ? ` via ${mode}` : ''}`}
            onPress={() => mode && onConfirm(mode)}
            disabled={!mode}
            fullWidth
            size="lg"
            icon={<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />}
          />
        )
      }
    >
      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Amount due</Text>
        <Text style={styles.amount}>{formatCurrency(amount, { decimals: 2 })}</Text>
        <Text style={styles.words}>{numberToWords(amount)}</Text>
      </View>
      {noModes ? (
        <View style={styles.warn}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.warningText} />
          <Text style={styles.warnText}>
            No payment modes are enabled. Turn on UPI, Cash, Card or Net Banking in Settings → Billing to collect this bill.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.section}>Payment mode</Text>
          <PaymentModePicker modes={modes} value={mode} onChange={setMode} />
          <Text style={styles.hint}>The receipt is issued immediately and the bill moves to today's collection.</Text>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  amountBox: {
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.base,
  },
  amountLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.warningText,
    fontWeight: typography.fontWeights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amount: {
    fontSize: 28,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    marginTop: 2,
  },
  words: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  warn: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warnText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.warningText,
    lineHeight: 19,
  },
});
