import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { FadeInView, Skeleton } from '../../components/common/Motion';
import { BottomActionBar, useBottomBarSpace } from '../../components/common/BottomActionBar';
import { ReceiptCard } from '../../components/receipt/ReceiptCard';
import { ClaimFormPreview, claimDocumentSpec } from '../../components/finance/ClaimFormPreview';
import { DischargeSummaryPreview, dischargeDocumentSpec } from '../../components/finance/DischargeSummaryPreview';
import { findTemplate } from '../../components/finance/templates';
import { resolveTemplateSample } from '../../components/finance/templateSamples';
import { receiptPrintData, roomForInvoice, signatoryFor } from '../../components/finance/invoiceUtils';
import { pushOrPopTo } from '../../components/finance/financeNavigation';
import { exportDocument, printOrShareReceipt } from '../../utils/pdfGenerator';

export default function TemplatePreviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    invoices,
    patients,
    doctors,
    wardInfo,
    medicines,
    labTests,
    radiologyScans,
    dischargeSummaries,
    documents,
    hospitalProfile,
    settings,
    getPatient,
  } = useApp();
  const navigation = useNavigation();
  const bottomSpace = useBottomBarSpace(84);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  const template = findTemplate(id);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 380);
    return () => clearTimeout(t);
  }, []);

  const sample = useMemo(
    () =>
      template
        ? resolveTemplateSample(template, { invoices, patients, doctors, wardInfo, medicines, labTests, radiologyScans, dischargeSummaries })
        : null,
    [template, invoices, patients, doctors, wardInfo, medicines, labTests, radiologyScans, dischargeSummaries]
  );

  if (!template || !sample) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="Template" showBack />
        <EmptyState
          icon="documents-outline"
          title="Template not found"
          description="This receipt template doesn't exist. Pick one from the list."
          actionTitle="All templates"
          onActionPress={() => pushOrPopTo(navigation.getState(), 'receipt-templates', '/receipt-templates')}
          style={styles.empty}
        />
      </SafeAreaView>
    );
  }

  const createHref: Href = { pathname: '/create-invoice', params: { type: template.invoiceType, template: template.id } };
  const samplePatient = sample.kind === 'invoice' || sample.kind === 'claim' ? getPatient(sample.invoice.patientId) : undefined;

  const exportSample = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (sample.kind === 'invoice') {
        await printOrShareReceipt(
          receiptPrintData(sample.invoice, {
            hospital: hospitalProfile,
            doctors,
            patient: samplePatient,
            footer: sample.fromRecord ? settings.receiptFooter : 'SAMPLE DOCUMENT — not a valid receipt',
          }),
          'download'
        );
      } else if (sample.kind === 'claim') {
        await exportDocument(
          claimDocumentSpec({ invoice: sample.invoice, patient: samplePatient, summary: dischargeSummaries.find((d) => d.patientId === sample.invoice.patientId), documents }, hospitalProfile),
          `Insurance-Claim-${sample.invoice.invoiceNo}.pdf`,
          'download'
        );
      } else if (sample.kind === 'discharge') {
        await exportDocument(dischargeDocumentSpec(sample.summary, hospitalProfile), `Discharge-Summary-${sample.summary.uhid}.pdf`, 'download');
      }
    } finally {
      setExporting(false);
    }
  };

  const primary =
    template.kind === 'discharge'
      ? {
          title: 'Open Summary',
          icon: 'document-text-outline' as const,
          onPress: () =>
            router.push(
              sample.kind === 'discharge' ? { pathname: '/discharge-summary', params: { patientId: sample.summary.patientId } } : '/discharge-summary'
            ),
        }
      : { title: 'Use Template', icon: 'add-circle-outline' as const, onPress: () => router.push(createHref) };

  const preview = (() => {
    switch (sample.kind) {
      case 'invoice':
        return (
          <ReceiptCard
            invoice={sample.invoice}
            hospital={hospitalProfile}
            signatory={signatoryFor(sample.invoice, doctors)}
            room={roomForInvoice(sample.invoice, samplePatient)}
            footer={settings.receiptFooter}
            watermark={sample.fromRecord ? 'PREVIEW' : 'SAMPLE'}
          />
        );
      case 'claim':
        return (
          <ClaimFormPreview
            data={{
              invoice: sample.invoice,
              patient: samplePatient,
              summary: dischargeSummaries.find((d) => d.patientId === sample.invoice.patientId),
              documents,
            }}
            hospital={hospitalProfile}
            watermark="PREVIEW"
          />
        );
      case 'discharge':
        return <DischargeSummaryPreview summary={sample.summary} hospital={hospitalProfile} watermark="PREVIEW" />;
      default:
        return (
          <EmptyState icon="document-outline" title="Nothing to preview yet" description={sample.note} style={styles.noneCard} />
        );
    }
  })();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title={template.title} subtitle="Template preview" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + spacing.base }]}
      >
        <FadeInView>
          <View style={styles.source}>
            <View style={[styles.sourceIcon, { backgroundColor: template.color + '18' }]}>
              <Ionicons name={template.icon} size={18} color={template.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitle}>{template.subtitle}</Text>
              <Text style={styles.sourceNote}>{sample.note}</Text>
            </View>
          </View>
          {sample.kind === 'invoice' && sample.fromRecord && (
            <TouchableOpacity
              style={styles.originalLink}
              onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: sample.invoice.id } })}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text style={styles.originalText}>Open original receipt {sample.invoice.invoiceNo} ›</Text>
            </TouchableOpacity>
          )}
        </FadeInView>

        {ready ? (
          <FadeInView delay={40}>{preview}</FadeInView>
        ) : (
          <View style={styles.skeletonCard} accessibilityLabel="Preparing preview">
            <View style={styles.skeletonHead}>
              <Skeleton width={44} height={44} radius={12} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="50%" height={10} />
              </View>
            </View>
            <Skeleton width="45%" height={22} style={{ alignSelf: 'center', marginVertical: spacing.md }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={12} style={{ marginBottom: 10 }} />
            ))}
            <Skeleton height={90} radius={12} style={{ marginTop: spacing.sm }} />
          </View>
        )}
      </ScrollView>

      <BottomActionBar>
        <View style={styles.barRow}>
          <Button
            title={exporting ? 'Preparing…' : 'Export sample PDF'}
            onPress={exportSample}
            variant="outline"
            loading={exporting}
            disabled={sample.kind === 'none'}
            style={styles.barBtn}
            textStyle={styles.barBtnText}
          />
          <Button
            title={primary.title}
            onPress={primary.onPress}
            icon={<Ionicons name={primary.icon} size={18} color="#FFFFFF" />}
            style={styles.barBtn}
            textStyle={styles.barBtnText}
          />
        </View>
      </BottomActionBar>
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
  content: {
    padding: spacing.base,
    gap: spacing.md,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  sourceIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  sourceNote: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  originalLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  originalText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  noneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
  },
  skeletonHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  barBtn: {
    flex: 1,
    paddingHorizontal: 10,
    minHeight: 50,
  },
  barBtnText: {
    fontSize: 14,
  },
});
