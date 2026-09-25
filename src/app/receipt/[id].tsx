import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { ReceiptCard } from '../../components/receipt/ReceiptCard';
import { Button } from '../../components/common/Button';
import { printOrShareReceipt } from '../../utils/pdfGenerator';

export default function ReceiptDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices } = useApp();

  const invoice = invoices.find((inv) => inv.id === id) || invoices[0];

  const receiptData = {
    receiptNo: invoice.invoiceNo,
    receiptType: invoice.title,
    date: invoice.date,
    time: invoice.time || '10:05 AM',
    patientName: invoice.patientName,
    uhid: invoice.uhid,
    paymentMode: invoice.paymentMode,
    amount: invoice.amount,
    doctorName: invoice.doctorName,
    items: invoice.items || [{ description: invoice.title, qty: 1, amount: invoice.amount }],
  };

  const handleDownloadPdf = () => {
    printOrShareReceipt(receiptData, 'download');
  };

  const handleShare = () => {
    printOrShareReceipt(receiptData, 'share');
  };

  const handlePrint = () => {
    printOrShareReceipt(receiptData, 'print');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Receipt / Invoice"
        showBack
        rightAction={
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ReceiptCard
          receiptNo={receiptData.receiptNo}
          receiptType={receiptData.receiptType}
          date={receiptData.date}
          time={receiptData.time}
          patientName={receiptData.patientName}
          uhid={receiptData.uhid}
          paymentMode={receiptData.paymentMode}
          amount={receiptData.amount}
          doctorName={receiptData.doctorName}
          items={receiptData.items}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Button
            title="Download PDF"
            onPress={handleDownloadPdf}
            icon={<Ionicons name="download-outline" size={20} color="#FFFFFF" />}
            fullWidth
            size="lg"
            style={styles.downloadBtn}
          />

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handlePrint}
              activeOpacity={0.7}
            >
              <Ionicons name="print-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  actionButtonsContainer: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  downloadBtn: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});
