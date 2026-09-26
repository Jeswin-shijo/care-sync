import React, { useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type { PaymentMode } from '../../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { FadeInView } from '../../components/common/Motion';
import { ReceiptCard } from '../../components/receipt/ReceiptCard';
import { ActionMenuSheet } from '../../components/finance/ActionMenuSheet';
import { CollectPaymentSheet } from '../../components/finance/CollectPaymentSheet';
import { ExportActions } from '../../components/finance/ExportActions';
import { SendToPatientRow, SendToPatientSheet } from '../../components/finance/SendToPatientSheet';
import { openBillingTab } from '../../components/finance/financeNavigation';
import {
  INVOICE_TYPE_META,
  enabledPaymentModes,
  invoiceDisplayTime,
  receiptPrintData,
  receiptShareText,
  roomForInvoice,
  signatoryFor,
} from '../../components/finance/invoiceUtils';
import { printOrShareReceipt, type ExportAction } from '../../utils/pdfGenerator';
import { formatCurrency } from '../../utils/formatters';

export default function ReceiptDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices, doctors, hospitalProfile, settings, getPatient, markInvoicePaid } = useApp();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [collectOpen, setCollectOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Never fall back to another patient's receipt.
  const invoice = invoices.find((inv) => inv.id === id);

  if (!invoice) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="Receipt / Invoice" showBack />
        <EmptyState
          icon="receipt-outline"
          title="Receipt not found"
          description="This invoice doesn't exist or the link is out of date. Search for it in Billing & Invoices."
          actionTitle="Go to Billing"
          onActionPress={() => openBillingTab()}
          style={styles.empty}
        />
      </SafeAreaView>
    );
  }

  const patient = getPatient(invoice.patientId);
  const pending = invoice.status === 'Pending';
  const meta = INVOICE_TYPE_META[invoice.type];
  const modes = enabledPaymentModes(settings.paymentModes);
  const printData = receiptPrintData(invoice, { hospital: hospitalProfile, doctors, patient, footer: settings.receiptFooter });

  const exportReceipt = (action: ExportAction) => printOrShareReceipt(printData, action);

  const collect = (mode: PaymentMode) => {
    setCollectOpen(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = markInvoicePaid(invoice.id, mode);
    if (updated?.status === 'Paid') {
      showToast({
        type: 'success',
        title: 'Payment collected',
        message: `${formatCurrency(updated.amount)} via ${mode} • ${updated.invoiceNo}`,
        action: { label: 'Send', onPress: () => setSendOpen(true) },
      });
    } else {
      showToast({ type: 'danger', title: 'Could not collect', message: 'This bill no longer exists.' });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Receipt / Invoice"
        subtitle={`${meta.label} • ${invoice.invoiceNo}`}
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="More receipt actions"
            hitSlop={6}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {pending && (
          <FadeInView style={styles.dueBanner}>
            <View style={styles.dueTop}>
              <View style={styles.dueIcon}>
                <Ionicons name="time-outline" size={20} color={colors.warningText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dueTitle}>Payment pending</Text>
                <Text style={styles.dueSub} numberOfLines={2}>
                  Raised {invoice.date} at {invoiceDisplayTime(invoice)} • {invoice.patientName}
                </Text>
              </View>
              <Text style={styles.dueAmount}>{formatCurrency(invoice.amount)}</Text>
            </View>
            <Button
              title="Collect Payment"
              onPress={() => setCollectOpen(true)}
              fullWidth
              size="lg"
              icon={<Ionicons name="wallet-outline" size={20} color="#FFFFFF" />}
            />
          </FadeInView>
        )}

        <FadeInView delay={pending ? 80 : 0}>
          <ReceiptCard
            invoice={invoice}
            hospital={hospitalProfile}
            signatory={signatoryFor(invoice, doctors)}
            room={roomForInvoice(invoice, patient)}
            footer={settings.receiptFooter}
            onPatientPress={patient ? () => router.push({ pathname: '/patient/[id]', params: { id: patient.id } }) : undefined}
          />
        </FadeInView>

        <FadeInView delay={160} style={styles.actions}>
          <ExportActions
            onExport={exportReceipt}
            secondaryDownload={pending}
            labels={pending ? { download: 'Download Bill (PDF)' } : undefined}
          />
          <SendToPatientRow patientName={invoice.patientName} phone={patient?.phone} onPress={() => setSendOpen(true)} />
          {pending && (
            <Text style={styles.note}>
              Pending bills print as a bill with “Amount Due” — the receipt is issued once payment is collected.
            </Text>
          )}
        </FadeInView>
      </ScrollView>

      <CollectPaymentSheet
        visible={collectOpen}
        onClose={() => setCollectOpen(false)}
        amount={invoice.amount}
        invoiceNo={invoice.invoiceNo}
        patientName={invoice.patientName}
        modes={modes}
        defaultMode={invoice.paymentMode}
        onConfirm={collect}
        onOpenSettings={() => {
          setCollectOpen(false);
          router.push({ pathname: '/settings/[section]', params: { section: 'billing' } });
        }}
      />

      <SendToPatientSheet
        visible={sendOpen}
        onClose={() => setSendOpen(false)}
        patientName={invoice.patientName}
        phone={patient?.phone}
        message={receiptShareText(invoice, hospitalProfile.name)}
        onSendPdf={() => printOrShareReceipt(printData, 'share')}
        documentLabel={pending ? 'bill' : 'receipt'}
      />

      <ActionMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={invoice.invoiceNo}
        subtitle={`${invoice.title} • ${formatCurrency(invoice.amount)}`}
        actions={[
          ...(pending
            ? [
                {
                  key: 'collect',
                  label: 'Collect payment',
                  description: `Mark ${formatCurrency(invoice.amount)} as received`,
                  icon: 'wallet-outline' as const,
                  color: colors.success,
                  onPress: () => setCollectOpen(true),
                },
              ]
            : []),
          {
            key: 'send',
            label: 'Send to patient',
            description: patient?.phone ? `WhatsApp, SMS or PDF to ${patient.phone}` : 'Share the PDF or summary',
            icon: 'paper-plane-outline',
            onPress: () => setSendOpen(true),
          },
          ...(patient
            ? [
                {
                  key: 'patient',
                  label: 'View patient record',
                  description: `${patient.name} • ${patient.uhid}`,
                  icon: 'person-circle-outline' as const,
                  color: colors.purple,
                  onPress: () => router.push({ pathname: '/patient/[id]', params: { id: patient.id } }),
                },
                {
                  key: 'new',
                  label: 'New invoice for this patient',
                  description: 'Bill another service or item',
                  icon: 'add-circle-outline' as const,
                  color: colors.teal,
                  onPress: () => router.push({ pathname: '/create-invoice', params: { patientId: patient.id } }),
                },
              ]
            : []),
          {
            key: 'billing',
            label: 'All bills & invoices',
            description: 'Open the Billing tab',
            icon: 'receipt-outline',
            color: colors.textSecondary,
            onPress: () => openBillingTab(),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
  },
  dueBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '55',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  dueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.warningText,
  },
  dueSub: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dueAmount: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
  },
  actions: {
    gap: spacing.md,
  },
  note: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.base,
  },
});
