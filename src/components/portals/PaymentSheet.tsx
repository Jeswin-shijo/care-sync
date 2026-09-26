import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { Invoice } from '../../data/mockData';
import type { PaymentMode } from '../../context/AppContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';

const APP_MODES: Array<{ mode: PaymentMode; icon: keyof typeof Ionicons.glyphMap; sub: string }> = [
  { mode: 'UPI', icon: 'phone-portrait-outline', sub: 'GPay, PhonePe, Paytm' },
  { mode: 'Card', icon: 'card-outline', sub: 'Debit / credit card' },
  { mode: 'Net Banking', icon: 'business-outline', sub: 'All major banks' },
];

interface PaymentSheetProps {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
}

/** In-app bill payment for the patient (simulated gateway, then marks the invoice paid). */
export const PaymentSheet: React.FC<PaymentSheetProps> = ({ visible, invoice, onClose }) => {
  const { markInvoicePaid, settings } = useApp();
  const { showToast } = useToast();
  const modes = APP_MODES.filter((m) => settings.paymentModes[m.mode]);
  const [mode, setMode] = useState<PaymentMode>(modes[0]?.mode ?? 'UPI');
  const [processing, setProcessing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setProcessing(false);
      if (!modes.some((m) => m.mode === mode) && modes[0]) setMode(modes[0].mode);
    }
  }, [visible]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const pay = () => {
    if (!invoice || processing) return;
    setProcessing(true);
    // Simulated gateway round-trip.
    timer.current = setTimeout(() => {
      const paid = markInvoicePaid(invoice.id, mode);
      setProcessing(false);
      onClose();
      if (!paid) {
        showToast({ type: 'danger', title: 'Payment failed', message: 'This bill could not be found. Please refresh and try again.' });
        return;
      }
      showToast({
        type: 'success',
        title: 'Payment successful',
        message: `${formatCurrency(paid.amount)} paid for ${paid.invoiceNo} via ${mode}.`,
        action: { label: 'Receipt', onPress: () => router.push({ pathname: '/receipt/[id]', params: { id: paid.id } }) },
        duration: 4200,
      });
    }, 900);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => !processing && onClose()}
      title="Pay bill"
      subtitle={invoice ? `${invoice.invoiceNo} • ${invoice.title}` : undefined}
      footer={
        <Button
          title={invoice ? `Pay ${formatCurrency(invoice.amount)}` : 'Pay'}
          onPress={pay}
          loading={processing}
          disabled={processing || !invoice || !modes.length}
          fullWidth
          icon={<Ionicons name="lock-closed" size={16} color="#FFFFFF" />}
        />
      }
    >
      {invoice && (
        <>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Amount due</Text>
            <Text style={styles.amount}>{formatCurrency(invoice.amount)}</Text>
            <Text style={styles.amountMeta}>
              {invoice.patientName} • {invoice.date}
            </Text>
          </View>
          {!!invoice.items?.length && (
            <View style={styles.items}>
              {invoice.items.map((it, i) => (
                <View key={`${it.description}-${i}`} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.description}
                  </Text>
                  <Text style={[styles.itemAmt, it.amount < 0 && { color: colors.success }]}>{formatCurrency(it.amount)}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.label}>Pay with</Text>
          {modes.map((m) => {
            const selected = m.mode === mode;
            return (
              <TouchableOpacity
                key={m.mode}
                style={[styles.mode, selected && styles.modeSelected]}
                onPress={() => {
                  setMode(m.mode);
                  Haptics.selectionAsync().catch(() => {});
                }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Pay with ${m.mode}`}
              >
                <View style={[styles.modeIcon, selected && { backgroundColor: colors.primary }]}>
                  <Ionicons name={m.icon} size={18} color={selected ? '#FFFFFF' : colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.modeName}>{m.mode}</Text>
                  <Text style={styles.modeSub}>{m.sub}</Text>
                </View>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            );
          })}
          {!modes.length && <Text style={styles.muted}>Online payment is currently disabled. Please pay at the billing counter.</Text>}
          <View style={styles.secure}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
            <Text style={styles.secureText}>Secure payment • receipt is generated instantly</Text>
          </View>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  amountBox: {
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
  },
  amountLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primaryDark,
    marginTop: 2,
  },
  amountMeta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  items: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 6,
  },
  itemName: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  itemAmt: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  modeSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  modeSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  muted: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  secureText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
});
