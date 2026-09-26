import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { Invoice } from '../../data/mockData';
import { receiptHeading } from '../../logic/billing';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { HOSPITAL_CONFIG } from '../../constants/config';
import { formatCurrency, numberToWords } from '../../utils/formatters';
import { useReducedMotion } from '../common/Motion';
import { DashedRule, Paper, PaperHeader, PaperHospital, PaperRow, PaperSignature, PaperTitle, Stamp } from '../finance/Paper';
import { invoiceDisplayTime, receiptBreakdown, splitDoctorName } from '../finance/invoiceUtils';

interface ReceiptCardProps {
  invoice: Invoice;
  hospital: PaperHospital;
  /** Consultant on the bill, or "Billing Desk". */
  signatory: string;
  /** Overrides the heading derived from the invoice (template previews). */
  heading?: string;
  room?: string;
  footer?: string;
  /** e.g. "SAMPLE" on template previews. */
  watermark?: string;
  onPatientPress?: () => void;
}

/** Pre-2.0 prop shape (still used by legacy src/screens code). */
interface LegacyReceiptCardProps {
  receiptNo: string;
  receiptType: string;
  date: string;
  time?: string;
  patientName: string;
  uhid: string;
  paymentMode: string;
  amount: number;
  items?: Array<{ description: string; qty?: number; rate?: number; amount: number }>;
  doctorName?: string;
  department?: string;
}

const PAYMENT_MODES: Invoice['paymentMode'][] = ['UPI', 'Cash', 'Card', 'Net Banking'];

const fromLegacy = (p: LegacyReceiptCardProps): ReceiptCardProps => ({
  invoice: {
    id: p.receiptNo,
    invoiceNo: p.receiptNo,
    title: p.receiptType,
    type: 'OPD',
    patientId: '',
    patientName: p.patientName,
    uhid: p.uhid,
    date: p.date,
    time: p.time ?? '',
    amount: p.amount,
    paymentMode: PAYMENT_MODES.find((m) => m === p.paymentMode) ?? 'Cash',
    status: 'Paid',
    doctorName: p.doctorName && p.department ? `${p.doctorName} (${p.department})` : p.doctorName,
    items: p.items,
  },
  heading: p.receiptType,
  hospital: { name: HOSPITAL_CONFIG.name, address: HOSPITAL_CONFIG.address, gstin: HOSPITAL_CONFIG.gstin, phone: HOSPITAL_CONFIG.phone },
  signatory: 'Billing Desk',
});

/**
 * On-screen receipt / bill. Pending invoices render as a bill with "Amount Due"
 * and a DUE stamp — never as a paid receipt. When a bill is collected the
 * stamp re-strikes as PAID.
 */
export const ReceiptCard: React.FC<ReceiptCardProps | LegacyReceiptCardProps> = (props) =>
  'invoice' in props ? <InvoiceReceipt {...props} /> : <InvoiceReceipt {...fromLegacy(props)} />;

