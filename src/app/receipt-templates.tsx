import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { nextInvoiceNumber } from '../logic/billing';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SectionHeader } from '../components/common/SectionHeader';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { FINANCE_TEMPLATES, type FinanceTemplate } from '../components/finance/templates';
import { invoicesForTemplate } from '../components/finance/templateSamples';
import { INVOICE_TYPE_META, INVOICE_TYPE_ORDER } from '../components/finance/invoiceUtils';
import { relativeDayLabel } from '../utils/dates';

export default function ReceiptTemplatesRoute() {
  const { invoices, dischargeSummaries } = useApp();
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  const usage = useMemo(() => {
    const map: Record<string, string> = {};
    FINANCE_TEMPLATES.forEach((t) => {
      if (t.kind === 'discharge') {
        const finals = dischargeSummaries.filter((d) => d.status !== 'Draft').length;
        map[t.id] = dischargeSummaries.length
          ? `${dischargeSummaries.length} on file • ${finals} final`
          : 'Generated at discharge';
        return;
      }
      const list = invoicesForTemplate(t, invoices);
      const last = list[0];
      map[t.id] = last
        ? `${list.length} issued • last ${last.invoiceNo}${last.dateISO ? `, ${relativeDayLabel(last.dateISO)}` : ''}`
        : 'Not used yet — preview shows sample data';
    });
    return map;
  }, [invoices, dischargeSummaries]);

  const open = (t: FinanceTemplate) => router.push({ pathname: '/template/[id]', params: { id: t.id } });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Receipt Templates" subtitle="Preview, export & start a bill" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <FadeInView>
          <View style={styles.intro}>
            <Ionicons name="documents-outline" size={20} color={colors.primary} />
            <Text style={styles.introText}>
              Open a template to preview it with your latest real bill, export a sample PDF, or start a new invoice in that format.
            </Text>
          </View>
        </FadeInView>

        <View style={styles.list}>
          {FINANCE_TEMPLATES.map((t, i) => (
            <FadeInView key={t.id} delay={stagger(i, 45)}>
              <PressableScale
                style={styles.card}
                onPress={() => open(t)}
                accessibilityRole="button"
                accessibilityLabel={`${t.title}. ${t.subtitle}. Open preview`}
              >
                <View style={[styles.icon, { backgroundColor: t.color + '16' }]}>
                  <Ionicons name={t.icon} size={22} color={t.color} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {t.subtitle}
                  </Text>
                  <Text style={styles.usage} numberOfLines={1}>
                    {usage[t.id]}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </PressableScale>
            </FadeInView>
          ))}
        </View>

        <FadeInView delay={stagger(FINANCE_TEMPLATES.length, 45)}>
          <SectionHeader title="Receipt numbering" meta={`${year} series`} />
          <View style={styles.numbering}>
            {INVOICE_TYPE_ORDER.map((type, i) => {
              const meta = INVOICE_TYPE_META[type];
              return (
                <View key={type} style={[styles.numRow, i > 0 && styles.numRowBorder]}>
                  <View style={[styles.numIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={14} color={meta.color} />
                  </View>
                  <Text style={styles.numLabel}>{meta.label}</Text>
                  <Text style={styles.numNext}>Next {nextInvoiceNumber(invoices, type, year)}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.hint}>Numbers are sequential per type and year, so receipts never collide.</Text>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
  },
  intro: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  introText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.infoText,
    lineHeight: 19,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    minHeight: 72,
    ...shadows.sm,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  usage: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 4,
  },
  numbering: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  numRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
  },
  numRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  numIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numLabel: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  numNext: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  hint: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
