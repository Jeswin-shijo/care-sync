import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Invoice, Patient } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import type { PaymentMode } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { AnimatedNumber } from '../common/Motion';
import { PatientPicker, PatientSelectorBar } from '../common/PatientPicker';
import { formatCurrency } from '../../utils/formatters';
import { BillingChoice, BillingOptions } from './BillingOptions';
import { QtyStepper } from './QtyStepper';
import { SafetyChecklist, SafetyItem, allAcknowledged } from './SafetyChecklist';
import { plural, useMountedRef, usePaymentModes } from './hooks';

interface CartSheetProps {
  visible: boolean;
  onClose: () => void;
  patient: Patient | null;
  onPatientChange: (patient: Patient) => void;
  /** Called after a successful checkout (the sheet closes itself first). */
  onBilled: (invoice: Invoice) => void;
}

/** Pharmacy counter cart: review lines, safety-screen against the patient, choose payment, bill. */
export const CartSheet: React.FC<CartSheetProps> = ({ visible, onClose, patient, onPatientChange, onBilled }) => {
  const { cart, medicines, addToCart, decrementCartItem, removeFromCart, clearCart, checkoutPharmacyCart, checkDrugsForPatient } = useApp();
  const modes = usePaymentModes();
  const mounted = useMountedRef();

  const [mode, setMode] = useState<PaymentMode>(modes[0]);
  const [billing, setBilling] = useState<BillingChoice>('now');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [limitHit, setLimitHit] = useState<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = cart.filter((c) => c.type === 'medicine');
  const units = lines.reduce((n, c) => n + c.qty, 0);
  const total = Math.round(lines.reduce((sum, c) => sum + c.price * c.qty, 0) * 100) / 100;
  const admitted = patient?.status === 'Admitted';

  // Reset transient state each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setShowErrors(false);
      setConfirmClear(false);
      setLimitHit(null);
      setBilling('now');
    }
  }, [visible]);

  useEffect(() => {
    if (!admitted && billing === 'pending') setBilling('now');
  }, [admitted]);

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  const lineKey = lines.map((l) => l.name).join('|');
  const safetyItems: SafetyItem[] = useMemo(() => {
    if (!patient || !lines.length) return [];
    return checkDrugsForPatient(
      patient.id,
      lines.map((l) => l.name)
    ).map((a, i) => ({
      id: `${a.rule}-${i}-${a.title}`,
      severity: a.severity,
      title: a.title,
      detail: a.suggestion ? `${a.detail} ${a.suggestion}` : a.detail,
      source: `Rule ${a.rule} • MediOS safety engine`,
      ackLabel: a.severity === 'critical' ? 'Verified with the prescriber — dispense anyway' : undefined,
    }));
  }, [patient?.id, lineKey]);

  // A new patient or a different cart invalidates earlier acknowledgements.
  useEffect(() => {
    setAcked({});
  }, [patient?.id, lineKey]);

  const stockOf = (id: string) => medicines.find((m) => m.id === id)?.stock ?? 0;

  const increment = (line: (typeof lines)[number]) => {
    const res = addToCart({ id: line.id, type: 'medicine', name: line.name, price: line.price });
    if (!res.ok) {
      setLimitHit(line.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const decrement = (id: string) => {
    setLimitHit((cur) => (cur === id ? null : cur));
    Haptics.selectionAsync().catch(() => {});
    decrementCartItem(id);
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearCart();
    setConfirmClear(false);
  };

  const canBill = !!patient && lines.length > 0 && allAcknowledged(safetyItems, acked);

  const bill = () => {
    if (!patient || !allAcknowledged(safetyItems, acked)) {
      setShowErrors(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      if (!mounted.current) return;
      const invoice = checkoutPharmacyCart(patient.id, mode, billing === 'pending' ? 'Pending' : 'Paid');
      setSubmitting(false);
      if (!invoice) return;
      onClose();
      onBilled(invoice);
    }, 450);
  };

  const footer = lines.length ? (
    <View>
      {showErrors && !patient && <Text style={styles.footerError}>Select the patient you are billing before generating the bill.</Text>}
      {showErrors && patient && !allAcknowledged(safetyItems, acked) && (
        <Text style={styles.footerError}>Acknowledge the critical safety alert above to continue.</Text>
      )}
      <Button
        title={billing === 'pending' ? `Add ${formatCurrency(total, { decimals: 2 })} to IPD bill` : `Bill ${formatCurrency(total, { decimals: 2 })}`}
        onPress={bill}
        loading={submitting}
        size="lg"
        fullWidth
        style={!canBill ? styles.buttonMuted : undefined}
        icon={<Ionicons name={billing === 'pending' ? 'bed-outline' : 'receipt-outline'} size={18} color="#FFFFFF" />}
      />
    </View>
  ) : undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={submitting ? () => {} : onClose}
      dismissible={!submitting}
      title="Review & Bill"
      subtitle={lines.length ? `${plural(lines.length, 'medicine')} • ${plural(units, 'unit')}` : 'Cart is empty'}
      footer={footer}
      maxHeight={0.92}
    >
      {!lines.length ? (
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          description="Add medicines from the list to start a pharmacy bill."
          actionTitle="Browse medicines"
          onActionPress={onClose}
        />
      ) : (
        <View>
          <PatientSelectorBar patient={patient} onPress={() => setPickerVisible(true)} label="Billing to" style={showErrors && !patient ? styles.barError : undefined} />
          {showErrors && !patient && <Text style={styles.fieldError}>Select a patient — bills are never raised to an implicit patient.</Text>}
          {patient && admitted && (
            <View style={styles.admitted}>
              <Ionicons name="bed-outline" size={14} color={colors.purple} />
              <Text style={styles.admittedText}>Admitted • {patient.room ?? 'In-patient'}</Text>
            </View>
          )}

          {safetyItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Safety check</Text>
              <SafetyChecklist items={safetyItems} acked={acked} onToggle={(id) => setAcked((a) => ({ ...a, [id]: !a[id] }))} showErrors={showErrors} />
            </View>
          )}
          {patient && !safetyItems.length && (
            <View style={styles.safeNote}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
              <Text style={styles.safeText}>No allergy or interaction alerts for {patient.name.split(' ')[0]}.</Text>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity onPress={handleClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear cart">
                <Text style={[styles.clear, confirmClear && styles.clearConfirm]}>{confirmClear ? 'Tap again to clear' : 'Clear all'}</Text>
              </TouchableOpacity>
            </View>
            {lines.map((line) => {
              const stock = stockOf(line.id);
              const maxed = line.qty >= stock;
              return (
                <View key={line.id} style={styles.line}>
                  <View style={styles.lineTop}>
                    <Text style={styles.lineName} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFromCart(line.id, true)}
                      hitSlop={12}
                      style={styles.remove}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${line.name} from cart`}
                    >
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.lineBottom}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineMeta}>{formatCurrency(line.price, { decimals: 2 })} each</Text>
                      {(maxed || limitHit === line.id) && <Text style={styles.lineLimit}>Max {stock} in stock</Text>}
                    </View>
                    <QtyStepper
                      qty={line.qty}
                      onIncrement={() => increment(line)}
                      onDecrement={() => decrement(line.id)}
                      maxReached={maxed}
                      label={line.name}
                      trashAtOne
                      compact
                    />
                    <Text style={styles.lineTotal}>{formatCurrency(line.price * line.qty, { decimals: 2 })}</Text>
                  </View>
                </View>
              );
            })}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total payable</Text>
              <AnimatedNumber value={total} duration={450} format={(n) => formatCurrency(n, { decimals: 2 })} style={styles.totalValue} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <BillingOptions patient={patient} billing={billing} onBillingChange={setBilling} mode={mode} onModeChange={setMode} modes={modes} />
          </View>
        </View>
      )}
      {/* Nested so it presents above this sheet on iOS. */}
      <PatientPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(p) => onPatientChange(p)}
        selectedId={patient?.id}
        title="Bill to patient"
        allowRegister={false}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  barError: { borderColor: colors.danger, borderStyle: 'solid' },
  fieldError: { color: colors.danger, fontSize: typography.fontSizes.xs + 1, marginTop: 6 },
  admitted: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  admittedText: { fontSize: typography.fontSizes.xs + 1, color: colors.purple, fontWeight: typography.fontWeights.semiBold },
  safeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
  },
  safeText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.successText, fontWeight: typography.fontWeights.medium },
  clear: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.textSecondary, marginBottom: spacing.sm },
  clearConfirm: { color: colors.danger },
  line: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lineBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  lineName: { flex: 1, fontSize: typography.fontSizes.sm + 0.5, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  lineMeta: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary },
  lineLimit: { fontSize: 10.5, color: colors.warningText, fontWeight: typography.fontWeights.semiBold, marginTop: 2 },
  lineTotal: {
    minWidth: 76,
    textAlign: 'right',
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  remove: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md },
  totalLabel: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  totalValue: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.extraBold, color: colors.primary },
  footerError: { color: colors.danger, fontSize: typography.fontSizes.xs + 1, marginBottom: spacing.sm, textAlign: 'center' },
  buttonMuted: { opacity: 0.75 },
});