const InvoiceReceipt: React.FC<ReceiptCardProps> = ({
  invoice,
  hospital,
  signatory,
  heading,
  room,
  footer,
  watermark,
  onPatientPress,
}) => {
  const reduced = useReducedMotion();
  const paid = invoice.status === 'Paid';
  const title = heading ?? receiptHeading(invoice);
  const isFinalBill = title === 'Final Hospital Bill';
  const b = receiptBreakdown(invoice);
  const doctor = splitDoctorName(invoice.doctorName);
  const time = invoiceDisplayTime(invoice);

  // Stamp: strikes in on mount and again whenever the status changes.
  const stamp = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const lastStatus = useRef<Invoice['status'] | null>(null);
  useEffect(() => {
    const changed = lastStatus.current !== null && lastStatus.current !== invoice.status;
    const first = lastStatus.current === null;
    lastStatus.current = invoice.status;
    if (reduced) {
      stamp.setValue(1);
      return;
    }
    if (!first && !changed) return;
    stamp.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(first ? 280 : 60),
      Animated.timing(stamp, { toValue: 1, duration: 360, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [invoice.status, reduced]);

  const stampStyle = {
    opacity: stamp.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { rotate: '-12deg' },
      { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
    ],
  };

  const paidAmount = paid ? invoice.amount : 0;

  return (
    <Paper watermark={watermark}>
      <PaperHeader hospital={hospital} />
      <DashedRule />

      <PaperTitle
        title={title}
        right={
          <Animated.View style={stampStyle} accessibilityLabel={paid ? 'Paid' : 'Payment due'}>
            <Stamp label={paid ? 'PAID' : 'DUE'} color={paid ? colors.success : colors.danger} />
          </Animated.View>
        }
      />

      <View style={styles.meta}>
        <PaperRow label={paid ? 'Receipt No' : 'Bill No'} value={invoice.invoiceNo} bold />
        <PaperRow label="Date & Time" value={`${invoice.date}${time ? ` • ${time}` : ''}`} />
        <PaperRow label="Patient Name" value={invoice.patientName} bold onPress={onPatientPress} />
        <PaperRow label="UHID" value={invoice.uhid} />
        {!!doctor && <PaperRow label="Consultant" value={doctor.name} />}
        {!!doctor?.department && <PaperRow label="Department" value={doctor.department} />}
        {!!room && <PaperRow label="Room / Bed" value={room} />}
        {paid ? (
          <PaperRow label="Payment Mode" value={invoice.paymentMode} />
        ) : (
          <PaperRow label="Status" value="Payment pending" valueStyle={{ color: colors.warningText, fontWeight: '700' }} />
        )}
      </View>

      <View style={styles.table}>
        <View style={styles.thead}>
          <Text style={[styles.th, styles.colDesc]}>Particulars</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colRate]}>Rate</Text>
          <Text style={[styles.th, styles.colAmt]}>Amount</Text>
        </View>
        {b.charges.map((c, i) => (
          <View key={`${c.description}-${i}`} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
            <Text style={[styles.td, styles.colDesc]}>{c.description}</Text>
            <Text style={[styles.tdMuted, styles.colQty]}>{c.qty}</Text>
            <Text style={[styles.tdMuted, styles.colRate]}>{formatCurrency(c.rate)}</Text>
            <Text style={[styles.td, styles.colAmt, styles.bold]}>{formatCurrency(c.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{isFinalBill ? 'Total Amount' : 'Total'}</Text>
          <Text style={styles.totalValue}>{formatCurrency(b.gross)}</Text>
        </View>
        {b.deductions.map((d, i) => {
          const green = d.kind === 'insurance';
          return (
            <View key={`ded-${i}`} style={styles.subRow}>
              <Text style={[styles.subLabel, green && styles.green]}>{d.description}</Text>
              <Text style={[styles.subValue, green && styles.green]}>
                {d.amount >= 0 ? `− ${formatCurrency(d.amount)}` : `+ ${formatCurrency(-d.amount)}`}
              </Text>
            </View>
          );
        })}
        {isFinalBill && (
          <>
            <View style={styles.subRow}>
              <Text style={styles.subLabel}>Paid</Text>
              <Text style={styles.subValue}>{formatCurrency(paidAmount)}</Text>
            </View>
            <View style={styles.subRow}>
              <Text style={[styles.subLabel, styles.bold]}>Balance</Text>
              <Text style={[styles.subValue, styles.bold, invoice.amount - paidAmount > 0 && { color: colors.danger }]}>
                {formatCurrency(invoice.amount - paidAmount)}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={[styles.amountBox, !paid && styles.amountBoxDue]}>
        <View style={styles.amountRow}>
          <Text style={[styles.amountLabel, !paid && { color: colors.dangerText }]}>{paid ? 'Amount Paid' : 'Amount Due'}</Text>
          <Text style={[styles.amountValue, !paid && { color: colors.danger }]}>{formatCurrency(invoice.amount, { decimals: 2 })}</Text>
        </View>
        <Text style={styles.wordsLabel}>Amount in Words</Text>
        <Text style={styles.words}>{numberToWords(invoice.amount)}</Text>
        {b.insurance > 0 && (
          <Text style={styles.insuranceNote}>
            Insurance approved {formatCurrency(b.insurance)} • patient share {formatCurrency(invoice.amount)}
          </Text>
        )}
      </View>

      <PaperSignature
        hospitalName={hospital.name}
        signatory={signatory}
        footer={`${footer ?? `Thank you for choosing ${hospital.name}`} • Computer-generated ${paid ? 'receipt' : 'bill'}`}
      />
    </Paper>
  );
};

const styles = StyleSheet.create({
  meta: {
    marginBottom: spacing.sm,
  },
  table: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  thead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  th: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  trAlt: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  td: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    lineHeight: 16,
  },
  tdMuted: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  colDesc: {
    flex: 1,
    paddingRight: 6,
  },
  colQty: {
    width: 30,
    textAlign: 'center',
  },
  colRate: {
    width: 64,
    textAlign: 'right',
  },
  colAmt: {
    width: 72,
    textAlign: 'right',
  },
  bold: {
    fontWeight: typography.fontWeights.bold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 7,
    paddingBottom: 5,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 4,
  },
  subLabel: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
  },
  subValue: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
  },
  green: {
    color: colors.success,
  },
  amountBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  amountBoxDue: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger + '30',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  amountLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  amountValue: {
    fontSize: typography.fontSizes.lg + 1,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
  },
  wordsLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  words: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 16,
  },
  insuranceNote: {
    fontSize: typography.fontSizes.xs,
    color: colors.success,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: spacing.sm,
  },
});
