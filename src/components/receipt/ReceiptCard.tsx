import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { HOSPITAL_CONFIG } from '../../constants/config';
import { numberToWords } from '../../utils/formatters';

interface ReceiptCardProps {
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

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receiptNo,
  receiptType,
  date,
  time,
  patientName,
  uhid,
  paymentMode,
  amount,
  items,
  doctorName,
  department,
}) => {
  return (
    <View style={styles.card}>
      {/* Hospital Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoPlus}>+</Text>
        </View>
        <Text style={styles.hospitalName}>{HOSPITAL_CONFIG.name}</Text>
        <Text style={styles.hospitalSub}>{HOSPITAL_CONFIG.address}</Text>
        <Text style={styles.hospitalSub}>GSTIN: {HOSPITAL_CONFIG.gstin}</Text>
      </View>

      <View style={styles.dashedDivider} />

      {/* Receipt Type Pill */}
      <View style={styles.titleWrapper}>
        <Text style={styles.receiptTitle}>{receiptType.toUpperCase()}</Text>
      </View>

      {/* Details Table */}
      <View style={styles.detailsGrid}>
        <View style={styles.row}>
          <Text style={styles.label}>Receipt No</Text>
          <Text style={styles.valueBold}>{receiptNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date & Time</Text>
          <Text style={styles.value}>{date} {time ? `• ${time}` : ''}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Patient Name</Text>
          <Text style={styles.valueBold}>{patientName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>UHID</Text>
          <Text style={styles.value}>{uhid}</Text>
        </View>
        {doctorName && (
          <View style={styles.row}>
            <Text style={styles.label}>Doctor</Text>
            <Text style={styles.value}>{doctorName}</Text>
          </View>
        )}
        {department && (
          <View style={styles.row}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{department}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Payment Mode</Text>
          <Text style={styles.value}>{paymentMode}</Text>
        </View>
      </View>

      {/* Line Items if present */}
      {items && items.length > 0 && (
        <View style={styles.itemsTable}>
          <View style={styles.itemHeaderRow}>
            <Text style={[styles.itemHeaderCell, { flex: 3 }]}>Particulars</Text>
            {items.some(i => i.qty) && <Text style={[styles.itemHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>}
            <Text style={[styles.itemHeaderCell, { flex: 2, textAlign: 'right' }]}>Amount</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemDataRow}>
              <Text style={[styles.itemDataText, { flex: 3 }]} numberOfLines={1}>{item.description}</Text>
              {items.some(i => i.qty) && (
                <Text style={[styles.itemDataSub, { flex: 1, textAlign: 'center' }]}>{item.qty ?? 1}</Text>
              )}
              <Text style={[styles.itemDataText, { flex: 2, textAlign: 'right', fontWeight: '600' }]}>
                ₹{item.amount.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Amount Box */}
      <View style={styles.amountBox}>
        <View style={styles.row}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>
        </View>
        <View style={styles.amountWordsRow}>
          <Text style={styles.label}>Amount in Words</Text>
          <Text style={styles.wordsText}>{numberToWords(amount)}</Text>
        </View>
      </View>

      {/* Signatory Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerHospital}>For {HOSPITAL_CONFIG.name}</Text>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureScript}>Dr. Priya M.</Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Authorized Signatory</Text>
        </View>
      </View>

      <Text style={styles.thankYouText}>Thank you for choosing {HOSPITAL_CONFIG.name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  logoPlus: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -2,
  },
  hospitalName: {
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  hospitalSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
  titleWrapper: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  receiptTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    letterSpacing: 1.2,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  detailsGrid: {
    gap: 8,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  value: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  valueBold: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  itemsTable: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  itemHeaderCell: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  itemDataRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  itemDataText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
  },
  itemDataSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  amountBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  amountLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  amountValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  amountWordsRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
  },
  wordsText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  footer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerHospital: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  signatureBox: {
    alignItems: 'center',
    width: 130,
  },
  signatureScript: {
    fontSize: typography.fontSizes.md,
    color: colors.primaryDark,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 2,
  },
  signatureLine: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
  },
  signatureLabel: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 4,
  },
  thankYouText: {
    textAlign: 'center',
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
